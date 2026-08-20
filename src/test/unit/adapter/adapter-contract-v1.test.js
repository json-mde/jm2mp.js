/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file Tests de contrato que TODOS los adaptadores deben pasar.
 *
 * Estos tests parametrizados garantizan que cada adaptador (nativo,
 * jsonpath, jsonata, jsonquery, futuros) replica el comportamiento uniforme
 * que el patrón Adapter exige: propagación absorbente de null, gestión de
 * errores, devolución de null en ausencia, escalar (no array) en match único.
 *
 * Cada adaptador foráneo se carga si su librería está disponible; si no,
 * se skipean los tests específicos. Esto permite que el comando
 * `node --test` funcione sin que todas las dependencias opcionales
 * estén instaladas.
 */

/**
 * @module jm2mp/test/unit/adapter/adapter_contract_v1
 * @description
 * Tests de contrato que TODOS los adaptadores deben pasar.
**/

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { createNativeAdapter } from "../../../adapters/native.js";
import { isModuleAvailable } from "../../../modules/helpers.js";

/**
 * Ejecuta una batería de tests de contrato para un adaptador dado.
 *
 * @param {string} syntaxName - Nombre de la sintaxis (para describe).
 * @param {() => Promise<import("../../../adapters/registry.js").QueryAdapter>} createAdapter
 * @param {object} pathSelector - Mapa caso lógico → path en esta sintaxis.
 *   Si un caso no tiene path para esta sintaxis, se salta ese caso.
 * @param {string} [pathSelector.simpleField] - Path que accede al campo "campo".
 * @param {string} [pathSelector.missingField] - Path que accede a un campo inexistente.
 * @param {string} [pathSelector.invalidExpression] - Path sintácticamente inválido.
 */
function runContractTests(syntaxName, createAdapter, pathSelector) {
  describe(`Contrato del adaptador: ${syntaxName}`, () => {
    let adapter;

    // Inicialización antes de los tests.
    it("se construye correctamente", async () => {
      adapter = await createAdapter();
      assert.equal(adapter.name, syntaxName);
      assert.equal(typeof adapter.evaluate, "function");
      assert.equal(typeof adapter.validate, "function");
      assert.ok(adapter.fallbackPolicy);
    });

    // Los siguientes tests usan adapter inicializado en el primer it.
    // En node:test, el orden secuencial dentro de un describe está garantizado.

    if (pathSelector.simpleField) {
      it("acceso a un campo existente devuelve el valor escalar (no array)", async () => {
        const cache = new Map();
        const input = { campo: 42 };
        const env = { ctx: input, root: input, aliases: {} };
        const result = await adapter.evaluate(
          pathSelector.simpleField,
          input,
          cache,
          env
        );
        // Verificación explícita: NO es array (debe estar desempaquetado).
        assert.equal(Array.isArray(result), false,
          `Resultado de match único debe ser escalar, no array: ${JSON.stringify(result)}`);
        assert.equal(result, 42);
      });
    }

    if (pathSelector.missingField) {
      it("acceso a un campo inexistente devuelve null", async () => {
        const cache = new Map();
        const input = { otro: 42 };
        const env = { ctx: input, root: input, aliases: {} };
        const result = await adapter.evaluate(
          pathSelector.missingField,
          input,
          cache,
          env
        );
        assert.equal(result, null);
      });
    }

    if (pathSelector.simpleField) {
      it("input null produce null sin invocar la librería", async () => {
        const cache = new Map();
        const env = { ctx: null, root: null, aliases: {} };
        const result = await adapter.evaluate(
          pathSelector.simpleField,
          null,
          cache,
          env
        );
        assert.equal(result, null);
      });

      it("input undefined produce null sin invocar la librería", async () => {
        const cache = new Map();
        const env = { ctx: null, root: null, aliases: {} };
        const result = await adapter.evaluate(
          pathSelector.simpleField,
          undefined,
          cache,
          env
        );
        assert.equal(result, null);
      });
    }

    if (pathSelector.invalidExpression) {
      it("expresión inválida lanza error de la jerarquía (validate)", async () => {
        await assert.rejects(
          async () => adapter.validate(pathSelector.invalidExpression),
          (err) => /Error/.test(err.name)
        );
      });
    }

    it("expone fallbackPolicy con campos documentados", () => {
      const policy = adapter.fallbackPolicy;
      assert.equal(typeof policy.missing, "string");
      assert.equal(typeof policy.typeError, "string");
      assert.equal(typeof policy.nullInput, "string");
    });

    it("evaluate y validate son asíncronos (devuelven Promise)", async () => {
      if (pathSelector.simpleField) {
        const cache = new Map();
        const input = { campo: 1 };
        const env = { ctx: input, root: input, aliases: {} };
        const evalResult = adapter.evaluate(pathSelector.simpleField, input, cache, env);
        assert.ok(evalResult && typeof evalResult.then === "function",
          "adapter.evaluate debe devolver Promise");
        await evalResult;

        const validateResult = adapter.validate(pathSelector.simpleField);
        assert.ok(validateResult && typeof validateResult.then === "function",
          "adapter.validate debe devolver Promise");
        await validateResult;
      }
    });

  });

}


// ============================================================================
// Adaptador nativo (siempre disponible).
// ============================================================================

runContractTests("native", async () => createNativeAdapter(), {
  simpleField: "@.campo",
  missingField: "@.noExiste",
  invalidExpression: "##sintaxis inválida##",
});

// Test extra específico del nativo: acceso a array por índice.
describe("Contrato extra del nativo: $path como array", () => {

  it("array de accesores funciona como string equivalente", async () => {
    const adapter = createNativeAdapter();
    const cache = new Map();
    const env = { ctx: null, root: null, aliases: {} };
    const result = await adapter.evaluate(
      ["a", "b", 1],
      { a: { b: [10, 20, 30] } },
      cache,
      env
    );
    assert.equal(result, 20);
  });

  it("array vacío de accesores devuelve el input", async () => {
    const adapter = createNativeAdapter();
    const cache = new Map();
    const env = { ctx: null, root: null, aliases: {} };
    const input = { a: 1 };
    const result = await adapter.evaluate([], input, cache, env);
    assert.deepEqual(result, input);
  });

  it("validate acepta $path string", async () => {
    const adapter = createNativeAdapter();
    await adapter.validate("$.a.b");
    await adapter.validate("@.x");
    await adapter.validate("%alias");
  });

  it("validate acepta $path array bien formado", async () => {
    const adapter = createNativeAdapter();
    await adapter.validate(["a", 0, "b"]);
    await adapter.validate([]);
  });

  it("validate rechaza $path con segmento inválido", async () => {
    const adapter = createNativeAdapter();
    await assert.rejects(adapter.validate(["a", true]), /Error/);
  });

  it("validate rechaza $path de tipo no soportado", async () => {
    const adapter = createNativeAdapter();
    await assert.rejects(adapter.validate(42), /Error/);
    await assert.rejects(adapter.validate(null), /Error/);
  });
});  // describe

// ============================================================================
// Adaptador JSONPath (si jsonpath-plus está instalado).
// ============================================================================

const jsonpathAvailable = await isModuleAvailable("jsonpath-plus");

if (jsonpathAvailable) {
  const { createJsonPathAdapter } = await import("../../../adapters/jsonpath.js");
  runContractTests("jsonpath", createJsonPathAdapter, {
    simpleField: "$.campo",
    missingField: "$.noExiste",
    invalidExpression: null,  // "$.[malformed",
  });
} else {
  describe("Contrato del adaptador: jsonpath", () => {
    it("se omite porque jsonpath-plus no está instalado", { skip: true }, () => {});
  });
}


// ============================================================================
// Adaptador JSONata (si jsonata está instalado).
// ============================================================================

const jsonataAvailable = await isModuleAvailable("jsonata");

if (jsonataAvailable) {
  const { createJsonataAdapter } = await import("../../../adapters/jsonata.js");
  runContractTests("jsonata", () => createJsonataAdapter(), {
    simpleField: "campo",
    missingField: "noExiste",
    invalidExpression: "campo[",
  });

  // Tests específicos del adaptador JSONata: timeout.
  describe("JSONata: timeout", () => {
    it("timeout=0 desactiva la protección", async () => {
      const { createJsonataAdapter } = await import("../../../adapters/jsonata.js");
      const adapter = await createJsonataAdapter({ timeout: 0 });
      const cache = new Map();
      const env = { ctx: null, root: null, aliases: {} };
      const result = await adapter.evaluate("$count(arr)", { arr: [1, 2, 3] }, cache, env);
      assert.equal(result, 3);
    });

    it("fallbackPolicy refleja el timeout configurado", async () => {
      const { createJsonataAdapter } = await import("../../../adapters/jsonata.js");
      const adapterSinTimeout = await createJsonataAdapter();
      const adapterConTimeout = await createJsonataAdapter({ timeout: 1000 });
      assert.match(adapterSinTimeout.fallbackPolicy.timeout, /0 \(no\)/i);
      assert.match(adapterConTimeout.fallbackPolicy.timeout, /1000 \(yes/);
    });
  });
} else {
  describe("Contrato del adaptador: jsonata", () => {
    it("se omite porque jsonata no está instalado", { skip: true }, () => {});
  });
}


// ============================================================================
// Adaptador JSON Query (si la librería está instalada).
// ============================================================================

const jsonqueryAvailable = await isModuleAvailable("@jsonquerylang/jsonquery");

if (jsonqueryAvailable) {
  const { createJsonQueryAdapter } = await import("../../../adapters/jsonquery.js");
  runContractTests("jsonquery", createJsonQueryAdapter, {
    simpleField: ".campo",
    missingField: ".noExiste",
    invalidExpression: "((((",
  });
} else {
  describe("Contrato del adaptador: jsonquery", () => {
    it("se omite porque @jsonquerylang/jsonquery no está instalado", { skip: true }, () => {});
  });
}
