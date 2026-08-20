/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The module [native]{@link module:jm2mp/adapters/native} implements
 * the [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * interface to use `native` _query language_ part of the `JM2MP`
 * _syntax_.
**/

/**
 * @module jm2mp/adapters/native
 * @description
 * The module [native]{@link module:jm2mp/adapters/native} implements
 * the [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * interface to use `native` _query language_ part of the `JM2MP`
 * _syntax_.
 * 
 * By compliance with `JM2MP`, the
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * created by {@link module:jm2mp/adapters/native.createNativeAdapter}
 * is the reference for the expected behaviour that any other external
 * adapter must replicate.
 * 
 * Native query language offers two different but equivalent syntaxes:
 * - A **text string** path in compliance with native EBNF rules (e.g. "@.users[0].name").
 * - An **array** with literal accessors (e.g. ["users", 0, "name"]).
 *
 * It is **important** to note that, although this adapter is
 * synchronous internally (it does not involve I/O or async libraries),
 * its `evaluate` function is marked as `async` just to comply with the
 * registry's uniform contract. The overhead of wrapping it in
 * `Promise.resolve()` is negligible and is offset by architectural
 * consistency (because other adapters are async, all of them would be
 * async).
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

import { EvaluationError, ValidationError } from "../errors.js";
import { EXECUTION_ENVIRONMENT_FROM, parsePath, navigate } from "./native-paths.js";

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @description
 * Crea el adaptador para la sintaxis nativa.
 * @returns {module:jm2mp/adapters/registry.QueryAdapter}
 * The `QueryAdapter` for the [native query language]{@tutorial 03--nql-syntax}.
 */
export function createNativeAdapter()
{
  /**
   * @constant
   * @type {module:jm2mp/adapters/registry.QueryAdapter}
   * @description
   * The newly created
   * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
   * for the [native]{@link jm2mp/adapters/native} query language.
  **/
  const new_native_query_adapter = {
    name: "native",
    description: "Sintaxis nativa del lenguaje, con tres referencias contextuales: $ (raíz), @ (contexto), %alias.",

    /**
     * @description
     * It statically validates a native '$path'.
     * It accepts both syntaxes: text string (parsed using EBNF) and an
     * array of accesors (with every item be a string or natural number).
     * @param {string|Array<string|number>} path
     * The native path to validate.
     * @throws {ValidationError}
     * - Whenever {@link parsePath} throwns a ParseError, it is wrapped as `cause` into a new {@link ValidationError}.
     * - Whenever `path` were ill-formed.
     */
    async validate(path) {
      if ((typeof path) === "string") {
        try {
          parsePath(path);
        } catch (cause) {
          // It encapsulates the ParseError into a ValidationError just
          // during this validation stage.
          throw new ValidationError(
            `NATIVE: invalid string path: "${path}".`,
            { cause }
          );
        }
      }
      else if (Array.isArray(path)) {
        // Native array syntax only accepts strings and natural numbers.
        for (let i = 0; i < path.length; i++) {
          const step = path[i];
          const is_step_OK = (
            ((typeof step) === "string")
            ||
            (
              ((typeof step) === "number") &&
              Number.isInteger(step) &&
              (step >= 0)
            )
          );
          if (!is_step_OK) {
            throw new ValidationError(
              `NATIVE: invalid array path: step ${i} must be a string (property name) ` +
              `or a natural number (array index), but '(${(typeof step)})(${step})' was received.`
            );
          }
        }
      }
      else {
        throw new ValidationError(
          `NATIVE: invalid path received '${(typeof path)}'; must be a string or array.`
        );
      }
    },

    /**
     * @description
     * It evaluates a NATIVE expression, trying to standardize the
     * outcome in accordance with the interface
     * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}.
     *
     * The `native` query language operates synchronously; `JM2MP.JS`
     * wraps the signature in `async` to comply with the uniform registry
     * contract (just like the rest of adapters).
     * 
     * When `path` is an array, then it try to locate from `input`.
     * 
     * When `path` is a text string, it parses agains EBNF and then
     * try to resolve from the execution environment: '$' for document
     * root, '@' for current context, and '%' for aliases. In this case,
     * `from` clause is ignored because `path` already defines it own
     * starting point.
     *
     * @param {*} path
     * The path to evaluate.
     * @param {*} input
     * The input where evaluate 'path'.
     * @param {*} cache
     * The cache for native query expressions to test 'path'.
     * @param {*} env
     * The execution environment where evaluate 'path'.
    **/
    async evaluate(path, input, cache, env) {
      /** @type {*} */
      let result;
      // When path is an array, it is resolved directly from input.
      if (Array.isArray(path)) {
        if (input === null || input === undefined) return null;
        result = navigate(input, path);
      }
      // When path is a string, then it is parsed using cache and
      // resolved from the execution environment.
      else if (typeof path === "string") {
        // First stage: it caches the parsed path.
        let parsed = cache.get(path);
        if (!parsed) {
          try {
            parsed = parsePath(path);
          } catch (cause) {
            throw new EvaluationError(
              `NATIVE: invalid path during its evaluation: "${path}".`,
              { cause }
            );
          }
          cache.set(path, parsed);
        }
        // Second stage: it finds out the base for this path.
        // The string path defines its own execution context, so we ignore
        // `input` (which comes from the `$from` clause used mainly for
        // native array-based paths and other query languages without root
        // concept).
        let base;
        switch (parsed.kind)
        {
          case EXECUTION_ENVIRONMENT_FROM.ROOT:
          {
            base = env.root;
            break;
          }
          case EXECUTION_ENVIRONMENT_FROM.CTX:
          {
            base = env.ctx;
            break;
          }
          case EXECUTION_ENVIRONMENT_FROM.ALIAS:
          default:
          {
            if (Object.hasOwn(env.aliases, parsed.aliasName)) {
              base = env.aliases[parsed.aliasName];
              break;
            }
            else {
              throw new EvaluationError(
                `NATIVE: alias '%${parsed.aliasName}' is not found in scope.`
              );
            }
          }
        }
        // If base is undefined or null, then null is propagated.
        if ((base === undefined) || (base === null)) { result = null; }
        else { result = navigate(base, parsed.accessors); }
      }
      // Otherwise, it raises an exception.
      else {
        throw new EvaluationError(
          `NATIVE $path must be a string or an array instead of '${(typeof path)}'.`
        );
      }
      // It returns the result value located using path.
      return result;
    },

    /**
     * @property {@link module:jm2mp/adapters/registry.FallbackPolicyObject}
     * @description
     * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
     * behavior policy for edge cases in [native]{@link module:jm2mp/adapters/native}.
     * This policy is actually the _reference_ for the rest of adapters:
     * they must replicate this behavior.
    **/
    fallbackPolicy: {
      missing:
        "null",
      multipleMatches:
        "do not apply (native syntax never matches several values)",
      singleMatch:
        "scalar (as-is)",
      typeError:
        "null (null absorption during navigation; other cases will raise an EvaluationError exception)",
      nullInput:
        "null (without invoking any additional logic)",
    },
  };

  return new_native_query_adapter;

}  // export function createNativeAdapter //

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/adapters/native.js                    */
