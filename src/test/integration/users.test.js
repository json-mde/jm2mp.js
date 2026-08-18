/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The module [users]{@link module:jm2mp/test/integration/users}
 * implements several **integration test** for `user` _use cases_.
**/

/**
 * @module jm2mp/test/integration/users
 * @description
 * This module implements several **integration test** for `user`
 * _use cases_:
 * 
 * - Extract first user.
 *   This technique uses `foldArr` with `@.index === 0` to identify the
 *   first element.
 *   Because `foldArr` iterates right-to-left, the first item is
 *   processed at last, and its value overwrites the accumulator in
 *   every step; the rest of steps just preserve the accumulator
 *   (branch `else` returns `@.acc`).
 **/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { evaluate } from "../../evaluator.js";
import { createNativeRegistry } from "../../adapters/helpers.js";
import { normalizeModule } from "../../modules/normalizer.js";
import { moduleWith } from "../../modules/helpers.js";

/* ------------------------------------------------------------------ */

const registry = createNativeRegistry();

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

describe("Integration test: users", () => {

/* ------------------------------------------------------------------ */

  const documento = {
    "Users": [
      { "name": "Luis Maria", "emails": ["Alpha.One", "Alpha.Two"] },
      { "name": "Inés",       "emails": ["Bravo.One", "Bravo.Two"] }
    ]
  };

/* ------------------------------------------------------------------ */

  it("It extracts the first user using foldArr with @.index", async () => {
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

/* ------------------------------------------------------------------ */

  it("Empty array returns $init (its actual null value)", async () => {
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

/* ------------------------------------------------------------------ */

  it("Undefined $over returns $init (its actual null value)", async () => {
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

/* ------------------------------------------------------------------ */

  it("Single user is also a first user", async () => {
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

/* ------------------------------------------------------------------ */

});  // describe

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/test/integration/users.test.js        */
