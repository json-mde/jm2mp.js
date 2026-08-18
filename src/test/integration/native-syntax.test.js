/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The module [native_syntax]{@link module:jm2mp/test/integration/native_syntax}
 * implements several **integration test** for `native syntax` _use cases_.
**/

/**
 * @module jm2mp/test/integration/native_syntax
 * @description
 * This module implements several **integration test** for `native syntax`
 * _use cases_.
 **/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import * as JM2MP from '../../index.js';

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

describe("Integration test: native syntax", () => {

/* ------------------------------------------------------------------ */

  /**
   * @constant {object}
   * @description
   * The object used as _source document_ in every integration test.
  **/
  const source_document = {
    // The single sub-root object.
    "SubRootObject": {
      // Scalar properties.
      "NullProperty" : null,
      "FalseProperty" : false,
      "TrueProperty" : true,
      "TextProperty" : "Text value.",
      "IntegerProperty" : 12,
      "RealProperty" : Math.PI,
      "EmptyArrayProperty" : [],
      "ArrayProperty" : [ 1, "Two", { "Three" : 3 } ],
      "EmptyObjectProperty": {},
      "ObjectProperty": {
        "Alpha" : 1,
        "Bravo" : "B",
        "Charlie" : (10/3)
      },
    }
  };

/* ------------------------------------------------------------------ */

  it("Create adapter registry for another (invented) query language.", async () => {
    const invented_adapter_registry = async function() { return {
      name: "do_not_use",
      description:"do_not_use",
      /* eslint-disable-next-line no-unused-vars */
      async validate(_path){return(true);},
      /* eslint-disable-next-line no-unused-vars */
      async evaluate(_path, _input, _cache, _env){return(null);},
    }};
    const r = await JM2MP.createAdapterRegistry({},invented_adapter_registry);  // native: siempre incluido.
    assert.notStrictEqual(r, null, "r === null");
  });

/* ------------------------------------------------------------------ */

  it("Clone source (getting the root context).", async () => {
    const root_projection = {
      "$": { "$op":"get", "$syntax":"native", "$path":"$" }
    };
    const string_loader = JM2MP.createStringLoader({"1":JSON.stringify(root_projection)});
    const registry_for_query_language_adapters = await JM2MP.createAdapterRegistry();  // native: siempre incluido.
    const r = await JM2MP.project({
      rootName: "1",
      loader: string_loader,
      document: source_document,
      registry: registry_for_query_language_adapters,
      options: {
        maxDepth:  100,
        maxModules: 10,
      }
    });
    assert.notStrictEqual(r, null, "r === null");
    assert.deepStrictEqual(r, source_document, "r === source_document");
  });

/* ------------------------------------------------------------------ */

  it("Clone source (getting its current context which initially is also the root context).", async () => {
    const root_projection = {
      "$": { "$op":"get", "$path":"@" }
    };
    const string_loader = JM2MP.createStringLoader({"1":JSON.stringify(root_projection)});
    const registry_for_query_language_adapters = await JM2MP.createAdapterRegistry();  // native: siempre incluido.
    const r = await JM2MP.project({
      rootName: "1",
      loader: string_loader,
      document: source_document,
      registry: registry_for_query_language_adapters,
      options: {
        maxDepth:  100,
        maxModules: 10,
      }
    });
    assert.notStrictEqual(r, null, "r === null");
    assert.deepStrictEqual(r, source_document, "r === source_document");
  });

/* ------------------------------------------------------------------ */

  it("Clone source (getting JSONPath root context).", async () => {
    const root_projection = {
      "$": { "$op":"get", "$syntax":"jsonpath", "$path":"$" }
    };
    const string_loader = JM2MP.createStringLoader({"1":JSON.stringify(root_projection)});
    const registry_for_query_language_adapters = await JM2MP.createAdapterRegistry({jsonpath:true});
    const r = await JM2MP.project({
      rootName: "1",
      loader: string_loader,
      document: source_document,
      registry: registry_for_query_language_adapters,
      options: {
        maxDepth:  100,
        maxModules: 10,
      }
    });
    assert.notStrictEqual(r, null, "r === null");
    assert.deepStrictEqual(r, source_document, "r === source_document");
  });

/* ------------------------------------------------------------------ */

  it("Clone source (getting JSON Pointer root context -an empty string-).", async () => {
    const root_projection = {
      "$": { "$op":"get", "$syntax":"jsonpointer", "$path":"" }
    };
    const string_loader = JM2MP.createStringLoader({"1":JSON.stringify(root_projection)});
    const registry_for_query_language_adapters = await JM2MP.createAdapterRegistry({jsonpointer:true});
    const r = await JM2MP.project({
      rootName: "1",
      loader: string_loader,
      document: source_document,
      registry: registry_for_query_language_adapters,
      options: {
        maxDepth:  100,
        maxModules: 10,
      }
    });
    assert.notStrictEqual(r, null, "r === null");
    assert.deepStrictEqual(r, source_document, "r === source_document");
  });

/* ------------------------------------------------------------------ */

  it("Clone source (getting JSONata root context).", async () => {
    const root_projection = {
      "$": { "$op":"get", "$syntax":"jsonata", "$path":"$" }
    };
    const string_loader = JM2MP.createStringLoader({"1":JSON.stringify(root_projection)});
    const registry_for_query_language_adapters = await JM2MP.createAdapterRegistry({jsonata:true, jsonataOptions:{timeout:(60*1000)}});
    const r = await JM2MP.project({
      rootName: "1",
      loader: string_loader,
      document: source_document,
      registry: registry_for_query_language_adapters,
      options: {
        maxDepth:  100,
        maxModules: 10,
      }
    });
    assert.notStrictEqual(r, null, "r === null");
    assert.deepStrictEqual(r, source_document, "r === source_document");
  });

/* ------------------------------------------------------------------ */

  it("Clone source (getting JSONQuery root context).", async () => {
    const root_projection = {
      "$": { "$op":"get", "$syntax":"jsonquery", "$path":"{SubRootObject:.SubRootObject}" }
    };
    const string_loader = JM2MP.createStringLoader({"1":JSON.stringify(root_projection)});
    const registry_for_query_language_adapters = await JM2MP.createAdapterRegistry({jsonquery:true});
    const r = await JM2MP.project({
      rootName: "1",
      loader: string_loader,
      document: source_document,
      registry: registry_for_query_language_adapters,
      options: {
        maxDepth:  100,
        maxModules: 10,
      }
    });
    assert.notStrictEqual(r, null, "r === null");
    assert.deepStrictEqual(r, source_document, "r === source_document");
  });

/* ------------------------------------------------------------------ */

  it("Almost clone source (getting JMESPath 'all' object projection over the root context).", async () => {
    const root_projection = {
      "$": { "$op":"get", "$syntax":"jmespath", "$path":"SubRootObject" }
    };
    const string_loader = JM2MP.createStringLoader({"1":JSON.stringify(root_projection)});
    const registry_for_query_language_adapters = await JM2MP.createAdapterRegistry({jmespath:true});
    const r = await JM2MP.project({
      rootName: "1",
      loader: string_loader,
      document: source_document,
      registry: registry_for_query_language_adapters,
      options: {
        maxDepth:  100,
        maxModules: 10,
      }
    });
    console.log('source_document',source_document);
    console.log('r',r);
    assert.notStrictEqual(r, null, "r === null");
    assert.deepStrictEqual(r, source_document.SubRootObject, "r === source_document.SubRootObject");
  });

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

});  // describe

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/test/integration/native-syntax.test.js */
