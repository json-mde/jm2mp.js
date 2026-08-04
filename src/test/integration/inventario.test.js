/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @module test/integration/inventario
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

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { evaluate } from "../../evaluator.js";
import { createNativeRegistry } from "../../adapters/helpers.js";
import { normalizeModule } from "../../modules/normalizer.js";
import { moduleWith } from "../../modules/helpers.js";

const registry = createNativeRegistry();

const documento = {
  "almacen": "Madrid-01",
  "umbral_critico": 10,
  "productos": {
    "SKU-A100": { "nombre": "Teclado mecánico",      "categoria": "perifericos", "stock": 45, "precio":  89.90 },
    "SKU-A101": { "nombre": "Ratón inalámbrico",     "categoria": "perifericos", "stock":  8, "precio":  35.00 },
    "SKU-B200": { "nombre": "Monitor 27 pulgadas",   "categoria": "pantallas",   "stock": 12, "precio": 320.00 },
    "SKU-B201": { "nombre": "Monitor 32 pulgadas",   "categoria": "pantallas",   "stock":  3, "precio": 480.00 },
    "SKU-C300": { "nombre": "Webcam HD",             "categoria": "perifericos", "stock":  0, "precio":  65.00 },
    "SKU-D400": { "nombre": "Auriculares Bluetooth", "categoria": "audio",       "stock": 25, "precio": 120.00 }
  }
};

describe("Integración: inventario — valor total", () => {
  it("calcula la suma de stock × precio", async () => {
    const proj = {
      "$op": "foldObj",
      "$over": { "$op": "get", "$path": "$.productos" },
      "$init": 0,
      "$step": {
        "$op": "add",
        "$left": { "$op": "get", "$path": "@.acc" },
        "$right": {
          "$op": "mul",
          "$left":  { "$op": "get", "$path": "@.value.stock" },
          "$right": { "$op": "get", "$path": "@.value.precio" }
        }
      }
    };
    const mod = normalizeModule(moduleWith(proj));
    const result = await evaluate(mod, documento, { registry });
    // 45×89.90 + 8×35 + 12×320 + 3×480 + 0×65 + 25×120 = 4045.50+280+3840+1440+0+3000 = 12605.50
    assert.ok(Math.abs(result - 12605.50) < 0.01, `esperado 12605.50, recibido ${result}`);
  });
});

describe("Integración: inventario — productos críticos", () => {
  it("filtra productos con stock ≤ umbral_critico", async () => {
    const proj = {
      "$op": "foldObj",
      "$over": { "$op": "get", "$path": "$.productos" },
      "$init": {},
      "$step": {
        "$op": "if",
        "$cond": {
          "$op": "lte",
          "$left":  { "$op": "get", "$path": "@.value.stock" },
          "$right": { "$op": "get", "$path": "$.umbral_critico" }
        },
        "$then": {
          "$op": "insert",
          "$key": { "$op": "get", "$path": "@.key" },
          "$value": {
            "nombre": { "$op": "get", "$path": "@.value.nombre" },
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
    assert.deepEqual(result["SKU-A101"], { nombre: "Ratón inalámbrico", stock: 8 });
    assert.deepEqual(result["SKU-B201"], { nombre: "Monitor 32 pulgadas", stock: 3 });
    assert.deepEqual(result["SKU-C300"], { nombre: "Webcam HD", stock: 0 });
  });
});

describe("Integración: inventario — stock por categoría", () => {
  it("agrupa stocks por categoría usando lookup en el acumulador", async () => {
    const proj = {
      "$op": "foldObj",
      "$over": { "$op": "get", "$path": "$.productos" },
      "$init": {},
      "$step": {
        "$op": "insert",
        "$key": { "$op": "get", "$path": "@.value.categoria" },
        "$value": {
          "$op": "add",
          "$left": {
            "$op": "coalesce",
            "$value": {
              "$op": "lookup",
              "$key": { "$op": "get", "$path": "@.value.categoria" },
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
    // perifericos: 45 + 8 + 0 = 53; pantallas: 12 + 3 = 15; audio: 25.
    assert.deepEqual(result, {
      "perifericos": 53,
      "pantallas":   15,
      "audio":       25
    });
  });
});

describe("Integración: inventario — proyección completa", () => {
  it("produce el documento esperado en una sola pasada", async () => {
    const proj = {
      "almacen": { "$op": "get", "$path": "$.almacen" },

      "valor_total_inventario": {
        "$op": "foldObj",
        "$over": { "$op": "get", "$path": "$.productos" },
        "$init": 0,
        "$step": {
          "$op": "add",
          "$left": { "$op": "get", "$path": "@.acc" },
          "$right": {
            "$op": "mul",
            "$left":  { "$op": "get", "$path": "@.value.stock" },
            "$right": { "$op": "get", "$path": "@.value.precio" }
          }
        }
      },

      "productos_criticos": {
        "$op": "foldObj",
        "$over": { "$op": "get", "$path": "$.productos" },
        "$init": {},
        "$step": {
          "$op": "if",
          "$cond": {
            "$op": "lte",
            "$left":  { "$op": "get", "$path": "@.value.stock" },
            "$right": { "$op": "get", "$path": "$.umbral_critico" }
          },
          "$then": {
            "$op": "insert",
            "$key": { "$op": "get", "$path": "@.key" },
            "$value": {
              "nombre": { "$op": "get", "$path": "@.value.nombre" },
              "stock":  { "$op": "get", "$path": "@.value.stock" }
            },
            "$into": { "$op": "get", "$path": "@.acc" }
          },
          "$else": { "$op": "get", "$path": "@.acc" }
        }
      },

      "stock_por_categoria": {
        "$op": "foldObj",
        "$over": { "$op": "get", "$path": "$.productos" },
        "$init": {},
        "$step": {
          "$op": "insert",
          "$key": { "$op": "get", "$path": "@.value.categoria" },
          "$value": {
            "$op": "add",
            "$left": {
              "$op": "coalesce",
              "$value": {
                "$op": "lookup",
                "$key": { "$op": "get", "$path": "@.value.categoria" },
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

    assert.equal(result.almacen, "Madrid-01");
    assert.ok(Math.abs(result.valor_total_inventario - 12605.50) < 0.01);
    assert.deepEqual(Object.keys(result.productos_criticos).sort(), [
      "SKU-A101", "SKU-B201", "SKU-C300"
    ]);
    assert.deepEqual(result.stock_por_categoria, {
      "perifericos": 53,
      "pantallas":   15,
      "audio":       25
    });
  });
});
