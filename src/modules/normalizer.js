/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file Normalización de módulos durante la fase de resolución.
 * @description
 * Cada módulo declara una sintaxis por defecto (en $options.$default-query-language)
 * que se aplica a las operaciones $get que omiten $syntax. La normalización
 * recorre cada plantilla del módulo y, para cada $get sin $syntax, le añade
 * la sintaxis declarada por defecto.
 *
 * Tras la normalización, todo $get del módulo lleva su $syntax explícito y, por
 * tanto, las plantillas son auto-explicativas y se pueden fusionar entre módulos
 * de distinta sintaxis sin ambigüedad.
 *
 * PROPIEDADES META-DOCUMENTALES IGNORADAS POR EL NORMALIZADOR:
 *  - $options: configuración del módulo (dependencias, sintaxis por defecto).
 *  - $schema: referencia opcional a un esquema JSON Schema externo.
 *
 * Estas dos propiedades NO son plantillas con nombre; son metadatos
 * del documento JSON. El normalizador las preserva sin recorrer su contenido.
**/

/**
 * @module jm2mp/modules/normalizer
**/

//// import { ValidationError } from "../errors.js";
import { ThrowsValidationErrorWhenIsNotAModule } from "./helpers.js";

/**
 * Conjunto de claves que se consideran metadata del módulo (no plantillas).
 * Estas claves se preservan tal cual, sin recorrer su contenido durante
 * la normalización.
 */
const MODULE_META_KEYS = new Set(["$options", "$schema"]);

/**
 * Normaliza un módulo completo, añadiendo $syntax a los $get que lo omitan.
 *
 * No modifica el módulo original; devuelve una nueva estructura.
 *
 * @param {object} module - Módulo a normalizar (objeto JSON).
 * @returns {object} Módulo normalizado.
 */
export function normalizeModule(module)
{
  // Determinamos si es un módulo válido.
  ThrowsValidationErrorWhenIsNotAModule(module);

  // Determinamos la sintaxis por defecto del módulo.
  const defaultSyntax = getDefaultSyntax(module);

  // Construimos un nuevo objeto resultado.
  const result = {};

  // Recorremos las claves del módulo.
  for (const key of Object.keys(module)) {
    if (MODULE_META_KEYS.has(key)) {
      // Las claves meta se preservan tal cual sin recorrer su contenido.
      // El resolver decidirá si se descartan al fusionar (es el caso de $options).
      result[key] = module[key];
      continue;
    }
    // Las demás claves son plantillas (incluyendo "@"). Las normalizamos recursivamente.
    result[key] = normalizeNode(module[key], defaultSyntax);
  }

  // Devolvemos el resultado.
  return result;
}

/**
 * Extrae la sintaxis por defecto declarada en $options.$default-query-language.
 * Si no se declara o es inválido, devuelve "native".
 *
 * @param {object} module
 * @returns {string}
 */
function getDefaultSyntax(module) {
  const module_options = (("$options" in module) ? module["$options"] : undefined);
  if (module_options
      && (typeof module_options === "object")
      && !Array.isArray(module_options))
  {
    const default_query_language_declared = module_options["$default-query-language"];
    if ((typeof default_query_language_declared === "string")
        && (default_query_language_declared.length > 0))
    {
      return default_query_language_declared;
    }
  }

  // Devolvemos el resultado.
  return "native";
}

/**
 * Normaliza recursivamente un nodo del árbol de plantillas.
 *
 * Solo modifica nodos que sean operaciones $get sin $syntax.
 * Cualquier otro nodo se recorre estructuralmente para descender en sus hijos.
 *
 * @param {*} node - Nodo a normalizar.
 * @param {string} defaultSyntax - Sintaxis por defecto del módulo.
 * @returns {*} Nodo normalizado.
 */
function normalizeNode(node, defaultSyntax) {
  // Tipos primitivos: no hay nada que normalizar.
  if (node === null || typeof node !== "object") {
    return node;
  }

  // Arrays: normalizamos cada elemento.
  if (Array.isArray(node)) {
    return node.map((child) => normalizeNode(child, defaultSyntax));
  }

  // Objetos: distinguimos operación de objeto literal.
  // Detectamos operaciones por la presencia de $op (string).
  const isOperation = Object.hasOwn(node, "$op") && typeof node.$op === "string";

  if (isOperation && node.$op === "get") {
    // Operación $get: si no tiene $syntax, se la añadimos.
    return normalizeGet(node, defaultSyntax);
  }

  // Cualquier otro nodo (operación distinta a $get, u objeto literal):
  // recorremos sus hijos para descender.
  const result = {};
  for (const key of Object.keys(node)) {
    result[key] = normalizeNode(node[key], defaultSyntax);
  }
  return result;
}

/**
 * Normaliza una operación $get, añadiendo $syntax si falta.
 * Los demás argumentos del $get se siguen recorriendo (por si tienen sub-$get).
 *
 * @param {object} getOp
 * @param {string} defaultSyntax
 * @returns {object}
 */
function normalizeGet(getOp, defaultSyntax) {
  const result = {};
  // Copiamos todas las propiedades, descendiendo en aquellas que sean proyecciones.
  for (const key of Object.keys(getOp)) {
    if (key === "$op") {
      // $op no se toca.
      result[key] = getOp[key];
    } else if (key === "$path") {
      // $path se preserva tal cual (puede ser cualquier tipo según la sintaxis;
      // no descendemos porque es un valor de consulta, no una proyección).
      result[key] = getOp[key];
    } else if (key === "$syntax") {
      // Si ya está, se preserva (el autor fue explícito).
      result[key] = getOp[key];
    } else if (key === "$from") {
      // $from es proyección: recorremos.
      result[key] = normalizeNode(getOp[key], defaultSyntax);
    } else {
      // Cualquier otra clave (tras validación, no debería haber más, pero por seguridad).
      result[key] = normalizeNode(getOp[key], defaultSyntax);
    }
  }
  // Si no había $syntax, lo añadimos con la sintaxis por defecto del módulo.
  if (!Object.hasOwn(result, "$syntax")) {
    result.$syntax = defaultSyntax;
  }
  return result;
}
