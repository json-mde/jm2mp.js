/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The module [JSONQuery]{@link module:jm2mp/adapters/jsonquery} implements
 * the [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * interface to use the external [JSONQuery]{@link external:JSONQuery}
 * _query language_ as part of `JM2MP` _projection documents_.
**/

/**
 * @module jm2mp/adapters/jsonquery
 * @description
 * This module implements
 * the [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * interface to use the [JSON Query](https://jsonquerylang.org/) _query language_
 * as part of `JM2MP` _projection documents_.
 *
 * This module _only_ supports
 * [@jsonquerylang/jsonquery 4.x](https://www.npmjs.com/package/@jsonquerylang/jsonquery)
 * _version_.
 *
 * The `JSON Query` _query language_ supports two syntaxes:
 * - [String](https://jsonquerylang.org/docs/#text-format):
 *   textual representation with specific syntax for built-in functions composition.
 * - [Array](https://jsonquerylang.org/docs/#json-format):
 *   structured list of JSON values composing function calls used as query.
 *
 * This [JSONQuery]{@link external:JSONQuery}'s
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * accepts both syntaxes in `$path` to navigate/locate any JSON value
 * from _source documents_.
 *
 * By compliance with `JM2MP`, the
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * created by
 * [createJsonQueryAdapter]{@link module:jm2mp/adapters/jsonquery.createJsonQueryAdapter}
 * maintains the expected behaviour:
 * - `undefined`: returns `null` (absorption).
 * - Any runtime error found: raises
 *   [EvaluationError]{@link module:jm2mp/errors.EvaluationError}
 *    wrapping the original `cause`.
 * - `null` input: returns `null` without running
 *   [JSONQuery]{@link external:JSONQuery} library.
**/

/**
 * @external JSONQuery
 * @description
 * **JSON Query**: a small, flexible, and expandable JSON query language.
 * @see {@link https://jsonquerylang.org/}
 * @see {@link https://www.npmjs.com/package/@jsonquerylang/jsonquery}
 * @see {@link https://github.com/jsonquerylang/jsonquery}
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

import { AdapterError, ValidationError, EvaluationError } from "../errors.js";

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @description
 * It creates a new
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * dynamically loading
 * [@jsonquerylang/jsonquery](https://www.npmjs.com/package/@jsonquerylang/jsonquery) version **4.x**.
 * @returns {Promise<module:jm2mp/adapters/registry.QueryAdapter>}
**/
export async function createJsonQueryAdapter()
{
  let jsonquery, parse;
  try {
    const mod = await import("@jsonquerylang/jsonquery");
    jsonquery = mod.jsonquery ?? mod.default?.jsonquery ?? mod.default;
    parse = mod.parse ?? mod.default?.parse;
    if ( ((typeof jsonquery) !== "function") &&
         ((typeof parse) !== "function") ) {
      throw new Error("Functions 'jsonquery' and 'parse' must be part of 'jsonquery' library.");
    }
  } catch (cause) {
    throw new AdapterError(
      "Unable to load '@jsonquerylang/jsonquery 4.x' external library. " +
      "To install it, please use: `npm install @jsonquerylang/jsonquery@4` .",
      { cause }
    );
  }

  /**
   * @constant
   * @type {module:jm2mp/adapters/registry.QueryAdapter}
   * @description
   * The newly created
   * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
   * for the [JSONQuery]{@link external:JSONQuery} query language.
  **/
  const new_jsonquerylang_query_adapter = {
    name:
      "jsonquery",
    description:
      "JSON Query 4.x query adapter.",

    /**
     * @description
     * It validates a JSON Query expression:
     * - If it is a `string`, it tries to `parse` it.
     * - It it is an `array` or `object`, it will a
     * - If it is an `array` or an `object` (it takes on a structured form),
     *   the actual validation will be deferred until runtime.
     * 
     * @param {string} path The JSON Query path to validate.
    **/
    async validate(path)
    {
      if ((typeof path) === "string")
      {
        if (path.length === 0)
        {
          throw new ValidationError(
            "JSON Query: $path must be a non-empty string."
          );
        }
        try
        {
          parse(path);
        }
        catch (cause)
        {
          throw new ValidationError(
            `Invalid JSON Query expression: "${path}".`,
            { cause }
          );
        }
      }
      else if ( Array.isArray(path) ||
                ( ((typeof path) === "object") && (path !== null) ) )
      {
        // If it is an `array` or an `object` (it takes on a structured form),
        // the actual validation will be deferred until runtime.
      }
      else
      {
        throw new ValidationError(
          `JSON Query: $path must be textual (a non-empty string) or structured (an array or an object), instead of '${(typeof path)}'.`
        );
      }
    },

    /**
     * @description
     * It evaluates a `JSON Query` expression, trying to standardize the
     * outcome in accordance with the interface
     * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}.
     *
     * The `JSONQuery` library operates synchronously; `JM2MP.JS` wraps
     * the signature in `async` to comply with the uniform registry
     * contract (just like the rest of adapters).
     * 
     * It caches parsed query only when `$path` is a `string`.
     * 
     * The `env` parameter is ignored: `JSONQuery` does not support
     * lexical _aliases_ and does not distinguish between roots and
     * contexts, other than just the input; so the expression is always
     * evaluated against `input`.
    **/
    /* eslint-disable-next-line no-unused-vars -- _env */
    async evaluate(path, input, cache, _env) {
      // Null absorption propagation.
      if (input === null || input === undefined) return null;
      // It only caches string-formated parsed expressions.
      let queryToRun = path;
      if (typeof path === "string" && typeof parse === "function") {
        if (cache.has(path)) {
          queryToRun = cache.get(path);
        } else {
          try {
            queryToRun = parse(path);
          } catch (cause) {
            throw new EvaluationError(
              `Error during JSON Query expressions evaluation for "${path}".`,
              { cause }
            );
          }
          cache.set(path, queryToRun);
        }
      }

      let result;
      try {
        result = jsonquery(input, queryToRun);
      } catch (cause) {
        throw new EvaluationError(
          `Error evaluating JSON Query expression "${path}".`,
          { cause }
        );
      }

      // Null absorption propagation.
      return ((result === undefined) ? null : result);
    },

    /**
     * @property {@link module:jm2mp/adapters/registry.FallbackPolicyObject}
     * @description
     * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
     * behavior policy for edge cases in [JSONQuery]{@link external:JSONQuery}.
    **/
    fallbackPolicy: {
      missing:
        "null (when JSON Query return undefined)",
      multipleMatches:
        "array (JSON Query preserves the query format)",
      singleMatch:
        "scalar (as-is)",
      typeError:
        "EvaluationError (wrapping errors)",
      nullInput:
        "null (without invoking external library)",
      timeout:
        "0 (not async)"
    },
  };

  return new_jsonquerylang_query_adapter;

}  // export async function createJsonQueryAdapter

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/adapters/jsonquery.js                 */
