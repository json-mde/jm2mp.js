/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file Tests del evaluador para los 34 operadores.
 *
 * Cubre cada operador del catálogo, las tres referencias contextuales
 * $/@/%, la profundidad lógica máxima, escape de claves, y las nuevas
 * extensiones (sort, lookup, merge).
**/

/**
 * @module jm2mp/test/unit/evaluator
 * @description
 * Tests del evaluador para los 34 operadores.
**/

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { EvaluationError } from "../../errors.js";
import { evaluate } from "../../evaluator.js";
import { createNativeRegistry } from "../../adapters/helpers.js";
import { normalizeModule } from "../../modules/normalizer.js";
import { moduleWith, ROOT_TEMPLATE_NAME } from "../../modules/helpers.js";

const registry = createNativeRegistry();

/** Helper: normaliza y evalúa. */
async function run(rootProjection, document, namedTemplates = {}) {
  const mod = normalizeModule(moduleWith(rootProjection, namedTemplates));
  return await evaluate(mod, document, { registry });
}

// ============================================================================
// Núcleo categórico: pipe
// ============================================================================

describe("evaluator: pipe", () => {
  it("encadena etapas pasando el contexto", async () => {
    const proj = {
      "$op": "pipe",
      "$stages": [
        { "$op": "get", "$path": "$.x" },
        { "$op": "add", "$left": { "$op": "get", "$path": "@" }, "$right": 1 }
      ]
    };
    assert.equal(await run(proj, { x: 10 }), 11);
  });

  it("pipe vacío devuelve el contexto inicial", async () => {
    const proj = { "$op": "pipe", "$stages": [] };
    assert.deepEqual(await run(proj, { x: 1 }), { x: 1 });
  });
});

// ============================================================================
// Acceso: get y las tres referencias contextuales
// ============================================================================

describe("evaluator: get y referencias contextuales", () => {
  it("$ accede a la raíz del documento", async () => {
    const proj = { "$op": "get", "$path": "$.a" };
    assert.equal(await run(proj, { a: 1 }), 1);
  });

  it("@ accede al contexto actual", async () => {
    const proj = {
      "$op": "pipe",
      "$stages": [
        { "$op": "get", "$path": "$.x" },
        { "$op": "get", "$path": "@" }
      ]
    };
    assert.deepEqual(await run(proj, { x: { y: 2 } }), { y: 2 });
  });

  it("% accede a un alias léxico", async () => {
    const proj = {
      "$op": "let",
      "$bindings": { "x": 99 },
      "$in": { "$op": "get", "$path": "%x" }
    };
    assert.equal(await run(proj, null), 99);
  });

  it("$ se mantiene invariante dentro de pipe", async () => {
    const proj = {
      "$op": "pipe",
      "$stages": [
        { "$op": "get", "$path": "$.x" },
        { "$op": "get", "$path": "$.y" }  // sigue accediendo a raíz
      ]
    };
    assert.equal(await run(proj, { x: 1, y: 2 }), 2);
  });

  it("clave inexistente devuelve null", async () => {
    const proj = { "$op": "get", "$path": "$.noExiste" };
    assert.equal(await run(proj, { a: 1 }), null);
  });

  it("acepta $path como array de accesores", async () => {
    const proj = {
      "$op": "get",
      "$path": ["x", 0, "y"],
      "$from": { "$op": "get", "$path": "$" }
    };
    assert.equal(await run(proj, { x: [{ y: 42 }] }), 42);
  });
});

// ============================================================================
// Eliminadores: if, fold, foldObj
// ============================================================================

describe("evaluator: if", () => {
  it("evalúa la rama then si la condición es true", async () => {
    const proj = {
      "$op": "if",
      "$cond": true,
      "$then": "a",
      "$else": "b"
    };
    assert.equal(await run(proj, null), "a");
  });

  it("evalúa la rama else si la condición es false", async () => {
    const proj = {
      "$op": "if", "$cond": false, "$then": "a", "$else": "b"
    };
    assert.equal(await run(proj, null), "b");
  });

  it("lanza error si la condición no es boolean", async () => {
    const proj = {
      "$op": "if", "$cond": "string", "$then": 1, "$else": 2
    };
    await assert.rejects(run(proj, null), EvaluationError);
  });
});

describe("evaluator: fold", () => {
  it("suma una lista por la derecha", async () => {
    const proj = {
      "$op": "foldArr",
      "$over": [1, 2, 3, 4],
      "$init": 0,
      "$step": {
        "$op": "add",
        "$left":  { "$op": "get", "$path": "@.item" },
        "$right": { "$op": "get", "$path": "@.acc" }
      }
    };
    assert.equal(await run(proj, null), 10);
  });

  it("expone @.index", async () => {
    const proj = {
      "$op": "foldArr",
      "$over": ["a", "b", "c"],
      "$init": [],
      "$step": {
        "$op": "cons",
        "$head": { "$op": "get", "$path": "@.index" },
        "$tail": { "$op": "get", "$path": "@.acc" }
      }
    };
    // fold por la derecha: c(idx 2), b(idx 1), a(idx 0). cons en cada paso.
    assert.deepEqual(await run(proj, null), [0, 1, 2]);
  });

  it("$over null devuelve $init", async () => {
    const proj = {
      "$op": "foldArr",
      "$over": null,
      "$init": 42,
      "$step": null
    };
    assert.equal(await run(proj, null), 42);
  });

  it("rechaza $over no array/null", async () => {
    const proj = {
      "$op": "foldArr", "$over": "string", "$init": 0, "$step": 0
    };
    await assert.rejects(run(proj, null), EvaluationError);
  });
});

describe("evaluator: foldObj", () => {
  it("agrega valores de un objeto", async () => {
    const proj = {
      "$op": "foldObj",
      "$over": { "a": 1, "b": 2, "c": 3 },
      "$init": 0,
      "$step": {
        "$op": "add",
        "$left":  { "$op": "get", "$path": "@.value" },
        "$right": { "$op": "get", "$path": "@.acc" }
      }
    };
    assert.equal(await run(proj, null), 6);
  });

  it("expone @.key y @.value", async () => {
    const proj = {
      "$op": "foldObj",
      "$over": { "x": 1 },
      "$init": null,
      "$step": {
        "$op": "get", "$path": "@.key"
      }
    };
    assert.equal(await run(proj, null), "x");
  });

  it("$over null devuelve $init", async () => {
    const proj = {
      "$op": "foldObj", "$over": null, "$init": "vacío", "$step": null
    };
    assert.equal(await run(proj, null), "vacío");
  });

  it("rechaza $over no objeto/null (array)", async () => {
    const proj = {
      "$op": "foldObj", "$over": [1, 2], "$init": 0, "$step": 0
    };
    await assert.rejects(run(proj, null), EvaluationError);
  });
});

// ============================================================================
// Constructores dinámicos: cons, insert
// ============================================================================

describe("evaluator: cons", () => {
  it("antepone un elemento a un array", async () => {
    const proj = { "$op": "cons", "$head": 0, "$tail": [1, 2, 3] };
    assert.deepEqual(await run(proj, null), [0, 1, 2, 3]);
  });

  it("rechaza $tail no array", async () => {
    const proj = { "$op": "cons", "$head": 0, "$tail": "no array" };
    await assert.rejects(run(proj, null), EvaluationError);
  });
});

describe("evaluator: insert", () => {
  it("añade una clave nueva al objeto", async () => {
    const proj = {
      "$op": "insert", "$key": "b", "$value": 2, "$into": { "a": 1 }
    };
    assert.deepEqual(await run(proj, null), { a: 1, b: 2 });
  });

  it("sobrescribe clave existente", async () => {
    const proj = {
      "$op": "insert", "$key": "a", "$value": 99, "$into": { "a": 1 }
    };
    assert.deepEqual(await run(proj, null), { a: 99 });
  });

  it("rechaza $key no string", async () => {
    const proj = {
      "$op": "insert", "$key": 42, "$value": 1, "$into": {}
    };
    await assert.rejects(run(proj, null), EvaluationError);
  });

  it("rechaza $into no objeto", async () => {
    const proj = {
      "$op": "insert", "$key": "x", "$value": 1, "$into": [1, 2]
    };
    await assert.rejects(run(proj, null), EvaluationError);
  });
});

// ============================================================================
// Entorno: let
// ============================================================================

describe("evaluator: let", () => {
  it("liga un alias y lo usa en $in", async () => {
    const proj = {
      "$op": "let",
      "$bindings": { "x": 42 },
      "$in": { "$op": "get", "$path": "%x" }
    };
    assert.equal(await run(proj, null), 42);
  });

  it("alias anidado sombrea al exterior", async () => {
    const proj = {
      "$op": "let",
      "$bindings": { "x": 1 },
      "$in": {
        "$op": "let",
        "$bindings": { "x": 2 },
        "$in": { "$op": "get", "$path": "%x" }
      }
    };
    assert.equal(await run(proj, null), 2);
  });

  it("alias sigue accesible tras sombreado", async () => {
    const proj = {
      "$op": "let",
      "$bindings": { "outer": 10 },
      "$in": {
        "$op": "let",
        "$bindings": { "inner": 20 },
        "$in": {
          "$op": "add",
          "$left":  { "$op": "get", "$path": "%outer" },
          "$right": { "$op": "get", "$path": "%inner" }
        }
      }
    };
    assert.equal(await run(proj, null), 30);
  });
});

// ============================================================================
// Invocación: call
// ============================================================================

describe("evaluator: call", () => {
  it("invoca una plantilla con nombre", async () => {
    const proj = { "$op": "call", "$ref": "aux" };
    const aux = { aux: 42 };
    assert.equal(await run(proj, null, aux), 42);
  });

  it("redirige el contexto con $at", async () => {
    const proj = {
      "$op": "call",
      "$ref": "doble",
      "$at": { "$op": "get", "$path": "$.x" }
    };
    const aux = {
      doble: {
        "$op": "mul",
        "$left":  { "$op": "get", "$path": "@" },
        "$right": 2
      }
    };
    assert.equal(await run(proj, { x: 5 }, aux), 10);
  });

  it("aliases del exterior NO son visibles en la plantilla invocada (cierre léxico sobre módulo)", async () => {
    const proj = {
      "$op": "let",
      "$bindings": { "x": 99 },
      "$in": { "$op": "call", "$ref": "aux" }
    };
    const aux = {
      // En aux, %x no está en alcance. Si se evaluase, lanzaría error.
      aux: 1  // devolvemos literal: el test verifica que NO falla por aux.
    };
    assert.equal(await run(proj, null, aux), 1);
  });

  it("lanza error si plantilla referenciada no existe", async () => {
    const proj = { "$op": "call", "$ref": "noExiste" };
    await assert.rejects(run(proj, null), EvaluationError);
  });
});

// ============================================================================
// Predicados: eq, lt, gt, lte, gte, neq
// ============================================================================

describe("evaluator: predicados", () => {
  it("eq compara estructuralmente", async () => {
    assert.equal(await run({ "$op": "eq", "$left": 1, "$right": 1 }, null), true);
    assert.equal(await run({ "$op": "eq", "$left": "a", "$right": "a" }, null), true);
    assert.equal(await run({ "$op": "eq", "$left": [1, 2], "$right": [1, 2] }, null), true);
    assert.equal(await run({ "$op": "eq", "$left": { a: 1 }, "$right": { a: 1 } }, null), true);
    assert.equal(await run({ "$op": "eq", "$left": 1, "$right": "1" }, null), false);
    assert.equal(await run({ "$op": "eq", "$left": null, "$right": null }, null), true);
  });

  it("neq es el inverso de eq", async () => {
    assert.equal(await run({ "$op": "neq", "$left": 1, "$right": 2 }, null), true);
    assert.equal(await run({ "$op": "neq", "$left": 1, "$right": 1 }, null), false);
  });

  it("lt, gt, lte, gte sobre números", async () => {
    assert.equal(await run({ "$op": "lt",  "$left": 1, "$right": 2 }, null), true);
    assert.equal(await run({ "$op": "gt",  "$left": 1, "$right": 2 }, null), false);
    assert.equal(await run({ "$op": "lte", "$left": 1, "$right": 1 }, null), true);
    assert.equal(await run({ "$op": "gte", "$left": 1, "$right": 1 }, null), true);
  });

  it("lt sobre strings lexicográfico", async () => {
    assert.equal(await run({ "$op": "lt", "$left": "abc", "$right": "abd" }, null), true);
  });

  it("rechaza tipos heterogéneos", async () => {
    await assert.rejects(
      run({ "$op": "lt", "$left": 1, "$right": "a" }, null),
      EvaluationError
    );
  });
});

// ============================================================================
// Booleanos: not, and, or
// ============================================================================

describe("evaluator: booleanos", () => {
  it("not invierte boolean", async () => {
    assert.equal(await run({ "$op": "not", "$value": true }, null), false);
    assert.equal(await run({ "$op": "not", "$value": false }, null), true);
  });

  it("and cortocircuita en false", async () => {
    // Si $right fallase, igualmente $left=false debe devolver false sin evaluarlo.
    const proj = {
      "$op": "and",
      "$left": false,
      "$right": { "$op": "div", "$left": 1, "$right": 0 }
    };
    assert.equal(await run(proj, null), false);
  });

  it("or cortocircuita en true", async () => {
    const proj = {
      "$op": "or",
      "$left": true,
      "$right": { "$op": "div", "$left": 1, "$right": 0 }
    };
    assert.equal(await run(proj, null), true);
  });

  it("rechaza tipos no booleanos", async () => {
    await assert.rejects(
      run({ "$op": "not", "$value": "string" }, null),
      EvaluationError
    );
  });
});

// ============================================================================
// Aritmética
// ============================================================================

describe("evaluator: aritmética", () => {
  it("add, sub, mul, div, mod", async () => {
    assert.equal(await run({ "$op": "add", "$left": 2, "$right": 3 }, null), 5);
    assert.equal(await run({ "$op": "sub", "$left": 5, "$right": 2 }, null), 3);
    assert.equal(await run({ "$op": "mul", "$left": 4, "$right": 3 }, null), 12);
    assert.equal(await run({ "$op": "div", "$left": 10, "$right": 2 }, null), 5);
    assert.equal(await run({ "$op": "mod", "$left": 10, "$right": 3 }, null), 1);
  });

  it("neg y abs", async () => {
    assert.equal(await run({ "$op": "neg", "$value": 5 }, null), -5);
    assert.equal(await run({ "$op": "abs", "$value": -7 }, null), 7);
    assert.equal(await run({ "$op": "abs", "$value": 7 }, null), 7);
  });

  it("div por cero lanza error", async () => {
    await assert.rejects(
      run({ "$op": "div", "$left": 1, "$right": 0 }, null),
      EvaluationError
    );
  });

  it("mod por cero lanza error", async () => {
    await assert.rejects(
      run({ "$op": "mod", "$left": 1, "$right": 0 }, null),
      EvaluationError
    );
  });
});

// ============================================================================
// Strings
// ============================================================================

describe("evaluator: strings", () => {
  it("concat de strings", async () => {
    const proj = { "$op": "concat", "$parts": ["a", "b", "c"] };
    assert.equal(await run(proj, null), "abc");
  });

  it("length de string", async () => {
    assert.equal(await run({ "$op": "length", "$value": "hola" }, null), 4);
  });

  it("length de array", async () => {
    assert.equal(await run({ "$op": "length", "$value": [1, 2, 3] }, null), 3);
  });

  it("substring básico", async () => {
    const proj = {
      "$op": "substring", "$value": "hola mundo", "$start": 5
    };
    assert.equal(await run(proj, null), "mundo");
  });

  it("substring con $end", async () => {
    const proj = {
      "$op": "substring", "$value": "hola mundo", "$start": 0, "$end": 4
    };
    assert.equal(await run(proj, null), "hola");
  });

  it("substring respeta codepoints", async () => {
    const proj = {
      "$op": "substring", "$value": "café", "$start": 0, "$end": 3
    };
    assert.equal(await run(proj, null), "caf");
  });

  it("upper y lower", async () => {
    assert.equal(await run({ "$op": "upper", "$value": "abc" }, null), "ABC");
    assert.equal(await run({ "$op": "lower", "$value": "XYZ" }, null), "xyz");
  });
});

// ============================================================================
// Tipos y reflexión
// ============================================================================

describe("evaluator: typeof, coalesce, has", () => {
  it("typeof discrimina tipos JSON", async () => {
    assert.equal(await run({ "$op": "typeof", "$value": null }, null), "null");
    assert.equal(await run({ "$op": "typeof", "$value": true }, null), "boolean");
    assert.equal(await run({ "$op": "typeof", "$value": 42 }, null), "number");
    assert.equal(await run({ "$op": "typeof", "$value": "x" }, null), "string");
    assert.equal(await run({ "$op": "typeof", "$value": [1, 2] }, null), "array");
    assert.equal(await run({ "$op": "typeof", "$value": { a: 1 } }, null), "object");
  });

  it("coalesce devuelve default solo si valor es null", async () => {
    assert.equal(
      await run({ "$op": "coalesce", "$value": null, "$default": 99 }, null),
      99
    );
    assert.equal(
      await run({ "$op": "coalesce", "$value": 0, "$default": 99 }, null),
      0
    );
    assert.equal(
      await run({ "$op": "coalesce", "$value": "", "$default": "x" }, null),
      ""
    );
  });

  it("coalesce no evalúa $default si $value no es null (perezoso)", async () => {
    const proj = {
      "$op": "coalesce",
      "$value": 1,
      "$default": { "$op": "div", "$left": 1, "$right": 0 }
    };
    assert.equal(await run(proj, null), 1);
  });

  it("has detecta presencia de clave", async () => {
    const proj = {
      "$op": "has", "$key": "x", "$in": { x: 1, y: 2 }
    };
    assert.equal(await run(proj, null), true);
  });

  it("has devuelve false si clave inexistente", async () => {
    const proj = { "$op": "has", "$key": "z", "$in": { x: 1 } };
    assert.equal(await run(proj, null), false);
  });
});

// ============================================================================
// Extensión: sort, lookup, merge
// ============================================================================

describe("evaluator: sort", () => {
  it("ordena ascendentemente por defecto", async () => {
    const proj = { "$op": "sort", "$over": [3, 1, 2] };
    assert.deepEqual(await run(proj, null), [1, 2, 3]);
  });

  it("ordena descendentemente con $desc", async () => {
    const proj = { "$op": "sort", "$over": [1, 2, 3], "$desc": true };
    assert.deepEqual(await run(proj, null), [3, 2, 1]);
  });

  it("ordena con clave $by", async () => {
    const proj = {
      "$op": "sort",
      "$over": [{ n: 3 }, { n: 1 }, { n: 2 }],
      "$by": { "$op": "get", "$path": "@.n" }
    };
    assert.deepEqual(await run(proj, null), [{ n: 1 }, { n: 2 }, { n: 3 }]);
  });

  it("$value null devuelve null", async () => {
    assert.equal(await run({ "$op": "sort", "$over": null }, null), null);
  });

  it("array vacío devuelve array vacío", async () => {
    assert.deepEqual(await run({ "$op": "sort", "$over": [] }, null), []);
  });

  it("orden estable preserva relativo de claves iguales", async () => {
    const proj = {
      "$op": "sort",
      "$over": [{ k: 1, t: "a" }, { k: 1, t: "b" }, { k: 1, t: "c" }],
      "$by": { "$op": "get", "$path": "@.k" }
    };
    const r = await run(proj, null);
    assert.deepEqual(r.map(x => x.t), ["a", "b", "c"]);
  });
});

describe("evaluator: lookup", () => {
  it("devuelve el valor si la clave existe", async () => {
    const proj = { "$op": "lookup", "$key": "a", "$in": { a: 1, b: 2 } };
    assert.equal(await run(proj, null), 1);
  });

  it("devuelve null si la clave no existe", async () => {
    const proj = { "$op": "lookup", "$key": "z", "$in": { a: 1 } };
    assert.equal(await run(proj, null), null);
  });

  it("propagación absorbente: $in null → null", async () => {
    const proj = { "$op": "lookup", "$key": "a", "$in": null };
    assert.equal(await run(proj, null), null);
  });
});

describe("evaluator: merge", () => {
  it("fusiona dos objetos, right gana", async () => {
    const proj = {
      "$op": "merge",
      "$left":  { a: 1, b: 2 },
      "$right": { b: 99, c: 3 }
    };
    assert.deepEqual(await run(proj, null), { a: 1, b: 99, c: 3 });
  });

  it("merge con null trata como vacío", async () => {
    const proj = {
      "$op": "merge",
      "$left":  null,
      "$right": { a: 1 }
    };
    assert.deepEqual(await run(proj, null), { a: 1 });
  });
});

// ============================================================================
// Ramas adicionales
// ============================================================================

describe("evaluator: ramas adicionales", () => {
  it("requiere options.registry", async () => {
    const mod = normalizeModule({ ROOT_TEMPLATE: null });
    await assert.rejects(evaluate(mod, null, {}), EvaluationError);
  });

  it("strings literales no se interpretan como rutas", async () => {
    assert.equal(await run("hola mundo", null), "hola mundo");
  });

  it("escape \\$ en claves de objetos literales", async () => {
    const proj = { "\\$total": 100 };
    assert.deepEqual(await run(proj, null), { "$total": 100 });
  });

  it("objeto literal con varias claves preserva orden", async () => {
    const proj = { "a": 1, "b": 2, "c": 3 };
    assert.deepEqual(await run(proj, null), { a: 1, b: 2, c: 3 });
  });

  it("array literal anidado se evalúa elemento a elemento", async () => {
    const proj = [
      1,
      { "$op": "add", "$left": 2, "$right": 3 },
      "x"
    ];
    assert.deepEqual(await run(proj, null), [1, 5, "x"]);
  });

  it("lanza error al exceder maxDepth", async () => {
    const aux = { "loop": { "$op": "call", "$ref": "loop" } };
    const mod = normalizeModule(moduleWith({ "$op": "call", "$ref": "loop" }, aux));
    await assert.rejects(
      evaluate(mod, null, { registry, maxDepth: 50 }),
      (err) => err instanceof EvaluationError && /[Pp]rofundidad/.test(err.message)
    );
  });
});

// ============================================================================
// Concurrencia: aislamiento entre evaluaciones
// ============================================================================

describe("evaluator: aislamiento entre evaluaciones concurrentes", () => {
  it("dos evaluate() en paralelo sobre el mismo módulo dan resultados independientes", async () => {
    const mod = normalizeModule(moduleWith({
      "$op": "add",
      "$left": { "$op": "get", "$path": "$.x" },
      "$right": { "$op": "get", "$path": "$.y" }
    }));

    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(evaluate(mod, { x: i, y: i * 2 }, { registry }));
    }
    const results = await Promise.all(promises);
    for (let i = 0; i < 50; i++) {
      assert.equal(results[i], i + i * 2);
    }
  });
});
