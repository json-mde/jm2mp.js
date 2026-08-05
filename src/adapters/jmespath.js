/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @module adapters/jmespath
 * @file Adaptador para sintaxis JMESPath (https://jmespath.org).
 *
 * JMESPath es un lenguaje de consulta declarativo con especificación
 * cerrada y test-suite oficial, ampliamente desplegado (es el lenguaje
 * que usa la AWS CLI para `--query`). Combina acceso por ruta,
 * proyecciones, segmentos por corchete, filtros, expresiones multi-select
 * (hash y list), pipelines y un catálogo de funciones built-in.
 *
 * Sintaxis (ejemplos):
 *   "foo.bar"               → acceso a propiedad anidada
 *   "users[0].name"         → primer usuario, propiedad name
 *   "users[*].name"         → proyección: nombres de todos
 *   "users[?age > `18`]"    → filtro por predicado
 *   "users[*].{n: name, a: age}"  → multi-select hash
 *   "length(users)"         → función built-in
 *   "people | [0]"          → pipe (reinicia el contexto)
 *
 * COMPORTAMIENTO UNIFORMIZADO (replica el contrato del adaptador nativo):
 *   - Input null → null sin invocar la librería.
 *   - Ausencia → null (JMESPath devuelve null nativamente).
 *   - Proyección que produce varios resultados → array tal cual.
 *   - Proyección que produce un único elemento → array de UN elemento.
 *     Aquí JMESPath DIFIERE del adaptador nativo / jsonpath-plus: no
 *     desempaquetamos. La razón es que en JMESPath la "aridad" de la
 *     expresión es una propiedad sintáctica (las proyecciones siempre
 *     devuelven listas, los accesos simples siempre devuelven escalares).
 *     Desempaquetar rompería esa propiedad y haría que el tipo de retorno
 *     dependa de los datos. Esta divergencia está documentada en la
 *     `fallbackPolicy` del adaptador para que el usuario sepa a qué atenerse.
 *   - Errores de la librería → EvaluationError o ValidationError.
 *
 * Versión soportada: jmespath 0.16.x EXCLUSIVAMENTE (paquete canónico).
 * El fork comunitario @jmespath-community/jmespath es API-compatible para
 * los casos comunes pero requeriría un adaptador propio si se quisiese
 * soportar oficialmente.
 *
 * NOTA SOBRE CACHE: la librería 'jmespath' canónica no expone su
 * TreeInterpreter públicamente, por lo que `jmespath.search(data, expr)`
 * re-parsea internamente la expresión en cada llamada. La cache que
 * mantenemos aquí guarda solo el marcador de "validado al menos una vez"
 * para evitar re-llamar a `compile` desde `evaluate`. No es una cache de
 * AST en sentido estricto.
**/

import { AdapterError, ValidationError, EvaluationError } from "../errors.js";

/**
 * @description **jmespath.js** is a JavaScript implementation of **JMESPath**,
 *              which is a query language for JSON. It will take a JSON document
 *              and transform it into another JSON document through a JMESPath
 *              expression.
 * @external jmespath
 * @see {@link https://www.npmjs.com/package/jmespath}
**/

/**
 * Crea el adaptador JMESPath. Carga 'jmespath' dinámicamente.
 *
 * Versión soportada: jmespath 0.16.x.
 *
 * @returns {Promise<module:registry.QueryAdapter>}
 */
export async function createJmesPathAdapter() {
  let jmespath;
  try {
    const mod = await import("jmespath");
    // 'jmespath' exporta sus funciones bajo named exports y, según el
    // bundler, también bajo un default. Aceptamos ambas.
    jmespath = mod.default ?? mod;
    if (typeof jmespath.search !== "function" || typeof jmespath.compile !== "function") {
      throw new Error("Las funciones 'search' y 'compile' no están disponibles en la librería.");
    }
  } catch (cause) {
    throw new AdapterError(
      "No se pudo cargar la librería 'jmespath' v0.16.x. " +
      "Asegúrese de instalarla: npm install jmespath@0.16.",
      { cause }
    );
  }

  return {
    name: "jmespath",
    description:
      "Sintaxis JMESPath (https://jmespath.org): lenguaje declarativo con " +
      "proyecciones, filtros, multi-select y funciones built-in. " +
      "Soportada: jmespath 0.16.x.",

    /**
     * Valida una expresión JMESPath compilándola con la librería.
     * Si la sintaxis es inválida, `compile` lanza.
     */
    async validate(path) {
      if (typeof path !== "string" || path.length === 0) {
        throw new ValidationError(
          `JMESPath: $path debe ser un string no vacío, recibido ${typeof path}.`
        );
      }
      try {
        jmespath.compile(path);
      } catch (cause) {
        throw new ValidationError(
          `Expresión JMESPath inválida: "${path}".`,
          { cause }
        );
      }
    },

    /**
     * Evalúa una expresión JMESPath y uniformiza el resultado al contrato.
     *
     * La librería trabaja síncronamente; envolvemos la firma en async para
     * cumplir el contrato uniforme del registro (igual que el adaptador
     * nativo y el de jsonpath).
     *
     * El parámetro `env` se ignora: JMESPath no tiene concepto de alias
     * léxicos ni de raíz/contexto distintos del input. La expresión
     * siempre se evalúa contra `input`.
    **/
    /* eslint-disable-next-line no-unused-vars -- _env */
    async evaluate(path, input, cache, _env) {
      // Propagación absorbente: input null → null sin invocar.
      if (input === null || input === undefined) return null;

      // Validación perezosa con cache de "ya validado". jmespath.search
      // re-parsea internamente, así que esta marca no cachea AST, solo
      // evita re-llamar a compile() desde evaluate().
      if (!cache.has(path)) {
        try {
          jmespath.compile(path);
          cache.set(path, true);
        } catch (cause) {
          throw new EvaluationError(
            `Expresión JMESPath inválida en evaluación: "${path}".`,
            { cause }
          );
        }
      }

      // Ejecución de la consulta.
      let result;
      try {
        result = jmespath.search(input, path);
      } catch (cause) {
        // Errores en runtime: tipos incompatibles dentro de funciones
        // built-in, división por cero en expresiones aritméticas, etc.
        throw new EvaluationError(
          `Error al evaluar JMESPath "${path}".`,
          { cause }
        );
      }

      // JMESPath devuelve null nativamente para ausencia, lo cual coincide
      // con la convención del adaptador nativo. Convertimos undefined → null
      // defensivamente, aunque la librería no debería devolver undefined.
      return result === undefined ? null : result;
    },

    /**
     * Política de comportamiento del adaptador frente a casos límite.
     * Atención a la divergencia documentada en `multipleMatches` respecto
     * a la convención de "match único → escalar" del adaptador nativo.
     */
    fallbackPolicy: {
      missing: "null (JMESPath devuelve null nativamente para rutas inexistentes)",
      multipleMatches:
        "array tal cual (las proyecciones JMESPath siempre devuelven lista " +
        "por especificación, incluso con un solo elemento; NO se desempaqueta)",
      singleMatch:
        "escalar tal cual cuando la expresión es un acceso simple; " +
        "array de un elemento cuando la expresión es una proyección",
      typeError: "EvaluationError (los errores de tipo en runtime se propagan envueltos)",
      nullInput: "null (sin invocar la librería)",
    },
  };
}
