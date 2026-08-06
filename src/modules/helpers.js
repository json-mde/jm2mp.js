/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @module jm2mp/modules/helpers
 * @file Funciones auxiliares relacionadas con los módulos.
 * @description Funciones auxiliares relacionadas con los módulos.
**/

import { ValidationError } from "../errors.js";

/**
 * Construye un módulo simple a partir de una proyección raíz, sin opciones
 * ni plantillas auxiliares. Útil para tests rápidos.
 *
 * @param {*} module - Valor a comprobar si puede ser (o no) un módulo.
 * @returns {boolean} Indica si puede ser (o no) un módulo.
 */
export function isModule(module) {
  return (
    (typeof module === "object") &&
    (module !== null) &&
    ( ! Array.isArray(module) )
  );
}

/**
 * Construye un módulo simple a partir de una proyección raíz, sin opciones
 * ni plantillas auxiliares. Útil para tests rápidos.
 *
 * @param {*} module - Valor a comprobar si puede ser (o no) un módulo.
 * @returns {boolean} Indica si puede ser (o no) un módulo.
 */
export function ThrowsValidationErrorWhenIsNotAModule(module) {
  if ( ! isModule(module) )
  {
    throw new ValidationError("A module must be a non-null JSON object.");
  }
}

/**
 * Construye un módulo simple a partir de una proyección raíz, sin opciones
 * ni plantillas auxiliares. Útil para tests rápidos.
 *
 * @param {*} rootProjection - Proyección a usar como plantilla raíz.
 * @returns {object} Módulo válido.
 */
export function moduleOf(rootProjection) {
  return { "@": rootProjection };
}

/**
 * Construye un módulo con plantilla raíz y plantillas auxiliares.
 *
 * @param {*} rootProjection - Plantilla raíz.
 * @param {object} [namedTemplates] - Plantillas con nombre.
 * @returns {object}
 */
export function moduleWith(rootProjection, namedTemplates = {}) {
  return { "@": rootProjection, ...namedTemplates };
}

/**
 * Detecta si un módulo de Node se puede importar dinámicamente.
 * Útil para skipear tests cuando una dependencia opcional no está instalada.
 *
 * @param {string} moduleName
 * @returns {Promise<boolean>}
 */
export async function isModuleAvailable(moduleName) {
  try {
    await import(moduleName);
    return true;
  } catch {
    return false;
  }
}
