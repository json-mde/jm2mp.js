/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @module test/unit/adapter/jmespath
 * @file Tests específicos del adaptador JMESPath.
 *
 * Estos tests son COMPLEMENTARIOS al de contrato
 * (test/contract/adapter-contract.test.js): cubren detalles propios de
 * la sintaxis JMESPath que el contrato genérico no ejercita:
 *
 *   - Validación: compile() acepta o rechaza expresiones bien/mal formadas.
 *   - Acceso simple, anidado, por índice y por slicing.
 *   - DIVERGENCIA documentada: las proyecciones JMESPath ([*], [?], multi-select)
 *     preservan su forma de lista y NO se desempaquetan a escalar, ni siquiera
 *     cuando contienen un único elemento. Es la divergencia más visible
 *     respecto a JSONPath y al adaptador nativo, y por eso se testea
 *     explícitamente.
 *   - Filtros, multi-select hash y list, funciones built-in, pipes.
 *   - Política de errores: ValidationError en validate, EvaluationError en evaluate.
 *   - Caché de "validado": el adaptador no compila dos veces la misma expresión.
 *   - Forma del adaptador: name, description, fallbackPolicy.
 *
 * Se saltan automáticamente si 'jmespath' no está instalada.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { ValidationError, EvaluationError } from "../../../errors.js";
import { isModuleAvailable } from "../../../modules/helpers.js";

const jmespathAvailable = await isModuleAvailable("jmespath");

if (!jmespathAvailable) {
  describe("Adaptador JMESPath", () => {
    it("se omite porque 'jmespath' no está instalada", { skip: true }, () => {});
  });
} else {
  const { createJmesPathAdapter } = await import("../../../adapters/jmespath.js");
  const adapter = await createJmesPathAdapter();
  const env = { ctx: null, root: null, aliases: {} };

  // ==========================================================================
  // validate: rechazo de tipos no permitidos
  // ==========================================================================

  describe("Adaptador JMESPath: validate — tipos no permitidos", () => {
    it("rechaza number", async () => {
      await assert.rejects(adapter.validate(42), ValidationError);
    });
    it("rechaza null", async () => {
      await assert.rejects(adapter.validate(null), ValidationError);
    });
    it("rechaza objeto", async () => {
      await assert.rejects(adapter.validate({}), ValidationError);
    });
    it("rechaza array", async () => {
      await assert.rejects(adapter.validate(["foo"]), ValidationError);
    });
    it("rechaza cadena vacía (JMESPath no admite expresiones vacías)", async () => {
      await assert.rejects(adapter.validate(""), ValidationError);
    });
  });

  // ==========================================================================
  // validate: sintaxis JMESPath
  // ==========================================================================

  describe("Adaptador JMESPath: validate — expresiones válidas", () => {
    it("acepta acceso a propiedad simple", async () => {
      await assert.doesNotReject(adapter.validate("foo"));
    });
    it("acepta acceso anidado por punto", async () => {
      await assert.doesNotReject(adapter.validate("foo.bar.baz"));
    });
    it("acepta acceso por índice", async () => {
      await assert.doesNotReject(adapter.validate("users[0]"));
      await assert.doesNotReject(adapter.validate("users[0].name"));
    });
    it("acepta slicing", async () => {
      await assert.doesNotReject(adapter.validate("items[0:3]"));
      await assert.doesNotReject(adapter.validate("items[::2]"));
    });
    it("acepta proyección con wildcard", async () => {
      await assert.doesNotReject(adapter.validate("users[*]"));
      await assert.doesNotReject(adapter.validate("users[*].name"));
    });
    it("acepta expresión de filtro", async () => {
      await assert.doesNotReject(adapter.validate("users[?age > `18`]"));
    });
    it("acepta multi-select hash", async () => {
      await assert.doesNotReject(adapter.validate("users[*].{n: name, a: age}"));
    });
    it("acepta multi-select list", async () => {
      await assert.doesNotReject(adapter.validate("users[*].[name, age]"));
    });
    it("acepta llamada a función built-in", async () => {
      await assert.doesNotReject(adapter.validate("length(users)"));
      await assert.doesNotReject(adapter.validate("sort_by(users, &age)"));
    });
    it("acepta pipe", async () => {
      await assert.doesNotReject(adapter.validate("users | [0].name"));
    });
  });

  describe("Adaptador JMESPath: validate — expresiones inválidas", () => {
    it("rechaza expresión con corchete sin cerrar", async () => {
      await assert.rejects(adapter.validate("users["), ValidationError);
    });
    it("rechaza filtro malformado", async () => {
      await assert.rejects(adapter.validate("users[?]"), ValidationError);
    });
    it("rechaza función desconocida con aridad imposible", async () => {
      // función bien escrita pero sintaxis incorrecta de delimitadores
      await assert.rejects(adapter.validate("length("), ValidationError);
    });
  });

  // ==========================================================================
  // evaluate: acceso escalar (devuelve escalar, no array)
  // ==========================================================================

  describe("Adaptador JMESPath: evaluate — acceso escalar", () => {
    it("propiedad simple devuelve escalar", async () => {
      const result = await adapter.evaluate("foo", { foo: 42 }, new Map(), env);
      assert.equal(result, 42);
    });

    it("propiedad anidada devuelve escalar", async () => {
      const result = await adapter.evaluate(
        "a.b.c",
        { a: { b: { c: "leaf" } } },
        new Map(),
        env
      );
      assert.equal(result, "leaf");
    });

    it("índice de array devuelve escalar", async () => {
      const result = await adapter.evaluate(
        "items[1]",
        { items: ["x", "y", "z"] },
        new Map(),
        env
      );
      assert.equal(result, "y");
    });

    it("acceso a propiedad de elemento devuelve escalar", async () => {
      const result = await adapter.evaluate(
        "users[0].name",
        { users: [{ name: "Alice" }, { name: "Bob" }] },
        new Map(),
        env
      );
      assert.equal(result, "Alice");
    });
  });

  // ==========================================================================
  // evaluate: DIVERGENCIA CLAVE — proyecciones NO se desempaquetan
  // ==========================================================================

  describe("Adaptador JMESPath: evaluate — proyecciones (no desempaqueta)", () => {
    it("wildcard sobre array de varios devuelve array de varios", async () => {
      const result = await adapter.evaluate(
        "users[*].name",
        { users: [{ name: "Alice" }, { name: "Bob" }] },
        new Map(),
        env
      );
      assert.deepEqual(result, ["Alice", "Bob"]);
    });

    it("wildcard sobre array de UN elemento devuelve array de UN elemento (NO escalar)", async () => {
      // Divergencia clave: JSONPath o el adaptador nativo desempaquetarían
      // este caso a "Alice"; JMESPath preserva la aridad sintáctica
      // porque [*] es por definición una proyección.
      const result = await adapter.evaluate(
        "users[*].name",
        { users: [{ name: "Alice" }] },
        new Map(),
        env
      );
      assert.ok(Array.isArray(result), `esperado array, recibido ${typeof result}`);
      assert.deepEqual(result, ["Alice"]);
    });

    it("wildcard sobre array vacío devuelve array vacío (NO null)", async () => {
      const result = await adapter.evaluate(
        "users[*].name",
        { users: [] },
        new Map(),
        env
      );
      assert.deepEqual(result, []);
    });

    it("filtro que no matchea nada devuelve array vacío (NO null)", async () => {
      const result = await adapter.evaluate(
        "users[?age > `100`].name",
        { users: [{ name: "Alice", age: 20 }, { name: "Bob", age: 30 }] },
        new Map(),
        env
      );
      assert.deepEqual(result, []);
    });

    it("filtro que matchea un solo elemento devuelve array de uno (NO escalar)", async () => {
      const result = await adapter.evaluate(
        "users[?age >= `30`].name",
        { users: [{ name: "Alice", age: 20 }, { name: "Bob", age: 30 }] },
        new Map(),
        env
      );
      assert.deepEqual(result, ["Bob"]);
    });

    it("multi-select hash construye objeto", async () => {
      const result = await adapter.evaluate(
        "users[0].{n: name, a: age}",
        { users: [{ name: "Alice", age: 20 }] },
        new Map(),
        env
      );
      assert.deepEqual(result, { n: "Alice", a: 20 });
    });

    it("multi-select list construye lista", async () => {
      const result = await adapter.evaluate(
        "users[0].[name, age]",
        { users: [{ name: "Alice", age: 20 }] },
        new Map(),
        env
      );
      assert.deepEqual(result, ["Alice", 20]);
    });
  });

  // ==========================================================================
  // evaluate: funciones built-in y pipes
  // ==========================================================================

  describe("Adaptador JMESPath: evaluate — funciones built-in", () => {
    it("length() sobre array devuelve número", async () => {
      const result = await adapter.evaluate(
        "length(users)",
        { users: [{}, {}, {}] },
        new Map(),
        env
      );
      assert.equal(result, 3);
    });

    it("keys() devuelve lista de claves", async () => {
      const result = await adapter.evaluate(
        "keys(obj)",
        { obj: { a: 1, b: 2 } },
        new Map(),
        env
      );
      assert.deepEqual(result.sort(), ["a", "b"]);
    });

    it("max() sobre array de números", async () => {
      const result = await adapter.evaluate(
        "max(nums)",
        { nums: [3, 1, 4, 1, 5, 9, 2, 6] },
        new Map(),
        env
      );
      assert.equal(result, 9);
    });

    it("pipe reinicia el contexto", async () => {
      const result = await adapter.evaluate(
        "users[*].age | [0]",
        { users: [{ age: 20 }, { age: 30 }] },
        new Map(),
        env
      );
      assert.equal(result, 20);
    });
  });

  // ==========================================================================
  // evaluate: ausencia, null literal, input null
  // ==========================================================================

  describe("Adaptador JMESPath: evaluate — ausencia y null", () => {
    it("input null devuelve null sin invocar la librería", async () => {
      const result = await adapter.evaluate("foo", null, new Map(), env);
      assert.equal(result, null);
    });

    it("propiedad inexistente devuelve null (JMESPath nativo)", async () => {
      const result = await adapter.evaluate("missing", { foo: 1 }, new Map(), env);
      assert.equal(result, null);
    });

    it("acceso anidado a propiedad inexistente devuelve null", async () => {
      const result = await adapter.evaluate("a.b.c", { a: { b: {} } }, new Map(), env);
      assert.equal(result, null);
    });

    it("índice fuera de rango devuelve null", async () => {
      const result = await adapter.evaluate(
        "items[10]",
        { items: ["a"] },
        new Map(),
        env
      );
      assert.equal(result, null);
    });

    it("valor false literal NO se confunde con ausencia", async () => {
      const result = await adapter.evaluate("flag", { flag: false }, new Map(), env);
      assert.equal(result, false);
    });

    it("valor 0 literal NO se confunde con ausencia", async () => {
      const result = await adapter.evaluate("n", { n: 0 }, new Map(), env);
      assert.equal(result, 0);
    });
  });

  // ==========================================================================
  // evaluate: caché y errores
  // ==========================================================================

  describe("Adaptador JMESPath: evaluate — caché y errores", () => {
    it("cache marca la expresión como validada en primera llamada", async () => {
      const cache = new Map();
      await adapter.evaluate("foo", { foo: 1 }, cache, env);
      assert.equal(cache.has("foo"), true);
    });

    it("expresiones distintas se cachean por separado", async () => {
      const cache = new Map();
      await adapter.evaluate("foo", { foo: 1 }, cache, env);
      await adapter.evaluate("bar", { bar: 2 }, cache, env);
      assert.equal(cache.size, 2);
      assert.ok(cache.has("foo"));
      assert.ok(cache.has("bar"));
    });

    it("expresión inválida en evaluate lanza EvaluationError", async () => {
      await assert.rejects(
        adapter.evaluate("users[", { users: [] }, new Map(), env),
        EvaluationError
      );
    });
  });

  // ==========================================================================
  // Metadata del adaptador
  // ==========================================================================

  describe("Adaptador JMESPath: metadata", () => {
    it("name es 'jmespath'", () => {
      assert.equal(adapter.name, "jmespath");
    });

    it("description es un string no vacío", () => {
      assert.equal(typeof adapter.description, "string");
      assert.ok(adapter.description.length > 0);
    });

    it("fallbackPolicy expone las claves del contrato", () => {
      assert.equal(typeof adapter.fallbackPolicy, "object");
      assert.ok(adapter.fallbackPolicy !== null);
      for (const key of [
        "missing", "multipleMatches", "singleMatch", "typeError", "nullInput",
      ]) {
        assert.ok(
          key in adapter.fallbackPolicy,
          `fallbackPolicy falta la clave "${key}"`
        );
      }
    });

    it("fallbackPolicy.multipleMatches documenta el NO-desempaquetado", () => {
      // Divergencia clave del adaptador; la política debe declararla
      // explícitamente para que el usuario sepa que las proyecciones
      // mantienen su aridad sintáctica.
      assert.match(adapter.fallbackPolicy.multipleMatches, /array/i);
      assert.match(adapter.fallbackPolicy.multipleMatches, /no\s+se\s+desempaqueta/i);
    });
  });
}
