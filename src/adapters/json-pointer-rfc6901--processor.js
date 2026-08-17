/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file Reference implementation of JSON Pointer (RFC 6901) standard as additional exercise.
 *
 * A pointer is an Unicode string with zero or more "reference tokens"
 * prefixed each one by '/'. An empty string means the root value of the
 * JSON document.
 *
 * Reserved codified characters in a token:
 *   '~' -> '~0'
 *   '/' -> '~1'
 * Decodification must process '~1' before than '~0' (or equivalent).
**/

/**
 * @module jm2mp/adapters/json_pointer_rfc6901_processor
 * @description Reference implementation of JSON Pointer (RFC 6901) standard as additional exercise.
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @class JsonPointerError
 * @extends Error
 * @description
 * Exception class for specific JSON Pointer errors.
**/
class JsonPointerError extends Error {
  constructor(message, pointer) {
    super(message);
    this.name = 'JsonPointerError';
    this.pointer = pointer;
  }
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @namespace
 * @description
 * Example for using this JSON Pointer (RFC6901) reference
 * implementation, just for experimental purposes.
 */
const JsonPointer = {

/* ------------------------------------------------------------------ */

  /**
   * @description
   * It parses a JSON Pointer resulting in an array of decodificated token.
   * @param {string} pointer
   * @returns {string[]}
  **/
  parse(pointer) {
    if (typeof pointer !== 'string') {
      throw new JsonPointerError('Pointer must be an "string".', pointer);
    }
    if (pointer === '') return [];
    if (pointer.charCodeAt(0) !== 0x2F /* '/' */) {
      throw new JsonPointerError('A non-empty pointer must start by "/".', pointer );
    }
    // Decodification: first '~1'-->'/' and then '~0'-->'~' (must preserve this order).
    return pointer
      .substring(1)
      .split('/')
      .map((tok) => tok.replace(/~1/g, '/').replace(/~0/g, '~'));
  },

  /* ------------------------------------------------------------------ */

  /**
   * @description
   * It compiles an array of uncodificated tokens into a JSON Pointer.
   * @param {Array<string|number>} tokens
   * @returns {string}
   */
  compile(tokens) {
    if (!Array.isArray(tokens)) {
      throw new JsonPointerError('It must be an "array" of tokens.', tokens);
    }
    else if (tokens.length === 0) { return ''; }
    else { return (
      '/' +
      tokens
        .map((t) => String(t).replace(/~/g, '~0').replace(/\//g, '~1'))
        .join('/')
    ); }
  },

/* ------------------------------------------------------------------ */

  /**
   * @description
   * It resolves a JSON Pointer agains a JSON document and returns the
   * specified value.
   * It will return 'undefined' if the pointer does not resolves any
   * value.
   * It will raise an {@link JsonPointerError} excepton if pointer is
   * not well-formed or any array indices are invalid.
   * @param {*} document JSON document.
   * @param {*} pointer JSON Pointer.
   * @returns {*} Located JSON value using 'pointer' in 'document'.
   */
  get(document, pointer) {
    const tokens = this.parse(pointer);
    let current = document;

    for (let i = 0; i < tokens.length; i++) {
      if (current === null || typeof current !== 'object') {
        return undefined;
      }
      const token = tokens[i];

      if (Array.isArray(current)) {
        if (token === '-') {
          // '-' referencia el elemento nuevo "al final": no existe aún.
          return undefined;
        }
        // RFC 6901: el token debe ser "0" o dígitos sin ceros a la izquierda.
        if (!/^(0|[1-9][0-9]*)$/.test(token)) {
          throw new JsonPointerError(
            `Índice de array inválido: "${token}"`,
            pointer
          );
        }
        const idx = Number(token);
        if (idx >= current.length) return undefined;
        current = current[idx];
      } else {
        // Objeto: acceso directo (incluye propiedades como "" o "a/b").
        if (!Object.prototype.hasOwnProperty.call(current, token)) {
          return undefined;
        }
        current = current[token];
      }
    }
    return current;
  },

/* ------------------------------------------------------------------ */

  /**
   * @description
   * It tries to resolve `pointer` in `document`.
   * @param {*} document The JSON document.
   * @param {*} pointer The JSON Pointer.
   * @returns {boolean}
   * It returns `true` if `pointer` resolves to any existing value in
   * `document` (including `null`); otherwise, it returns `false`.
  **/
  has(document, pointer) {
    const tokens = this.parse(pointer);
    let current = document;
    for (const token of tokens) {
      if (current === null || typeof current !== 'object') return false;
      if (Array.isArray(current)) {
        if (token === '-') return false;
        if (!/^(0|[1-9][0-9]*)$/.test(token)) return false;
        const idx = Number(token);
        if (idx >= current.length) return false;
        current = current[idx];
      } else {
        if (!Object.prototype.hasOwnProperty.call(current, token)) return false;
        current = current[token];
      }
    }
    return true;
  },

/* ------------------------------------------------------------------ */

  /**
   * @description
   * Asigna `value` en la ubicación referenciada por `pointer`.
   * Devuelve el documento modificado (mutación in situ).
   * No crea rutas intermedias inexistentes: el padre debe existir.
   * Para arrays admite '-' como sufijo (push).
   * @param {*} document The JSON document.
   * @param {*} pointer The JSON Pointer.
   * @param {*} value The JSON value to set in `document` at `pointer`.
   * @returns {*} The new `document`.
   */
  set(document, pointer, value) {
    const tokens = this.parse(pointer);
    if (tokens.length === 0) {
      throw new JsonPointerError(
        'The "set" operation does not allow to change the "root value" of "document".',
        pointer
      );
    }
    const parentTokens = tokens.slice(0, -1);
    const last = tokens[tokens.length - 1];
    const parent = this.get(document, this.compile(parentTokens));

    if (parent === undefined || parent === null || typeof parent !== 'object') {
      throw new JsonPointerError(
        `The parent value does not exist or is not a container: "${this.compile(parentTokens)}"`,
        pointer
      );
    }

    if (Array.isArray(parent)) {
      if (last === '-') {
        parent.push(value);
      } else {
        if (!/^(0|[1-9][0-9]*)$/.test(last)) {
          throw new JsonPointerError(
            `Invalid array index: "${last}"`,
            pointer
          );
        }
        const idx = Number(last);
        if (idx > parent.length) {
          throw new JsonPointerError(
            `Out of range index: ${idx} > ${parent.length}`,
            pointer
          );
        }
        parent[idx] = value;
      }
    } else {
      parent[last] = value;
    }
    return document;
  },

/* ------------------------------------------------------------------ */

  /**
   * @description
   * It removes the value specified by `pointer` in `document`
   * (applies `splice` in arrays and `delete` in objects).
   * @param {*} document The JSON document.
   * @param {*} pointer The JSON Pointer.
   * @returns {*} The modified `document`.
  **/
  remove(document, pointer) {
    const tokens = this.parse(pointer);
    if (tokens.length === 0) {
      throw new JsonPointerError(
        'No se puede eliminar el documento raíz',
        pointer
      );
    }
    const parent = this.get(document, this.compile(tokens.slice(0, -1)));
    const last = tokens[tokens.length - 1];
    if (parent === undefined || parent === null || typeof parent !== 'object') {
      throw new JsonPointerError('Padre inexistente', pointer);
    }
    if (Array.isArray(parent)) {
      if (!/^(0|[1-9][0-9]*)$/.test(last)) {
        throw new JsonPointerError(`Índice inválido: "${last}"`, pointer);
      }
      parent.splice(Number(last), 1);
    } else {
      delete parent[last];
    }
    return document;
  },

/* ------------------------------------------------------------------ */

  /**
   * @description
   * Helper method that queries several `pointers` inside `document`,
   * returning a map of pairs `{pointer,value}`.
   * @param {*} document The JSON document.
   * @param {array<*>} pointers An array of JSON Pointers to be evaluated.
   * @returns {map<*,*>} A map of pairs.
  **/
  query(document, pointers) {
    return pointers.map((p) => ({ pointer: p, value: this.get(document, p) }));
  },

/* ------------------------------------------------------------------ */

};  // const JsonPointer

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @description
 * IIFE for operational demonstration.
**/
(function() {

  /* */
  const doc = {
    '': 0,
    'a/b': 1,
    'c%d': 2,
    'e^f': 3,
    'g|h': 4,
    'i\\j': 5,
    'k"l': 6,
    ' ': 7,
    'm~n': 8,
    foo: ['bar', 'baz'],
    config: { servers: [{ host: 'a.example' }, { host: 'b.example' }] },
  };

  /* */
  const ejemplos = [
    '',           // → todo el documento
    '/foo',       // → ["bar","baz"]
    '/foo/0',     // → "bar"
    '/',          // → 0  (propiedad "" del raíz)
    '/a~1b',      // → 1  ("a/b")
    '/c%d',       // → 2
    '/m~0n',      // → 8  ("m~n")
    '/config/servers/1/host', // → "b.example"
    '/foo/-',     // → undefined (elemento "nuevo" inexistente)
  ];

  /* */
  console.log('— Resolución de punteros —');
  for (const p of ejemplos) {
    console.log(JSON.stringify(p).padEnd(28), '→', JsonPointer.get(doc, p));
  }

  /* */
  console.log('\n— Consulta múltiple —');
  console.log(
    JsonPointer.query(doc, ['/foo/1', '/config/servers/0/host', '/no/existe'])
  );
  /* */
  console.log('\n— Mutaciones —');
  JsonPointer.set(doc, '/foo/-', 'qux');     // append
  JsonPointer.set(doc, '/config/region', 'eu-west-1');
  JsonPointer.remove(doc, '/foo/0');
  console.log(doc.foo, '|', doc.config);
})();

/* ------------------------------------------------------------------ */

/* Export (CommonJS / ESM-friendly) */
if (typeof module !== 'undefined') {
  module.exports = { JsonPointer, JsonPointerError };
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/adapters/json-pointer-rfc6901--processor.js */
