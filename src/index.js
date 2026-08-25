/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The module [index]{@link module:jm2mp/index} implements the
 * high level API process of the _projection language_ JM2MP.
**/

/**
 * @module jm2mp/index
 * @description
 * This module implements the **evaluation process** of the _projection
 * language_ `JM2MP` and exposes it as a public API.
 * 
 * It exports:
 *
 * - Hierarchy of errors.
 *
 * - Pipeline: resolve, normalizeModule, validateModule, evaluate.
 *
 * - Loaders: string, file, and URL.
 *
 * - Query adapters: interfaces/contracts, individual factories, and
 *   registry's factory.
 *
 * - High level functionality:
 *   [project]{@link module:jm2mp/index.project}
 *   links all stages.
 * 
 *   The `native`
 *   [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 *   is always available; the external references (`jsonpath`,
 *   `jsonata`, `jsonquery`, `jsonpointer`, and `jmespath`) are
 *   [dynamically loaded]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import}
 *   on demand.
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/***
 ** Exporting the hierarchy of errors.
***/
export {
  ProjectionError,
  ParseError,
  ResolutionError,
  ValidationError,
  EvaluationError,
  AdapterError,
} from "./errors.js";

/***
 ** Exporting the projection pipeline.
***/
export { resolve, DEFAULT_MAX_MODULES } from "./modules/resolver.js";
export { validateModule } from "./validator.js";
export { evaluate, DEFAULT_MAX_DEPTH } from "./evaluator.js";
export { normalizeModule } from "./modules/normalizer.js";

/***
 ** Exporting query adapters and its registry.
***/
export { AdapterRegistry } from "./adapters/registry.js";
//// export { createNativeRegistry } from './adapters/helpers.js';
export { createNativeAdapter } from "./adapters/native.js";
export { createJsonPathAdapter } from "./adapters/jsonpath.js";
export { createJsonataAdapter } from "./adapters/jsonata.js";
export { createJsonQueryAdapter } from "./adapters/jsonquery.js";
export { createJsonPointerAdapter } from "./adapters/jsonpointer.js";
export { createJmesPathAdapter } from "./adapters/jmespath.js";

/***
 ** Exports loaders for modularization.
***/
export {
  createStringLoader,
  createFileLoader,
  createUrlLoader,
} from "./modules/loaders.js";

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/***
 ** Internal imports for high level API.
***/
import { resolve as _resolve } from "./modules/resolver.js";
import { validateModule as _validate } from "./validator.js";
import { evaluate as _evaluate } from "./evaluator.js";
import { AdapterRegistry } from "./adapters/registry.js";
import { createNativeAdapter } from "./adapters/native.js";

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @description
 * It creates an
 * [adapter registry]{@link module:jm2mp/adapters/registry.AdapterRegistry}
 * with the
 * [query adapters]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * specified by the caller.
 * 
 * The `native` _query adapter_ is **always** included automatically;
 * it requires no external dependencies.
 * 
 * It combines two ways to add adapters:
 * 
 * 1. Adapters predefined by the library: these are enabled using
 *    Boolean flags in the `defaultAdaptersToLoad` parameter. Their
 *    libraries are dynamically imported when enabled, so the cost is
 *    zero if they are not used.
 * 
 * 2. Custom adapters: these are passed as rest arguments after the
 *    first parameter; each one can be a pre-constructed
 *    [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 *    instance object or a _factory function_ (synchronous or
 *    asynchronous) that returns an actual
 *    [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 *    instance.
 *
 * @example
 * // native only:
 * const r1 = await createAdapterRegistry();
 *
 * // Native + JSONata (with timeout):
 * const r2 = await createAdapterRegistry({
 *   jsonata: true,
 *   jsonataOptions: { timeout: 5000 }
 * });
 *
 * // Native + JSONPath + JSON Pointer + JMESPath:
 * const r3 = await createAdapterRegistry({
 *   jsonpath: true,
 *   jsonpointer: true,
 *   jmespath: true,
 * });
 *
 *  // Native + another customized adapter:
 * const myAdapter = await createAnotherAdapter();
 * const r4 = await createAdapterRegistry({}, myAdapter);
 *
 * @param {object} [defaultAdaptersToLoad]
 * @param {boolean} [defaultAdaptersToLoad.jsonpath=false]
 * It registers the intention to use the `JSONPath` _query language_
 * (and imports the `jsonpath-plus` package).
 * @param {boolean} [defaultAdaptersToLoad.jsonata=false]
 * It registers the intention to use the `JSONata` _query language_
 * (and imports the `jsonata` package).
 * @param {object}  [defaultAdaptersToLoad.jsonataOptions]
 * It configures the options for `createJsonataAdapter` (timeout, ...).
 * @param {boolean} [defaultAdaptersToLoad.jsonquery=false]
 * It registers the intention to use the `JSON Query` _query language_
 * (and imports the `@jsonquerylang/jsonquery` package).
 * @param {boolean} [defaultAdaptersToLoad.jsonpointer=false]
 * It registers the intention to use the `JSON Pointer / RFC 6901`
 * _query language_ (and imports the `json-pointer` package).
 * @param {boolean} [defaultAdaptersToLoad.jmespath=false]
 * It registers the intention to use the `JMESPath` _query language_
 * (and imports the `jmespath` package).
 * @param {...(QueryAdapter | Function)} otherAdaptersToLoad
 * It registers the intention to use additional
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}s,
 * allowing both _factory functions_ or already created objects.
 * @returns {Promise<AdapterRegistry>}
 * It returns a new configure
 * [AdapterRegistry]{@link module:jm2mp/adapters/registry.AdapterRegistry}.
 * @throws {module:jm2mp/errors.AdapterError}
 * Whenever a package cannot be imported.
 */
export async function createAdapterRegistry(
                                            defaultAdaptersToLoad = {},
                                            ...otherAdaptersToLoad )
{
  // It creates the new registry for query adapters...
  const registry = new AdapterRegistry();
  // ...always considering the native syntax.
  registry.register(createNativeAdapter());

  // Predefined adapters: dynamic loading using import.
  // External package is only required if corresponding
  // flag is activated.
  if (defaultAdaptersToLoad.jsonpath)
  {
    const { createJsonPathAdapter } = await import("./adapters/jsonpath.js");
    registry.register(await createJsonPathAdapter());
  }
  if (defaultAdaptersToLoad.jsonata)
  {
    const { createJsonataAdapter } = await import("./adapters/jsonata.js");
    registry.register(
      await createJsonataAdapter(defaultAdaptersToLoad.jsonataOptions)
    );
  }
  if (defaultAdaptersToLoad.jsonquery)
  {
    const { createJsonQueryAdapter } = await import("./adapters/jsonquery.js");
    registry.register(await createJsonQueryAdapter());
  }
  if (defaultAdaptersToLoad.jsonpointer)
  {
    const { createJsonPointerAdapter } = await import("./adapters/jsonpointer.js");
    registry.register(await createJsonPointerAdapter());
  }
  if (defaultAdaptersToLoad.jmespath)
  {
    const { createJmesPathAdapter } = await import("./adapters/jmespath.js");
    registry.register(await createJmesPathAdapter());
  }

  // Other customized adapters (rest parameters).
  // It supports both: sync/async factory objects
  // and literal objects.
  for (const item of otherAdaptersToLoad)
  {
    const adapter = (
      ((typeof item) === "function")
      ? (await item())
      : item
    );
    registry.register(adapter);
  }

  // It returns the just created result.
  return registry;
}

/* ------------------------------------------------------------------ */

/**
 * @typedef {Function} AsyncLoaderFunction
 * @description
 * typedef {(name: string) => Promise<object>} AsyncLoaderFunction
**/

/* ------------------------------------------------------------------ */

/**
 * @description
 * The high level convenience function: resolves, validates, and
 * evaluates.
 * 
 * It chains the three stages together in a safe order.
 * 
 * This is the recommended approach for standard usage.
 *
 * @param {object} params
 * @param {string} params.rootName
 * The name for the root _projection module_.
 * @param {AsyncLoaderFunction} params.loader
 * The loader of _projection modules_.
 * @param {*} params.document
 * The _source JSON document_ to project (transform).
 * @param {AdapterRegistry} [params.registry]
 * Si se omite, se crea uno con sólo el adaptador nativo.
 * @param {object} [params.options]
 * @param {number} [params.options.maxDepth=1000]
 * Maximum logical depth (to avoid infinite recursion, for example).
 * @param {number} [params.options.maxModules=1000]
 * Maximum number of loaded _projection modules_.
 * @returns {Promise<*>}
 * The _resultant JSON document_ obtained.
 */
export async function project({ rootName, loader, document, registry, options = {} })
{
  // When no registry is specified, a native-only wull be created.
  const actualRegistry = ( registry ?? (await createAdapterRegistry()));
  // Stage 1/3: resolve and normalize modules.
  const resolvedModule = await _resolve(rootName, loader, {
    maxModules: options.maxModules,
  });
  // Stage 2/3: validate the final module.
  await _validate(resolvedModule, actualRegistry);
  // Stage 3/3: evaluate the projection over the source.
  return await _evaluate(resolvedModule, document, {
    registry: actualRegistry,
    maxDepth: options.maxDepth,
  });
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/index.js                              */
