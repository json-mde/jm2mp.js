/**
 * @file Tests específicos de la jerarquía de errores.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import {
  ProjectionError, ParseError, ResolutionError,
  ValidationError, EvaluationError, AdapterError,
} from "../../errors.js";

describe("ProjectionError: jerarquía", () => {
  it("ProjectionError es la raíz de todas las subclases", () => {
    const subclasses = [ParseError, ResolutionError, ValidationError, EvaluationError, AdapterError];
    for (const Sub of subclasses) {
      const e = new Sub("test");
      assert.ok(e instanceof ProjectionError);
      assert.ok(e instanceof Error);
    }
  });

  it("name coincide con el nombre de la clase concreta", () => {
    assert.equal(new ParseError("x").name, "ParseError");
    assert.equal(new ResolutionError("x").name, "ResolutionError");
    assert.equal(new ValidationError("x").name, "ValidationError");
    assert.equal(new EvaluationError("x").name, "EvaluationError");
    assert.equal(new AdapterError("x").name, "AdapterError");
    assert.equal(new ProjectionError("x").name, "ProjectionError");
  });

  it("path por defecto es null", () => {
    const e = new ProjectionError("x");
    assert.equal(e.path, null);
  });

  it("path se asigna correctamente desde metadata", () => {
    const e = new ProjectionError("x", { path: "$.a.b" });
    assert.equal(e.path, "$.a.b");
  });

  it("cause se asigna correctamente desde metadata", () => {
    const cause = new Error("error subyacente");
    const e = new ProjectionError("x", { cause });
    assert.equal(e.cause, cause);
  });

  it("sin cause, no hay propiedad cause definida (undefined)", () => {
    const e = new ProjectionError("x");
    // En la implementación, cuando no se pasa cause se llama super(message)
    // sin segundo argumento. Esto deja cause como undefined.
    assert.equal(e.cause, undefined);
  });

  it("metadata vacío equivale a omitir metadata", () => {
    const e = new ProjectionError("x", {});
    assert.equal(e.path, null);
    assert.equal(e.cause, undefined);
  });

  it("message se preserva en todas las subclases", () => {
    const msg = "mensaje de prueba";
    assert.equal(new ParseError(msg).message, msg);
    assert.equal(new ResolutionError(msg).message, msg);
    assert.equal(new ValidationError(msg).message, msg);
    assert.equal(new EvaluationError(msg).message, msg);
    assert.equal(new AdapterError(msg).message, msg);
  });

  it("cause y path pueden combinarse", () => {
    const cause = new TypeError("tipo");
    const e = new ValidationError("invalida", { cause, path: "@.foo" });
    assert.equal(e.cause, cause);
    assert.equal(e.path, "@.foo");
  });
});
