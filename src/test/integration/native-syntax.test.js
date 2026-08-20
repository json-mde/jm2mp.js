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
    const registry_for_query_language_adapters = null;  // native: siempre incluido.
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

  it("Clone just root sub-object (string).", async () => {
    const root_projection = {
      "$": { "$op":"get", "$path":"$.SubRootObject" }
    };
    const string_loader = JM2MP.createStringLoader({"$":JSON.stringify(root_projection)});
    const resultant_document = await JM2MP.project({
      rootName: "$",
      loader: string_loader,
      document: source_document
    });
    assert.notStrictEqual(resultant_document, null);
    assert.deepStrictEqual(resultant_document, source_document.SubRootObject);
  });

/* ------------------------------------------------------------------ */

  it("Clone just root sub-object (array).", async () => {
    const root_projection = {
      "$": { "$op":"get", "$path":['SubRootObject'] }
    };
    const string_loader = JM2MP.createStringLoader({"$":JSON.stringify(root_projection)});
    const resultant_document = await JM2MP.project({
      rootName: "$",
      loader: string_loader,
      document: source_document
    });
    assert.notStrictEqual(resultant_document, null);
    assert.deepStrictEqual(resultant_document, source_document.SubRootObject);
  });

/* ------------------------------------------------------------------ */

  it("It gets an inner property (string).", async () => {
    const root_projection = {
      "$": { "$op":"get", "$path":"$.SubRootObject.RealProperty" }
    };
    const string_loader = JM2MP.createStringLoader({"$":JSON.stringify(root_projection)});
    const resultant_document = await JM2MP.project({
      rootName: "$",
      loader: string_loader,
      document: source_document
    });
    assert.notStrictEqual(resultant_document, null);
    assert.deepStrictEqual(resultant_document, source_document.SubRootObject.RealProperty);
  });

/* ------------------------------------------------------------------ */

  it("It gets an inner property (array).", async () => {
    const root_projection = {
      "$": { "$op":"get", "$path":['SubRootObject','RealProperty'] }
    };
    const string_loader = JM2MP.createStringLoader({"$":JSON.stringify(root_projection)});
    const resultant_document = await JM2MP.project({
      rootName: "$",
      loader: string_loader,
      document: source_document
    });
    assert.notStrictEqual(resultant_document, null);
    assert.deepStrictEqual(resultant_document, source_document.SubRootObject.RealProperty);
  });

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

});  // describe

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/test/integration/native-syntax.test.js */
