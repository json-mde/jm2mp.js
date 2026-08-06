/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file Tests específicos del AdapterRegistry.
**/

/**
 * @module jm2mp/test/unit/adapter/registry
 * @description
 * Tests específicos del AdapterRegistry.
**/

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { AdapterRegistry } from "../../../adapters/registry.js";
import { createNativeAdapter } from "../../../adapters/native.js";
import { AdapterError } from "../../../errors.js";

describe("AdapterRegistry", () => {
  it("registro vacío inicial", () => {
    const r = new AdapterRegistry();
    assert.deepEqual(r.names(), []);
    assert.equal(r.has("native"), false);
  });

  it("register acepta un adaptador válido", () => {
    const r = new AdapterRegistry();
    r.register(createNativeAdapter());
    assert.equal(r.has("native"), true);
    assert.deepEqual(r.names(), ["native"]);
  });

  it("get devuelve el adaptador registrado", () => {
    const r = new AdapterRegistry();
    const adapter = createNativeAdapter();
    r.register(adapter);
    assert.equal(r.get("native"), adapter);
  });

  it("get sobre nombre desconocido lanza AdapterError", () => {
    const r = new AdapterRegistry();
    assert.throws(() => r.get("noExiste"), AdapterError);
  });

  it("get sobre registro vacío lista '(ninguno)' en el mensaje", () => {
    const r = new AdapterRegistry();
    assert.throws(
      () => r.get("x"),
      (err) => err instanceof AdapterError && /\(ninguno\)/.test(err.message)
    );
  });

  it("register sobre nombre ya registrado lanza AdapterError", () => {
    const r = new AdapterRegistry();
    r.register(createNativeAdapter());
    assert.throws(() => r.register(createNativeAdapter()), AdapterError);
  });

  it("register rechaza adaptadores no objeto", () => {
    const r = new AdapterRegistry();
    assert.throws(() => r.register(null), AdapterError);
    assert.throws(() => r.register("string"), AdapterError);
    assert.throws(() => r.register(42), AdapterError);
  });

  it("register rechaza adaptadores sin name", () => {
    const r = new AdapterRegistry();
    assert.throws(
      () => r.register({ evaluate: async () => null, validate: async () => {} }),
      AdapterError
    );
  });

  it("register rechaza adaptadores con name vacío", () => {
    const r = new AdapterRegistry();
    assert.throws(
      () => r.register({ name: "", evaluate: async () => null, validate: async () => {} }),
      AdapterError
    );
  });

  it("register rechaza adaptadores con name no string", () => {
    const r = new AdapterRegistry();
    assert.throws(
      () => r.register({ name: 42, evaluate: async () => null, validate: async () => {} }),
      AdapterError
    );
  });

  it("register rechaza adaptadores sin evaluate", () => {
    const r = new AdapterRegistry();
    assert.throws(
      () => r.register({ name: "x", validate: async () => {} }),
      AdapterError
    );
  });

  it("register rechaza adaptadores sin validate", () => {
    const r = new AdapterRegistry();
    assert.throws(
      () => r.register({ name: "x", evaluate: async () => null }),
      AdapterError
    );
  });

  it("names() devuelve los nombres en orden de inserción", () => {
    const r = new AdapterRegistry();
    r.register({
      name: "alpha",
      evaluate: async () => null,
      validate: async () => {},
    });
    r.register({
      name: "beta",
      evaluate: async () => null,
      validate: async () => {},
    });
    assert.deepEqual(r.names(), ["alpha", "beta"]);
  });

  it("instancias distintas son independientes", () => {
    const r1 = new AdapterRegistry();
    const r2 = new AdapterRegistry();
    r1.register(createNativeAdapter());
    assert.equal(r1.has("native"), true);
    assert.equal(r2.has("native"), false);
  });
});
