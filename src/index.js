/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @module index
 * @file API pública del sistema de proyecciones.
 *
 * Exporta:
 *   - Jerarquía de errores.
 *   - Pipeline (resolve, normalizeModule, validateModule, evaluate).
 *   - Loaders (string, file, URL).
 *   - Adaptadores: contrato + factorías individuales + factoría de registro.
 *   - Función de alto nivel `project()` que encadena todas las fases.
 *
 * El adaptador nativo está disponible siempre; los foráneos (jsonpath,
 * jsonata, jsonquery, jsonpointer, jmespath) se cargan dinámicamente solo
 * al solicitarlos.
**/

// ----------------------------------------------------------------------------
// Errores.
// ----------------------------------------------------------------------------
export {
  ProjectionError,
  ParseError,
  ResolutionError,
  ValidationError,
  EvaluationError,
  AdapterError,
} from "./errors.js";

// ----------------------------------------------------------------------------
// Pipeline.
// ----------------------------------------------------------------------------
export { resolve } from "./modules/resolver.js";
export { validateModule } from "./validator.js";
export { evaluate } from "./evaluator.js";
export { normalizeModule } from "./modules/normalizer.js";

// ----------------------------------------------------------------------------
// Adaptadores: contrato y factorías individuales.
// ----------------------------------------------------------------------------
export { AdapterRegistry } from "./adapters/registry.js";
export { createNativeAdapter } from "./adapters/native.js";
export { createJsonPathAdapter } from "./adapters/jsonpath.js";
export { createJsonataAdapter } from "./adapters/jsonata.js";
export { createJsonQueryAdapter } from "./adapters/jsonquery.js";
export { createJsonPointerAdapter } from "./adapters/jsonpointer.js";
export { createJmesPathAdapter } from "./adapters/jmespath.js";

// ----------------------------------------------------------------------------
// Loaders.
// ----------------------------------------------------------------------------
export {
  createStringLoader,
  createFileLoader,
  createUrlLoader,
} from "./modules/loaders.js";

// ----------------------------------------------------------------------------
// Imports internos para las funciones de alto nivel.
// ----------------------------------------------------------------------------
import { resolve as _resolve } from "./modules/resolver.js";
import { validateModule as _validate } from "./validator.js";
import { evaluate as _evaluate } from "./evaluator.js";
import { AdapterRegistry } from "./adapters/registry.js";
import { createNativeAdapter } from "./adapters/native.js";


/**
 * Crea un registro con los adaptadores que el usuario indique.
 *
 * El adaptador nativo se incluye SIEMPRE de forma automática; no requiere
 * ninguna dependencia externa.
 *
 * Combina dos formas de añadir adaptadores:
 *
 *   1. Adaptadores predefinidos por la biblioteca:
 *        Se activan con flags booleanos en `defaultAdaptersToLoad`. Sus
 *        librerías se importan dinámicamente al activarse, así que el
 *        coste es cero si no se usan.
 *
 *   2. Adaptadores personalizados:
 *        Se pasan como argumentos rest después del primer parámetro.
 *        Cada uno puede ser un objeto QueryAdapter ya construido o una
 *        función (sync o async) que devuelve un QueryAdapter.
 *
 * @example
 *   // Solo nativo:
 *   const r1 = await createAdapterRegistry();
 *
 *   // Nativo + JSONata con timeout:
 *   const r2 = await createAdapterRegistry({
 *     jsonata: true,
 *     jsonataOptions: { timeout: 5000 }
 *   });
 *
 *   // Nativo + JSONPath + JSON Pointer + JMESPath:
 *   const r3 = await createAdapterRegistry({
 *     jsonpath: true,
 *     jsonpointer: true,
 *     jmespath: true,
 *   });
 *
 *   // Nativo + un adaptador personalizado:
 *   const myAdapter = await createMyXPathAdapter();
 *   const r4 = await createAdapterRegistry({}, myAdapter);
 *
 * @param {object} [defaultAdaptersToLoad]
 * @param {boolean} [defaultAdaptersToLoad.jsonpath=false]
 *   Registrar JSONPath (requiere `jsonpath-plus`).
 * @param {boolean} [defaultAdaptersToLoad.jsonata=false]
 *   Registrar JSONata (requiere `jsonata`).
 * @param {object}  [defaultAdaptersToLoad.jsonataOptions]
 *   Opciones para createJsonataAdapter (timeout, etc.).
 * @param {boolean} [defaultAdaptersToLoad.jsonquery=false]
 *   Registrar JSON Query (requiere `@jsonquerylang/jsonquery`).
 * @param {boolean} [defaultAdaptersToLoad.jsonpointer=false]
 *   Registrar JSON Pointer / RFC 6901 (requiere `json-pointer`).
 * @param {boolean} [defaultAdaptersToLoad.jmespath=false]
 *   Registrar JMESPath (requiere `jmespath`).
 * @param {...(QueryAdapter | Function)} otherAdaptersToLoad
 * *param {...(import("./adapters/registry.js").QueryAdapter | Function)} otherAdaptersToLoad
 *   Adaptadores adicionales: objetos ya construidos o funciones que los crean.
 * @returns {Promise<AdapterRegistry>}
 */
export async function createAdapterRegistry(
  defaultAdaptersToLoad = {},
  ...otherAdaptersToLoad
) {
  const registry = new AdapterRegistry();
  // El adaptador nativo siempre está disponible.
  registry.register(createNativeAdapter());

  // -------------------------------------------------------------------------
  // Adaptadores predefinidos. Cada uno se carga por import dinámico de modo
  // que la librería correspondiente solo se requiere si el flag se activa.
  // El orden está estabilizado por convención (legibilidad de los logs y
  // diagnósticos), no por dependencias semánticas.
  // -------------------------------------------------------------------------
  if (defaultAdaptersToLoad.jsonpath) {
    const { createJsonPathAdapter } = await import("./adapters/jsonpath.js");
    registry.register(await createJsonPathAdapter());
  }
  if (defaultAdaptersToLoad.jsonata) {
    const { createJsonataAdapter } = await import("./adapters/jsonata.js");
    registry.register(
      await createJsonataAdapter(defaultAdaptersToLoad.jsonataOptions)
    );
  }
  if (defaultAdaptersToLoad.jsonquery) {
    const { createJsonQueryAdapter } = await import("./adapters/jsonquery.js");
    registry.register(await createJsonQueryAdapter());
  }
  if (defaultAdaptersToLoad.jsonpointer) {
    const { createJsonPointerAdapter } = await import("./adapters/jsonpointer.js");
    registry.register(await createJsonPointerAdapter());
  }
  if (defaultAdaptersToLoad.jmespath) {
    const { createJmesPathAdapter } = await import("./adapters/jmespath.js");
    registry.register(await createJmesPathAdapter());
  }

  // -------------------------------------------------------------------------
  // Adaptadores personalizados (rest parameters). Soportan objetos ya
  // construidos y factorías sync/async.
  // -------------------------------------------------------------------------
  for (const item of otherAdaptersToLoad) {
    const adapter = typeof item === "function" ? await item() : item;
    registry.register(adapter);
  }

  return registry;
}

/**
 * *typedef {(name: string) => Promise<object>} AsyncLoaderFunction
 * @typedef {Function} AsyncLoaderFunction
 **/

/**
 * Función de conveniencia (NIVEL ALTO): resuelve, valida y evalúa.
 *
 * Encadena las tres fases en orden seguro. Es el camino recomendado
 * para uso normal.
 *
 * @param {object} params
 * @param {string} params.rootName - Nombre del módulo raíz.
 * @param {AsyncLoaderFunction} params.loader - Loader de módulos.
 * @param {*} params.document - Documento JSON de origen.
 * @param {AdapterRegistry} [params.registry] - Si se omite, se crea uno con
 *   solo el adaptador nativo.
 * @param {object} [params.options]
 * @param {number} [params.options.maxDepth=1000] - Profundidad lógica máxima.
 * @param {number} [params.options.maxModules=1000] - Límite de módulos.
 * @returns {Promise<*>}
 */
export async function project({ rootName, loader, document, registry, options = {} }) {
  // Si no hay registry, creamos uno con solo el nativo.
  const actualRegistry = registry ?? (await createAdapterRegistry());

  // Fase 1: resolver y normalizar el módulo.
  const resolvedModule = await _resolve(rootName, loader, {
    maxModules: options.maxModules,
  });
  // Fase 2: validar (es async porque adapter.validate es async).
  await _validate(resolvedModule, actualRegistry);
  // Fase 3: evaluar.
  return await _evaluate(resolvedModule, document, {
    registry: actualRegistry,
    maxDepth: options.maxDepth,
  });
}
