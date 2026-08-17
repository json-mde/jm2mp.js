/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file Helper functions for adapters and registry.
**/

/**
 * @module jm2mp/adapters/helpers
 * @description
 * Helper functions for adapters and registry.
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

import { AdapterRegistry } from "../adapters/registry.js";
import { createNativeAdapter } from "../adapters/native.js";

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @description
 * It creates a new {@link AdapterRegistry} only with the
 * `native` adapter ({@link createNativeAdapter}) registered.
 * 
 * It is the _minimal setup_ used for majority of unit tests.
 *
 * @returns {AdapterRegistry} Resultant {@link AdapterRegistry}.
**/
export function createNativeRegistry()
{
  const registry = new AdapterRegistry();
  registry.register(createNativeAdapter());
  return registry;
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/adapters/helpers.js                   */
