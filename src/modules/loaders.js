/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The file `loaders.js` contains the module
 * [helpers]{@link module:jm2mp/modules/loaders}, which implements
 * predefined loader functions related with `JM2MP` _projection modules_.
**/

/**
 * @module jm2mp/modules/loaders
 * @description
 * The module [loaders]{@link module:jm2mp/modules/loaders} implements
 * predefined loader functions related with `JM2MP` _projection modules_.
 *
 * All loaders must implement the interface (contract):
 * `(name: string) => Promise<object>`.
 * 
 * All loaders must be agnostic about _query language adapters_
 * and just load the corresponding _projection module_ as a JSON value.
 *
 * Predefined loader functions are:
 * - `createStringLoader`: it loads a _projection module_ directly from
 *   memory; it is usefull for testing.
 * - `createFileLoader`: it loads a _projection module_ from the
 *   filesystem; it uses
 *   [Node.js file system module]{@link https://nodejs.org/api/fs.html},
 *   so it can be used only in applications and not in web browsers.
 * - `createUrlLoader`: it loads a _projection module_ using the
 *   [Fetch API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API};
 *   it can be used within both web browsers and
 *   [Node.js v18+]{@link https://undici.nodejs.org/best-practices/undici-vs-builtin-fetch}
 *   applications.
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

import { ResolutionError } from "../errors.js";

/* ------------------------------------------------------------------ */

/**
 * @typedef {Function} StringLoaderResult
 * @description
 * *typedef {(name: string) => Promise<object>} StringLoaderResult
**/

/* ------------------------------------------------------------------ */

/**
 * @description
 * Loader based on a simple (in memory) map of names and
 * [serialized]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify}
 * JSON values.
 * 
 * It is usefull for testing purposes or when the _projection modules_
 * are actually integrated into the code.
 *
 * @param {Object<string, string>} stringMap
 * The map of names and serialized JSON values.
 * @returns {StringLoaderResult}
 * The just created
 * [StringLoaderResult]{@link module:jm2mp/modules/loaders.StringLoaderResult}.
 * @throws {module:jm2mp/modules/LookupAddress.TypeError}
 * Whenever 'stringMap' is not an object or is null.
**/
export async function createStringLoader(stringMap)
{
  if (typeof stringMap !== "object" || stringMap === null)
  {
    throw new TypeError("createStringLoader: 'stringMap' must be a non-null object.");
  }
  else
  {
    /**
     * @description
     * It loads (retrieves) the _projection module_ of name `name`.
     * @param {string} name
     * The name of the loaded _projection module_ to load (retrieve).
     * @returns {*}
     * The parsed JSON value of the _module_.
     * @throws {module:jm2mp/modules/LookupAddress.ResolutionError}
     * Whenever trying to resolve a `name` for a _projection module_ that is
     * no part of this
     * [StringLoaderResult]{@link module:jm2mp/modules/loaders.StringLoaderResult}
     * or its serialized JSON value not is of type 'string'.
    **/
    return async function stringLoader(name)
    {
      if ( ! Object.hasOwn(stringMap, name) )
      {
        throw new ResolutionError(
          `stringLoader: module '${name}' not found inside stringMap.`
        );
      }
      const string_content = stringMap[name];
      if (typeof string_content !== "string")
      {
        throw new ResolutionError(
          `stringLoader: module '${name}' does not have an string as associated serialized JSON value.`
        );
      }
      try
      {
        const module_content = JSON.parse(string_content);
        return module_content;
      }
      catch (cause)
      {
        throw new ResolutionError(
          `stringLoader: module '${name}' has malformed JSON.`,
          { cause }
        );
      }
    };
  }
}

/* ------------------------------------------------------------------ */

/**
 * @typedef {Function} FileLoaderResult
 * @description
 * *typedef {Promise<(name: string) => Promise<object>>} FileLoaderResult
**/

/* ------------------------------------------------------------------ */

/**
 * @description
 * Loader based on filesystem, so only on
 * [Node.js]{@link https://nodejs.org/api/fs.html} applications can be
 * used, and not as part of client contexts in web browsers.
 *
 * Every `name` will be interpreted as a relative path to `baseDir`, or
 * as an absolute path.
 *
 * It dynamically imports `node:fs/promises` and `node:path` modules to
 * avoid breaks web browser's use context.
 *
 * @param {object} [options]
 * .
 * @param {string} [options.baseDir]
 * It specifies the base directory for relative paths.
 * By default
 * [process.cwd()]{@link https://nodejs.org/api/process.html#processcwd}
 * is used.
 * @param {string} [options.encoding="utf8"]
 * By default, it uses `UTF-8` encoding.
 * @returns {FileLoaderResult}
 * The just created
 * [FileLoaderResult]{@link module:jm2mp/modules/loaders.FileLoaderResult}.
 * @throws {module:jm2mp/modules/LookupAddress.TypeError}
 * Whenever 'stringMap' is not an object or is null.
**/
export async function createFileLoader(options = {})
{
  let fs, path;
  try
  {
    fs = await import("node:fs/promises");
    path = await import("node:path");
  }
  catch (cause)
  {
    throw new ResolutionError(
      "createFileLoader: Node.js is required ('node:fs/promises' and 'node:path').",
      { cause }
    );
  }
  const baseDir = options.baseDir ?? process.cwd();
  const encoding = options.encoding ?? "utf8";

  /**
   * @description
   * It loads (retrieves) the _projection module_ of filename `name`.
   * @param {string} name
   * The filename of the loaded _projection module_ to load (retrieve);
   * it can be absolute or relative to `baseDir`.
   * @returns {*}
   * The parsed JSON value of the _module_.
   * @throws {module:jm2mp/modules/LookupAddress.ResolutionError}
   * Whenever an error reading filename `name` is raised or its content
   * is not a valid parseable JSON value.
  **/
  return async function fileLoader(name)
  {
    // https://nodejs.org/api/path.html#pathresolvepaths
    // It resolves both absolute and relative paths.
    const fullPath = path.resolve(baseDir, name);
    let file_content;
    try
    {
      file_content = await fs.readFile(fullPath, encoding);
    }
    catch (cause)
    {
      throw new ResolutionError(
        `fileLoader: error reading file '${fullPath}'.`,
        { cause }
      );
    }
    try
    {
      const module_content = JSON.parse(file_content);
      return module_content;
    }
    catch (cause)
    {
      throw new ResolutionError(
        `fileLoader: malformed JSON in file '${fullPath}'.`,
        { cause }
      );
    }
  };
}

/* ------------------------------------------------------------------ */

/**
 * @typedef {Function} UrlLoaderResult
 * @description
 * *typedef {(name: string) => Promise<object>} UrlLoaderResult
**/

/* ------------------------------------------------------------------ */

/**
 * @description
 * Loader based on the
 * [Fetch API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API}
 * feature, available in modern web browser and as part of
 * [Node.js v18+]{@link https://nodejs.org/api/fs.html} applications.
 *
 * Every `name` is interpreted as an absolute URL, or relative to `baseUrl`
 * if provided.
 * @param {object} [options]
 * .
 * @param {string} [options.baseUrl]
 * It specifies the base URL for relative addresses.
 * @param {RequestInit} [options.fetchOptions]
 * It allows to specify options for `fetch` (like headers, credentials, ...).
 * @returns {UrlLoaderResult}
 * The just created
 * [UrlLoaderResult]{@link module:jm2mp/modules/loaders.UrlLoaderResult}.
 * @throws {module:jm2mp/modules/LookupAddress.TypeError}
 * Whenever 'stringMap' is not an object or is null.
**/
export async function createUrlLoader(options = {})
{
  if (typeof fetch !== "function")
  {
    throw new TypeError(
      "createUrlLoader: 'Fetch API' is required (modern web browser or Node.js v18+)."
    );
  }
  else
  {
    // The configurations for urlLoader.
    const baseUrl = options.baseUrl ?? null;
    const fetchOptions = options.fetchOptions ?? {};
    /**
     * @description
     * It loads (retrieves) the _projection module_ with URL `name`.
     * @param {string} name
     * The URL of the loaded _projection module_ to load (retrieved via
     * fetch); it can be absolute or relative to `baseUrl`.
     * @returns {*}
     * The parsed JSON value of the _module_.
     * @throws {module:jm2mp/modules/LookupAddress.ResolutionError}
     * Whenever an error fetching URL `name` is raised or its content
     * is not a valid parseable JSON value.
    **/
    return async function urlLoader(name)
    {
      // It builds an absolute URL (if baseUrl has been defined, it will be used).
      let url;
      try
      {
        url = ( baseUrl
                ? new URL(name, baseUrl).toString()
                : name );
      }
      catch (cause)
      {
        throw new ResolutionError(
          `urlLoader: invalid URL for module '${name}'.`,
          { cause }
        );
      }
      // It invokes the actual fetch.
      let response;
      try
      {
        response = await fetch(url, fetchOptions);
      }
      catch (cause)
      {
        throw new ResolutionError(
          `urlLoader: error fetching module '${name}' from URL '${url}'.`,
          { cause }
        );
      }
      // It tests the received HTTP status code.
      if (!response.ok)
      {
        throw new ResolutionError(
          `urlLoader: HTTP error '${response.status}' '${response.statusText}' loading module '${name}' from ULR '${url}'.`
        );
      }
      // It tries to parse fetched content as JSON.
      try
      {
        // Invoking JSON.parse internally.
        const module_content = await response.json();
        return module_content;
      }
      catch (cause)
      {
        throw new ResolutionError(
          `urlLoader: malformed JSON content for module '${name}' from URL '${url}'.`,
          { cause }
        );
      }
    };
  }
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/modules/loaders.js                    */
