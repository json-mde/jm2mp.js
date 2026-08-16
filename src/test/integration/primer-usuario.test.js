/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file Test de integración: ejercicio 1 (extraer el primer usuario).
 *
 * Recreamos el ejercicio diseñado durante el modelado del lenguaje.
 *
 * La técnica usa fold con @.index == 0 para identificar al primer elemento.
 * Como fold itera por la derecha, el primer elemento se procesa AL FINAL,
 * y su valor sobrescribe el acumulador en ese paso. Los demás pasos
 * preservan el acumulador (rama $else devuelve @.acc).
 */

/**
 * @module jm2mp/test/integration/primer_usuario
 * @description
 * Test de integración: ejercicio 1 (extraer el primer usuario).
**/

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { evaluate } from "../../evaluator.js";
import { createNativeRegistry } from "../../adapters/helpers.js";
import { normalizeModule } from "../../modules/normalizer.js";
import { moduleWith } from "../../modules/helpers.js";

const registry = createNativeRegistry();

describe("Integración: extraer primer usuario", () => {
  const documento = {
    "Users": [
      { "name": "Luis Maria", "emails": ["Alpha.One", "Alpha.Two"] },
      { "name": "Inés",       "emails": ["Bravo.One", "Bravo.Two"] }
    ]
  };

  it("extrae el primer usuario usando fold con @.index", async () => {
    const proj = {
      "$op": "foldArr",
      "$over": { "$op": "get", "$path": "$.Users" },
      "$init": null,
      "$step": {
        "$op": "if",
        "$cond": {
          "$op": "eq",
          "$left":  { "$op": "get", "$path": "@.index" },
          "$right": 0
        },
        "$then": { "$op": "get", "$path": "@.item" },
        "$else": { "$op": "get", "$path": "@.acc" }
      }
    };
    const mod = normalizeModule(moduleWith(proj));
    const result = await evaluate(mod, documento, { registry });
    assert.deepEqual(result, {
      "name": "Luis Maria",
      "emails": ["Alpha.One", "Alpha.Two"]
    });
  });

  it("array vacío devuelve null (el $init)", async () => {
    const proj = {
      "$op": "foldArr",
      "$over": [],
      "$init": null,
      "$step": {
        "$op": "if",
        "$cond": {
          "$op": "eq",
          "$left":  { "$op": "get", "$path": "@.index" },
          "$right": 0
        },
        "$then": { "$op": "get", "$path": "@.item" },
        "$else": { "$op": "get", "$path": "@.acc" }
      }
    };
    const mod = normalizeModule(moduleWith(proj));
    const result = await evaluate(mod, null, { registry });
    assert.equal(result, null);
  });

  it("usuarios null absorbe la proyección", async () => {
    const proj = {
      "$op": "foldArr",
      "$over": { "$op": "get", "$path": "$.NoExisten" },
      "$init": null,
      "$step": { "$op": "get", "$path": "@.acc" }
    };
    const mod = normalizeModule(moduleWith(proj));
    const result = await evaluate(mod, documento, { registry });
    assert.equal(result, null);
  });

  it("un solo usuario también es el primero", async () => {
    const proj = {
      "$op": "foldArr",
      "$over": { "$op": "get", "$path": "$.Users" },
      "$init": null,
      "$step": {
        "$op": "if",
        "$cond": {
          "$op": "eq",
          "$left":  { "$op": "get", "$path": "@.index" },
          "$right": 0
        },
        "$then": { "$op": "get", "$path": "@.item" },
        "$else": { "$op": "get", "$path": "@.acc" }
      }
    };
    const docMini = { Users: [{ name: "Single" }] };
    const mod = normalizeModule(moduleWith(proj));
    const result = await evaluate(mod, docMini, { registry });
    assert.deepEqual(result, { name: "Single" });
  });
});
