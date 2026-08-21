/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The module [native_syntax]{@link module:jm2mp/test/integration/map_reduce}
 * implements several **integration test** for `index.js` _use cases_.
**/

/**
 * @module jm2mp/test/integration/map_reduce
 * @description
 * This module implements several **integration test** for showing
 * **map and reduce** projections.
 **/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import * as JM2MP from '../../index.js';

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

describe("Integration test: map-reduce", () => {

/* ------------------------------------------------------------------ */

  /**
   * @constant {object}
   * @description
   * The object used as _source document_ in every integration test.
  **/
  const source_document = {
    "Name": "Map-Reduce first example.",
    "Records": [
      { "Id":1, "Title":"One",   "Group":"Alpha",   "Value": 3.00 },
      { "Id":2, "Title":"Two",   "Group":"Alpha",   "Value": 5.00 },
      { "Id":3, "Title":"Three", "Group":"Bravo",   "Value": 7.00 },
      { "Id":4, "Title":"Four",  "Group":"Bravo",   "Value": 9.00 },
      { "Id":5, "Title":"Five",  "Group":"Charlie", "Value":11.00 },
    ]
  };

/* ------------------------------------------------------------------ */

  it("It filters by value less than or equal to 6.", async () => {
    const projection_projection = {
      "$": {
        "Name": { "$op":"get", "$path":"@.Name" },
        "Records":
          { "$op" : "foldArr",
            "$over": { "$op":"get", "$path":"@.Records" },
            "$init": [] ,
            "$step": {
              "$op": "if",
              "$cond":
                { "$op"    : "lte",
                  "$left"  : { "$op":"get", "$path":"@.item.Value"},
                  "$right" : 6 },
              "$then":
                { "$op" : "cons",
                  "$head" : { "$op":"get", "$path":"@.item" },
                  "$tail" : { "$op":"get", "$path":"@.acc" } },
              "$else":
                { "$op":"get", "$path":"@.acc" }
            }
        }
      }
    };
    const string_loader = JM2MP.createStringLoader({"$":JSON.stringify(projection_projection)});
    const resultant_document = await JM2MP.project({
      rootName: "$",
      loader: string_loader,
      document: source_document
    });
    //// console.log('resultant_document',resultant_document);
    assert.notStrictEqual(resultant_document, null, "resultant_document === null");
    const expected_document = { Name: source_document.Name,
                                Records: source_document.Records.filter( (i)=>(i.Value<=6)) } ;
    assert.deepStrictEqual(resultant_document, expected_document, "resultant_document === expected_document");
  });

/* ------------------------------------------------------------------ */

  it("It sums every value greater than to 6.", async () => {
    const projection_projection = {
      "$": {
        "Name": { "$op":"get", "$path":"@.Name" },
        "SumOfRecordValues":
          { "$op" : "foldArr",
            "$over": { "$op":"get", "$path":"@.Records" },
            "$init": 0 ,
            "$step": {
              "$op": "if",
              "$cond":
                { "$op"    : "gt",
                  "$left"  : { "$op":"get", "$path":"@.item.Value"},
                  "$right" : 6 },
              "$then":
                { "$op" : "add",
                  "$left" : { "$op":"get", "$path":"@.item.Value" },
                  "$right" : { "$op":"get", "$path":"@.acc" } },
              "$else":
                { "$op":"get", "$path":"@.acc" }
            }
        }
      }
    };
    const string_loader = JM2MP.createStringLoader({"$":JSON.stringify(projection_projection)});
    const resultant_document = await JM2MP.project({
      rootName: "$",
      loader: string_loader,
      document: source_document
    });
    //// console.log('resultant_document',resultant_document);
    assert.notStrictEqual(resultant_document, null, "resultant_document === null");
    const expected_document = {
      Name: source_document.Name,
      SumOfRecordValues: source_document
                         .Records
                         .reduceRight( (acc, i)=>( (i.Value > 6)
                                                        ? (acc + i.Value)
                                                        : acc ),
                                            0 ) } ;
    assert.deepStrictEqual(resultant_document, expected_document, "resultant_document === expected_document");
  });

/* ------------------------------------------------------------------ */

  it("It sums every value greater than to 6.", async () => {
    const projection_projection = {
      "$": {
        "Name": { "$op":"get", "$path":"@.Name" },
        "SumOfRecordValues": {
          "$op" : "pipe",
          "$stages" : [
            {
              "$op" : "foldArr",
              "$over": { "$op":"get", "$path":"@.Records" },
              "$init": [],
              "$step": {
                "$op": "if",
                "$cond": {
                  "$op"    : "gt",
                  "$left"  : { "$op":"get", "$path":"@.item.Value"},
                  "$right" : 6
                },
                "$then": {
                  "$op" : "cons",
                  "$head" : { "$op":"get", "$path":"@.item" },
                  "$tail" : { "$op":"get", "$path":"@.acc"  }
                },
                "$else": {
                  "$op":"get", "$path":"@.acc"
                }
              }
            },
            {
              "$op" : "foldArr",
              "$over": { "$op":"get", "$path":"@" },
              "$init": 0,
              "$step": {
                "$op": "if",
                "$cond": {
                  "$op"    : "gt",
                  "$left"  : { "$op":"get", "$path":"@.item.Value"},
                  "$right" : 6
                },
                "$then": {
                  "$op" : "add",
                  "$left" : { "$op":"get", "$path":"@.item.Value" },
                  "$right" : { "$op":"get", "$path":"@.acc" }
                },
                "$else":
                  { "$op":"get", "$path":"@.acc" }
              }
            }
          ]
        }
      }
    };
    const string_loader = JM2MP.createStringLoader({"$":JSON.stringify(projection_projection)});
    const resultant_document = await JM2MP.project({
      rootName: "$",
      loader: string_loader,
      document: source_document
    });
    //// console.log('resultant_document',resultant_document);
    assert.notStrictEqual(resultant_document, null, "resultant_document === null");
    const expected_document = {
      Name: source_document.Name,
      SumOfRecordValues: source_document
                         .Records
                         .filter( (i)=>(i.Value > 6) )
                         .reduceRight( (acc, i)=>(acc + i.Value), 0 ) } ;
    assert.deepStrictEqual(resultant_document, expected_document, "resultant_document === expected_document");
  });

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

});  // describe

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/test/integration/map-reduce.test.js   */
