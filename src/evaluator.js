/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @module evaluator
 * @file Evaluador del lenguaje de proyecciones.
 *
 * Dado un módulo resuelto y normalizado, evalúa la plantilla raíz "@" sobre
 * un documento de origen. El evaluador es ASÍNCRONO porque el contrato de
 * los adaptadores es async.
 *
 * NIVEL DE LA API:
 * Esta función es parte del NIVEL BAJO. Si se invoca sin previo paso por
 * `validateModule()`, los errores que la validación habría detectado
 * (referencias inexistentes, alias fuera de alcance) se manifestarán como
 * EvaluationError en runtime. Use `project()` para el flujo completo
 * con validación.
 *
 * MANEJO DE ERRORES DE ADAPTADORES:
 * El operador `get` envuelve cualquier excepción del adaptador que NO sea
 * ProjectionError en EvaluationError. Esto garantiza que la jerarquía de
 * errores del lenguaje sea cerrada: cualquier error capturable en
 * try/catch (e instanceof ProjectionError) será uno de los nuestros.
 *
 * AISLAMIENTO ENTRE EVALUACIONES:
 * Cada llamada a `evaluate()` crea su propia caché de expresiones
 * compiladas (independiente por sintaxis). No hay estado compartido entre
 * evaluaciones concurrentes; dos `evaluate()` ejecutándose en paralelo
 * no se contaminan mutuamente. Esto permite uso seguro en servidores
 * concurrentes sin sincronización adicional.
 */

import { ProjectionError, EvaluationError } from "./errors.js";
import { isOperation } from "./validator.js";

/**
 * Profundidad lógica máxima por defecto. No es del stack JS (que es
 * independiente por usar async/await), sino una protección contra
 * recursión sin terminación o expresiones lógicamente muy anidadas.
 */
const DEFAULT_MAX_DEPTH = 1000;

/**
 * Evalúa un módulo resuelto sobre un documento de origen.
 *
 * @param {object} module - Módulo resuelto y normalizado.
 * @param {*} document - Documento JSON de origen.
 * @param {object} options
 * @param {AdapterRegistry} options.registry
 * *param {import("./adapters/registry.js").AdapterRegistry} options.registry
 * @param {number} [options.maxDepth=1000]
 * @returns {Promise<*>} Resultado de aplicar la plantilla raíz.
 */
export async function evaluate(module, document, options) {
  if (!options || !options.registry) {
    throw new EvaluationError("Se requiere options.registry para evaluar.");
  }
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;

  // Cache de expresiones compiladas, una por nombre de sintaxis.
  // Esta cache es local a esta evaluación; no se comparte entre
  // llamadas concurrentes a evaluate().
  const queryCaches = new Map();
  const getCacheFor = (syntax) => {
    let cache = queryCaches.get(syntax);
    if (!cache) {
      cache = new Map();
      queryCaches.set(syntax, cache);
    }
    return cache;
  };

  const env = {
    ctx: document,
    root: document,
    aliases: Object.create(null),
    module,
    registry: options.registry,
    getCacheFor,
    depth: 0,
    maxDepth,
  };

  return evalProjection(module["@"], env);
}

/**
 * Evalúa recursivamente una proyección. Es async para soportar adaptadores async.
 */
async function evalProjection(proj, env) {
  if (env.depth >= env.maxDepth) {
    throw new EvaluationError(
      `Profundidad lógica máxima de evaluación excedida (${env.maxDepth}). ` +
      `Posible recursión sin terminación o expresión lógicamente muy anidada.`
    );
  }

  // Tipos primitivos (incluido string): literales puros.
  if (proj === null || typeof proj === "boolean" ||
      typeof proj === "number" || typeof proj === "string") {
    return proj;
  }

  if (Array.isArray(proj)) {
    const result = [];
    for (const p of proj) {
      result.push(await evalProjection(p, deepen(env)));
    }
    return result;
  }

  if (typeof proj === "object") {
    if (isOperation(proj)) {
      return await evalOperation(proj, env);
    }
    return await evalLiteralObject(proj, env);
  }

  throw new EvaluationError(`Tipo no soportado: ${typeof proj}.`);
}

/** Devuelve un entorno con depth incrementado en 1. */
function deepen(env) {
  return { ...env, depth: env.depth + 1 };
}

/**
 * Evalúa un objeto literal: cada valor es proyección, cada clave puede
 * estar escapada con \$ para producir una clave que empiece literalmente por $.
 */
async function evalLiteralObject(obj, env) {
  const result = {};
  for (const key of Object.keys(obj)) {
    // Soporte de claves escapadas \$nombre → nombre con $ literal.
    const realKey = (key.length >= 2 && key[0] === "\\" && key[1] === "$")
      ? key.slice(1)
      : key;
    // Los VALORES son siempre literales (sin desescapar);
    // solo las CLAVES tienen mecanismo de escape.
    result[realKey] = await evalProjection(obj[key], deepen(env));
  }
  return result;
}

/** Despacha la operación al handler correspondiente. */
async function evalOperation(op, env) {
  const handler = OPERATORS[op.$op];
  if (!handler) {
    throw new EvaluationError(`Operador desconocido '${op.$op}'.`);
  }
  return handler(op, env);
}

/** Asegura que `value` sea del tipo esperado o lanza EvaluationError. */
function expectType(value, expectedType, opName, argName) {
  let actual;
  if (value === null) actual = "null";
  else if (Array.isArray(value)) actual = "array";
  else actual = typeof value;
  if (actual !== expectedType) {
    throw new EvaluationError(
      `${opName}: ${argName} debe ser ${expectedType}, recibido ${actual}.`
    );
  }
}

/**
 * Tabla de operadores. Cada entrada es async para uniformidad con el
 * contrato de los adaptadores.
 */
const OPERATORS = {

  /* Núcleo categórico */

  async pipe(op, env) {
    let currentCtx = env.ctx;
    for (const stage of op.$stages) {
      const stageEnv = { ...env, ctx: currentCtx, depth: env.depth + 1 };
      currentCtx = await evalProjection(stage, stageEnv);
    }
    return currentCtx;
  },

  /* Acceso */

  async get(op, env) {
    const syntax = op.$syntax;
    const adapter = env.registry.get(syntax);
    const input = Object.hasOwn(op, "$from")
      ? await evalProjection(op.$from, deepen(env))
      : env.ctx;
    const cache = env.getCacheFor(syntax);
    // Envoltura de errores no-ProjectionError para garantizar la jerarquía cerrada.
    try {
      return await adapter.evaluate(op.$path, input, cache, env);
    } catch (err) {
      if (err instanceof ProjectionError) throw err;
      throw new EvaluationError(
        `Adaptador '${syntax}' falló durante la evaluación.`,
        { cause: err }
      );
    }
  },

  /* Eliminadores */

  async if(op, env) {
    const cond = await evalProjection(op.$cond, deepen(env));
    if (typeof cond !== "boolean") {
      throw new EvaluationError(
        `if: $cond debe ser boolean, recibido ${cond === null ? "null" : typeof cond}.`
      );
    }
    return cond
      ? await evalProjection(op.$then, deepen(env))
      : await evalProjection(op.$else, deepen(env));
  },

  async fold(op, env) {
    const xs = await evalProjection(op.$over, deepen(env));
    if (xs === null) {
      return await evalProjection(op.$init, deepen(env));
    }
    if (!Array.isArray(xs)) {
      throw new EvaluationError("fold: $over debe ser array o null.");
    }
    let acc = await evalProjection(op.$init, deepen(env));
    // fold por la derecha: del último elemento al primero.
    for (let i = xs.length - 1; i >= 0; i--) {
      const stepCtx = { item: xs[i], acc, index: i };
      const stepEnv = { ...env, ctx: stepCtx, depth: env.depth + 1 };
      acc = await evalProjection(op.$step, stepEnv);
    }
    return acc;
  },

  async foldObj(op, env) {
    const obj = await evalProjection(op.$over, deepen(env));
    if (obj === null) {
      return await evalProjection(op.$init, deepen(env));
    }
    if (typeof obj !== "object" || Array.isArray(obj)) {
      throw new EvaluationError("foldObj: $over debe ser objeto o null.");
    }
    let acc = await evalProjection(op.$init, deepen(env));
    for (const key of Object.keys(obj)) {
      const stepCtx = { key, value: obj[key], acc };
      const stepEnv = { ...env, ctx: stepCtx, depth: env.depth + 1 };
      acc = await evalProjection(op.$step, stepEnv);
    }
    return acc;
  },

  /* Constructores dinámicos */

  async cons(op, env) {
    const head = await evalProjection(op.$head, deepen(env));
    const tail = await evalProjection(op.$tail, deepen(env));
    if (!Array.isArray(tail)) {
      throw new EvaluationError("cons: $tail debe ser array.");
    }
    return [head, ...tail];
  },

  async insert(op, env) {
    const key = await evalProjection(op.$key, deepen(env));
    if (typeof key !== "string") {
      throw new EvaluationError("insert: $key debe ser string.");
    }
    const value = await evalProjection(op.$value, deepen(env));
    const into = await evalProjection(op.$into, deepen(env));
    if (typeof into !== "object" || into === null || Array.isArray(into)) {
      throw new EvaluationError("insert: $into debe ser objeto.");
    }
    return { ...into, [key]: value };
  },

  /* Entorno */

  async let(op, env) {
    // Bindings paralelos (no let*).
    const newAliases = { ...env.aliases };
    for (const [name, projection] of Object.entries(op.$bindings)) {
      newAliases[name] = await evalProjection(projection, deepen(env));
    }
    const innerEnv = { ...env, aliases: newAliases, depth: env.depth + 1 };
    return await evalProjection(op.$in, innerEnv);
  },

  /* Invocación */

  async call(op, env) {
    const ref = op.$ref;
    if (!Object.hasOwn(env.module, ref)) {
      throw new EvaluationError(
        `call: la plantilla '${ref}' no existe en el módulo.`
      );
    }
    const template = env.module[ref];
    const newCtx = Object.hasOwn(op, "$at")
      ? await evalProjection(op.$at, deepen(env))
      : env.ctx;
    // Aliases se reinician (cierre léxico sobre el módulo).
    const callEnv = {
      ctx: newCtx,
      root: env.root,
      aliases: Object.create(null),
      module: env.module,
      registry: env.registry,
      getCacheFor: env.getCacheFor,
      depth: env.depth + 1,
      maxDepth: env.maxDepth,
    };
    return await evalProjection(template, callEnv);
  },

  /* Predicados */

  async eq(op, env) {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    return deepEqual(l, r);
  },
  async lt(op, env) {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    return compareOrdered(l, r, "lt") < 0;
  },
  async gt(op, env) {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    return compareOrdered(l, r, "gt") > 0;
  },
  async lte(op, env) {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    return compareOrdered(l, r, "lte") <= 0;
  },
  async gte(op, env) {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    return compareOrdered(l, r, "gte") >= 0;
  },
  async neq(op, env) {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    return !deepEqual(l, r);
  },

  /* Booleanos */

  async not(op, env) {
    const v = await evalProjection(op.$value, deepen(env));
    expectType(v, "boolean", "not", "$value");
    return !v;
  },
  async and(op, env) {
    // Cortocircuito: si $left es false, no evaluamos $right.
    const l = await evalProjection(op.$left, deepen(env));
    expectType(l, "boolean", "and", "$left");
    if (!l) return false;
    const r = await evalProjection(op.$right, deepen(env));
    expectType(r, "boolean", "and", "$right");
    return r;
  },
  async or(op, env) {
    // Cortocircuito: si $left es true, no evaluamos $right.
    const l = await evalProjection(op.$left, deepen(env));
    expectType(l, "boolean", "or", "$left");
    if (l) return true;
    const r = await evalProjection(op.$right, deepen(env));
    expectType(r, "boolean", "or", "$right");
    return r;
  },

  /* Aritmética */

  async add(op, env) {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    expectType(l, "number", "add", "$left");
    expectType(r, "number", "add", "$right");
    return l + r;
  },
  async sub(op, env) {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    expectType(l, "number", "sub", "$left");
    expectType(r, "number", "sub", "$right");
    return l - r;
  },
  async mul(op, env) {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    expectType(l, "number", "mul", "$left");
    expectType(r, "number", "mul", "$right");
    return l * r;
  },
  async div(op, env) {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    expectType(l, "number", "div", "$left");
    expectType(r, "number", "div", "$right");
    if (r === 0) throw new EvaluationError("div: división por cero.");
    const result = ( l / r );
    if ( ! Number.isFinite(result) ) throw EvaluationError("div: resultado no finito.");
    return result;
  },
  async mod(op, env) {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    expectType(l, "number", "mod", "$left");
    expectType(r, "number", "mod", "$right");
    if (r === 0) throw new EvaluationError("mod: módulo con divisor cero.");
    const result = ( l % r );
    if ( ! Number.isFinite(result) ) throw EvaluationError("mod: resultado no finito.");
    return result;
  },
  async neg(op, env) {
    const v = await evalProjection(op.$value, deepen(env));
    expectType(v, "number", "neg", "$value");
    return (-v);
  },
  async abs(op, env) {
    const v = await evalProjection(op.$value, deepen(env));
    expectType(v, "number", "abs", "$value");
    return Math.abs(v);
  },

  /* Strings */

  async concat(op, env) {
    if (!Array.isArray(op.$parts)) {
      throw new EvaluationError("concat: $parts debe ser array.");
    }
    let result = "";
    for (let i = 0; i < op.$parts.length; i++) {
      const part = await evalProjection(op.$parts[i], deepen(env));
      if (typeof part !== "string") {
        throw new EvaluationError(
          `concat: $parts[${i}] debe ser string, recibido ${typeof part}.`
        );
      }
      result += part;
    }
    return result;
  },

  async length(op, env) {
    const v = await evalProjection(op.$value, deepen(env));
    if (typeof v === "string") return Array.from(v).length;
    if (Array.isArray(v)) return v.length;
    throw new EvaluationError("length: $value debe ser string o array.");
  },

  async substring(op, env) {
    const v = await evalProjection(op.$value, deepen(env));
    expectType(v, "string", "substring", "$value");
    const start = await evalProjection(op.$start, deepen(env));
    if (!Number.isInteger(start) || start < 0) {
      throw new EvaluationError("substring: $start debe ser entero >= 0.");
    }
    const codepoints = Array.from(v);
    let end;
    if (Object.hasOwn(op, "$end")) {
      end = await evalProjection(op.$end, deepen(env));
      if (!Number.isInteger(end) || end < 0) {
        throw new EvaluationError("substring: $end debe ser entero >= 0.");
      }
    } else {
      end = codepoints.length;
    }
    const realStart = Math.min(start, codepoints.length);
    const realEnd = Math.min(Math.max(end, realStart), codepoints.length);
    return codepoints.slice(realStart, realEnd).join("");
  },

  async upper(op, env) {
    const v = await evalProjection(op.$value, deepen(env));
    expectType(v, "string", "upper", "$value");
    return v.toUpperCase();
  },

  async lower(op, env) {
    const v = await evalProjection(op.$value, deepen(env));
    expectType(v, "string", "lower", "$value");
    return v.toLowerCase();
  },

  /* Tipos y reflexión */

  async typeof(op, env) {
    const v = await evalProjection(op.$value, deepen(env));
    if (v === null) return "null";
    if (Array.isArray(v)) return "array";
    return typeof v;
  },

  async coalesce(op, env) {
    // Solo si $value es null, evaluamos $default (perezoso).
    const v = await evalProjection(op.$value, deepen(env));
    if (v === null) {
      return await evalProjection(op.$default, deepen(env));
    }
    return v;
  },

  async has(op, env) {
    const key = await evalProjection(op.$key, deepen(env));
    expectType(key, "string", "has", "$key");
    const inObj = await evalProjection(op.$in, deepen(env));
    if (typeof inObj !== "object" || inObj === null || Array.isArray(inObj)) {
      throw new EvaluationError("has: $in debe ser objeto.");
    }
    return Object.hasOwn(inObj, key);
  },

  /* Listas (extensión) */

  async sort(op, env) {
    const xs = await evalProjection(op.$over, deepen(env));
    if (xs === null) return null;
    if (!Array.isArray(xs)) {
      throw new EvaluationError("sort: $over debe ser array o null.");
    }
    let desc = false;
    if (Object.hasOwn(op, "$desc")) {
      desc = await evalProjection(op.$desc, deepen(env));
      expectType(desc, "boolean", "sort", "$desc");
    }
    const hasBy = Object.hasOwn(op, "$by");
    // Decoración: para cada elemento, calculamos su clave de ordenación.
    const decorated = [];
    for (let i = 0; i < xs.length; i++) {
      const key = hasBy
        ? await evalProjection(op.$by, { ...env, ctx: xs[i], depth: env.depth + 1 })
        : xs[i];
      decorated.push({ x: xs[i], key, i });
    }
    decorated.sort((a, b) => {
      const cmp = compareOrdered(a.key, b.key, "sort");
      if (cmp !== 0) return desc ? -cmp : cmp;
      return a.i - b.i; // estable
    });
    return decorated.map((d) => d.x);
  },

  /* Acceso por clave (extensión, O(1)) */

  async lookup(op, env) {
    const key = await evalProjection(op.$key, deepen(env));
    expectType(key, "string", "lookup", "$key");
    const inObj = await evalProjection(op.$in, deepen(env));
    // Propagación absorbente: null en $in → null.
    if (inObj === null) return null;
    if (typeof inObj !== "object" || Array.isArray(inObj)) {
      throw new EvaluationError("lookup: $in debe ser objeto o null.");
    }
    return Object.hasOwn(inObj, key) ? inObj[key] : null;
  },

  /* Fusión de objetos (extensión, O(m+n)) */

  async merge(op, env) {
    const left = await evalProjection(op.$left, deepen(env));
    const right = await evalProjection(op.$right, deepen(env));
    // Tratamos null como objeto vacío para tolerar propagación absorbente.
    const leftObj = (left === null) ? {} : left;
    const rightObj = (right === null) ? {} : right;
    if (typeof leftObj !== "object" || Array.isArray(leftObj)) {
      throw new EvaluationError("merge: $left debe ser objeto o null.");
    }
    if (typeof rightObj !== "object" || Array.isArray(rightObj)) {
      throw new EvaluationError("merge: $right debe ser objeto o null.");
    }
    // El spread es O(m+n); las claves de right ganan.
    return { ...leftObj, ...rightObj };
  },
};

/* =============================================================================
 *                              UTILIDADES
 * ============================================================================= */

/**
 * Igualdad estructural recursiva sobre valores JSON.
 *
 * Reglas:
 *  - Mismos primitivos → iguales según ===.
 *  - Arrays iguales si tienen misma longitud y elementos correspondientes iguales.
 *  - Objetos iguales si tienen mismo conjunto de claves y valores correspondientes iguales.
 *  - Tipos distintos: nunca iguales.
 *
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray !== bIsArray) return false;
  if (aIsArray) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) {
      if (!Object.hasOwn(b, k)) return false;
      if (!deepEqual(a[k], b[k])) return false;
    }
    return true;
  }
  return false;
}

/**
 * Compara dos valores ordenables (number/number o string/string).
 * Lanza EvaluationError si los tipos son heterogéneos o no ordenables.
 */
function compareOrdered(a, b, opName) {
  if (typeof a === "number" && typeof b === "number") {
    return a < b ? -1 : (a > b ? 1 : 0);
  }
  if (typeof a === "string" && typeof b === "string") {
    return a < b ? -1 : (a > b ? 1 : 0);
  }
  throw new EvaluationError(
    `${opName}: argumentos deben ser ambos number o ambos string ` +
    `(recibido ${typeName(a)} y ${typeName(b)}).`
  );
}

function typeName(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}
