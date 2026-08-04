/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @module modules/loaders
 * @file Implementaciones del loader de módulos.
 *
 * Tres loaders predefinidos que satisfacen la interfaz inyectable
 * (name: string) => Promise<object>:
 *  - createStringLoader: carga desde mapa en memoria. Útil para tests.
 *  - createFileLoader: carga desde sistema de ficheros (Node.js exclusivamente).
 *  - createUrlLoader: carga vía fetch (navegador y Node 18+).
 *
 * Los loaders son agnósticos al sistema de adaptadores: simplemente cargan JSON.
 */

import { ResolutionError } from "../errors.js";

/**
 * *typedef {(name: string) => Promise<object>} StringLoaderResult
 * @typedef {Function} StringLoaderResult
**/

/**
 * Loader basado en un mapa nombre → string-JSON.
 *
 * Útil para tests y para escenarios donde los módulos están embebidos en código.
 *
 * @param {Object<string, string>} stringMap - Mapa nombre → JSON serializado.
 * @returns {StringLoaderResult}
 */
export function createStringLoader(stringMap) {
  if (typeof stringMap !== "object" || stringMap === null) {
    throw new TypeError("createStringLoader: el argumento debe ser un objeto.");
  }
  return async function stringLoader(name) {
    if (!Object.hasOwn(stringMap, name)) {
      throw new ResolutionError(
        `Módulo no encontrado en el mapa de strings: "${name}".`
      );
    }
    const raw = stringMap[name];
    if (typeof raw !== "string") {
      throw new ResolutionError(
        `El valor para "${name}" no es una cadena JSON.`
      );
    }
    try {
      return JSON.parse(raw);
    } catch (cause) {
      throw new ResolutionError(
        `JSON malformado en el módulo "${name}".`,
        { cause }
      );
    }
  };
}

/**
 * *typedef {Promise<(name: string) => Promise<object>>} FileLoaderResult
 * @typedef {Function} FileLoaderResult
**/

/**
 * Loader basado en sistema de ficheros (solo Node.js).
 *
 * Cada nombre se interpreta como ruta relativa al `baseDir` o absoluta.
 * Importa dinámicamente `node:fs/promises` y `node:path` para no romper
 * en navegador.
 *
 * @param {object} [options]
 * @param {string} [options.baseDir] - Directorio base. Default: process.cwd().
 * @param {string} [options.encoding="utf8"]
 * @returns {FileLoaderResult}
 */
export async function createFileLoader(options = {}) {
  let fs, path;
  try {
    fs = await import("node:fs/promises");
    path = await import("node:path");
  } catch (cause) {
    throw new ResolutionError(
      "createFileLoader requiere Node.js (node:fs/promises y node:path).",
      { cause }
    );
  }
  const baseDir = options.baseDir ?? process.cwd();
  const encoding = options.encoding ?? "utf8";

  return async function fileLoader(name) {
    // path.resolve maneja correctamente nombres absolutos y relativos.
    const fullPath = path.resolve(baseDir, name);
    let content;
    try {
      content = await fs.readFile(fullPath, encoding);
    } catch (cause) {
      throw new ResolutionError(
        `No se pudo leer el módulo desde "${fullPath}".`,
        { cause }
      );
    }
    try {
      return JSON.parse(content);
    } catch (cause) {
      throw new ResolutionError(
        `JSON malformado en el fichero "${fullPath}".`,
        { cause }
      );
    }
  };
}

/**
 * *typedef {(name: string) => Promise<object>} UrlLoaderResult
 * @typedef {Function} UrlLoaderResult
**/

/**
 * Loader basado en `fetch` (navegador moderno o Node.js 18+).
 *
 * Cada nombre se interpreta como URL absoluta, o relativa a `baseUrl` si se proporciona.
 *
 * @param {object} [options]
 * @param {string} [options.baseUrl] - URL base para resolver nombres relativos.
 * @param {RequestInit} [options.fetchOptions] - Opciones para fetch (headers, credentials, etc.).
 * @returns {UrlLoaderResult}
 */
export function createUrlLoader(options = {}) {
  if (typeof fetch !== "function") {
    throw new ResolutionError(
      "createUrlLoader requiere la API global `fetch` (navegador moderno o Node.js 18+)."
    );
  }
  const baseUrl = options.baseUrl ?? null;
  const fetchOptions = options.fetchOptions ?? {};

  return async function urlLoader(name) {
    // Construimos la URL absoluta (si baseUrl está, resolvemos contra ella).
    let url;
    try {
      url = baseUrl ? new URL(name, baseUrl).toString() : name;
    } catch (cause) {
      throw new ResolutionError(
        `URL inválida para el módulo "${name}".`,
        { cause }
      );
    }

    // Realizamos la petición.
    let response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (cause) {
      throw new ResolutionError(
        `Fallo de red al cargar el módulo desde "${url}".`,
        { cause }
      );
    }

    // Comprobamos el código de estado HTTP.
    if (!response.ok) {
      throw new ResolutionError(
        `HTTP ${response.status} ${response.statusText} al cargar "${url}".`
      );
    }

    // Parseamos como JSON. response.json() ya hace JSON.parse internamente.
    try {
      return await response.json();
    } catch (cause) {
      throw new ResolutionError(
        `JSON malformado en la respuesta de "${url}".`,
        { cause }
      );
    }
  };
}
