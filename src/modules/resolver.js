/**
 * @file Resolución de módulos: carga, detección de ciclos, normalización
 * por módulo, fusión por importación.
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
 */

import { ResolutionError } from "../errors.js";
import { normalizeModule } from "./normalizer.js";

/** Valor por defecto para maxModules. */
const DEFAULT_MAX_MODULES = 1000;

/**
 * Importa un módulo m2 sobre un módulo acumulado m1.
 *
 * Las claves de plantillas de m2 sobrescriben las de m1.
 * Las claves $options y $schema (metadata del módulo) se descartan
 * del resultado: el módulo final solo contiene plantillas.
 *
 * @param {object} m1 - Módulo acumulado.
 * @param {object} m2 - Módulo nuevo a importar.
 * @returns {object} Módulo resultante.
 */
function importInto(m1, m2) {
  // Construimos un nuevo objeto con todas las plantillas de m1.
  const result = { ...m1 };
  // Para cada clave de m2 que no sea metadata, la copiamos al resultado, sobrescribiendo.
  for (const key of Object.keys(m2)) {
    if (key === "$options" || key === "$schema") continue;
    result[key] = m2[key];
  }
  // Aseguramos que las claves de metadata no queden en el resultado, incluso si venían de m1.
  delete result.$options;
  delete result.$schema;
  return result;
}

/**
 * Resuelve un módulo a partir de su nombre raíz, usando un loader inyectado.
 *
 * @param {string} rootName - Nombre del módulo raíz.
 * @param {(name: string) => Promise<object>} loader - Función que carga
 *   un módulo por nombre. El loader recibe el nombre ORIGINAL (no normalizado)
 *   tal y como apareció en $depends-on.
 * @param {object} [options]
 * @param {number} [options.maxModules=1000] - Límite máximo de módulos
 *   únicos cargables en esta resolución. Protege contra cadenas de
 *   dependencias accidentalmente o maliciosamente largas.
 * @returns {Promise<object>} Módulo final resuelto y normalizado.
 * @throws {ResolutionError} Si hay ciclos, módulos no cargables, o falta plantilla raíz.
 */
export async function resolve(rootName, loader, options = {}) {
  const maxModules = options.maxModules ?? DEFAULT_MAX_MODULES;

  // Cache de módulos cargados (clave normalizada a minúsculas).
  const loadedCache = new Map();

  // Conjuntos para detectar ciclos y evitar reprocesar (claves normalizadas).
  const visiting = new Set();
  const visited = new Set();

  // Acumulador del módulo final.
  let result = {};

  /**
   * Carga un módulo a través del loader, con cache, y lo normaliza inmediatamente.
   *
   * @param {string} name - Nombre tal como aparece en $depends-on (sin normalizar).
   * @returns {Promise<object>}
   */
  async function load(name) {
    const cacheKey = name.toLowerCase();
    // Si ya está en cache, devolver directamente.
    if (loadedCache.has(cacheKey)) {
      return loadedCache.get(cacheKey);
    }

    // Comprobamos el límite de módulos ANTES de cargar.
    if (loadedCache.size >= maxModules) {
      throw new ResolutionError(
        `Se ha excedido el límite de módulos cargables (maxModules=${maxModules}). ` +
        `Esta protección evita cadenas de dependencias excesivamente largas.`
      );
    }

    let mod;
    try {
      mod = await loader(name);
    } catch (cause) {
      throw new ResolutionError(
        `No se pudo cargar el módulo "${name}".`,
        { cause }
      );
    }
    // Comprobamos que sea un objeto.
    if (typeof mod !== "object" || mod === null || Array.isArray(mod)) {
      throw new ResolutionError(
        `El módulo "${name}" no es un objeto JSON válido.`
      );
    }

    // NORMALIZACIÓN POR MÓDULO: añadimos $syntax a los $get que lo omitan,
    // según el $default-query-language declarado en ESTE módulo.
    const normalized = normalizeModule(mod);

    // Guardamos en cache y devolvemos.
    loadedCache.set(cacheKey, normalized);
    return normalized;
  }

  /**
   * Visita recursivamente un módulo y sus dependencias.
   *
   * @param {string} name
   */
  async function visit(name) {
    const normalized = name.toLowerCase();

    // Detección de ciclos: si lo estamos visitando ahora, hay ciclo.
    if (visiting.has(normalized)) {
      throw new ResolutionError(
        `Ciclo de importación detectado en "${name}".`
      );
    }
    // Si ya lo procesamos completamente, lo omitimos.
    if (visited.has(normalized)) {
      return;
    }

    // Marcamos como "en visita".
    visiting.add(normalized);

    // Cargamos el módulo (con cache).
    const mod = await load(name);

    // Extraemos la lista de dependencias de $options.$depends-on, si existe.
    const opts = mod.$options;
    const deps = (opts && Array.isArray(opts["$depends-on"]))
      ? opts["$depends-on"]
      : [];

    // Validamos que las entradas sean strings no vacíos.
    for (const dep of deps) {
      if (typeof dep !== "string" || dep.length === 0) {
        throw new ResolutionError(
          `$depends-on en "${name}" contiene una entrada inválida (debe ser string no vacío).`
        );
      }
    }

    // Visitamos las dependencias en orden de izquierda a derecha.
    for (const dep of deps) {
      await visit(dep);
    }

    // Tras procesar dependencias, importamos el propio módulo sobre el acumulado.
    result = importInto(result, mod);

    // Marcamos como visitado y desmarcamos como "en visita".
    visiting.delete(normalized);
    visited.add(normalized);
  }

  // Iniciamos la resolución desde la raíz.
  await visit(rootName);

  // Validamos que el módulo final tenga la plantilla raíz "@".
  if (!Object.hasOwn(result, "@")) {
    throw new ResolutionError(
      'El módulo final tras la resolución no contiene la plantilla raíz "@".'
    );
  }

  return result;
}
