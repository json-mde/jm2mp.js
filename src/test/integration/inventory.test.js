/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The module [users]{@link module:jm2mp/test/integration/inventory}
 * implements several **integration test** for `inventory` _use cases_.
**/

/**
 * @module jm2mp/test/integration/inventory
 * @description
 * This module implements several **integration test** for `inventory`
 * _use cases_:
 *
 * - Calculate stock and price from the store's inventory:
 *   - `store`: direct copy from root element.
 *   - `total_inventory_value`: sum-product (stock * price) of all products.
 *   - `products_below_critical_threshold`: sub-object with SKUs where ( stock <= threshold ).
 *   - `stock_per_category`: grouping by category with stock totals.
 *     Calculating `stock_per_category` requires a dynamic lookup in the
 *     accumulator based on a computed key. We express this using the
 *     `lookup` _template command_, which provides O(1) access to an
 *     object by string key.
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
/* ------------------------------------------------------------------ */

/**
 * @constant {@link module:jm2mp/adapters/registry.AdapterRegistry}
 * @description
 * The [AdapterRegistry]{@link module:jm2mp/adapters/registry.AdapterRegistry}
 * created as _singleton_ an used in every integration test.
**/
const registry = createNativeRegistry();

/* ------------------------------------------------------------------ */

/**
 * @constant {object}
 * @description
 * The object used as _source document_ in every integration test.
 */
const source_document = {
  "store": "Madrid-01",
  "threshold": 10,
  "products": {
    "SKU-A100": { "name": "Mechanical Keyboard", "category": "peripheral", "stock": 45, "price":  89.90 },
    "SKU-A101": { "name": "Wireless Mouse",      "category": "peripheral", "stock":  8, "price":  35.00 },
    "SKU-B200": { "name": "Monitor 27 inches",   "category": "screen",     "stock": 12, "price": 320.00 },
    "SKU-B201": { "name": "Monitor 32 inches",   "category": "screen",     "stock":  3, "price": 480.00 },
    "SKU-C300": { "name": "Webcam HD",           "category": "peripheral", "stock":  0, "price":  65.00 },
    "SKU-D400": { "name": "Bluetooth earphones", "category": "audio",      "stock": 25, "price": 120.00 }
  }
};

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

describe("Integration test: inventory - total value as sum·product", () => {
  it("SUM( stock * price )", async () => {
    const projection = {
      "$op": "foldObj",
      "$over": { "$op": "get", "$path": "$.products" },
      "$init": 0,
      "$step": {
        "$op": "add",
        "$left": { "$op": "get", "$path": "@.acc" },
        "$right": {
          "$op": "mul",
          "$left":  { "$op": "get", "$path": "@.value.stock" },
          "$right": { "$op": "get", "$path": "@.value.price" }
        }
      }
    };
    const projection_module = normalizeModule(moduleWith(projection));
    const resultant_document = await evaluate(projection_module, source_document, { registry });
    // 45*89.90 + 8*35 + 12*320 + 3*480 + 0*65 + 25*120 =
    // = 4045.50 + 280.00 + 3840.00 + 1440.00 + 0.00 + 3000.00 =
    // = 12605.50
    assert.ok(Math.abs(resultant_document - 12605.50) < 0.01,
              `Expected='12605.50', Actual='${resultant_document}'`);
  });
});

/* ------------------------------------------------------------------ */

describe("Integration test: inventory - products below critical threshold", () => {
  it("FILTER( products[*].stock <= threshold )", async () => {
    const projection = {
      "$op": "foldObj",
      "$over": { "$op": "get", "$path": "$.products" },
      "$init": {},
      "$step": {
        "$op": "if",
        "$cond": {
          "$op": "lte",
          "$left":  { "$op": "get", "$path": "@.value.stock" },
          "$right": { "$op": "get", "$path": "$.threshold" }
        },
        "$then": {
          "$op": "insert",
          "$key": { "$op": "get", "$path": "@.key" },
          "$value": {
            "nombre": { "$op": "get", "$path": "@.value.name" },
            "stock":  { "$op": "get", "$path": "@.value.stock" }
          },
          "$into": { "$op": "get", "$path": "@.acc" }
        },
        "$else": { "$op": "get", "$path": "@.acc" }
      }
    };
    const projection_module = normalizeModule(moduleWith(projection));
    const resultant_document = await evaluate(projection_module, source_document, { registry });
    assert.deepEqual(Object.keys(resultant_document).sort(), [
      "SKU-A101", "SKU-B201", "SKU-C300"
    ]);
    assert.deepEqual(resultant_document["SKU-A101"], { nombre: "Wireless Mouse", stock: 8 });
    assert.deepEqual(resultant_document["SKU-B201"], { nombre: "Monitor 32 inches", stock: 3 });
    assert.deepEqual(resultant_document["SKU-C300"], { nombre: "Webcam HD", stock: 0 });
  });
});

/* ------------------------------------------------------------------ */

describe("Integration test: inventory - stock per category", () => {
  it("SELECT SUM( stock ) FROM lookup( products ) GROUP-BY( category )", async () => {
    const projection = {
      "$op": "foldObj",
      "$over": { "$op": "get", "$path": "$.products" },
      "$init": {},
      "$step": {
        "$op": "insert",
        "$key": { "$op": "get", "$path": "@.value.category" },
        "$value": {
          "$op": "add",
          "$left": {
            "$op": "coalesce",
            "$value": {
              "$op": "lookup",
              "$key": { "$op": "get", "$path": "@.value.category" },
              "$in":  { "$op": "get", "$path": "@.acc" }
            },
            "$default": 0
          },
          "$right": { "$op": "get", "$path": "@.value.stock" }
        },
        "$into": { "$op": "get", "$path": "@.acc" }
      }
    };
    const projection_module = normalizeModule(moduleWith(projection));
    const resultant_document = await evaluate(projection_module, source_document, { registry });
    // peripheral: 45 + 8 + 0 = 53; screen: 12 + 3 = 15; audio: 25.
    assert.deepEqual(resultant_document, {
      "peripheral": 53,
      "screen":     15,
      "audio":      25
    });
  });
});

/* ------------------------------------------------------------------ */

describe("Integration test: inventory - full projection", () => {
  it("Full projection in a single pass", async () => {
    const projection = {
      // Store.
      "store": { "$op": "get", "$path": "$.store" },
      // Total inventory value.
      "total_inventory_value": {
        "$op": "foldObj",
        "$over": { "$op": "get", "$path": "$.products" },
        "$init": 0,
        "$step": {
          "$op": "add",
          "$left": { "$op": "get", "$path": "@.acc" },
          "$right": {
            "$op": "mul",
            "$left":  { "$op": "get", "$path": "@.value.stock" },
            "$right": { "$op": "get", "$path": "@.value.price" }
          }
        }
      },
      // Products below the critical threshold.
      "products_below_critical_threshold": {
        "$op": "foldObj",
        "$over": { "$op": "get", "$path": "$.products" },
        "$init": {},
        "$step": {
          "$op": "if",
          "$cond": {
            "$op": "lte",
            "$left":  { "$op": "get", "$path": "@.value.stock" },
            "$right": { "$op": "get", "$path": "$.threshold" }
          },
          "$then": {
            "$op": "insert",
            "$key": { "$op": "get", "$path": "@.key" },
            "$value": {
              "name":  { "$op": "get", "$path": "@.value.name"  },
              "stock": { "$op": "get", "$path": "@.value.stock" }
            },
            "$into": { "$op": "get", "$path": "@.acc" }
          },
          "$else": { "$op": "get", "$path": "@.acc" }
        }
      },
      // Aggregated stock per category.
      "stock_per_category": {
        "$op": "foldObj",
        "$over": { "$op": "get", "$path": "$.products" },
        "$init": {},
        "$step": {
          "$op": "insert",
          "$key": { "$op": "get", "$path": "@.value.category" },
          "$value": {
            "$op": "add",
            "$left": {
              "$op": "coalesce",
              "$value": {
                "$op": "lookup",
                "$key": { "$op": "get", "$path": "@.value.category" },
                "$in":  { "$op": "get", "$path": "@.acc" }
              },
              "$default": 0
            },
            "$right": { "$op": "get", "$path": "@.value.stock" }
          },
          "$into": { "$op": "get", "$path": "@.acc" }
        }
      }
    };
    const projection_module = normalizeModule(moduleWith(projection));
    const resultant_document = await evaluate(projection_module, source_document, { registry });
    //// console.log('resultant_document', JSON.stringify(resultant_document,undefined,'  '));

    assert.equal(resultant_document.store, "Madrid-01");
    assert.ok(Math.abs(resultant_document.total_inventory_value - 12605.50) < 0.01);
    assert.deepEqual(Object.keys(resultant_document.products_below_critical_threshold).sort(), [
      "SKU-A101", "SKU-B201", "SKU-C300"
    ]);
    assert.deepEqual(resultant_document.stock_per_category, {
      "peripheral": 53,
      "screen":     15,
      "audio":      25
    });
  });
});

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/test/integration/inventory.test.js    */
