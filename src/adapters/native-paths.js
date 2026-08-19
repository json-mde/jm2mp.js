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
 * @namespace
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
 * @property {Array<string|number>} accessors
 * The accessors after the base (it is always an array, empty or not).
 * @description
 * It represents a parsed path (from string-based syntax).
**/

/* ------------------------------------------------------------------ */

/**
 * Parsea un string como ruta nativa.
 *
 * @param {string} input - El string a parsear.
 * @returns {ParsedPath} El AST de la ruta.
 * @throws {ParseError} Si el string no es una ruta nativa válida.
 */
export function parsePath(input)
{
  if (typeof input !== "string" || input.length === 0) {
    throw new ParseError("La ruta nativa debe ser una cadena no vacía.");
  }
  else
  {
    // Posición actual del parser dentro del string.
    let pos = 0;
    // Helper: consume el siguiente carácter si coincide; lanza error en caso contrario.
    const expect = (ch) => {
      if (input[pos] !== ch) {
        throw new ParseError(
          `Se esperaba '${ch}' en posición ${pos} de la ruta "${input}".`
        );
      }
      pos++;
    };
    // Determinamos la raíz a partir del primer carácter.
    let kind, aliasName = null;
    //
    if (input[0] === "$") {
      // Raíz "$": documento de origen.
      kind = EXECUTION_ENVIRONMENT_FROM.ROOT;
      pos = 1;
    } else if (input[0] === "@") {
      // Raíz "@": contexto actual.
      kind = EXECUTION_ENVIRONMENT_FROM.CTX;
      pos = 1;
    } else if (input[0] === "%") {
      // Raíz "%nombre": alias léxico. Tras "%" debe haber un identificador.
      kind = EXECUTION_ENVIRONMENT_FROM.ALIAS;
      pos = 1;
      aliasName = readIdentifier(input, pos);
      if (aliasName === null) {
        throw new ParseError(
          `Se esperaba un identificador tras '%' en la ruta "${input}".`
        );
      }
      // Avanzamos pos hasta el final del identificador.
      pos += aliasName.length;
    } else {
      throw new ParseError(
        `Raíz de ruta desconocida en "${input}". Se esperaba '$', '@' o '%'.`
      );
    }
    // Lista de accesores que se van extrayendo tras la raíz.
    const accessors = [];
    // Parseamos accesores hasta agotar el string.
    while (pos < input.length) {
      const ch = input[pos];
      //
      if (ch === ".") {
        // Accesor por punto: ".identificador".
        pos++;
        const id = readIdentifier(input, pos);
        if (id === null) {
          throw new ParseError(
            `Se esperaba un identificador tras '.' en posición ${pos} de "${input}".`
          );
        }
        accessors.push(id);
        pos += id.length;
      } else if (ch === "[") {
        // Accesor por corchetes: "[índice]" o "[string-citado]".
        pos++;
        // Decidimos si lo siguiente es un número o un string citado.
        if (input[pos] === '"') {
          // String citado.
          const { value, length } = readQuotedString(input, pos);
          accessors.push(value);
          pos += length;
        } else if (isDigit(input[pos])) {
          // Número.
          const { value, length } = readNonNegativeInteger(input, pos);
          accessors.push(value);
          pos += length;
        } else {
          throw new ParseError(
            `Se esperaba número o string citado tras '[' en posición ${pos} de "${input}".`
          );
        }
        expect("]");
      } else {
        throw new ParseError(
          `Carácter inesperado '${ch}' en posición ${pos} de "${input}".`
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
 * Lee un identificador (letra o subrayado seguido de alfanuméricos o subrayados)
 * a partir de la posición dada. Devuelve el identificador encontrado, o null si no había.
 *
 * @param {string} input - El string completo.
 * @param {number} start - Posición inicial.
 * @returns {string|null} El identificador, o null si no hay uno válido en esa posición.
 */
function readIdentifier(input, start) {
  // Comprobamos que el primer carácter sea letra o subrayado.
  if (start >= input.length || !isIdentifierStart(input[start])) {
    return null;
  }
  let end = start + 1;
  // Consumimos caracteres alfanuméricos o subrayados.
  while (end < input.length && isIdentifierContinue(input[end])) {
    end++;
  }
  return input.slice(start, end);
}

/* ------------------------------------------------------------------ */

/**
 * Lee un entero no negativo a partir de la posición dada.
 *
 * @param {string} input - El string completo.
 * @param {number} start - Posición inicial.
 * @returns {{value: number, length: number}} Valor entero y número de caracteres consumidos.
 */
function readNonNegativeInteger(input, start) {
  let end = start;
  while (end < input.length && isDigit(input[end])) {
    end++;
  }
  if (end === start) {
    throw new ParseError(
      `Se esperaba un dígito en posición ${start} de "${input}".`
    );
  }
  const value = Number(input.slice(start, end));
  return { value, length: end - start };
}

/* ------------------------------------------------------------------ */

/**
 * Lee un string citado al estilo JSON a partir de la posición dada.
 * Soporta los escapes JSON estándar: \" \\ \/ \b \f \n \r \t \uXXXX.
 *
 * @param {string} input - El string completo.
 * @param {number} start - Posición de la comilla de apertura.
 * @returns {{value: string, length: number}} Valor desescapado y longitud incluyendo comillas.
 */
function readQuotedString(input, start) {
  if (input[start] !== '"') {
    throw new ParseError(`Se esperaba '"' en posición ${start} de "${input}".`);
  }
  let pos = start + 1;
  let value = "";
  while (pos < input.length) {
    const ch = input[pos];
    if (ch === '"') {
      return { value, length: pos - start + 1 };
    }
    if (ch === "\\") {
      // Procesamos escape JSON estándar.
      pos++;
      if (pos >= input.length) {
        throw new ParseError(`Escape incompleto en "${input}".`);
      }
      const esc = input[pos];
      switch (esc) {
        case '"': value += '"'; break;
        case "\\": value += "\\"; break;
        case "/":  value += "/"; break;
        case "b":  value += "\b"; break;
        case "f":  value += "\f"; break;
        case "n":  value += "\n"; break;
        case "r":  value += "\r"; break;
        case "t":  value += "\t"; break;
        case "u": {
          // Escape unicode \uXXXX.
          if (pos + 4 >= input.length) {
            throw new ParseError(`Escape \\u incompleto en "${input}".`);
          }
          const hex = input.slice(pos + 1, pos + 5);
          if (!/^[0-9A-Fa-f]{4}$/.test(hex)) {
            throw new ParseError(`Escape \\u inválido en "${input}".`);
          }
          value += String.fromCharCode(parseInt(hex, 16));
          pos += 4;
          break;
        }
        default:
          throw new ParseError(`Escape \\${esc} no reconocido en "${input}".`);
      }
      pos++;
    } else {
      value += ch;
      pos++;
    }
  }
  throw new ParseError(`String citado sin cerrar en "${input}".`);
}

/* ------------------------------------------------------------------ */

/** True si ch puede iniciar un identificador (letra ASCII o subrayado). */
function isIdentifierStart(ch) {
  return (ch >= "A" && ch <= "Z") ||
         (ch >= "a" && ch <= "z") ||
         ch === "_";
}

/* ------------------------------------------------------------------ */

/** True si ch puede continuar un identificador (alfanumérico ASCII o subrayado). */
function isIdentifierContinue(ch) {
  return isIdentifierStart(ch) || isDigit(ch);
}

/* ------------------------------------------------------------------ */

/** True si ch es un dígito ASCII. */
function isDigit(ch) {
  return ch >= "0" && ch <= "9";
}

/* ------------------------------------------------------------------ */

/**
 * Aplica una secuencia de accesores a un valor JSON, navegando dentro de él.
 *
 * Sigue la regla absorbente: si en algún paso el valor es null o el accesor
 * no es aplicable (clave inexistente, índice fuera de rango, navegación por
 * punto sobre array/primitivo, etc.), el resultado es null.
 *
 * @param {*} value - Valor JSON inicial.
 * @param {Array<string|number>} accessors - Lista de accesores a aplicar en orden.
 * @returns {*} El valor tras la navegación, o null si la navegación falla.
 */
export function navigate(value, accessors)
{
  // Recorremos los accesores uno por uno, actualizando el valor actual.
  let current = value;
  for (const acc of accessors) {
    // Cualquier null absorbe la navegación.
    if (current === null || current === undefined) return null;

    if (typeof acc === "string") {
      // Accesor de objeto: solo aplicable si el valor es un objeto plano (no array).
      if (typeof current !== "object" || Array.isArray(current)) {
        return null;
      }
      // Object.hasOwn evita usar propiedades del prototipo.
      current = Object.hasOwn(current, acc) ? current[acc] : null;
    } else if (typeof acc === "number") {
      // Accesor de array: solo aplicable a arrays.
      if (!Array.isArray(current)) {
        return null;
      }
      current = (acc >= 0 && acc < current.length) ? current[acc] : null;
    } else {
      throw new EvaluationError(
        `Tipo de accesor no soportado: ${typeof acc}`
      );
    }
  }
  return current;
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/adapters/native-paths.js              */
