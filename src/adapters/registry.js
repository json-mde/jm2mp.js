/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The module [Registry]{@link module:jm2mp/adapters/registry} declares
 * the [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * interface to implement by any external _query language_ as part of
 * `JM2MP` _projection documents_, which needs to be registered using
 * an instance of the
 * [AdapterRegistry]{@link module:jm2mp/adapters/registry.AdapterRegistry}
 * class.
**/

/* ------------------------------------------------------------------ */

/**
 * @module jm2mp/adapters/registry
 * @description
 * This module declares the
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * interface to implement by any external _query language_ as part of
 * `JM2MP` _projection documents_, which needs to be registered using
 * an instance of the
 * [AdapterRegistry]{@link module:jm2mp/adapters/registry.AdapterRegistry}
 * class.
 *
 * This module serves as a central registry for _query language_
 * external adapters (like `JMESPath` or `JSONPath`, to name a few).
 * After an external adapters is registered, its offered syntax can be
 * used as part of any `JM2MP` _projection module_ through the `$get`
 * _template command_.
 *
 * To standardize any potential _adapters_, an **asynchronous**
 * execution mechanism has been chosen.
 *
 * The `evaluate` function will always return a `Promise<any>`.
 * This way, _adapters_ that are internally synchronous can simply
 * return `Promise.resolve(value)` implicitly, since they are declared
 * as `async`. This unifies the interface and avoids ambiguities in the evaluator.
 *
 * The fact is that, for now, the `JSONata@2.x` library is the only
 * asynchronous one. However, it is expected that in the future, as
 * asynchronous programming in JavaScript becomes more popular, the
 * number of external libraries that benefit from this design will
 * grow.
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

import { AdapterError } from "../errors.js";

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @typedef {object} FallbackPolicyObject
 * @memberof module:jm2mp/adapters/registry
 * @description
 * FallbackPolicyObject
 * A descriptive object with human-readable documentation of the
 * adapter's behavior.
 * @property {!string} missing
 * How a missing value from each query is returned.
 * @property {!string} singleMatch
 * How a single matched value from each query is returned.
 * @property {!string} multipleMatches
 * How multiple matched values from each query are returned.
 * @property {!string} typeError
 * How type errors from each query are catched and maybe raised.
 * @property {!string} nullInput
 * How a null input (execution environment) is treated.
 * @property {!string} timeout
 * Is there any timeout to configure? Currenctly only affects to
 * `JSONata@2.x` adapter, due its _async_ internal implementation.
**/

/* ------------------------------------------------------------------ */

/**
 * @typedef {Function} ValidateFunction
 * @memberof module:jm2mp/adapters/registry
 * @description
 * typedef {(path: any) => Promise<void>} ValidateFunction
 * @property {ValidateFunction} validate
 * It validates a `$path` expression statically (_template command_
 * `get`).
 * 
 * It throws a `ValidationError` if it is invalid.
 * 
 * It is _asynchronous_ to accommodate adapters whose parser is
 * _asynchronous_.
**/

/* ------------------------------------------------------------------ */

/**
 * @typedef {Function} EvaluateFunction
 * @memberof module:jm2mp/adapters/registry
 * @description
 * typedef {(path: any, input: any, cache: Map<string, any>, env: object) => Promise<any>} EvaluateFunction
 * @property {EvaluateFunction} evaluate
 * It evaluates the expression on the provided `input`.
 *
 * It must be always `async`.
 *
 * Every adapter must guarantee satisfaction of (uniform contract):
 * - If input is null, returns null without invoking the underlying
 *   library.
 * - If the expression returns no result or undefined, it returns null.
 * - If the expression returns a single scalar, it returns that scalar
 *   not wrapped in an array.
 * - If the expression returns multiple matches, it returns an array
 *   wrapping all maches.
 * - Library errors are wrapped in `EvaluationError` or
 *   `ValidationError`, as appropriate.
 *
 * The `cache` parameter is a `Map` provided by the system to store
 * compiled expressions during the current evaluation.
 *
 * The `env` parameter is the complete language environment.
 * The native adapter needs it to resolve `$` or `@` or `%alias`;
 * the rest of adapters ignore it.
 *
 * @property {FallbackPolicyObject} fallbackPolicy
 * Human-readable documentation of the adapter's behavior.
 * 
 * Required fields: `missing`, `multipleMatches`, `typeError`, and
 * `nullInput`.
**/

/* ------------------------------------------------------------------ */

/**
 * @typedef {object} QueryAdapter
 * @memberof module:jm2mp/adapters/registry
 * @description
 * Interface (contract) that every _query language_ **adapter** must
 * implement.
 * @property {string} name
 * Unique syntax identifier.
 * 
 * It is used in the `$syntax` clause of the `get` _templante command_.
 * @property {string} description
 * Shrot description for documenting purposes.
 * @property {ValidateFunction} validate
 * It validates (tests) the path expression.
 * @property {EvaluateFunction} evaluate
 * It evaluates (runs) the path expression.
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @description
 * The **registry of adapter**. It maintains a mapping between names
 * and adapters.
 * 
 * This class is **not** a _singleton_. Each instance is independent,
 * which allows for isolated testing and different configurations
 * depending on the evaluation context.
**/
export class AdapterRegistry
{

/* ------------------------------------------------------------------ */

  /**
   * @constructor
   * @description
   * Default constructor for the
   * [AdapterRegistry]{@link module:jm2mp/adapters/registry.AdapterRegistry}
   * class.
  **/
  constructor()
  {
    /**
     * @type {Map<string, QueryAdapter>}
     * @description
     * Field to reference all registered
     * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}'s.
    **/
    this._adapters = new Map();
  }

/* ------------------------------------------------------------------ */

  /**
   * @description
   * It registers a new [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}.
   * @param {module:jm2mp/adapters/registry.QueryAdapter} adapter
   * The
   * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
   * to be registered.
   * @throws {module:jm2mp/errors.AdapterError}
   * It throws an [AdapterError]{@link module:jm2mp/errors.AdapterError}
   * if there is a previously registered
   * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
   * with the same `name`, and also if the specified `adapter`
   * does not comply with the required interface (contract).
  **/
  register(adapter)
  {
    // It validates the adapter's interface (contract).
    if (!adapter || typeof adapter !== "object") {
      throw new AdapterError("All adapters must be object.");
    }
    else if (typeof adapter.name !== "string" || adapter.name.length === 0) {
      throw new AdapterError("All adapters require a 'name' property which must be non empty.");
    }
    else if (typeof adapter.evaluate !== "function") {
      throw new AdapterError(
        `This "${adapter.name}" adapter does not implement an 'evaluate' function.`
      );
    }
    else if (typeof adapter.validate !== "function") {
      throw new AdapterError(
        `This "${adapter.name}" adapter does not implement a 'validate' function.`
      );
    }
    else if (this._adapters.has(adapter.name)) {
      throw new AdapterError(
        `This registry already contains a previously registered adapter with same name "${adapter.name}".`
      );
    }
    // The specified adapter is saved into this registry.
    else {
      this._adapters.set(adapter.name, adapter);
    }
  }

/* ------------------------------------------------------------------ */

  /**
   * @description
   * It gets a previously registered
   * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
   * by its name; otherwise, an
   * [AdapterError]{@link module:jm2mp/errors.AdapterError} is raised,
   * informing the list of available adapters' names.
   * @param {string} name
   * The name of the
   * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
   * being searched for.
   * @returns {QueryAdapter}
   * Previously registered
   * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter};
   * otherwise, an [AdapterError]{@link module:jm2mp/errors.AdapterError}
   * exception will be raised.
   * @throws {module:jm2mp/errors.AdapterError}
   * Whenever no
   * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
   * with `name` were previously registered in this
   * [AdapterRegistry]{@link module:jm2mp/adapters/registry.AdapterRegistry}
   * instance.
  **/
  get(name)
  {
    const adapter = this._adapters.get(name);
    if (!adapter) {
      throw new AdapterError(
        `There is no adapter registered under the name "${name}. "` +
        `The available adapters are: "${[...this._adapters.keys()].join(", ") || "(none)"}."`
      );
    }
    return adapter;
  }

/* ------------------------------------------------------------------ */

  /**
   * @description
   * It tests if a
   * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
   * has been registered with such 'name' in this
   * [AdapterRegistry]{@link module:jm2mp/adapters/registry.AdapterRegistry}
   * instance.
   * @param {string} name
   * The name of the
   * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
   * being searched for.
   * @returns {boolean}
   * `true` whenever a registered
   * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
   * with such 'name' is found in this
   * [AdapterRegistry]{@link module:jm2mp/adapters/registry.AdapterRegistry};
   * `false` otherwise.
  **/
  has(name)
  {
    return this._adapters.has(name);
  }

/* ------------------------------------------------------------------ */

  /**
   * @description
   * It returns a list with the 'name's of all previously registered
   * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}s.
   * @returns {string[]}
   * An _array of strings_ with the 'name's of all
   * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
   * registered in this
   * [AdapterRegistry]{@link module:jm2mp/adapters/registry.AdapterRegistry}
   * instance; if no
   * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
   * has been registered, an **empty array** will be returned.
  **/
  names()
  {
    return [...this._adapters.keys()];
  }

/* ------------------------------------------------------------------ */

}  // export class AdapterRegistry

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/adapters/registry.js                  */
