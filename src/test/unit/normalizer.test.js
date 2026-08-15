/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file Tests de la normalización de módulos.
**/

/**
 * @module jm2mp/test/unit/normalizer
 * @description
 * Tests de la normalización de módulos.
**/

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { normalizeModule } from "../../modules/normalizer.js";
import { ROOT_TEMPLATE_NAME, moduleOf, moduleWith } from '../../modules/helpers.js';

describe("normalizeModule: sintaxis por defecto", () => {
  it("usa 'native' cuando no se declara $options", () => {
    const mod = {
      '$': { "$op": "get", "$path": "$.x" }
    };
    const result = normalizeModule(mod);
    assert.equal(result[ROOT_TEMPLATE_NAME].$syntax, "native");
  });

  it("usa 'native' cuando $options no declara $default-query-language", () => {
    const mod = {
      '$': { "$op": "get", "$path": "$.x" },
      "$options": { "$depends-on": [] },
    };
    const result = normalizeModule(mod);
    assert.equal(result[ROOT_TEMPLATE_NAME].$syntax, "native");
  });

  it("usa la sintaxis declarada cuando se especifica", () => {
    const mod = {
      '$': { "$op": "get", "$path": "x.y" },
      "$options": { "$default-query-language": "jsonata" },
    };
    const result = normalizeModule(mod);
    assert.equal(result[ROOT_TEMPLATE_NAME].$syntax, "jsonata");
  });

  it("usa 'native' cuando $default-query-language es string vacío", () => {
    const mod = {
      '$': { "$op": "get", "$path": "$.x" },
      "$options": { "$default-query-language": "" },
    };
    const result = normalizeModule(mod);
    assert.equal(result[ROOT_TEMPLATE_NAME].$syntax, "native");
  });

  it("usa 'native' cuando $default-query-language no es string", () => {
    const mod = moduleWith(
      { "$op": "get", "$path": "$.x" },
      { "$options": { "$default-query-language": 42 } },
    );
    const result = normalizeModule(mod);
    assert.equal(result[ROOT_TEMPLATE_NAME].$syntax, "native");
  });
});

describe("normalizeModule: preservación de $syntax explícito", () => {
  it("no sobrescribe $syntax cuando ya está presente", () => {
    const mod = moduleWith(
      { "$op": "get", "$path": "$.x", "$syntax": "native" },
      { "$options": { "$default-query-language": "jsonata" } },
    );
    const result = normalizeModule(mod);
    assert.equal(result[ROOT_TEMPLATE_NAME].$syntax, "native");
  });

  it("mezcla plantillas: cada $get conserva o adquiere su $syntax", () => {
    const mod = moduleWith(
      {
        "a": { "$op": "get", "$path": "$.x", "$syntax": "native" },
        "b": { "$op": "get", "$path": "y" }
      },
      { "$options": { "$default-query-language": "jsonata" } },
    );
    const result = normalizeModule(mod);
    assert.equal(result[ROOT_TEMPLATE_NAME].a.$syntax, "native");
    assert.equal(result[ROOT_TEMPLATE_NAME].b.$syntax, "jsonata");
  });
});

describe("normalizeModule: descenso recursivo", () => {
  it("normaliza $get anidado dentro de otros operadores", () => {
    const mod = moduleOf({
      "$op": "add",
      "$left":  { "$op": "get", "$path": "@.x" },
      "$right": { "$op": "get", "$path": "@.y" }
    });
    const result = normalizeModule(mod);
    assert.equal(result[ROOT_TEMPLATE_NAME].$left.$syntax, "native");
    assert.equal(result[ROOT_TEMPLATE_NAME].$right.$syntax, "native");
  });

  it("normaliza $get dentro de arrays", () => {
    const mod = moduleOf([
      { "$op": "get", "$path": "@.a" },
      { "$op": "get", "$path": "@.b" },
    ]);
    const result = normalizeModule(mod);
    assert.equal(result[ROOT_TEMPLATE_NAME][0].$syntax, "native");
    assert.equal(result[ROOT_TEMPLATE_NAME][1].$syntax, "native");
  });

  it("normaliza $get dentro de objetos literales", () => {
    const mod = moduleOf({
      "literal": { "$op": "get", "$path": "@.x" }
    });
    const result = normalizeModule(mod);
    assert.equal(result[ROOT_TEMPLATE_NAME].literal.$syntax, "native");
  });

  it("normaliza $get dentro de plantillas con nombre", () => {
    const mod = moduleWith(
      { "$op": "call", "$ref": "aux" },
      { "aux": { "$op": "get", "$path": "@.x" } }
    );
    const result = normalizeModule(mod);
    assert.equal(result.aux.$syntax, "native");
  });

  it("normaliza $get dentro de $from de otro $get", () => {
    const mod = moduleOf({
      "$op": "get",
      "$path": "@.b",
      "$from": { "$op": "get", "$path": "$.a" },
    });
    const result = normalizeModule(mod);
    assert.equal(result[ROOT_TEMPLATE_NAME].$syntax, "native");
    assert.equal(result[ROOT_TEMPLATE_NAME].$from.$syntax, "native");
  });
});

describe("normalizeModule: invariantes", () => {
  it("preserva $options en el módulo normalizado (el resolver lo descartará)", () => {
    const mod = moduleWith(
      null,
      { "$options": { "$default-query-language": "jsonata" } },
    );
    const result = normalizeModule(mod);
    assert.deepEqual(result.$options, { "$default-query-language": "jsonata" });
  });

  it("preserva $schema sin modificarlo", () => {
    const mod = moduleWith(
      null,
      { "$schema": "https://example.com/schema.json" },
    );
    const result = normalizeModule(mod);
    assert.equal(result.$schema, "https://example.com/schema.json");
  });

  it("no muta el módulo original", () => {
    const mod = moduleOf({
      "$op": "get",
      "$path": "$.x"
    });
    const original = JSON.parse(JSON.stringify(mod));
    normalizeModule(mod);
    assert.deepEqual(mod, original);
  });

  it("operadores que no son $get no se modifican estructuralmente", () => {
    const mod = moduleOf({
      "$op": "add",
      "$left": 1,
      "$right": 2
    });
    const result = normalizeModule(mod);
    assert.deepEqual(result[ROOT_TEMPLATE_NAME], { "$op": "add", "$left": 1, "$right": 2 });
  });

  it("primitivos en la raíz se preservan", () => {
    const mod = moduleOf( null );
    assert.deepEqual(normalizeModule(mod), { '$': null });
  });

  it("objeto literal con clave escapada no se altera", () => {
    const mod = moduleOf({ "\\$op": "valor literal" });
    const result = normalizeModule(mod);
    // No es operación (no tiene $op no escapado), se trata como objeto literal.
    assert.deepEqual(result[ROOT_TEMPLATE_NAME], { "\\$op": "valor literal" });
  });
});
