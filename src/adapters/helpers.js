/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file Funciones auxiliares relacionadas con los adaptadores y su registro.
**/

/**
 * @module jm2mp/adapters/helpers
 * @description
 * Funciones auxiliares relacionadas con los adaptadores y su registro.
**/

import { AdapterRegistry } from "../adapters/registry.js";
import { createNativeAdapter } from "../adapters/native.js";

/**
 * @description
 * Crea un {@link AdapterRegistry} con solamente el adaptador nativo
 * {@link createNativeAdapter} registrado.
 * Es el _setup_ mínimo para la mayoría de tests.
 *
 * @returns {AdapterRegistry}
**/
export function createNativeRegistry()
{
  const registry = new AdapterRegistry();
  registry.register(createNativeAdapter());
  return registry;
}

// End of file: $/JM2MP.JS/src/adapters/helpers.js //
