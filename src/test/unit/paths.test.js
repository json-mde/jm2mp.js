/**
 * @file Tests del parser EBNF de rutas nativas y la función navigate.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { parsePath, navigate } from "../../paths.js";
import { ParseError } from "../../errors.js";

describe("parsePath: raíces", () => {
  it("parsea $ como raíz root sin accesores", () => {
    const r = parsePath("$");
    assert.deepEqual(r, { kind: "root", aliasName: null, accessors: [] });
  });

  it("parsea @ como raíz ctx sin accesores", () => {
    const r = parsePath("@");
    assert.deepEqual(r, { kind: "ctx", aliasName: null, accessors: [] });
  });

  it("parsea %nombre como alias", () => {
    const r = parsePath("%miAlias");
    assert.deepEqual(r, { kind: "alias", aliasName: "miAlias", accessors: [] });
  });

  it("rechaza string vacía", () => {
    assert.throws(() => parsePath(""), ParseError);
  });

  it("rechaza raíz desconocida", () => {
    assert.throws(() => parsePath("foo"), ParseError);
  });

  it("rechaza % sin identificador", () => {
    assert.throws(() => parsePath("%"), ParseError);
  });

  it("rechaza no-string", () => {
    assert.throws(() => parsePath(null), ParseError);
    assert.throws(() => parsePath(42), ParseError);
    assert.throws(() => parsePath(undefined), ParseError);
  });

  it("rechaza $$ como raíz (en el nuevo léxico no es válido)", () => {
    assert.throws(() => parsePath("$$"), ParseError);
  });
});

describe("parsePath: accesores por punto", () => {
  it("parsea $.a", () => {
    const r = parsePath("$.a");
    assert.deepEqual(r.accessors, ["a"]);
  });

  it("parsea $.a.b.c", () => {
    const r = parsePath("$.a.b.c");
    assert.deepEqual(r.accessors, ["a", "b", "c"]);
  });

  it("parsea identificadores con subrayado y dígitos", () => {
    const r = parsePath("@.foo_bar.x123");
    assert.deepEqual(r.accessors, ["foo_bar", "x123"]);
  });

  it("acepta subrayado como inicio de identificador", () => {
    const r = parsePath("$._private");
    assert.deepEqual(r.accessors, ["_private"]);
  });

  it("rechaza punto sin identificador", () => {
    assert.throws(() => parsePath("$."), ParseError);
  });

  it("rechaza identificador que empieza por dígito", () => {
    assert.throws(() => parsePath("$.0abc"), ParseError);
  });
});

describe("parsePath: accesores por corchetes", () => {
  it("parsea $[0]", () => {
    const r = parsePath("$[0]");
    assert.deepEqual(r.accessors, [0]);
  });

  it("parsea índices multidígito", () => {
    const r = parsePath("$[123]");
    assert.deepEqual(r.accessors, [123]);
  });

  it("parsea claves citadas", () => {
    const r = parsePath('$["clave con espacios"]');
    assert.deepEqual(r.accessors, ["clave con espacios"]);
  });

  it("parsea claves citadas con escapes JSON", () => {
    const r = parsePath('$["línea\\nrota"]');
    assert.deepEqual(r.accessors, ["línea\nrota"]);
  });

  it("parsea escape unicode \\uXXXX", () => {
    const r = parsePath('$["\\u00e1rbol"]');
    assert.deepEqual(r.accessors, ["árbol"]);
  });

  it("parsea todos los escapes JSON estándar", () => {
    const r = parsePath('$["\\"\\\\\\/\\b\\f\\n\\r\\t"]');
    assert.deepEqual(r.accessors, ['"\\/\b\f\n\r\t']);
  });

  it("rechaza corchete sin contenido", () => {
    assert.throws(() => parsePath("$[]"), ParseError);
  });

  it("rechaza corchete sin cerrar", () => {
    assert.throws(() => parsePath("$[0"), ParseError);
  });

  it("rechaza string sin comilla de cierre", () => {
    assert.throws(() => parsePath('$["abc'), ParseError);
  });

  it("rechaza escape unicode inválido", () => {
    assert.throws(() => parsePath('$["\\uZZZZ"]'), ParseError);
  });

  it("rechaza escape no reconocido", () => {
    assert.throws(() => parsePath('$["\\q"]'), ParseError);
  });
});

describe("parsePath: combinaciones", () => {
  it("parsea $.a[0].b", () => {
    const r = parsePath("$.a[0].b");
    assert.deepEqual(r.accessors, ["a", 0, "b"]);
  });

  it('parsea %x[2]["y"]', () => {
    const r = parsePath('%x[2]["y"]');
    assert.deepEqual(r, { kind: "alias", aliasName: "x", accessors: [2, "y"] });
  });

  it("rechaza carácter inesperado tras la raíz", () => {
    assert.throws(() => parsePath("$#"), ParseError);
  });
});

describe("navigate: navegación absorbente", () => {
  it("navega sobre objetos por clave string", () => {
    assert.equal(navigate({ a: 1, b: 2 }, ["a"]), 1);
  });

  it("navega sobre arrays por índice", () => {
    assert.equal(navigate([10, 20, 30], [1]), 20);
  });

  it("navega anidado", () => {
    assert.equal(navigate({ a: [{ b: 42 }] }, ["a", 0, "b"]), 42);
  });

  it("devuelve null al navegar clave inexistente", () => {
    assert.equal(navigate({ a: 1 }, ["b"]), null);
  });

  it("devuelve null al navegar índice fuera de rango", () => {
    assert.equal(navigate([1, 2], [5]), null);
  });

  it("devuelve null al navegar string sobre array", () => {
    assert.equal(navigate([1, 2, 3], ["x"]), null);
  });

  it("devuelve null al navegar índice sobre objeto", () => {
    assert.equal(navigate({ a: 1 }, [0]), null);
  });

  it("devuelve null al navegar sobre primitivo", () => {
    assert.equal(navigate(42, ["x"]), null);
    assert.equal(navigate("hola", [0]), null);
    assert.equal(navigate(true, ["x"]), null);
  });

  it("propaga null absorbente desde el inicio", () => {
    assert.equal(navigate(null, ["a", "b"]), null);
  });

  it("propaga null absorbente cuando aparece a mitad de camino", () => {
    assert.equal(navigate({ a: null }, ["a", "b"]), null);
  });

  it("devuelve el valor original con accesores vacíos", () => {
    const v = { a: 1 };
    assert.equal(navigate(v, []), v);
  });

  it("no accede a propiedades del prototipo", () => {
    // toString existe en el prototipo, pero hasOwn devuelve false.
    assert.equal(navigate({}, ["toString"]), null);
  });

  it("rechaza índice negativo (fuera de rango)", () => {
    assert.equal(navigate([1, 2, 3], [-1]), null);
  });
});
