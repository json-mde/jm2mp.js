/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file Adaptador para sintaxis JSONPath.
 *
 * Versión soportada: jsonpath-plus 10.x EXCLUSIVAMENTE. Otras versiones
 * mayores no están soportadas y requerirán nuevos adaptadores en el futuro.
 *
 * COMPORTAMIENTO UNIFORMIZADO (replica el contrato del adaptador nativo):
 *  - Array vacío del motor → null (propagación absorbente).
 *  - Array de un único elemento → ese elemento (desempaquetado).
 *  - Array de múltiples elementos → array tal cual.
 *  - Input null → null sin invocar la librería.
 *  - Errores de la librería → EvaluationError (en evaluación) o ValidationError
 *    (en validación previa).
 *
 * La librería 'jsonpath-plus' se carga dinámicamente al construir el
 * adaptador. Si no está instalada, lanza AdapterError con mensaje claro.
 */

/**
 * @module jm2mp/adapters/jsonpath
**/

import { AdapterError, ValidationError, EvaluationError } from "../errors.js";

/**
 * @description
 *   **jsonpath-plus** analyses, transforms, and selectively extracts data
 *   from JSON documents (and JavaScript objects).
 *   
 *   **jsonpath-plus** expands on the original **JSON Path** specification
 *   to add some additional operators and makes explicit some behaviors
 *   the original Goessner's work did not spell out.
 * @external JSONPath
 * @see {@link https://goessner.net/articles/JsonPath/}
 * @see {@link https://www.npmjs.com/package/jsonpath-plus}
 * @see {@link https://github.com/JSONPath-Plus/JSONPath}
**/

/**
 * Crea el adaptador JSONPath. Carga 'jsonpath-plus' dinámicamente.
 *
 * Versión soportada: 10.x. Otras versiones (anteriores o posteriores)
 * pueden funcionar pero NO están oficialmente soportadas.
 *
 * @returns {Promise<module:registry.QueryAdapter>}
 */
export async function createJsonPathAdapter() {
  let JSONPath;
  try {
    const mod = await import("jsonpath-plus");
    // 'jsonpath-plus' exporta JSONPath como named export y también default en algunas versiones.
    JSONPath = mod.JSONPath ?? mod.default?.JSONPath ?? mod.default;
    if (typeof JSONPath !== "function") {
      throw new Error("La función 'JSONPath' no está disponible en la librería.");
    }
  } catch (cause) {
    throw new AdapterError(
      "No se pudo cargar la librería 'jsonpath-plus' v10.x. " +
      "Asegúrese de instalarla: npm install jsonpath-plus@10.",
      { cause }
    );
  }

  return {
    name: "jsonpath",
    description: "Sintaxis JSONPath (RFC 9535-like). Soportada: jsonpath-plus 10.x.",

    /**
     * Valida una expresión JSONPath ejecutando una invocación de prueba
     * con un input vacío. En general, jsonpath-plus nunca lanza excpeciones,
     * ni siquiera cuando se indica una sintaxis inválida.
     */
    async validate(path) {
      if (typeof path !== "string" || path.length === 0) {
        throw new ValidationError(
          `JSONPath: $path debe ser un string no vacío, recibido ${typeof path}.`
        );
      }
      try {
        JSONPath({ path, json: {}, wrap: true });
      } catch (cause) {
        throw new ValidationError(
          `Expresión JSONPath inválida: "${path}".`,
          { cause }
        );
      }
    },

    /**
     * Evalúa una expresión JSONPath y uniformiza el resultado al contrato.
     */
    /* eslint-disable-next-line no-unused-vars -- _env */
    async evaluate(path, input, cache, _env) {
      // Propagación absorbente: input null → null sin invocar.
      if (input === null || input === undefined) return null;

      // jsonpath-plus parsea internamente cada llamada. Marcamos en cache
      // que la expresión ya ha sido validada al menos una vez para evitar
      // re-validar en bucle.
      if (!cache.has(path)) {
        try {
          JSONPath({ path, json: {}, wrap: true });
          cache.set(path, true);
        } catch (cause) {
          throw new EvaluationError(
            `Expresión JSONPath inválida en evaluación: "${path}".`,
            { cause }
          );
        }
      }

      // Ejecutamos la expresión sobre el input real.
      let result;
      try {
        result = JSONPath({ path, json: input, wrap: true });
      } catch (cause) {
        throw new EvaluationError(
          `Error al evaluar JSONPath "${path}".`,
          { cause }
        );
      }

      // Uniformización al contrato:
      //   array vacío → null; un único elemento → desempaquetado; varios → array.
      if (!Array.isArray(result) || result.length === 0) return null;
      if (result.length === 1) return result[0];
      return result;
    },

    fallbackPolicy: {
      missing: "null (la librería devuelve [], que el adaptador convierte a null)",
      multipleMatches: "array tal cual de la librería",
      singleMatch: "escalar (desempaquetado del array de un elemento)",
      typeError: "null (la librería tolera errores de tipo devolviendo [])",
      nullInput: "null (sin invocar la librería)",
    },
  };
}
