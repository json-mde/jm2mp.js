/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The module [JSONPath]{@link module:jm2mp/adapters/jsonpath} implements
 * the [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * interface to use the external [JSONPath]{@link external:JSONPath}
 * _query language_ as part of `JM2MP` _projection documents_.
**/

/**
 * @module jm2mp/adapters/jsonpath
 * @description
 * This module implements the
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * interface to use the [JSONPath](https://goessner.net/articles/JsonPath/)
 *  _query language_ as part of `JM2MP` _projection documents_.
 * 
 * This module _only_ supports **jsonpath-plus 10.x** _versions_.
 * Other versions must be tested previously to be considered as well.
 *
 * By compliance with `JM2MP`, the
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * created by
 * [createJsonataAdapter]{@link module:jm2mp/adapters/jsonata.createJsonPathAdapter}
 * maintains the expected behaviour:
 * - `undefined`, `null` and empty arrays --> `null`.
 * - `null` input --> `null` output without calling [JSONPath+{@link external:JSONPath} external library.
 * - Array with just one item --> Unwrap to single result.
 * - Array with several items --> array (as-is).
 * - Invalid expression during validation --> [ValidationError]{@link module:jm2mp/errors.ValidationError}.
 * - Invalid expression during runtime --> [EvaluationError]{@link module:jm2mp/errors.EvaluationError}.
 *
 * The [jsonpath-plus](https://www.npmjs.com/package/jsonpath-plus)
 * library is dynamically loaded when constructing its corresponding
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}.
 * If not previously installed, an
 * [AdapterError]{@link module:jm2mp/errors.AdapterError} exception will
 * be raised from
 * [createJsonPathAdapter]{@link module:jm2mp/adapters/jsonpath.createJsonPathAdapter}
 * with a clear message about it.
 *
 * @see [JSONPath (external)]{@link external:JSONPath}
**/

/**
 * @external JSONPath
 * @description
 * **jsonpath-plus** analyses, transforms, and selectively extracts data
 * from JSON documents (and JavaScript objects). **jsonpath-plus**
 * expands on the original **JSON Path** specification to add some
 * additional operators and makes explicit some behaviors the original
 * Goessner's work did not spell out.
 *
 * The module {@link module:jm2mp/adapters/jsonpath} implements the
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * interface to use [JSONPath](https://goessner.net/articles/JsonPath/)
 * as part of `JM2MP` _projection documents_.
 *
 * @see {@link https://goessner.net/articles/JsonPath/}
 * @see {@link https://www.npmjs.com/package/jsonpath-plus}
 * @see {@link https://github.com/JSONPath-Plus/JSONPath}
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
 * [JSONPath](https://www.npmjs.com/package/jsonpath-plus) version **10.x**.
 *
 * @returns {Promise<module:jm2mp/adapters/registry.QueryAdapter>}
 */
export async function createJsonPathAdapter() {
  // Trying to load JSONPath external library.
  let JSONPath;
  try {
    const mod = await import("jsonpath-plus");
    JSONPath = mod.JSONPath ?? mod.default?.JSONPath ?? mod.default;
    if (typeof JSONPath !== "function") {
      throw new Error("Function 'JSONPath' (from default or named export) not found!");
    }
  } catch (cause) {
    throw new AdapterError(
      "Unable to load 'jsonpath-plus 10.x.x' external library. " +
      "To install it, please use: `npm install jsonpath-plus@10` .",
      { cause }
    );
  }

  /**
   * @constant
   * @type {module:jm2mp/adapters/registry.QueryAdapter}
   * @description
   * The newly created
   * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
   * for the [JSONPath]{@link external:JSONPath} query language.
  **/
  const new_jsonpath_query_adapter = {
    name: "jsonpath",
    description: "JSONPath 10.x query adapter.",

    /**
     * @description
     * It validates a JSONPath expression, testing it using an
     * empty-object as input.
     * 
     * Quite rare JSONPath raises exceptions, even on invalid syntaxes.
     * 
     * @param {string} path The JSONPath expression to validate.
     */
    async validate(path) {
      if (typeof path !== "string" || path.length === 0) {
        throw new ValidationError(
          `JSONPath: $path must be a non-empty string, instead of '${typeof path}'.`
        );
      }
      try {
        JSONPath({ path, json: {}, wrap: true });
      } catch (cause) {
        throw new ValidationError(
          `Invalid JSONPath expression: "${path}".`,
          { cause }
        );
      }
    },

    /**
     * @description
     * It evaluates a JSONPath expression and normalize its result.
     *
     * The `JSONPath` library operates synchronously; `JM2MP.JS` wraps
     * the signature in `async` to comply with the uniform registry
     * contract (just like the rest of adapters).
     *
     * The `env` parameter is ignored: `JSONPath` does not support
     * lexical _aliases_ and does not distinguish between roots and
     * contexts, other than just the input; so the expression is always
     * evaluated against `input`.
     * @param {*} path The JSONPath expression to evaluate.
     * @param {*} input The input context (source document?).
     * @param {*} cache The expression cache.
     * @param {*} _env Unused by JSONPath (only root context is allowed).
    **/
    /* eslint-disable-next-line no-unused-vars -- _env */
    async evaluate(path, input, cache, _env) {
      // NULL absorptive propagation.
      if (input === null || input === undefined) return null;
      // jsonpath-plus parses every call, so we use the cache just to
      // know that such expression is already valid (to validate it just
      // once), avoiding loops.
      if (!cache.has(path)) {
        try {
          JSONPath({ path, json: {}, wrap: true });
          cache.set(path, true);
        } catch (cause) {
          throw new EvaluationError(
            `Error during JSONPath expressions evaluation for "${path}".`,
            { cause }
          );
        }
      }

      // Actual query execution.
      let result;
      try {
        result = JSONPath({ path, json: input, wrap: true });
      } catch (cause) {
        throw new EvaluationError(
          `Error evaluating JSONPath expression "${path}".`,
          { cause }
        );
      }

      // We normalizes `JSONPath` to `native` behavior:
      // - not array at all or empty array --> null,
      // - single item --> unwrap,
      // - several items --> array (as-is).
      if (!Array.isArray(result) || result.length === 0) return null;
      if (result.length === 1) return result[0];
      return result;
    },

    /**
     * @property {@link module:jm2mp/adapters/registry.FallbackPolicyObject}
     * @description
     * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
     * behavior policy for edge cases in `JSONPath`. Note the documented
     * divergence in `multipleMatches` from the native adapter's
     * "single match --> scalar" convention.
    **/
    fallbackPolicy: {
      missing:
        "null (an empty array is converted to null)",
      multipleMatches:
        "array (as-is; JSONPath always returns arrays, even on single values)",
      singleMatch:
        "scalar (unwrapping arrays with single items)",
      typeError:
        "null (any error is catched and returned as an empty array)",
      nullInput:
        "null (without invoking external library)",
      timeout:
        "0 (not async)",
    },
  };

  return new_jsonpath_query_adapter;
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/adapters/jsonpath.js                  */
