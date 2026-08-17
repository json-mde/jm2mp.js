/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The module [JMESPath]{@link module:jm2mp/adapters/jmespath} implements
 * the [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * interface to use **JMESpath** _query language_ as part of `JM2MP`
 * _projection documents_.
**/

/**
 * @module jm2mp/adapters/jmespath
 * @description
 * This module implements
 * the [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * interface to use the [JMESPath](https://jmespath.org/) _query language_
 * as part of `JM2MP` _projection documents_.
 *
 * This module _only_ supports **jmespath 0.16.x** _version_ (the canonical package).
 * There is a [community fork](https://jmespath.site/),
 * [@jmespath-community/jmespath](https://github.com/jmespath-community/typescript-jmespath),
 * but its API is different enough that it is not considered compatible.
 *
 * By design, **JMESPath** is a declarative _query language_ with a formal
 * specification and an official test suite. It is widely deployed
 * (for instance, in the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-filter.html)).
 * It combines path access, projections, square-brackets segments,
 * filtering, multi-selection expressions (for both, lists and maps),
 * pipelines and a catalogue of built-in functions.
 *
 * Examples of syntax:
 *   "foo.bar"                     --> inner property accessor
 *   "users[0].name"               --> inner property name of first user
 *   "users[*].name"               --> all names of every user
 *   "users[?age > `18`]"          --> filter by predicates
 *   "users[*].{n: name, a: age}"  --> multi-select hash
 *   "length(users)"               --> built-in functions
 *   "people | [0]"                --> pipe (restarting its own context)
 *
 * By compliance with `JM2MP`, the
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * created by {@link module:jm2mp/adapters/jmespath.createJmesPathAdapter}
 * maintains the expected behaviour:
 * - `undefined` --> `null` (native for JMESPath).
 * - `null` input --> `null` output without calling {@link external:JMESpath} external library.
 * - Expression with multiple resultsets --> array (as is).
 * - Expression with single result --> array (with single item).
 *   Aquí JMESPath DIFIERE del adaptador nativo / jsonpath-plus: no
 *   desempaquetamos. La razón es que en JMESPath la "aridad" de la
 *   expresión es una propiedad sintáctica (las proyecciones siempre
 *   devuelven listas, los accesos simples siempre devuelven escalares).
 *   Desempaquetar rompería esa propiedad y haría que el tipo de retorno
 *   dependa de los datos. Esta divergencia está documentada en la
 *   `fallbackPolicy` del adaptador para que el usuario sepa a qué atenerse.
 * - Invalid expression during validation --> {@link ValidationError}.
 * - Invalid expression during runtime --> {@link EvaluationError}.
 * - Expression cache: the canonical `jmespath` library do not publicly
 *   exposes its TreeInterpreter; because of that, `jmespath.search(data, expr)`
 *   parses again internally each query in every invocation; this
 *   [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 *   then uses its cache just for _remember queries previously validated_
 *   to avoid call `compile` from `evaluate`; it is not useful as a proper
 *   AST cache _stricto sensu_.
 *
 * The [jmespath](https://www.npmjs.com/package/jmespath)
 * library is dynamically loaded when constructing its corresponding
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}.
 * If not previously installed, an
 * [AdapterError]{@link module:jm2mp/errors.AdapterError} exception will
 * be raised from
 * [createJmesPathAdapter]{@link module:jm2mp/adapters/jsonpath.createJmesPathAdapter}
 * with a clear message about it.
 * 
 * @see [JMESPath (external)]{@link external:JMESPath}
**/

/**
 * @external JMESPath
 * @description
 * **jmespath.js** is a JavaScript implementation of **JMESPath**, which
 * is a query language for JSON. It will take a JSON document and
 * transform it into another JSON document through a JMESPath
 * expression.
 *
 * The module {@link module:jm2mp/adapters/jmespath} implements the
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * interface to use **JMESPath** as part of `JM2MP`
 * _projection documents_.
 *
 * @see {@link https://jmespath.org/}
 * @see {@link https://www.npmjs.com/package/jmespath}
 * @see {@link https://github.com/jmespath/jmespath.js}
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
 * [jmespath](https://www.npmjs.com/package/jmespath) version **0.16.x**.
 * @returns {Promise<module:jm2mp/adapters/registry.QueryAdapter>}
 */
export async function createJmesPathAdapter()
{
  // Trying to load JMESPath external library.
  let jmespath;
  try {
    const mod = await import("jmespath");
    jmespath = mod.default ?? mod;
    if ( (typeof jmespath.search !== "function") ||
         (typeof jmespath.compile !== "function") ) {
      throw new Error("Functions 'search' and 'compile' must be part of 'jmespath' library.");
    }
  } catch (cause) {
    throw new AdapterError(
      "Unable to load 'jmespath 0.16.x' external library. " +
      "To install it, please use: `npm install jmespath@0.16` .",
      { cause }
    );
  }

  /** @type {@link module:jm2mp/adapters/registry.QueryAdapter} */
  return {
    name: "jmespath",
    description:
      "JMESPath 0.16.x query adapter.",

    /**
     * @description
     * It validates a JMESPath expression, trying to compile it.
     */
    async validate(path) {
      if (typeof path !== "string" || path.length === 0) {
        throw new ValidationError(
          `JMESPath: $path must be a non-empty string, instead of '${typeof path}'.`
        );
      }
      try {
        jmespath.compile(path);
      } catch (cause) {
        throw new ValidationError(
          `Invalid JMESPath expression: "${path}".`,
          { cause }
        );
      }
    },

    /**
     * @description
     * It evaluates a JMESPath expression, trying to standardize the
     * outcome in accordance with the interface
     * {@link module:jm2mp/adapters/registry.QueryAdapter}.
     * 
     * The `JMESPath` library operates synchronously; `JM2MP.JS` wraps
     * the signature in `async` to comply with the uniform registry
     * contract (just like the rest of adapters).
     * 
     * The `env` parameter is ignored: `JMESPath` does not support
     * lexical _aliases_ and does not distinguish between roots and
     * contexts, other than just the input; so the expression is always
     * evaluated against `input`.
    **/
    /* eslint-disable-next-line no-unused-vars -- _env */
    async evaluate(path, input, cache, _env) {
      // NULL absorptive propagation.
      if (input === null || input === undefined) return null;
      // It validates using `compile`, and cache is just used to know
      // if an expression is already valid (to validate it just once).
      // Function `jmespath.search` always re-parses again internally,
      // so no AST-caching is performed.
      if (!cache.has(path)) {
        try {
          jmespath.compile(path);
          cache.set(path, true);
        } catch (cause) {
          throw new EvaluationError(
            `Error during JMESPath expressions evaluation for "${path}".`,
            { cause }
          );
        }
      }

      // Actual query execution.
      let result;
      try {
        result = jmespath.search(input, path);
      } catch (cause) {
        // Kind of runtime errors: type mismatch inside built-in
        // functions, division by zero, etc...
        throw new EvaluationError(
          `Error evaluating JMESPath expression "${path}".`,
          { cause }
        );
      }

      // JMESPath natively returns `null` to indicate an absence of
      // result, which is consistent with the `native adapter`
      // convention. We defensively convert `undefined` to `null`,
      // because the library must not return `undefined`.
      return (result === undefined ? null : result);
    },

    /**
     * @type {@link module:jm2mp/adapters/registry.FallbackPolicyObject}
     * @description
     * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
     * behavior policy for edge cases in `JMESPath`. Note the documented
     * divergence in `multipleMatches` from the native adapter's
     * "single match --> scalar" convention.
    **/
    fallbackPolicy: {
      missing:
        "null (JMESPath default behavior)",
      multipleMatches:
        "array (as-is; JMESPath always returns arrays, even on single values results it never wraps)",
      singleMatch:
        "scalar (for single access expressions), and " +
        "array (for multiselect expressions)",
      typeError:
        "EvaluationError (wrapping errors)",
      nullInput:
        "null (without invoking external library)",
      timeout:
        "0 (not async)"
    },
  };
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/adapters/jmespath.js                  */
