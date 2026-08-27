/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The file `resolver.js` contains the module
 * [normaresolverlizer]{@link module:jm2mp/modules/resolver}, which
 * implements the standardization process over the `JM2MP` _projection modules_
 * content in the stage of resolution, before it will be evaluated.
**/

/**
 * @module module:jm2mp/modules/resolver
 * @description
 * Resolución de módulos: carga, detección de ciclos, normalización por
 * módulo, fusión por importación.
 * 
 * PROTECCIÓN CONTRA CARGA EXCESIVA:
 *  - Detección de ciclos (DFS con conjunto 'visiting').
 *  - Cache de módulos ya cargados (clave normalizada a minúsculas).
 *  - Parámetro `maxModules` que limita el número total de módulos
 *    cargables en una resolución (protección contra DoS y errores
 *    de configuración).
 *
 * NORMALIZACIÓN DE LA CACHÉ DE MÓDULOS:
 * La caché interna usa el nombre del módulo en MINÚSCULAS como clave,
 * para evitar duplicación accidental por diferencias de mayúsculas.
 * El loader, sin embargo, recibe siempre el nombre ORIGINAL tal y como
 * apareció en $depends-on (no normalizado), para que loaders sensibles
 * a mayúsculas (como sistemas de ficheros UNIX) funcionen correctamente
 * en la primera carga. Si dos referencias difieren solo en mayúsculas,
 * la primera carga sí ocurre con su forma original; las siguientes
 * usan la caché.
 *
 * NORMALIZACIÓN POR MÓDULO:
 * Tras cargar cada módulo, se normaliza (se añade $syntax a los $get que
 * lo omitan) según el $default-query-language de ESE módulo, ANTES de fusionar.
 * Esto preserva la sintaxis original de cada plantilla incluso al combinar
 * módulos con sintaxis distintas.
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

import { ResolutionError } from "../errors.js";
import { isModule, ROOT_TEMPLATE_NAME } from "./helpers.js";
import { normalizeModule, MODULE_METADATA_KEYS } from "./normalizer.js";

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @constant {integer}
 * @description
 * Default value for `maxModules`: `1000`.
**/
export const DEFAULT_MAX_MODULES = 1000;

/* ------------------------------------------------------------------ */

/**
 * @description
 * It imports an `m2` _projection module_ into the accumulated
 * `m1` _projection module.
 *
 * All keys from `m2` overwrites keys from `m1`.
 * 
 * All meta-data properties ($options and $schema) are discarded
 * from the resultant module, so only named templates are preserved.
 * @param {object} dependencies
 * The _accumulated module_ (lower dependency, to the leafs).
 * @param {object} dependant
 * The new _module_ to import (higher dependency, to the root).
 * @returns {object}
 * Resultant _projection module_ with only _named templates_ and
 * no meta-data.
**/
function importInto(dependencies, dependant)
{
  // It combines both modules, with right-to-left precedence.
  const result = { ...dependencies, ...dependant };
  // It ensures that meta-data keys are deleted.
  MODULE_METADATA_KEYS.forEach( (key) => { delete result[key] ; } ) ;
  // It returns the (just created) combined module.
  return result;
}

/* ------------------------------------------------------------------ */

/**
 * *typedef {(name: string) => Promise<object>} LoaderFunction
 * @typedef {Function} LoaderFunction
**/

/* ------------------------------------------------------------------ */

/**
 * @description
 * It resolves a _projection module_ since its root name using `loader`.
 * @param {string} rootName
 * The name of the root _projection module_.
 * @param {LoaderFunction} loader
 * The function that loads a module by its name.
 * The loader receives the original (not normalized) name, as declared
 * in `$.$options.$depends-on` (path) clause.
 * @param {object} [options]
 * An optional configuration object.
 * @param {number} [options.maxModules=1000]
 * Maximum number of unique _projection modules_ that must be loaded by
 * `loader` in this resolution stage (threshold).
 *
 * Its purpose is to protect against extremely long dependency chains,
 * whether accidental or malicious.
 * @returns {Promise<object>}
 * The final resultant _projection module_ already normalized and
 * resolved.
 * @throws {ResolutionError}
 * Whenever a cycle, not loadable modules or undefined root template
 * is found during this resolution stage.
**/
export async function resolve(rootName, loader, options = {})
{
  // Maximum loadable modules (threshold).
  const maxModules = options.maxModules ?? DEFAULT_MAX_MODULES;
  // Loaded modules cache (with names normalized to lowercase).
  const loadedCache = new Map();
  // Sets used to detect cycles and avoid reprocess several times
  // the same module (with name normalized to lowercase).
  const visiting = new Set();
  const visited = new Set();
  // The resultant module.
  let result = {};
  // It starts resolution from the root module.
  await visit(rootName);
  // It validates that the final resultant projection document
  // must contain the root template.
  if (!Object.hasOwn(result, ROOT_TEMPLATE_NAME))
  {
    throw new ResolutionError(
      `resolve: the projection document must contain the root template ` +
      `'${ROOT_TEMPLATE_NAME}', but '${rootName}' does not contain it.`
    );
  }
  return result;

  /**
   * @description
   * Carga un módulo a través del loader, con cache, y lo normaliza inmediatamente.
   * @param {string} name
   * Nombre tal como aparece en $depends-on (sin normalizar).
   * @returns {Promise<object>}
   * .
   * @throws {ResolutionError}
   * - Whenever module `name` cannot be loaded.
   * - Whenever ...
   */
  async function load(name)
  {
    // The resultant module.
    let load_result ;
    // It normalizes the module's name.
    // Must, can or should all names be normalized to, for example, lowercase?
    // This could cause conflicts when the only distinctions are: uppercase, lowercase, and accents.
    // Some file systems distinguish between uppercase and lowercase letters; others do not.
    // What about URLs?
    // What about plain text?
    //// const cacheKey = name;
    const cacheKey = name.toLowerCase();
    // It tests if the module is cached.
    if (loadedCache.has(cacheKey))
    {
      load_result = loadedCache.get(cacheKey);
    }
    // It tests the threshold before loading any other dependency (module).
    else if (loadedCache.size >= maxModules)
    {
      throw new ResolutionError(
        `resolver~load: loaded modules threshold exceeded (maxModules='${maxModules}').`
      );
    }
    else
    {
      // It tries to load the dependency (module).
      let loaded_module;
      try
      {
        loaded_module = await loader(name);
      }
      catch (cause)
      {
        throw new ResolutionError(
          `resolver~load: unable to load module '${name}'.`,
          { cause }
        );
      }
      // It tests if the loaded modules is a valid one.
      if ( ! isModule(loaded_module) )
      {
        throw new ResolutionError(
          `resolver~load: named value '${name}' is not a valid module.`
        );
      }
      else
      {
        // It normalizes every loaded module (get.$syntax vs $default-query-language).
        load_result = normalizeModule(loaded_module);
        // It saves the normalized version of each module in the cache.
        loadedCache.set(cacheKey, load_result);
      }
    }
    // It returns the result.
    return load_result;
  }

  /**
   * @description
   * It traverses the dependency tree, visiting recursively every module
   * and all its dependencies.
   * @param {string} name
   * The `name` of the _projection module_.
  **/
  async function visit(name)
  {
    // It normalizes its module's name.
    const normalized_name = name.toLowerCase();
    // It detects cycles in the dependency tree.
    if (visiting.has(normalized_name))
    {
      throw new ResolutionError(
        `resolver~visit: dependency cycle detected on '${name}'.`
      );
    }
    // If already processed, this module is just ommited...
    if (visited.has(normalized_name))
    {
      return;
    }
    // ...otherwise, it is marked as "visiting".
    visiting.add(normalized_name);
    // Then, it loads the module (using the cache) that we are visiting right now.
    const visiting_module = await load(name);
    // It detects the declaration of the full list of dependencies
    // ($.$options.$depends-on) and extracts them.
    const opts = visiting_module.$options;
    const deps = (opts && Array.isArray(opts["$depends-on"]))
                  ? opts["$depends-on"]
                  : [];
    // It validates every dependency declared (as non-empty strings).
    for (const dep of deps)
    {
      if (typeof dep !== "string" || dep.length === 0)
      {
        throw new ResolutionError(
          `resolve~visit: invalid dependency in module '${name}'.`
        );
      }
    }
    // It visits every dependency in same declaration order (left to right).
    for (const dep of deps)
    {
      await visit(dep);
    }
    // After all the dependencies, the module itself is imported over its own
    // dependency (sub)tree, as root (with the highest priority for now).
    /*outer(resolver).*/result = importInto(result, visiting_module);
    // It marks this module as "visited", so unchecking it from "visiting".
    visiting.delete(normalized_name);
    visited.add(normalized_name);
  }

}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/modules/resolver.js                   */
