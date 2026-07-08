/**
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
