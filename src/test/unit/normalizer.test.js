/**
 * @file Tests de la normalización de módulos.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { normalizeModule } from "../../modules/normalizer.js";

describe("normalizeModule: sintaxis por defecto", () => {
  it("usa 'native' cuando no se declara $options", () => {
    const mod = {
      "@": { "$op": "get", "$path": "$.x" }
    };
    const result = normalizeModule(mod);
    assert.equal(result["@"].$syntax, "native");
  });

  it("usa 'native' cuando $options no declara $default-query-language", () => {
    const mod = {
      "$options": { "$depends-on": [] },
      "@": { "$op": "get", "$path": "$.x" }
    };
    const result = normalizeModule(mod);
    assert.equal(result["@"].$syntax, "native");
  });

  it("usa la sintaxis declarada cuando se especifica", () => {
    const mod = {
      "$options": { "$default-query-language": "jsonata" },
      "@": { "$op": "get", "$path": "x.y" }
    };
    const result = normalizeModule(mod);
    assert.equal(result["@"].$syntax, "jsonata");
  });

  it("usa 'native' cuando $default-query-language es string vacío", () => {
    const mod = {
      "$options": { "$default-query-language": "" },
      "@": { "$op": "get", "$path": "$.x" }
    };
    const result = normalizeModule(mod);
    assert.equal(result["@"].$syntax, "native");
  });

  it("usa 'native' cuando $default-query-language no es string", () => {
    const mod = {
      "$options": { "$default-query-language": 42 },
      "@": { "$op": "get", "$path": "$.x" }
    };
    const result = normalizeModule(mod);
    assert.equal(result["@"].$syntax, "native");
  });
});

describe("normalizeModule: preservación de $syntax explícito", () => {
  it("no sobrescribe $syntax cuando ya está presente", () => {
    const mod = {
      "$options": { "$default-query-language": "jsonata" },
      "@": { "$op": "get", "$path": "$.x", "$syntax": "native" }
    };
    const result = normalizeModule(mod);
    assert.equal(result["@"].$syntax, "native");
  });

  it("mezcla plantillas: cada $get conserva o adquiere su $syntax", () => {
    const mod = {
      "$options": { "$default-query-language": "jsonata" },
      "@": {
        "a": { "$op": "get", "$path": "$.x", "$syntax": "native" },
        "b": { "$op": "get", "$path": "y" }
      }
    };
    const result = normalizeModule(mod);
    assert.equal(result["@"].a.$syntax, "native");
    assert.equal(result["@"].b.$syntax, "jsonata");
  });
});

describe("normalizeModule: descenso recursivo", () => {
  it("normaliza $get anidado dentro de otros operadores", () => {
    const mod = {
      "@": {
        "$op": "add",
        "$left":  { "$op": "get", "$path": "@.x" },
        "$right": { "$op": "get", "$path": "@.y" }
      }
    };
    const result = normalizeModule(mod);
    assert.equal(result["@"].$left.$syntax, "native");
    assert.equal(result["@"].$right.$syntax, "native");
  });

  it("normaliza $get dentro de arrays", () => {
    const mod = {
      "@": [
        { "$op": "get", "$path": "@.a" },
        { "$op": "get", "$path": "@.b" }
      ]
    };
    const result = normalizeModule(mod);
    assert.equal(result["@"][0].$syntax, "native");
    assert.equal(result["@"][1].$syntax, "native");
  });

  it("normaliza $get dentro de objetos literales", () => {
    const mod = {
      "@": {
        "campo": { "$op": "get", "$path": "@.x" }
      }
    };
    const result = normalizeModule(mod);
    assert.equal(result["@"].campo.$syntax, "native");
  });

  it("normaliza $get dentro de plantillas con nombre", () => {
    const mod = {
      "@": { "$op": "call", "$ref": "aux" },
      "aux": { "$op": "get", "$path": "@.x" }
    };
    const result = normalizeModule(mod);
    assert.equal(result.aux.$syntax, "native");
  });

  it("normaliza $get dentro de $from de otro $get", () => {
    const mod = {
      "@": {
        "$op": "get",
        "$path": "@.b",
        "$from": { "$op": "get", "$path": "$.a" }
      }
    };
    const result = normalizeModule(mod);
    assert.equal(result["@"].$syntax, "native");
    assert.equal(result["@"].$from.$syntax, "native");
  });
});

describe("normalizeModule: invariantes", () => {
  it("preserva $options en el módulo normalizado (el resolver lo descartará)", () => {
    const mod = {
      "$options": { "$default-query-language": "jsonata" },
      "@": null
    };
    const result = normalizeModule(mod);
    assert.deepEqual(result.$options, { "$default-query-language": "jsonata" });
  });

  it("preserva $schema sin modificarlo", () => {
    const mod = {
      "$schema": "https://example.com/schema.json",
      "@": null
    };
    const result = normalizeModule(mod);
    assert.equal(result.$schema, "https://example.com/schema.json");
  });

  it("no muta el módulo original", () => {
    const mod = {
      "@": { "$op": "get", "$path": "$.x" }
    };
    const original = JSON.parse(JSON.stringify(mod));
    normalizeModule(mod);
    assert.deepEqual(mod, original);
  });

  it("operadores que no son $get no se modifican estructuralmente", () => {
    const mod = {
      "@": { "$op": "add", "$left": 1, "$right": 2 }
    };
    const result = normalizeModule(mod);
    assert.deepEqual(result["@"], { "$op": "add", "$left": 1, "$right": 2 });
  });

  it("primitivos en la raíz se preservan", () => {
    const mod = { "@": null };
    assert.deepEqual(normalizeModule(mod), { "@": null });
  });

  it("objeto literal con clave escapada no se altera", () => {
    const mod = { "@": { "\\$op": "valor literal" } };
    const result = normalizeModule(mod);
    // No es operación (no tiene $op no escapado), se trata como objeto literal.
    assert.deepEqual(result["@"], { "\\$op": "valor literal" });
  });
});
