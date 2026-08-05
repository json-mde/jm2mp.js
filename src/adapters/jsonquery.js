/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @module adapters/jsonquery
 * @file Adaptador para sintaxis JSON Query.
 *
 * Versión soportada: @jsonquerylang/jsonquery 4.x EXCLUSIVAMENTE.
 *
 * JSON Query soporta dos formatos:
 *  - Textual: string con sintaxis específica.
 *  - Estructurado: array JSON con la consulta como dato.
 *
 * El adaptador acepta ambos en $path manteniendo la generalidad del diseño
 * (recordemos que $path es de tipo `any` en nuestro modelo).
 *
 * COMPORTAMIENTO UNIFORMIZADO (replica el contrato del adaptador nativo):
 *  - undefined del motor → null.
 *  - Errores del motor → EvaluationError envolviendo causa.
 *  - Input null → null sin invocar la librería.
 */

import { AdapterError, ValidationError, EvaluationError } from "../errors.js";

/**
 * Crea el adaptador JSON Query.
 *
 * Versión soportada: @jsonquerylang/jsonquery 4.x EXCLUSIVAMENTE.
 *
 * @returns {Promise<module:registry.QueryAdapter>}
 */
export async function createJsonQueryAdapter() {
  let jsonquery, parse;
  try {
    const mod = await import("@jsonquerylang/jsonquery");
    jsonquery = mod.jsonquery ?? mod.default?.jsonquery ?? mod.default;
    parse = mod.parse ?? mod.default?.parse;
    if (typeof jsonquery !== "function") {
      throw new Error("La función 'jsonquery' no está disponible en la librería.");
    }
  } catch (cause) {
    throw new AdapterError(
      "No se pudo cargar la librería '@jsonquerylang/jsonquery' v4.x. " +
      "Asegúrese de instalarla: npm install @jsonquerylang/jsonquery@4.",
      { cause }
    );
  }

  return {
    name: "jsonquery",
    description: "Sintaxis JSON Query. Soportada: @jsonquerylang/jsonquery 4.x.",

    /**
     * Valida una expresión JSON Query.
     * Si es string, intenta parsearla con `parse` (si la librería lo expone).
     * Si es array u objeto, asume forma estructurada con validación profunda
     * diferida al runtime.
     */
    async validate(path) {
      if (typeof path === "string") {
        if (path.length === 0) {
          throw new ValidationError("JSON Query: el string $path no puede estar vacío.");
        }
        if (typeof parse === "function") {
          try {
            parse(path);
          } catch (cause) {
            throw new ValidationError(
              `Expresión JSON Query inválida: "${path}".`,
              { cause }
            );
          }
        }
        return;
      }
      if (Array.isArray(path) || (typeof path === "object" && path !== null)) {
        // Forma estructurada; validación profunda diferida al runtime.
        return;
      }
      throw new ValidationError(
        `JSON Query: $path debe ser string, array u objeto, recibido ${typeof path}.`
      );
    },

    /**
     * Evalúa una expresión JSON Query.
     * Cachea la forma parseada cuando $path es string.
     */
    /* eslint-disable-next-line no-unused-vars -- _env */
    async evaluate(path, input, cache, _env) {
      // Propagación absorbente.
      if (input === null || input === undefined) return null;

      // Caché de expresiones parseadas (solo para forma textual).
      let queryToRun = path;
      if (typeof path === "string" && typeof parse === "function") {
        if (cache.has(path)) {
          queryToRun = cache.get(path);
        } else {
          try {
            queryToRun = parse(path);
          } catch (cause) {
            throw new EvaluationError(
              `Expresión JSON Query inválida en evaluación: "${path}".`,
              { cause }
            );
          }
          cache.set(path, queryToRun);
        }
      }

      let result;
      try {
        result = jsonquery(input, queryToRun);
      } catch (cause) {
        throw new EvaluationError(
          `Error al evaluar JSON Query.`,
          { cause }
        );
      }

      // Uniformización: undefined → null.
      return result === undefined ? null : result;
    },

    fallbackPolicy: {
      missing: "null (cuando la librería devuelve undefined)",
      multipleMatches: "array (la librería preserva la forma de la consulta)",
      singleMatch: "escalar tal cual",
      typeError: "EvaluationError",
      nullInput: "null (sin invocar la librería)",
    },
  };
}
