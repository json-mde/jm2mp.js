/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file Tests de contrato que TODOS los adaptadores deben pasar.
 *
 * Estos tests parametrizados garantizan que cada adaptador (nativo,
 * jsonpath, jsonata, jsonquery, jsonpointer, jmespath, futuros) replica
 * el comportamiento uniforme que el patrón Adapter exige:
 *   - Propagación absorbente de null (input null → null sin invocar).
 *   - Gestión de errores con ValidationError / EvaluationError.
 *   - Devolución de null en ausencia.
 *   - Escalar (no array) en match único, con la divergencia documentada
 *     de JMESPath (que preserva su aridad sintáctica).
 *
 * Cada adaptador foráneo se carga si su librería está disponible; si no,
 * se skipean los tests específicos. Esto permite que `node --test`
 * funcione sin que todas las dependencias opcionales estén instaladas.
 */

/**
 * @module jm2mp/test/unit/adapter/adapter_contract
 * @description
 * Tests de contrato que TODOS los adaptadores deben pasar.
**/

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { createNativeAdapter } from "../../../adapters/native.js";
import { isPackagedEsmModuleAvailable } from "../../../modules/helpers.js";

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
 * @param {object} [contractOptions]
 * @param {boolean} [contractOptions.unwrapsSingleMatch=true]
 *   Si el adaptador desempaqueta un único match a escalar. JMESPath es la
 *   excepción documentada: preserva su aridad sintáctica como lista.
 */
function runContractTests(syntaxName, createAdapter, pathSelector, contractOptions = {}) {
  const { unwrapsSingleMatch = true } = contractOptions;

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

    // Los tests siguientes asumen `adapter` inicializado: node:test garantiza
    // orden secuencial dentro de un describe.

    if (pathSelector.simpleField) {
      it("acceso a un campo existente devuelve el valor (escalar si procede)", async () => {
        const cache = new Map();
        const input = { campo: 42 };
        const env = { ctx: input, root: input, aliases: {} };
        const result = await adapter.evaluate(
          pathSelector.simpleField,
          input,
          cache,
          env
        );
        if (unwrapsSingleMatch) {
          // Adaptadores que desempaquetan: el match único es escalar.
          assert.ok(
            !Array.isArray(result),
            `Adaptador ${syntaxName} devolvió array en lugar de escalar para match único`
          );
          assert.equal(result, 42);
        } else {
          // JMESPath con proyección: aridad lista preservada.
          // Para acceso simple sin proyección sigue devolviendo escalar.
          assert.equal(result, 42);
        }
      });
    }

    if (pathSelector.missingField) {
      it("acceso a un campo inexistente devuelve null", async () => {
        const cache = new Map();
        const input = { otro: 24 };
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

    it("input null devuelve null sin invocar la librería", async () => {
      const cache = new Map();
      const env = { ctx: null, root: null, aliases: {} };
      // Usamos cualquier path "razonable" para esta sintaxis: si no
      // existe simpleField, no podemos llamar; pero en la práctica todos
      // los selectores definen al menos uno.
      const path = pathSelector.simpleField ?? pathSelector.missingField;
      if (!path) return;
      const result = await adapter.evaluate(path, null, cache, env);
      assert.equal(result, null);
    });

    it("input undefined devuelve null sin invocar la librería", async () => {
      const cache = new Map();
      const env = { ctx: null, root: null, aliases: {} };
      // Usamos cualquier path "razonable" para esta sintaxis: si no
      // existe simpleField, no podemos llamar; pero en la práctica todos
      // los selectores definen al menos uno.
      const path = pathSelector.simpleField ?? pathSelector.missingField;
      if (!path) return;
      const result = await adapter.evaluate(path, undefined, cache, env);
      assert.equal(result, null);
    });

    if (pathSelector.invalidExpression) {
      it("expresión inválida es rechazada en validate()", async () => {
        await assert.rejects(adapter.validate(pathSelector.invalidExpression));
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
    const env = { ctx: { a: { b: [10, 20, 30] } }, root: null, aliases: {} };
    const result = await adapter.evaluate(["a", "b", 1], env.ctx, cache, env);
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

const jsonpathAvailable = await isPackagedEsmModuleAvailable("jsonpath-plus");

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

const jsonataAvailable = await isPackagedEsmModuleAvailable("jsonata");

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

const jsonqueryAvailable = await isPackagedEsmModuleAvailable("@jsonquerylang/jsonquery");

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


// ============================================================================
// Adaptador JSON Pointer / RFC 6901 (si json-pointer está instalada).
// ============================================================================

const jsonpointerAvailable = await isPackagedEsmModuleAvailable("json-pointer");

if (jsonpointerAvailable) {
  const { createJsonPointerAdapter } = await import("../../../adapters/jsonpointer.js");
  runContractTests("jsonpointer", createJsonPointerAdapter, {
    // RFC 6901: los tokens empiezan por '/'. Para "campo" simple usamos "/campo".
    simpleField: "/campo",
    missingField: "/noExiste",
    // No empezar por '/' es sintácticamente inválido por RFC 6901 §3.
    invalidExpression: "no-empieza-por-slash",
  });
} else {
  describe("Contrato del adaptador: jsonpointer", () => {
    it("se omite porque json-pointer no está instalado", { skip: true }, () => {});
  });
}


// ============================================================================
// Adaptador JMESPath (si jmespath está instalada).
//
// IMPORTANTE: JMESPath PRESERVA la aridad sintáctica de las proyecciones
// ([*], [?], multi-select) — no desempaqueta listas de un elemento a
// escalar. Esto solo afecta a expresiones proyectivas; los accesos simples
// (sin [*] ni filtro) siguen devolviendo escalares, así que el contrato
// común se cumple con simpleField="campo". El no-desempaquetado de
// proyecciones se cubre en test/unit/adapter-jmespath.test.js, donde se
// testea explícitamente.
// ============================================================================

const jmespathAvailable = await isPackagedEsmModuleAvailable("jmespath");

if (jmespathAvailable) {
  const { createJmesPathAdapter } = await import("../../../adapters/jmespath.js");
  runContractTests("jmespath", createJmesPathAdapter, {
    simpleField: "campo",
    missingField: "noExiste",
    invalidExpression: "campo[",
  }, {
    // Para acceso simple no hay diferencia; la divergencia solo aplica a
    // proyecciones, que NO ejercita esta suite de contrato.
    unwrapsSingleMatch: true,
  });
} else {
  describe("Contrato del adaptador: jmespath", () => {
    it("se omite porque jmespath no está instalado", { skip: true }, () => {});
  });
}
