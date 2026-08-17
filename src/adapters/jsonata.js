/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The module [JSONata]{@link module:jm2mp/adapters/jsonata} implements
 * the [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * interface to use **JSONata** _query language_ as part of `JM2MP`
 * _projection documents_.
**/

/**
 * @module jm2mp/adapters/jsonata
 * @description
 * This module implements the
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * interface to use the [JSONata](https://jsonata.org/) _query language_
 * as part of `JM2MP` _projection documents_.
 *
 * This module _only_ supports **JSONata 2.x** _versions_. Older version
 * 1.x uses another incompatible API, as well as possibily future
 * versions (3.x).
 *
 * By design, **JSONata 2.x** is **async only**, as well as
 * {@link QueeryAdapter.evaluate} interface contract.
 *
 * By compliance with `JM2MP`, the
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * created by [createJsonataAdapter]{@link module:jm2mp/adapters/jsonata.createJsonataAdapter}
 * maintains the expected behaviour:
 * - `undefined` --> `null`.
 * - Type errors --> {@link module:jm2mp/errors.EvaluationError} with `cause`.
 * - `null` input --> `null` output without calling [JSONata]{@link external:JSONata} external library.
 * - Invalid expression during validation --> [ValidationError]{@link module:jm2mp/errors.ValidationError}.
 * - Invalid expression during runtime --> [EvaluationError]{@link module:jm2mp/errors.EvaluationError}.
 *
 * **Timeout mechanism**: this adapter supports an optional `timeout`
 * parameter (expressed in milliseconds). If the evaluation of an
 * expression takes too long, it will be rejected and a
 * {@link module:jm2mp/errors.EvaluationError} exception will be raised,
 * referencing such _timeout_. But the actual evaluation will continue
 * to run in the background until it naturally completes, although its
 * result will be discarded.
 * 
 * This _timeout mechanism_ is acceptable for well written expressions
 * but maybe insufficient for potentially malicious queries.
 *
 * The [jsonata](https://www.npmjs.com/package/jsonata)
 * library is dynamically loaded when constructing its corresponding
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}.
 * If not previously installed, an
 * [AdapterError]{@link module:jm2mp/errors.AdapterError} exception will
 * be raised from
 * [createJsonataAdapter]{@link module:jm2mp/adapters/jsonpath.createJsonataAdapter}
 * with a clear message about it.
 *
 * @see [JSONata (external)]{@link external:JSONata}
**/

/**
 * @external JSONata
 * @description
 * **jsonata** is a JavaScript implementation of **JSONata**, which is a
 * JSON query and transformation language. This package is the reference
 * implementation of the JSONata query and transformation language.
 *
 * The module {@link module:jm2mp/adapters/jsonata} implements the
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * interface to use **JSONata** as part of `JM2MP`
 * _projection documents_.
 *
 * @see {@link http://jsonata.org/}
 * @see {@link https://www.npmjs.com/package/jsonata}
 * @see {@link https://github.com/jsonata-js/jsonata}
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

import { AdapterError, ParseError, ValidationError, EvaluationError } from "../errors.js";

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @description
 * It creates a new
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * dynamically loading
 * [JSONata](https://www.npmjs.com/package/jsonata) version **2.x**.
 * 
 * @param {object} [options]
 * @param {number} [options.timeout]
 * Timeout (expressed in _milliseconds_) for evaluating each query.
 * If its value is greater than zero, any evaluation that exceeds this
 * _timeout_ will raise an [EvaluationError]{@link module:jm2mp/errors.EvaluationError}
 * exception. If it is not defined, is zero or is less than zero, no
 * _timeout_ will be applied.
 * @returns {Promise<module:jm2mp/adapters/registry.QueryAdapter>}
 */
export async function createJsonataAdapter(options = {})
{
  // Trying to load JSONata external library.
  let jsonata;
  try {
    const mod = await import("jsonata");
    jsonata = mod.default ?? mod.jsonata ?? mod;
    if (typeof jsonata !== "function") {
      throw new Error("Function 'jsonata' (default or named export) not found!");
    }
  } catch (cause) {
    throw new AdapterError(
      "Unable to load 'jsonata 2.x.x' external library. " +
      "To install it, please use: `npm install jsonata@2` .",
      { cause }
    );
  }

  // Configuring timeout (<=0 --> no timeout).
  const timeout = (typeof options.timeout === "number" && options.timeout > 0)
    ? options.timeout
    : 0;

  /**
   * @description
   * Compila o recupera de caché una expresión JSONata.
   * Devuelve el objeto JSONata compilado (con .evaluate()).
   * @param {*} expr 
   * @param {*} cache The {@link }
   * @returns {*} The equivalent compiled JSONata expression.
   */
  function compileWithCache(expr, cache) {
    if (cache.has(expr)) return cache.get(expr);
    let compiled;
    try {
      compiled = jsonata(expr);
    } catch (cause) {
      throw new ParseError(
        `Expresión JSONata inválida: "${expr}".`,
        { cause }
      );
    }
    cache.set(expr, compiled);
    return compiled;
  }

  /** @type {@link module:jm2mp/adapters/registry.QueryAdapter} */
  return {
    name: "jsonata",
    description: "JSONata 2.x query adapter.",

    /**
     * @description
     * It validates a JSONata expression, trying to compile it.
     */
    async validate(path) {
      if (typeof path !== "string" || path.length === 0) {
        throw new ValidationError(
          `JSONata: $path must be a non-empty string, instead of '${typeof path}'.`
        );
      }
      try {
        jsonata(path);
      } catch (cause) {
        throw new ValidationError(
          `Invalid JSONata expression: "${path}".`,
          { cause }
        );
      }
    },

    /**
     * @description
     * It evaluates a JSONata expression and normalize its result:
     * - It will return `null` whenever `input` is `null` or `undefined`.
     * - It will use a pre-compiled expression cache (specially useful
     * in loops).
     * - It _timeout_ (>0) is configured, then it applies `Promise.race`
     *   with `setTimeout`; when evaluation exceeds such timeout, an
     *   [EvaluationError]{@link module:jm2mp/errors.EvaluationError}
     *   exception will be raised (but actual JSONata expressions
     *   evaluation will be running in background until finished; only
     *   result is fast discarded).
     *
     * The `env` parameter is ignored: `JSONPath` does not support
     * lexical _aliases_ and does not distinguish between roots and
     * contexts, other than just the input; so the expression is always
     * evaluated against `input`.
    **/
    /* eslint-disable-next-line no-unused-vars -- _env */
    async evaluate(path, input, cache, _env) {
      // NULL absorptive propagation.
      if (input === null || input === undefined) return null;
      // Compiling using cache.
      let compiled;
      try {
        compiled = compileWithCache(path, cache);
      } catch (cause) {
        throw new EvaluationError(
          `Error during JSONata expressions compilation for "${path}".`,
          { cause }
        );
      }

      /**
       * @description
       * Function to normalize the NULL absorptive propagation:
       * undefined --> null.
       * @returns {*}
      **/
      const evalFn = async () => {
        let result;
        try {
          result = await compiled.evaluate(input);
        } catch (cause) {
          throw new EvaluationError(
            `Error evaluating JSONata expression "${path}".`,
            { cause }
          );
        }
        return (result === undefined ? null : result);
      };

      // When no timeout is configured, just evaluate.
      if (timeout === 0) {
        return await evalFn();
      }
      // If timeout is configured, then wait/race between evaluation and timeout.
      let timeoutHandle;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new EvaluationError(
            `JSONata evaluation of "${path}" exceeds the timeout of '${timeout}'ms.`
          ));
        }, timeout);
      });

      try {
        return await Promise.race([evalFn(), timeoutPromise]);
      } finally {
        // In Node.JS a setTimeout always must be ended with clearTimeout.
        if (timeoutHandle) clearTimeout(timeoutHandle);
      }
    },  // async inner function evaluate()

    /**
     * @type {@link module:jm2mp/adapters/registry.FallbackPolicyObject}
     * @description
     * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
     * behavior policy for `JSONata`.
    **/
    fallbackPolicy: {
      missing:
        "null (when JSONata returns undefined)",
      multipleMatches:
        "array (when JSONata expression returns a sequence)",
      singleMatch:
        "scalar (as-is)",
      typeError:
        "EvaluationError (wrapping errors)",
      nullInput:
        "null (without invoking external library)",
      timeout:
        ( ( timeout > 0 )
          ? `${timeout} (yes, in milliseconds; raising EvaluationError but continue running in background)`
          : "0 (no)" ),
    },
  };

/* ------------------------------------------------------------------ */

}  // export async function createJsonataAdapter

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/adapters/jsonata.js                   */
