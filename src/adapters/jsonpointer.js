/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @module adapters/jsonpointer
 * @file Adaptador para sintaxis JSON Pointer (RFC 6901).
 *
 * JSON Pointer es una sintaxis de direccionamiento estandarizada que
 * identifica UN ÚNICO valor dentro de un documento JSON mediante una cadena
 * de tokens separados por '/'. No es un lenguaje de consulta general (no
 * tiene wildcards, filtros, ni descenso recursivo), pero está cubierto por
 * una RFC y su gramática cabe en treinta líneas.
 *
 * Sintaxis (RFC 6901):
 *   ""           → el documento raíz completo
 *   "/foo"       → propiedad "foo" del raíz
 *   "/foo/0"     → primer elemento del array en "foo"
 *   "/a~1b"      → propiedad literal "a/b"   (~1 escapa '/')
 *   "/a~0b"      → propiedad literal "a~b"   (~0 escapa '~')
 *   "/-"         → en array, posición "siguiente" inexistente (RFC 6901 §4)
 *
 * COMPORTAMIENTO UNIFORMIZADO (replica el contrato del adaptador nativo):
 *   - Input null → null sin invocar la librería.
 *   - Cadena vacía como puntero → el input completo (raíz).
 *   - Ruta inexistente → null (chequeo previo con .has antes de .get para
 *     evitar la excepción que lanzaría .get).
 *   - Punteros SIEMPRE referencian 0 o 1 valor: no hay desempaquetado de
 *     array a hacer. El valor devuelto pasa tal cual (incluido null literal).
 *   - Ruta sintácticamente inválida → ValidationError en validate(),
 *     EvaluationError en evaluate() (paralelo al patrón jsonpath/jsonata).
 *
 * Versión soportada: json-pointer 0.6.x EXCLUSIVAMENTE. Cualquier otra
 * versión puede funcionar pero no está oficialmente soportada. La librería
 * se carga con import dinámico al construir el adaptador; si no está
 * instalada, la factoría falla con AdapterError claro.
 *
 * Nota de diseño: JSON Pointer es tan compacto que una implementación
 * propia cabría aquí mismo. Se ha optado, sin embargo, por delegar en la
 * librería externa para mantener uniformidad con los demás adaptadores
 * (todos delegan en su librería de referencia) y para que la conformidad
 * con la RFC quede en manos del paquete dedicado y su suite de tests.
 */

import { AdapterError, ValidationError, EvaluationError } from "../errors.js";

/**
 * Crea el adaptador JSON Pointer. Carga 'json-pointer' dinámicamente.
 *
 * Versión soportada: json-pointer 0.6.x.
 *
 * @returns {Promise<module:registry.QueryAdapter>}
 */
export async function createJsonPointerAdapter() {
  let jsonPointer;
  try {
    const mod = await import("json-pointer");
    // 'json-pointer' exporta sus funciones tanto como named exports como
    // bajo un único default export, según el bundler / sistema de módulos.
    jsonPointer = mod.default ?? mod;
    if (typeof jsonPointer.get !== "function" || typeof jsonPointer.has !== "function") {
      throw new Error("Las funciones 'get' y 'has' no están disponibles en la librería.");
    }
  } catch (cause) {
    throw new AdapterError(
      "No se pudo cargar la librería 'json-pointer' v0.6.x. " +
      "Asegúrese de instalarla: npm install json-pointer@0.6.",
      { cause }
    );
  }

  /**
   * Valida sintácticamente una cadena JSON Pointer según RFC 6901.
   *
   * Reglas (RFC 6901 §3):
   *   - La cadena vacía representa el documento raíz, válida.
   *   - Una cadena no vacía debe empezar por '/'.
   *   - Las únicas secuencias de escape permitidas son '~0' y '~1'.
   *     Cualquier '~' seguido de otro carácter (o fin de cadena) es inválido.
   *
   * Se valida aquí en lugar de delegar en la librería porque 'json-pointer'
   * no expone una función de validación sintáctica separada de la
   * evaluación, y queremos detectar errores en `validate()` antes de
   * llegar a `evaluate()`.
   */
  function validateSyntax(path) {
    if (typeof path !== "string") {
      throw new ValidationError(
        `JSON Pointer: $path debe ser un string, recibido ${typeof path}.`
      );
    }
    // Cadena vacía → raíz, válido.
    if (path.length === 0) return;
    // Debe empezar por '/'.
    if (path.charCodeAt(0) !== 0x2F /* '/' */) {
      throw new ValidationError(
        `JSON Pointer inválido: debe empezar por '/' o ser cadena vacía. Recibido: "${path}".`
      );
    }
    // Validación de escapes: '~' solo puede ir seguido de '0' o '1'.
    for (let i = 0; i < path.length; i++) {
      if (path.charCodeAt(i) === 0x7E /* '~' */) {
        const next = i + 1 < path.length ? path.charCodeAt(i + 1) : -1;
        if (next !== 0x30 /* '0' */ && next !== 0x31 /* '1' */) {
          throw new ValidationError(
            `JSON Pointer inválido: el escape '~' en posición ${i} de "${path}" ` +
            `debe ir seguido de '0' o '1'.`
          );
        }
        i++; // saltamos el carácter de escape ya validado.
      }
    }
  }

  return {
    name: "jsonpointer",
    description:
      "Sintaxis JSON Pointer (RFC 6901). Identifica un único valor mediante " +
      "tokens separados por '/'. Soportada: json-pointer 0.6.x.",

    /**
     * Valida estáticamente una expresión JSON Pointer.
     */
    async validate(path) {
      validateSyntax(path);
    },

    /**
     * Evalúa una expresión JSON Pointer y uniformiza el resultado al contrato.
     *
     * El parámetro `cache` se usa para marcar que el path ya fue validado
     * sintácticamente al menos una vez, evitando re-validar en bucle. El
     * coste de la validación es despreciable; cachear es por simetría con
     * los demás adaptadores.
     *
     * El parámetro `env` se ignora: JSON Pointer no tiene concepto de
     * alias léxicos ni de raíz/contexto distintos del input.
     */
    /* eslint-disable-next-line no-unused-vars -- _env */
    async evaluate(path, input, cache, _env) {
      // Validación perezosa con cache de "ya validado".
      if (!cache.has(path)) {
        try {
          validateSyntax(path);
          cache.set(path, true);
        } catch (cause) {
          throw new EvaluationError(
            `JSON Pointer inválido en evaluación: "${path}".`,
            { cause }
          );
        }
      }

      // Propagación absorbente: input null → null sin invocar.
      if (input === null || input === undefined) return null;

      // Cadena vacía: referencia el documento entero. La librería también
      // lo soporta, pero lo cortocircuitamos por claridad y para evitar
      // ramas internas innecesarias.
      if (path === "") return input;

      // Chequeo previo con .has para evitar la excepción de .get cuando
      // la ruta no resuelve. Esto convierte ausencia en null de forma
      // limpia, alineándose con el contrato uniforme.
      let exists;
      try {
        exists = jsonPointer.has(input, path);
      } catch (cause) {
        // .has raramente lanza, pero si el input no es navegable lo hace.
        throw new EvaluationError(
          `Error al inspeccionar JSON Pointer "${path}" sobre el input.`,
          { cause }
        );
      }
      if (!exists) return null;

      let value;
      try {
        value = jsonPointer.get(input, path);
      } catch (cause) {
        // No debería ocurrir tras .has===true, pero si la librería lanza
        // (por ejemplo, race con mutación externa), envolvemos limpiamente.
        throw new EvaluationError(
          `Error al evaluar JSON Pointer "${path}".`,
          { cause }
        );
      }
      // undefined → null (uniformización defensiva).
      return value === undefined ? null : value;
    },

    /**
     * Política de comportamiento del adaptador frente a casos límite.
     * Documentada explícitamente como parte de la API pública del adaptador.
     */
    fallbackPolicy: {
      missing: "null (chequeo previo con .has antes de .get; nunca propaga la excepción de .get)",
      multipleMatches: "no aplica (JSON Pointer identifica siempre 0 o 1 valor por la RFC 6901)",
      singleMatch: "el valor encontrado tal cual: escalar, objeto, array o null literal",
      typeError: "null (acceso a clave inexistente, índice fuera de rango o tipo incompatible)",
      nullInput: "null (sin invocar la librería)",
      emptyPointer: "el input completo (la cadena vacía referencia el raíz por RFC 6901 §5)",
    },
  };
}
