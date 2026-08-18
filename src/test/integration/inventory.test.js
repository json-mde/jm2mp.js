/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file Test de integración: ejercicio 2 (inventario completo).
 *
 * Reproduce íntegramente el ejercicio diseñado durante el modelado:
 *  - almacen: copia directa desde la raíz.
 *  - valor_total_inventario: suma de stock × precio para todos los productos.
 *  - productos_criticos: subobjeto con SKUs cuyo stock ≤ umbral_critico.
 *  - stock_por_categoria: agrupación por categoría con suma de stocks.
 *
 * El cálculo de stock_por_categoria requiere lookup dinámico en el acumulador
 * por una clave calculada. Lo expresamos con la extensión `lookup`, que provee
 * acceso O(1) por clave string a un objeto.
 */

/**
 * @module jm2mp/test/integration/inventario
 * @description
 * Test de integración: ejercicio 2 (inventario completo).
**/

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { evaluate } from "../../evaluator.js";
import { createNativeRegistry } from "../../adapters/helpers.js";
import { normalizeModule } from "../../modules/normalizer.js";
import { moduleWith } from "../../modules/helpers.js";

const registry = createNativeRegistry();

const documento = {
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

describe("Integration test: inventory - total value as sum·product", () => {
  it("SUM( stock * price )", async () => {
    const proj = {
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
    const mod = normalizeModule(moduleWith(proj));
    const result = await evaluate(mod, documento, { registry });
    // 45*89.90 + 8*35 + 12*320 + 3*480 + 0*65 + 25*120 =
    // = 4045.50 + 280.00 + 3840.00 + 1440.00 + 0.00 + 3000.00 =
    // = 12605.50
    assert.ok(Math.abs(result - 12605.50) < 0.01, `Expected='12605.50', Actual='${result}'`);
  });
});

describe("Integration test: inventory - products below critical threshold", () => {
  it("FILTER( products[*].stock <= threshold )", async () => {
    const proj = {
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
    const mod = normalizeModule(moduleWith(proj));
    const result = await evaluate(mod, documento, { registry });
    assert.deepEqual(Object.keys(result).sort(), [
      "SKU-A101", "SKU-B201", "SKU-C300"
    ]);
    assert.deepEqual(result["SKU-A101"], { nombre: "Wireless Mouse", stock: 8 });
    assert.deepEqual(result["SKU-B201"], { nombre: "Monitor 32 inches", stock: 3 });
    assert.deepEqual(result["SKU-C300"], { nombre: "Webcam HD", stock: 0 });
  });
});

describe("Integration test: inventory - stock per category", () => {
  it("SELECT SUM( stock ) FROM lookup( products ) GROUP-BY( category )", async () => {
    const proj = {
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
    const mod = normalizeModule(moduleWith(proj));
    const result = await evaluate(mod, documento, { registry });
    // peripheral: 45 + 8 + 0 = 53; screen: 12 + 3 = 15; audio: 25.
    assert.deepEqual(result, {
      "peripheral": 53,
      "screen":     15,
      "audio":      25
    });
  });
});

describe("Integration test: inventory - full projection", () => {
  it("Full projection in a single pass", async () => {
    const proj = {
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
    const mod = normalizeModule(moduleWith(proj));
    const result = await evaluate(mod, documento, { registry });
    //// console.log('result', JSON.stringify(result,undefined,'  '));

    assert.equal(result.store, "Madrid-01");
    assert.ok(Math.abs(result.total_inventory_value - 12605.50) < 0.01);
    assert.deepEqual(Object.keys(result.products_below_critical_threshold).sort(), [
      "SKU-A101", "SKU-B201", "SKU-C300"
    ]);
    assert.deepEqual(result.stock_per_category, {
      "peripheral": 53,
      "screen":     15,
      "audio":      25
    });
  });
});
