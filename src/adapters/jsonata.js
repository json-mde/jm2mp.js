/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @module adapters/jsonata
 * @file Adaptador para sintaxis JSONata.
 *
 * Versión soportada: jsonata 2.x EXCLUSIVAMENTE. Versiones 1.x no están
 * soportadas (su API era distinta). Versiones 3.x futuras requerirán
 * nuevos adaptadores.
 *
 * NOTA IMPORTANTE: JSONata 2.x es ASYNC-ONLY por construcción. La librería
 * fue reescrita en v2 para usar async/await internamente y no ofrece modo
 * síncrono. Esto no es problema porque el contrato de los adaptadores ya
 * exige que `evaluate` sea async.
 *
 * COMPORTAMIENTO UNIFORMIZADO (replica el contrato del adaptador nativo):
 *  - undefined del motor → null.
 *  - Errores de tipo del motor → EvaluationError envolviendo causa.
 *  - Input null → null sin invocar la librería.
 *  - Compilación de expresión inválida en validación → ValidationError.
 *  - Compilación de expresión inválida en evaluación → EvaluationError.
 *
 * MECANISMO DE TIMEOUT: el adaptador acepta un `timeout` opcional en
 * milisegundos. Si la evaluación tarda más, se rechaza con EvaluationError
 * indicando timeout. La evaluación de JSONata sigue corriendo en background
 * hasta su finalización natural, pero su resultado se descarta. Para
 * proyecciones bien escritas esto es aceptable; para proyecciones
 * potencialmente maliciosas, considere también limitar entradas.
 */

import { AdapterError, ParseError, ValidationError, EvaluationError } from "../errors.js";

/**
 * Crea el adaptador JSONata.
 *
 * Versión soportada: jsonata 2.x EXCLUSIVAMENTE.
 *
 * @param {object} [options]
 * @param {number} [options.timeout] - Timeout en milisegundos para cada
 *     evaluación. Si > 0, las evaluaciones que excedan este tiempo lanzan
 *     EvaluationError. Si se omite o es <= 0, no hay timeout.
 * @returns {Promise<module:registry.QueryAdapter>}
 */
export async function createJsonataAdapter(options = {}) {
  let jsonata;
  try {
    const mod = await import("jsonata");
    // 'jsonata' exporta su función como default en v2.
    jsonata = mod.default ?? mod.jsonata ?? mod;
    if (typeof jsonata !== "function") {
      throw new Error("La función 'jsonata' no está disponible en la librería.");
    }
  } catch (cause) {
    throw new AdapterError(
      "No se pudo cargar la librería 'jsonata' v2.x. " +
      "Asegúrese de instalarla: npm install jsonata@2.",
      { cause }
    );
  }

  // Timeout configurable. 0 o negativo = sin timeout.
  const timeout = (typeof options.timeout === "number" && options.timeout > 0)
    ? options.timeout
    : 0;

  /**
   * Compila o recupera de caché una expresión JSONata.
   * Devuelve el objeto JSONata compilado (con .evaluate()).
   */
  function compileWithCache(expr, cache) {
    if (cache.has(expr)) return cache.get(expr);
    let compiled;
    try {
      compiled = jsonata(expr);
    } catch (cause) {
      throw new ParseError(
        `Expresión JSONata inválida: "${expr}".`,
        { cause }
      );
    }
    cache.set(expr, compiled);
    return compiled;
  }

  return {
    name: "jsonata",
    description: "Sintaxis JSONata (lenguaje funcional de consulta y transformación). Soportada: jsonata 2.x.",

    /**
     * Valida una expresión JSONata intentando compilarla con la librería.
     */
    async validate(path) {
      if (typeof path !== "string" || path.length === 0) {
        throw new ValidationError(
          `JSONata: $path debe ser un string no vacío, recibido ${typeof path}.`
        );
      }
      try {
        jsonata(path);
      } catch (cause) {
        throw new ValidationError(
          `Expresión JSONata inválida: "${path}".`,
          { cause }
        );
      }
    },

    /**
     * Evalúa una expresión JSONata. Usa caché de expresiones compiladas
     * para amortizar el coste de compilación en bucles.
     *
     * Si timeout está configurado (> 0), aplica Promise.race con un
     * setTimeout. Si la evaluación excede el tiempo, lanza EvaluationError.
     * NOTA: la evaluación JSONata sigue ejecutándose en background hasta
     * terminar; solo se descarta el resultado.
     */
    async evaluate(path, input, cache, _env) {
      // Propagación absorbente.
      if (input === null || input === undefined) return null;

      // Recuperamos o compilamos con caché.
      let compiled;
      try {
        compiled = compileWithCache(path, cache);
      } catch (cause) {
        throw new EvaluationError(
          `Compilación JSONata falló para "${path}".`,
          { cause }
        );
      }

      // Función que ejecuta y normaliza undefined → null.
      const evalFn = async () => {
        let result;
        try {
          result = await compiled.evaluate(input);
        } catch (cause) {
          throw new EvaluationError(
            `Error al evaluar JSONata "${path}".`,
            { cause }
          );
        }
        return result === undefined ? null : result;
      };

      // Si no hay timeout, ejecutar directamente.
      if (timeout === 0) {
        return await evalFn();
      }

      // Con timeout: race entre evaluación y temporizador.
      let timeoutHandle;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new EvaluationError(
            `Evaluación JSONata "${path}" excedió el timeout de ${timeout}ms.`
          ));
        }, timeout);
      });

      try {
        return await Promise.race([evalFn(), timeoutPromise]);
      } finally {
        // Limpiamos el setTimeout para evitar handles colgantes en Node.
        if (timeoutHandle) clearTimeout(timeoutHandle);
      }
    },

    fallbackPolicy: {
      missing: "null (cuando JSONata devuelve undefined)",
      multipleMatches: "array (cuando la expresión genera secuencia)",
      singleMatch: "escalar tal cual",
      typeError: "EvaluationError (los errores de tipo se propagan envueltos)",
      nullInput: "null (sin invocar la librería)",
      timeout: timeout > 0
        ? `EvaluationError tras ${timeout}ms (evaluación sigue en background)`
        : "no configurado",
    },
  };
}
