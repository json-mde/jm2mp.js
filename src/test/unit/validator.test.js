/**
 * @file Tests del validador.
 *
 * Cubre validación estructural, semántica, alcance de alias, validación
 * de operadores, y la integración con el adaptador para validar $path.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { ValidationError } from "../../errors.js";
import { validateModule } from "../../validator.js";
import { createNativeRegistry } from "../../adapters/helpers.js";
import { normalizeModule } from "../../modules/normalizer.js";

const registry = createNativeRegistry();

/** Helper: normaliza y valida. Devuelve la promesa para usar con rejects. */
async function validate(module) {
  const normalized = normalizeModule(module);
  return validateModule(normalized, registry);
}

describe("validator: estructura del módulo", () => {
  it("acepta un módulo mínimo con plantilla raíz", async () => {
    await validate({ "@": null });
  });

  it("rechaza módulo sin plantilla raíz @", async () => {
    await assert.rejects(
      validate({ "otra": null }),
      ValidationError
    );
  });

  it("rechaza módulo no objeto", async () => {
    await assert.rejects(validate(null), ValidationError);
    await assert.rejects(validate("string"), ValidationError);
    await assert.rejects(validate([]), ValidationError);
  });

  it("rechaza nombre de plantilla que empieza por $", async () => {
    await assert.rejects(
      validate({ "@": null, "$malo": null }),
      ValidationError
    );
  });

  it("rechaza nombre de plantilla vacío", async () => {
    await assert.rejects(
      validate({ "@": null, "": null }),
      ValidationError
    );
  });

  it("acepta plantillas con nombre válido", async () => {
    await validate({ "@": null, "auxiliar": null, "otra_mas": null });
  });
});

describe("validator: $let y alcance de alias", () => {
  it("acepta $let con bindings válidos", async () => {
    await validate({
      "@": {
        "$op": "let",
        "$bindings": { "x": 42 },
        "$in": { "$op": "get", "$path": "%x" }
      }
    });
  });

  it("rechaza alias usado fuera de su alcance", async () => {
    await assert.rejects(
      validate({
        "@": { "$op": "get", "$path": "%noDefinido" }
      }),
      (err) => err instanceof ValidationError && /alcance/i.test(err.message)
    );
  });

  it("rechaza nombre de alias con prefijo prohibido", async () => {
    await assert.rejects(
      validate({
        "@": { "$op": "let", "$bindings": { "$malo": 1 }, "$in": null }
      }),
      ValidationError
    );
  });

  it("alias anidado sombrea correctamente", async () => {
    await validate({
      "@": {
        "$op": "let",
        "$bindings": { "x": 1 },
        "$in": {
          "$op": "let",
          "$bindings": { "x": 2 },
          "$in": { "$op": "get", "$path": "%x" }
        }
      }
    });
  });

  it("bindings paralelos: un binding no ve a otro del mismo $let", async () => {
    await assert.rejects(
      validate({
        "@": {
          "$op": "let",
          "$bindings": {
            "a": 10,
            "b": { "$op": "get", "$path": "%a" }
          },
          "$in": null
        }
      }),
      ValidationError
    );
  });

  it("rechaza $bindings que no es objeto", async () => {
    await assert.rejects(
      validate({ "@": { "$op": "let", "$bindings": [1, 2], "$in": null } }),
      ValidationError
    );
  });

  it("rechaza $bindings null", async () => {
    await assert.rejects(
      validate({ "@": { "$op": "let", "$bindings": null, "$in": null } }),
      ValidationError
    );
  });
});

describe("validator: $call", () => {
  it("acepta $call apuntando a plantilla existente", async () => {
    await validate({
      "@": { "$op": "call", "$ref": "aux" },
      "aux": null
    });
  });

  it("rechaza $call apuntando a plantilla inexistente", async () => {
    await assert.rejects(
      validate({ "@": { "$op": "call", "$ref": "noExiste" } }),
      ValidationError
    );
  });

  it("rechaza $ref con nombre inválido", async () => {
    await assert.rejects(
      validate({ "@": { "$op": "call", "$ref": "$malo" } }),
      ValidationError
    );
  });

  it("valida $call.$at recursivamente", async () => {
    await validate({
      "@": {
        "$op": "call",
        "$ref": "aux",
        "$at": { "$op": "get", "$path": "$.x" }
      },
      "aux": null
    });
  });

  it("rechaza $call.$at con operador desconocido", async () => {
    await assert.rejects(
      validate({
        "@": {
          "$op": "call",
          "$ref": "aux",
          "$at": { "$op": "noExiste" }
        },
        "aux": null
      }),
      ValidationError
    );
  });
});

describe("validator: $get y $syntax", () => {
  it("acepta $get con $path string", async () => {
    await validate({ "@": { "$op": "get", "$path": "$.x" } });
  });

  it("acepta $get con $path array", async () => {
    await validate({ "@": { "$op": "get", "$path": ["a", 0, "b"] } });
  });

  it("rechaza $get con $syntax no registrado", async () => {
    await assert.rejects(
      validate({
        "@": { "$op": "get", "$path": "$.x", "$syntax": "noExiste" }
      }),
      (err) => err instanceof ValidationError && /no corresponde a ningún adaptador/.test(err.message)
    );
  });

  it("rechaza ruta nativa malformada", async () => {
    await assert.rejects(
      validate({ "@": { "$op": "get", "$path": "##malo##" } }),
      ValidationError
    );
  });

  it("rechaza array con segmento de tipo inválido", async () => {
    await assert.rejects(
      validate({ "@": { "$op": "get", "$path": ["a", true, "b"] } }),
      ValidationError
    );
  });

  it("rechaza array con segmento entero negativo", async () => {
    await assert.rejects(
      validate({ "@": { "$op": "get", "$path": ["a", -1] } }),
      ValidationError
    );
  });

  it("valida $from recursivamente", async () => {
    await assert.rejects(
      validate({
        "@": {
          "$op": "get",
          "$path": "@.x",
          "$from": { "$op": "noExiste" }
        }
      }),
      ValidationError
    );
  });
});

describe("validator: operadores", () => {
  it("rechaza operador desconocido", async () => {
    await assert.rejects(
      validate({ "@": { "$op": "noExiste" } }),
      ValidationError
    );
  });

  it("rechaza argumento requerido faltante", async () => {
    await assert.rejects(
      validate({ "@": { "$op": "add", "$left": 1 } }), // falta $right
      ValidationError
    );
  });

  it("rechaza argumento no reconocido", async () => {
    await assert.rejects(
      validate({ "@": { "$op": "add", "$left": 1, "$right": 2, "$extra": 3 } }),
      ValidationError
    );
  });

  it("rechaza $op no string", async () => {
    await assert.rejects(
      validate({ "@": { "$op": 42 } }),
      ValidationError
    );
  });

  it("valida recursivamente argumentos de operadores", async () => {
    await assert.rejects(
      validate({
        "@": {
          "$op": "add",
          "$left": { "$op": "noExiste" },
          "$right": 1
        }
      }),
      ValidationError
    );
  });
});

describe("validator: literales", () => {
  it("acepta literales primitivos como plantilla", async () => {
    await validate({ "@": 42 });
    await validate({ "@": "texto" });
    await validate({ "@": true });
    await validate({ "@": null });
  });

  it("acepta plantilla raíz como array literal", async () => {
    await validate({ "@": [1, 2, 3] });
  });

  it("valida elementos de array recursivamente", async () => {
    await assert.rejects(
      validate({ "@": [{ "$op": "noExiste" }] }),
      ValidationError
    );
  });

  it("rechaza clave $algo sin escape en objeto literal", async () => {
    await assert.rejects(
      validate({ "@": { "$malo": "valor" } }),
      ValidationError
    );
  });

  it("acepta clave \\$algo (escape para literal)", async () => {
    await validate({ "@": { "\\$total": 100 } });
  });

  it("valida valores de objetos literales recursivamente", async () => {
    await assert.rejects(
      validate({ "@": { "campo": { "$op": "noExiste" } } }),
      ValidationError
    );
  });
});
