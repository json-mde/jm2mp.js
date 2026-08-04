/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @module adapters/native
 * @file Adaptador para la sintaxis nativa del lenguaje.
 *
 * Es el adaptador de REFERENCIA: define el contrato de comportamiento
 * que todos los demás adaptadores deben replicar.
 *
 * El $path en sintaxis nativa puede ser:
 *  - Un string que cumple la EBNF nativa (p.ej. "@.usuarios[0].nombre").
 *  - Un array de accesores literales (p.ej. ["usuarios", 0, "nombre"]).
 *
 * Esta dualidad es exclusiva de la sintaxis nativa.
 *
 * IMPORTANTE: aunque internamente este adaptador es síncrono (no involucra
 * I/O ni librerías async), su función `evaluate` está marcada como `async`
 * para cumplir el contrato uniforme del registro. El overhead de envolver
 * en Promise.resolve() es despreciable y se compensa con la coherencia
 * arquitectónica.
 */

import { EvaluationError, ValidationError } from "../errors.js";
import { parsePath, navigate } from "../paths.js";

/**
 * Crea el adaptador para la sintaxis nativa.
 *
 * @returns {module:registry.QueryAdapter}
 */
export function createNativeAdapter() {
  return {
    name: "native",
    description: "Sintaxis nativa del lenguaje, con tres referencias contextuales: $ (raíz), @ (contexto), %alias.",

    /**
     * Valida estáticamente un $path nativo.
     *
     * Acepta string (parseo según EBNF nativa) o array de accesores
     * (validación de tipos: cada elemento debe ser string o entero ≥ 0).
     */
    async validate(path) {
      if (typeof path === "string") {
        try {
          parsePath(path);
        } catch (cause) {
          // Convertimos ParseError a ValidationError para el flujo de validación.
          throw new ValidationError(
            `Ruta nativa inválida: "${path}".`,
            { cause }
          );
        }
        return;
      }
      if (Array.isArray(path)) {
        // Cada accesor debe ser string o número entero no negativo.
        for (let i = 0; i < path.length; i++) {
          const seg = path[i];
          const ok = (typeof seg === "string") ||
                     (typeof seg === "number" && Number.isInteger(seg) && seg >= 0);
          if (!ok) {
            throw new ValidationError(
              `Segmento ${i} de ruta nativa inválido: debe ser string o entero no negativo, ` +
              `recibido ${typeof seg}.`
            );
          }
        }
        return;
      }
      throw new ValidationError(
        `$path nativo debe ser string o array, recibido ${typeof path}.`
      );
    },

    /**
     * Evalúa una ruta nativa.
     *
     * Si $path es array: navega desde el input directamente.
     * Si $path es string: parsea EBNF y resuelve la raíz desde el entorno
     * antes de navegar. En este caso, $from se ignora porque el string
     * define su propia raíz ($, @ o %nombre).
     */
    async evaluate(path, input, cache, env) {
      // Caso array: navegación directa desde input.
      if (Array.isArray(path)) {
        if (input === null || input === undefined) return null;
        return navigate(input, path);
      }

      // Caso string: parsing con caché y resolución desde entorno.
      if (typeof path === "string") {
        let parsed = cache.get(path);
        if (!parsed) {
          try {
            parsed = parsePath(path);
          } catch (cause) {
            throw new EvaluationError(
              `Ruta nativa inválida en evaluación: "${path}".`,
              { cause }
            );
          }
          cache.set(path, parsed);
        }

        // El string define su propia raíz; ignoramos `input` (que provenía de $from).
        // Esto es coherente con el diseño: $from solo es útil cuando $path es array
        // (y, principalmente, cuando se usan adaptadores foráneos que no tienen
        // concepto de raíz).
        let base;
        if (parsed.kind === "root") {
          base = env.root;
        } else if (parsed.kind === "ctx") {
          base = env.ctx;
        } else {
          // alias
          if (!Object.hasOwn(env.aliases, parsed.aliasName)) {
            throw new EvaluationError(
              `Alias '%${parsed.aliasName}' no está en alcance.`
            );
          }
          base = env.aliases[parsed.aliasName];
        }

        // Si la base es null, propagamos null.
        if (base === null || base === undefined) return null;
        return navigate(base, parsed.accessors);
      }

      throw new EvaluationError(
        `$path nativo debe ser string o array en evaluación, recibido ${typeof path}.`
      );
    },

    /**
     * Política de fallos del adaptador nativo. ES LA REFERENCIA para los
     * demás adaptadores: deben replicar este comportamiento.
     */
    fallbackPolicy: {
      missing: "null",
      multipleMatches: "no aplica (la sintaxis nativa nunca produce múltiples matches)",
      singleMatch: "escalar tal cual",
      typeError: "null (cuando ocurre durante navegación; otros casos lanzan EvaluationError)",
      nullInput: "null (sin invocar lógica adicional)",
    },
  };
}
