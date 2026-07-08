/**
 * JSON Pointer (RFC 6901) — implementación de referencia.
 *
 * Un puntero es una cadena Unicode formada por cero o más "reference tokens"
 * precedidos cada uno por '/'. La cadena vacía referencia el documento raíz.
 *
 * Codificación de caracteres reservados en un token:
 *   '~' -> '~0'
 *   '/' -> '~1'
 * La decodificación debe procesar '~1' antes que '~0' (o equivalente).
 */

class JsonPointerError extends Error {
  constructor(message, pointer) {
    super(message);
    this.name = 'JsonPointerError';
    this.pointer = pointer;
  }
}

const JsonPointer = {
  /**
   * Parsea un puntero JSON a un array de tokens decodificados.
   * @param {string} pointer
   * @returns {string[]}
   */
  parse(pointer) {
    if (typeof pointer !== 'string') {
      throw new JsonPointerError('El puntero debe ser una cadena', pointer);
    }
    if (pointer === '') return [];
    if (pointer.charCodeAt(0) !== 0x2F /* '/' */) {
      throw new JsonPointerError(
        'Un puntero no vacío debe empezar por "/"',
        pointer
      );
    }
    // Decodificación: ~1 -> '/' y luego ~0 -> '~'  (orden importante).
    return pointer
      .substring(1)
      .split('/')
      .map((tok) => tok.replace(/~1/g, '/').replace(/~0/g, '~'));
  },

  /**
   * Compila un array de tokens (sin codificar) a un puntero JSON.
   * @param {Array<string|number>} tokens
   * @returns {string}
   */
  compile(tokens) {
    if (!Array.isArray(tokens)) {
      throw new JsonPointerError('Se esperaba un array de tokens', tokens);
    }
    if (tokens.length === 0) return '';
    return (
      '/' +
      tokens
        .map((t) => String(t).replace(/~/g, '~0').replace(/\//g, '~1'))
        .join('/')
    );
  },

  /**
   * Resuelve un puntero contra un documento y devuelve el valor referenciado.
   * Devuelve `undefined` si el puntero no resuelve.
   * Lanza si el puntero está mal formado o si un índice de array es inválido.
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

  /**
   * `true` si el puntero resuelve a un valor existente (incluido `null`).
   */
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

  /**
   * Asigna `value` en la ubicación referenciada por `pointer`.
   * Devuelve el documento modificado (mutación in situ).
   * No crea rutas intermedias inexistentes: el padre debe existir.
   * Para arrays admite '-' como sufijo (push).
   */
  set(document, pointer, value) {
    const tokens = this.parse(pointer);
    if (tokens.length === 0) {
      throw new JsonPointerError(
        'No se puede asignar el documento raíz con set()',
        pointer
      );
    }
    const parentTokens = tokens.slice(0, -1);
    const last = tokens[tokens.length - 1];
    const parent = this.get(document, this.compile(parentTokens));

    if (parent === undefined || parent === null || typeof parent !== 'object') {
      throw new JsonPointerError(
        `El padre no existe o no es contenedor: "${this.compile(parentTokens)}"`,
        pointer
      );
    }

    if (Array.isArray(parent)) {
      if (last === '-') {
        parent.push(value);
      } else {
        if (!/^(0|[1-9][0-9]*)$/.test(last)) {
          throw new JsonPointerError(
            `Índice de array inválido: "${last}"`,
            pointer
          );
        }
        const idx = Number(last);
        if (idx > parent.length) {
          throw new JsonPointerError(
            `Índice fuera de rango: ${idx} > ${parent.length}`,
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

  /**
   * Elimina la ubicación referenciada por `pointer`.
   * En arrays, splice; en objetos, delete.
   */
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

  /**
   * "Consulta": resuelve múltiples punteros y devuelve pares { pointer, value }.
   * No es JSONPath — sólo evalúa cada puntero RFC 6901 contra el documento.
   */
  query(document, pointers) {
    return pointers.map((p) => ({ pointer: p, value: this.get(document, p) }));
  },
};

// ─── Demostración ─────────────────────────────────────────────────────────
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

console.log('— Resolución de punteros —');
for (const p of ejemplos) {
  console.log(JSON.stringify(p).padEnd(28), '→', JsonPointer.get(doc, p));
}

console.log('\n— Consulta múltiple —');
console.log(
  JsonPointer.query(doc, ['/foo/1', '/config/servers/0/host', '/no/existe'])
);

console.log('\n— Mutaciones —');
JsonPointer.set(doc, '/foo/-', 'qux');     // append
JsonPointer.set(doc, '/config/region', 'eu-west-1');
JsonPointer.remove(doc, '/foo/0');
console.log(doc.foo, '|', doc.config);

// Export (CommonJS / ESM-friendly)
if (typeof module !== 'undefined') {
  module.exports = { JsonPointer, JsonPointerError };
}
