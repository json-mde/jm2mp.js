/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file Tests del resolutor de módulos.
 *
 * Cubre resolución básica, detección de ciclos, estructura de diamante,
 * cache normalizada, prioridad de importación, descarte de metadata y el
 * límite maxModules.
 */

/**
 * @module jm2mp/test/unit/resolver
 * @description
 * Tests del resolutor de módulos.
**/

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { resolve } from "../../modules/resolver.js";
import { ResolutionError } from "../../errors.js";

/** Crea un loader a partir de un mapa de objetos JSON ya parseados. */
function objectLoader(mapping) {
  return async function (name) {
    if (!Object.hasOwn(mapping, name)) {
      throw new Error(`Módulo no encontrado: ${name}`);
    }
    // Devolvemos copia para evitar mutaciones cruzadas.
    return JSON.parse(JSON.stringify(mapping[name]));
  };
}

describe("resolve: caso simple sin dependencias", () => {
  it("resuelve un módulo sin importaciones", async () => {
    const loader = objectLoader({ "main": { "@": null } });
    const result = await resolve("main", loader);
    assert.deepEqual(result, { "@": null });
  });

  it("falla si no se encuentra la plantilla raíz tras resolver", async () => {
    const loader = objectLoader({
      "main": { "$options": { "$depends-on": [] }, "aux": null }
    });
    await assert.rejects(
      resolve("main", loader),
      (err) => err instanceof ResolutionError && /raíz "@"/.test(err.message)
    );
  });

  it("módulo sin $options no tiene dependencias", async () => {
    const loader = objectLoader({ "main": { "@": "valor" } });
    const result = await resolve("main", loader);
    assert.equal(result["@"], "valor");
  });

  it("propaga error del loader como ResolutionError", async () => {
    /* eslint-disable-next-line no-unused-vars -- _name */
    const loader = async (_name) => { throw new Error("falla I/O"); };
    await assert.rejects(
      resolve("main", loader),
      (err) => err instanceof ResolutionError && /No se pudo cargar/.test(err.message)
    );
  });

  it("rechaza módulo que no es objeto", async () => {
    /* eslint-disable-next-line no-unused-vars -- _name */
    const loader = async (_name) => [1, 2, 3];
    await assert.rejects(
      resolve("main", loader),
      ResolutionError
    );
  });
});

describe("resolve: dependencias en cadena", () => {
  it("resuelve A→B→C y aplica plantillas en orden topológico", async () => {
    const loader = objectLoader({
      "A": {
        "$options": { "$depends-on": ["B"] },
        "@": { "$op": "call", "$ref": "fromB" }
      },
      "B": {
        "$options": { "$depends-on": ["C"] },
        "fromB": { "$op": "call", "$ref": "fromC" }
      },
      "C": { "fromC": "valor de C" }
    });
    const result = await resolve("A", loader);
    assert.ok(Object.hasOwn(result, "@"));
    assert.ok(Object.hasOwn(result, "fromB"));
    assert.ok(Object.hasOwn(result, "fromC"));
    assert.equal(result.fromC, "valor de C");
    // $options no debe aparecer en el módulo final.
    assert.equal(result.$options, undefined);
  });

  it("rechaza $depends-on con entrada no string", async () => {
    const loader = objectLoader({
      "A": { "$options": { "$depends-on": [42] }, "@": null }
    });
    await assert.rejects(resolve("A", loader), ResolutionError);
  });
});

describe("resolve: detección de ciclos", () => {
  it("detecta ciclo directo A→B→A", async () => {
    const loader = objectLoader({
      "A": { "$options": { "$depends-on": ["B"] }, "@": null },
      "B": { "$options": { "$depends-on": ["A"] } }
    });
    await assert.rejects(
      resolve("A", loader),
      (err) => err instanceof ResolutionError && /[Cc]iclo/.test(err.message)
    );
  });

  it("detecta autoreferencia A→A", async () => {
    const loader = objectLoader({
      "A": { "$options": { "$depends-on": ["A"] }, "@": null }
    });
    await assert.rejects(
      resolve("A", loader),
      (err) => err instanceof ResolutionError && /[Cc]iclo/.test(err.message)
    );
  });

  it("detecta ciclo de tres elementos", async () => {
    const loader = objectLoader({
      "A": { "$options": { "$depends-on": ["B"] }, "@": null },
      "B": { "$options": { "$depends-on": ["C"] } },
      "C": { "$options": { "$depends-on": ["A"] } }
    });
    await assert.rejects(
      resolve("A", loader),
      (err) => err instanceof ResolutionError && /[Cc]iclo/.test(err.message)
    );
  });
});

describe("resolve: estructura de diamante", () => {
  it("la prioridad por la derecha gana en redeclaración", async () => {
    const loader = objectLoader({
      "A": {
        "$options": { "$depends-on": ["B", "C"] },
        "@": { "$op": "call", "$ref": "comun" }
      },
      "B": { "comun": "desde B" },
      "C": { "comun": "desde C" }
    });
    const result = await resolve("A", loader);
    assert.equal(result.comun, "desde C");
  });

  it("invertir el orden de $depends-on cambia la prioridad", async () => {
    const loader = objectLoader({
      "A": {
        "$options": { "$depends-on": ["C", "B"] },
        "@": { "$op": "call", "$ref": "comun" }
      },
      "B": { "comun": "desde B" },
      "C": { "comun": "desde C" }
    });
    const result = await resolve("A", loader);
    assert.equal(result.comun, "desde B");
  });

  it("el módulo raíz tiene máxima prioridad", async () => {
    const loader = objectLoader({
      "A": {
        "$options": { "$depends-on": ["B"] },
        "@": "raíz",
        "comun": "desde A"
      },
      "B": { "comun": "desde B" }
    });
    const result = await resolve("A", loader);
    assert.equal(result.comun, "desde A");
  });

  it("módulo ya visitado en otra rama del DAG no se reprocesa", async () => {
    let dCount = 0;
    const loader = async (name) => {
      if (name === "A") return {
        "$options": { "$depends-on": ["B", "C"] },
        "@": null
      };
      if (name === "B") return { "$options": { "$depends-on": ["D"] } };
      if (name === "C") return { "$options": { "$depends-on": ["D"] } };
      if (name === "D") {
        dCount++;
        return { "valor": "D" };
      }
      throw new Error("desconocido");
    };
    await resolve("A", loader);
    assert.equal(dCount, 1);
  });
});

describe("resolve: cache normalizada a minúsculas", () => {
  it("trata 'Foo' y 'foo' como el mismo módulo", async () => {
    let calls = 0;
    const loader = async (name) => {
      calls++;
      if (name === "main") {
        return { "$options": { "$depends-on": ["Foo", "foo"] }, "@": null };
      }
      return { "valor": name.toLowerCase() };
    };
    await resolve("main", loader);
    // El loader se invoca para main y para "Foo" (primer hit); la segunda
    // referencia a "foo" se sirve desde caché.
    assert.equal(calls, 2);
  });
});

describe("resolve: maxModules", () => {
  it("rechaza cadena de dependencias muy larga si excede maxModules", async () => {
    let count = 0;
    /* eslint-disable-next-line no-unused-vars -- _name */
    const loader = async (_name) => {
      count++;
      return {
        "$options": { "$depends-on": [`m${count}`] },
        "@": null
      };
    };
    await assert.rejects(
      resolve("main", loader, { maxModules: 5 }),
      (err) => err instanceof ResolutionError && /maxModules/.test(err.message)
    );
  });

  it("módulos dentro del límite se resuelven correctamente", async () => {
    const loader = async (name) => {
      if (name === "A") return { "$options": { "$depends-on": ["B"] }, "@": null };
      if (name === "B") return { "$options": { "$depends-on": ["C"] } };
      if (name === "C") return { "valor": "C" };
      throw new Error("?");
    };
    const result = await resolve("A", loader, { maxModules: 5 });
    assert.equal(result.valor, "C");
  });
});

describe("resolve: descarte de metadata", () => {
  it("descarta $options aunque venga de varios módulos", async () => {
    const loader = objectLoader({
      "A": {
        "$options": { "$depends-on": ["B"], "$default-query-language": "jsonata" },
        "@": null
      },
      "B": {
        "$options": { "$default-query-language": "jsonpath" },
        "aux": null
      }
    });
    const result = await resolve("A", loader);
    assert.equal(result.$options, undefined);
  });

  it("descarta $schema del módulo final", async () => {
    const loader = objectLoader({
      "A": {
        "$schema": "https://example.com/s.json",
        "@": null
      }
    });
    const result = await resolve("A", loader);
    assert.equal(result.$schema, undefined);
  });
});
