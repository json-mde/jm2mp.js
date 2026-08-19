/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The module [native_paths]{@link jm2mp/adapters/native_paths} implements
 * the EBNF parser for `native` paths and navigation/location functions.
**/

/**
 * @module jm2mp/adapters/native_paths
 * @description
 * This module implements the EBNF parser for `native` paths and
 * navigation/location functions.
 * 
 * This modules encapsules `native syntaxes` for `JM2MP`. It is invoked
 * exclusively for the
 * [native]{@link module:jm2mp/adapters/native} _query language_
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter};
 * there are no other sites of invocation (neither evaluator nor generic
 * validator).
 * 
 * A `native` _path_ with text string syntax has following form:
 * <div style="text-align:center;">
 * 
 * `root ( "." identifier | "[" array-index "]" | "[" named-property "]" )*`
 * 
 * </div>
 *
 * where `root` must be one of the following:
 * - `$`: represents the source document's root value (`root`).
 * - `@`: represents the current context (`ctx`).
 * - `%AliasName`: represents a lexical _alias_ bound using a `let`
 *   _template command_ (`alias`).
 *
 * `native` syntax also allows `$path` to be an array literal which
 * items will represent _accessors_ (strings for named-properties of
 * objects and natural numbers for indexed-items in arrays); that allows
 * navigation/location without additional parsing.
 * 
 * In practice, `native_paths` are really similar to
 * [JSONPointer (external)]{@link external:JSONPointer} syntax, which
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * is developed in [JSONPointer (module)]{@link module:jm2mp/adapters/jsonpointer}.
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

import { ParseError, EvaluationError } from "../errors.js";

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @constant {object}
 * @enum
 * @description
 * It lists the starting points of a `path` from the `execution environment`.
**/
export const EXECUTION_ENVIRONMENT_FROM = {
  /**
   * @memberof EXECUTION_ENVIRONMENT_FROM
   * @property {string}
   * @readonly
   * @description "root"
  **/
  get ROOT() { return "root"; },

  /**
   * @memberof EXECUTION_ENVIRONMENT_FROM
   * @property {string}
   * @readonly
   * @description "ctx"
  **/
  get CTX(){ return "ctx"; },

  /**
   * @memberof EXECUTION_ENVIRONMENT_FROM
   * @property {string}
   * @readonly
   * @description "alias"
  **/
  get ALIAS() { return "alias"; },
}

/* ------------------------------------------------------------------ */

/**
 * @typedef {object} ParsedPath
 * @property {"root" | "ctx" | "alias"} kind
 * The base kind of the parsed path.
 * @property {string|null} aliasName
 * The name of the alias only if `kind` is `'alias'`; otherwise, it is `null`.
 * @property {Array.<string|number>} accessors
 * The accessors after the base (it is always an array, empty or not).
 * @description
 * It represents a parsed path (from string-based syntax).
**/

/* ------------------------------------------------------------------ */

/**
 * @default
 * It parses 'input' string as a native path.
 * @param {string} input
 * The input path to parse.
 * @returns {ParsedPath}
 * The _abstract syntax tree_ (AST) of 'input' path.
 * @throws {module:jm2mp/errors.ParseError}
 * Whenever 'input' string were not a valid path.
 */
export function parsePath(input)
{
  // Argument validation.
  if ( ((typeof input) !== "string") || (input.length === 0) ) {
    throw new ParseError("Syntax error: a native path must be a non-empty string.");
  }
  else
  {
    // Initial position of the parse inside the input string (path).
    let pos = 0;

    /**
     * @description
     * Helper function to consume the next character if it is the expected;
     * otherwise, it will raise an exception.
     * @param {string} ch The character to look for.
     * @throws {ParseError} Whenever 'ch' were not the next 'input' character.
     */
    const expect = (ch) => {
      if (input[pos] !== ch) {
        throw new ParseError(
          `Syntax error: unexpected character '${input[pos]}' instead of '${ch}' at position '${pos}' of input path '${input}'.`
        );
      }
      pos++;
    };

    // It determines the kind of root depending of first character.
    let kind, aliasName = null;
    if (input[0] === "$") {
      // "$" means root document's value.
      kind = EXECUTION_ENVIRONMENT_FROM.ROOT;
      pos = 1;
    } else if (input[0] === "@") {
      // "@" means current context.
      kind = EXECUTION_ENVIRONMENT_FROM.CTX;
      pos = 1;
    } else if (input[0] === "%") {
      // "%name" means a lexical alias.
      kind = EXECUTION_ENVIRONMENT_FROM.ALIAS;
      pos = 1;
      aliasName = readIdentifier(input, pos);
      if (aliasName === null) {
        throw new ParseError(
          `Syntax error: missing identifier right after '%' in input path '${input}'.`
        );
      }
      // It advances the current position until the end of the alias identifier.
      pos += aliasName.length;
    } else {
      throw new ParseError(
        `Syntax error: unknown root path in input '${input}'; only '$', '@' or '%' is expected.`
      );
    }
    // The list of accessors, which will be extracted from 'input' path
    // after the execution context.
    /** @type {Array.<string|number>} */
    const accessors = [];
    // It parses accessors until the end of the 'input' string.
    while (pos < input.length) {
      // Current character.
      const ch = input[pos];
      if (ch === ".")
      {
        // It is an accessor by dot: ".identifier".
        pos++;
        const id = readIdentifier(input, pos);
        if (id === null) {
          throw new ParseError(
            `Syntax error: missing identifier after dot ('.') at position '${pos}' of input path '${input}'.`
          );
        }
        accessors.push(id);
        pos += id.length;
      }
      else if (ch === "[")
      {
        // It is an accessor by square brackts: "[number (array index)]" or "[string (property name)]".
        pos++;
        // String: property name.
        if (input[pos] === '"')
        {
          const { value, length } = readQuotedString(input, pos);
          accessors.push(value);
          pos += length;
        }
        // Number: array index.
        else if ( isDigit(input[pos]) )
        {
          const { value, length } = readNonNegativeInteger(input, pos);
          accessors.push(value);
          pos += length;
        }
        // Else, meaning... syntax error.
        else
        {
          throw new ParseError(
            `Syntax error: expected number (array-index) or string (property-name) after '[' at position '${pos}' of input path '${input}'.`
          );
        }
        expect("]");
      } else {
        throw new ParseError(
          `Syntax error: unexpected character '${ch}' at position '${pos}' of input path '${input}'.`
        );
      }
    }
    // It buids and returns the abstract syntax tree (AST) of the parsed path.
    /** @constant {ParsedPath} */
    const result = { kind, aliasName, accessors };
    return result;
  }
}  // export function parsePath

/* ------------------------------------------------------------------ */

/**
 * @description
 * It reads an identifier from 'input' with starting delimiter character
 * 'start'. An identifier starts by `[A-Za-z_]` (see {@link isIdentifierStart})
 * and continues by `[A-Za-z_0-9]` (see {@link isIdentifierContinue}).
 * It returns the identifier found, or `null` otherwise.
 * @param {string} input
 * The input string containing the full path.
 * @param {number} start
 * The initial position to read the expected identifier.
 * @returns {string|null}
 * The identifier found, or `null` if no one valid is in such position.
**/
function readIdentifier(input, start) {
  // Current start at input must be a valid identifier-start-character.
  if (start >= input.length || !isIdentifierStart(input[start])) {
    return null;
  }
  // It continues until no identifier-character is found.
  let end = start + 1;
  while (end < input.length && isIdentifierContinue(input[end])) {
    end++;
  }
  // It returns the slice for the identifier.
  return input.slice(start, end);
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It reads a natural number (non-negative integer) from 'start'
 * position in 'input', and returns its numeric value.
 * @param {string} input
 * The input string containing the full path.
 * @param {number} start
 * The initial position to read the expected natural number.
 * @returns {{value: number, length: number}}
 * Tuple with both: numeric value and number of characters consumed by
 * the parser.
**/
function readNonNegativeInteger(input, start) {
  let end = start;
  while ( ( end < input.length ) && isDigit(input[end]) )
  {
    end++;
  }
  const value = Number(input.slice(start, end));
  return { value, length: end - start };
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It reads an string quoted only as JSON supports (`&quote;` is allowed
 * but not `&apos;`) from 'input' path, starting at 'start' position
 * character. It also supports escaping characters like JSON:
 * `\"`, `\\`, `\/`, `\b`, `\f`, `\n`, `\r`, `\t`, and `\uXXXX`.
 * @param {string} input
 * The input string containing the full path.
 * @param {integer} start
 * The initial position to read the quoted string, considering that
 * `input[start]` must be a `&quote;`.
 * @returns {{value: string, length: integer}}
 * Tuple with both: unquoted string value and the number of characters
 * consumed by the parser reading the value (and both `&quote;s`).
 */
function readQuotedString(input, start) {
  if (input[start] !== '"')
  {
    // Assert (argument validation, theoric but not possible).
    throw new ParseError(`Syntax error: expected '"' at position '${start}' of input path '${input}'.`);
  }
  else
  {
    // Resulting value (unquoted string).
    /** @type {string} */
    let value = "";
    /** @type {boolean} */
    let found = false ;
    // It consumes characters until the end of the 'input' path.
    let end = start + 1;
    while ( (!found) && (end < input.length) )
    {
      // It inspects the current character.
      const ch = input[end];
      if (ch === '"')
      {
        found = true ;
      }
      else if (ch === "\\")
      {
        // Escaping characters like JSON.
        end++;
        if (end >= input.length)
        {
          throw new ParseError(`Syntax error: incomplete escape character at the end of input path '${input}'.`);
        }
        const esc = input[end];
        switch (esc)
        {
          case '"':  value += '"';  break;
          case "\\": value += "\\"; break;
          case "/":  value += "/";  break;
          case "b":  value += "\b"; break;
          case "f":  value += "\f"; break;
          case "n":  value += "\n"; break;
          case "r":  value += "\r"; break;
          case "t":  value += "\t"; break;
          case "u": {
            // Escape unicode \uXXXX.
            if (end + 4 >= input.length) {
              throw new ParseError(`Syntax error: incomplete Unicode escape '\\uXXXX' at '${end}' in input path '${input}'.`);
            }
            const hex = input.slice(end + 1, end + 5);
            if (!/^[0-9A-Fa-f]{4}$/.test(hex)) {
              throw new ParseError(`Syntax error: invalid Unicode escape '\\uXXXX' at '${end}' in pinput path '${input}'.`);
            }
            value += String.fromCharCode(parseInt(hex, 16));
            end += 4;
            break;
          }
          default: throw new ParseError(`Syntax error: unrecognized escape character '\\X' at '${end}' of input path '${input}'.`);
        }
        end++;
      }
      else
      {
        value += ch;
        end++;
      }
    }
    // It returns the result found, or raises an exception otherwise.
    if (found)
    {
      const result = { value, length: end - start + 1 };
      return result;
    }
    else
    {
      throw new ParseError(`Syntax error: quoted string not closed at the end of input path '${input}'.`);
    }
  }
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * True whenever 'ch' can starts an identifier
 * (ASCII letter or underline characters).
 * @param {string} ch
 * The character to test.
 * @returns {boolean}
 * Is 'ch' in [A-Za-z_] ?
**/
function isIdentifierStart(ch) {
  return (
    (ch >= "A" && ch <= "Z") ||
    (ch >= "a" && ch <= "z") ||
    ( ch === "_" )
  );
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * True whenever 'ch' can continue an identifier
 * (ASCII letter, digit or underline characters).
 * @param {string} ch
 * The character to test.
 * @returns {boolean}
 * Is 'ch' in {@link isIdentifierStart} and {@link isDigit} ?
**/
function isIdentifierContinue(ch) {
  return ( isIdentifierStart(ch) || isDigit(ch) );
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * True whenever 'ch' is an ASCII digit.
 * @param {string} ch
 * The character to test.
 * @returns {boolean}
 * Is 'ch' in [0-9] ?
**/
function isDigit(ch) {
  return ( ( ch >= "0" ) && ( ch <= "9" ) );
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It applies the sequence of accessors to an initial JSON value,
 * navigating/location inside of such value.
 * 
 * It follows the _null absorption_ rule: if in any step the resulting
 * value is `null` or the _accessor_ is not applicable (not named
 * property found, index out of range, dot navigation over scalar value,
 * ...), then the final resultant value will be `null`.
 * @param {*} value
 * The initial JSON value.
 * @param {Array<string|number>} accessors
 * The list of accessors to be orderly applied.
 * @returns {*}
 * El valor tras la navegación, o null si la navegación falla.
 * The resultant JSON value found after the navigation/locate.
 * @throws {EvaluationError}
 * Whenever ... is not supported.
 */
export function navigate(value, accessors)
{
  // Argument validation.
  if (!Array.isArray(accessors))
  {
    throw new ParseError('Accessors must be an array, empty or not!');
  }
  else
  {
    // It follows every accessor, one by one, updating the
    // current value, to determine the resultant value.
    let current = value;
    for (const acc of accessors)
    {
      // Null absorption rule.
      if (current === null || current === undefined)
      {
        break;
      }
      // String accessor means property name, only supported by object traversal.
      else if (typeof acc === "string")
      {
        if (typeof current !== "object" || Array.isArray(current))
        {
          // Semantic error, actually, but resolved as 'not found' without raising errors.
          current = null;
        }
        else
        {
          // Only owned properties and not from the prototype.
          current = (
            Object.hasOwn(current, acc)
            ? current[acc]
            : null
          );
        }
      }
      else if ( (typeof acc === "number") && Number.isSafeInteger(acc) )
      {
        // Numeric accessor means an index, only supported by array traversal.
        if ( ! Array.isArray(current) )
        {
          // Semantic error, actually, but resolved as 'not found' without raising error.
          current = null;
        }
        else
        {
          current = (
            ( ( acc >= 0 ) && ( acc < current.length ) )
            ? current[acc]
            : null
          );
        }
      }
      else
      {
        throw new EvaluationError(
          `Parser error: unsupported kind of accessor '${(typeof acc)}'.`
        );
      }
    }
    return current;
  }
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/adapters/native-paths.js              */
