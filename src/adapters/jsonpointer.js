/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The module [JSON Pointer]{@link module:jm2mp/adapters/jsonpointer} implements
 * the [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * interface to use the external [JSON Pointer]{@link external JSONPointer}
 * _query language_ as part of `JM2MP` _projection documents_.
**/

/**
 * @module jm2mp/adapters/jsonpointer
 * @description
 * This module implements the
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * interface to use the
 * [JSON Pointer (RFC 6901)](https://www.rfc-editor.org/info/rfc6901/)
 *  _query language_ as part of `JM2MP` _projection documents_.
 *
 * This module _only_ supports **json-pointer 0.6.x** _versions_.
 * Other versions must be tested previously to be considered as well.
 *
 * **JSON Pointer** is a standardized addressing syntax that identifies
 * only single values within a JSON document using a string of tokens
 * separated by the "/" (slash) character. It is not a general-purpose
 * _query language_ (it has no wildcards, filters, nor recursive
 * descent), but it is covered by an RFC, and its grammar fits into
 * thirty lines of notation.
 *
 * Syntax based on RFC 6901:
 * - `""`       --> the root value (the full document)
 * - `"/foo"`   --> "foo" property from the root object
 * - `"/foo/0"` --> first item in "foo" array
 * - `"/a~1b"`  --> literal property "a/b"   (~1 escapes '/')
 * - `"/a~0b"`  --> literal property "a~b"   (~0 escapes '~')
 * - `"/-"`     --> the (nonexistent) member after the last array element (RFC 6901 §4)
 *
 * By compliance with `JM2MP`, the
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * created by
 * [createJsonPointerAdapter]{@link module:jm2mp/adapters/jsonpointer.createJsonPointerAdapter}
 * maintains the expected behavior:
 * - `null` input --> `null` output without calling [JSONPath+{@link external:JSONPath} external library,
 * - empty string as path --> root context (the full document),
 * - nonexistent path --> `null` (avoiding any exception using `has` before `get`),
 * - a path always points to single scalar value --> returns such scalar value,
 * - syntax error --> raises an exception
 *   ([ValidationError]{@link module:jm2mp/errors.ValidationError} on
 *   [validate]{@link module:jm2mp/adapters/registry.QueryAdapter.validate} and
 *   [EvaluationError]{@link module:jm2mp/errors.EvaluationError} on
 *   [evaluate]{@link module:jm2mp/adapters/registry.QueryAdapter.evaluate}).
 *
 * The [json-pointer](https://www.npmjs.com/package/json-pointer)
 * library is dynamically loaded when constructing its corresponding
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}.
 * If not previously installed, an
 * [AdapterError]{@link module:jm2mp/errors.AdapterError} exception will
 * be raised from
 * [createJsonPointerAdapter]{@link module:jm2mp/adapters/jsonpointer.createJsonPointerAdapter}
 * with a clear message about it.
 *
 * @see [JSONPointer (external)]{@link external:JSONPointer}
**/

/**
 * @external JSONPointer
 * @description
 * **json-pointer** offers some utilities for JSON pointers described by
 * RFC 6901. It provides some additional stuff needed but is not
 * included in other libraries like
 * [node-jsonpointer](https://github.com/janl/node-jsonpointer).
 *
 * The module {@link module:jm2mp/adapters/jsonpointer} implements the
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 * interface to use [JSON Pointer](https://www.rfc-editor.org/info/rfc6901/)
 * as part of `JM2MP` _projection documents_.
 *
 * @see {@link https://www.rfc-editor.org/info/rfc6901/}
 * @see {@link https://www.npmjs.com/package/json-pointer}
 * @see {@link https://github.com/manuelstofer/json-pointer}
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
 * [JSON Pointer](https://www.npmjs.com/package/json-pointer) version **0.6.x**.
 * @returns {Promise<module:jm2mp/adapters/registry.QueryAdapter>}
 */
export async function createJsonPointerAdapter() {
  // Trying to load JSONPath external library.
  let jsonPointer;
  try {
    const mod = await import("json-pointer");
    jsonPointer = mod.default ?? mod;
    if (typeof jsonPointer.get !== "function" || typeof jsonPointer.has !== "function") {
      throw new Error("Functions 'get' and 'has' (from default or named export) not found!");
    }
  } catch (cause) {
    throw new AdapterError(
      "Unable to load 'json-pointer 0.6.x' external library. " +
      "To install it, please use: `npm install json-pointer@0.6` .",
      { cause }
    );
  }

  /**
   * Valida sintácticamente una cadena JSON Pointer según RFC 6901.
   *
   * Reglas (RFC 6901 §3):
   *   - La cadena vacía representa el documento raíz, válida.
   *   - Una cadena no vacía debe empezar por '/'.
   *   - Las únicas secuencias de escape permitidas son '~0' y '~1'.
   *     Cualquier '~' seguido de otro carácter (o fin de cadena) es inválido.
   *
   * Se valida aquí en lugar de delegar en la librería porque 'json-pointer'
   * no expone una función de validación sintáctica separada de la
   * evaluación, y queremos detectar errores en `validate()` antes de
   * llegar a `evaluate()`.
   */
  function validateSyntax(path) {
    if (typeof path !== "string") {
      throw new ValidationError(
        `JSON Pointer: $path must be a string, instead of '${typeof path}'.`
      );
    }
    // An empty string returns the root value, so it is a valid
    // expression.
    if (path.length === 0) return;
    // A pointer must always start by slash.
    if (path.charCodeAt(0) !== 0x2F /* '/' */) {
      throw new ValidationError(
        `Invalid JSON Pointer expression (must be an empty string or start by '/'): "${path}".`,
      );
    }
    // It validates escaping characters:
    // '~' must only be followed by '0' or '1'.
    for (let i = 0; i < path.length; i++) {
      if (path.charCodeAt(i) === 0x7E /* '~' */) {
        const next = i + 1 < path.length ? path.charCodeAt(i + 1) : -1;
        if (next !== 0x30 /* '0' */ && next !== 0x31 /* '1' */) {
          throw new ValidationError(
            `Invalid JSON Pointer expression (escape '~' in position ${i} must be followed by '0' or '1') in "${path}".`
          );
        }
        i++; // It jumps (also) the escaped character.
      }
    }
  }

  /**
   * @constant
   * @type {module:jm2mp/adapters/registry.QueryAdapter}
   * @description
   * The newly created
   * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
   * for the [JSONPointer]{@link external:JSONPointer} query language.
  **/
  const new_jsonpointer_query_adapter = {
    name: "jsonpointer",
    description: "JSON Pointer (RFC 6901) 0.60.x query adapter.",

    /**
     * @description
     * It validates a JSON Pointer expression.
     */
    async validate(path) {
      validateSyntax(path);
    },

    /**
     * @description
     * It evaluates a JSON Pointer expression and normalize its result.
     *
     * The `cache` parameter is used to mark a previously evaluated path
     * avoiding loops.
     *
     * The `env` parameter is ignored: `JSON Pointer` does not support
     * lexical _aliases_ and does not distinguish between roots and
     * contexts, other than just the input; so the expression is always
     * evaluated against `input`.
    **/
    /* eslint-disable-next-line no-unused-vars -- _env */
    async evaluate(path, input, cache, _env) {
      // Validación perezosa con cache de "ya validado".
      if (!cache.has(path)) {
        try {
          validateSyntax(path);
          cache.set(path, true);
        } catch (cause) {
          throw new EvaluationError(
            `JSON Pointer inválido en evaluación: "${path}".`,
            { cause }
          );
        }
      }

      // Propagación absorbente: input null --> null sin invocar.
      if (input === null || input === undefined) return null;

      // Cadena vacía: referencia el documento entero. La librería también
      // lo soporta, pero lo cortocircuitamos por claridad y para evitar
      // ramas internas innecesarias.
      if (path === "") return input;

      // Chequeo previo con .has para evitar la excepción de .get cuando
      // la ruta no resuelve. Esto convierte ausencia en null de forma
      // limpia, alineándose con el contrato uniforme.
      let exists;
      try {
        exists = jsonPointer.has(input, path);
      } catch (cause) {
        // .has raramente lanza, pero si el input no es navegable lo hace.
        throw new EvaluationError(
          `Error al inspeccionar JSON Pointer "${path}" sobre el input.`,
          { cause }
        );
      }
      if (!exists) return null;

      let value;
      try {
        value = jsonPointer.get(input, path);
      } catch (cause) {
        // No debería ocurrir tras .has===true, pero si la librería lanza
        // (por ejemplo, race con mutación externa), envolvemos limpiamente.
        throw new EvaluationError(
          `Error al evaluar JSON Pointer "${path}".`,
          { cause }
        );
      }
      // undefined --> null (uniformización defensiva).
      return value === undefined ? null : value;
    },

    /**
     * @property {@link module:jm2mp/adapters/registry.FallbackPolicyObject}
     * @description
     * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
     * behavior policy for edge cases in [JSON Pointer]{@link external:JSONPointer}.
     */
    fallbackPolicy: {
      missing:
        "null (using HAS before GET never raises any exception)",
      multipleMatches:
        "never (JSON Pointer only returns scalar values)",
      singleMatch:
        "scalar (JSON Pointer only returns scalara values)",
      typeError:
        "null (nonexistent key, out of range index, type mismatch)",
      nullInput:
        "null (without invoking external library)",
      timeout:
        "0 (not async)",
      emptyPointer:
        "full root document (empty string is root, RFC 6901 §5)",
    },
  };

  return new_jsonpointer_query_adapter;

/* ------------------------------------------------------------------ */

}  // export async function createJsonPointerAdapter

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/adapters/jsonpointer.js               */
