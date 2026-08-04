/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @module adapters/helpers
 * @file Funciones auxiliares relacionadas con los adaptadores y su registro.
**/

import { AdapterRegistry } from "../adapters/registry.js";
import { createNativeAdapter } from "../adapters/native.js";

/**
 * Crea un AdapterRegistry con solo el adaptador nativo registrado.
 * Es el setup mínimo para la mayoría de tests.
 *
 * @returns {AdapterRegistry}
 */
export function createNativeRegistry()
{
  const registry = new AdapterRegistry();
  registry.register(createNativeAdapter());
  return registry;
}
