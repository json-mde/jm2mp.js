/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * Tests que garantizan el buen funcionamiento del adaptador nativo.
**/

/**
 * @module jm2mp/test/unit/adapter/adapter_contract
 * @description
 * Tests que garantizan el buen funcionamiento del adaptador nativo.
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { createNativeAdapter } from "../../../adapters/native.js";

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

describe("Unitary tests: native & native-path syntax", () => {

/* ------------------------------------------------------------------ */

  it("Validate: root", () => {
    const adapter = createNativeAdapter();
    const path = null;
    assert.rejects(
        adapter.validate(path)
    );
  });


/* ------------------------------------------------------------------ */

  it("Evaluate: root", () => {
    const adapter = createNativeAdapter();
    const path = null ;
    const input = null ;
    const cache =  null ;
    const env = null ;
    assert.rejects(
        adapter.evaluate(path, input, cache, env)
    );
  });


/* ------------------------------------------------------------------ */

});


/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/test/unit/adapter/native.test.js      */
