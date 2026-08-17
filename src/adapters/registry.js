/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file Registro central de adaptadores de sintaxis.
 *
 * Sistema de extensibilidad por patrón Adapter. Cada sintaxis (nativa,
 * JSONPath, JSONata, JSON Query, futuras) implementa un contrato uniforme
 * que el sistema central invoca al ejecutar operaciones $get.
 *
 * CONTRATO DE LOS ADAPTADORES:
 *
 * Todos los adaptadores son ASÍNCRONOS. La función `evaluate` siempre
 * devuelve una Promise<any>. Los adaptadores que internamente son síncronos
 * (como el nativo) simplemente devuelven Promise.resolve(valor) implícitamente
 * al estar declarados con `async`. Esta decisión unifica el contrato y
 * evita ambigüedades en el evaluador.
 *
 * Razón histórica: la librería JSONata v2+ es async-only. Para que TODOS
 * los adaptadores tengan el mismo contrato, todos son async, aunque algunos
 * no lo necesitarían internamente.
 */

/* ------------------------------------------------------------------ */

/**
 * @module jm2mp/adapters/registry
 * @description
 * Registro central de adaptadores de sintaxis.
**/

/* ------------------------------------------------------------------ */

import { AdapterError } from "../errors.js";

/* ------------------------------------------------------------------ */

/**
 * @description
 * FallbackPolicyObject
 * Objeto descriptivo con documentación legible por humanos del comportamiento del adaptador.
 * @typedef {object} FallbackPolicyObject
 * @property {!string} missing -
 * @property {!string} multipleMatches -
 * @property {!string} typeError -
 * @property {!string} nullInput -
**/

/* ------------------------------------------------------------------ */

/**
 * @typedef {Function} ValidateFunction
 * @memberof module:jm2mp/adapters/registry
 * @description
 * typedef {(path: any) => Promise<void>} ValidateFunction
 * @property {ValidateFunction} validate -
 * Valida una expresión $path estáticamente. Lanza ValidationError si
 * es inválida. Es async para permitir adaptadores cuyo parser es async.
**/

/* ------------------------------------------------------------------ */

/**
 * @typedef {Function} EvaluateFunction
 * @memberof module:jm2mp/adapters/registry
 * @description
 * typedef {(path: any, input: any, cache: Map<string, any>, env: object) => Promise<any>} EvaluateFunction
 * @property {EvaluateFunction} evaluate -
 * Evalúa la expresión sobre el input proporcionado. SIEMPRE async.
 *
 * Garantías que todo adaptador debe satisfacer (contrato uniforme):
 * - Si input es null, devuelve null sin invocar la librería subyacente.
 * - Si la expresión no encuentra resultado, devuelve null.
 * - Si la expresión encuentra un escalar único, devuelve el escalar
 *   (no envuelto en array).
 * - Si la expresión encuentra múltiples matches, devuelve un array.
 * - Errores de la librería se envuelven en EvaluationError o
 *   ValidationError según corresponda.
 *
 * El parámetro `cache` es un Map proporcionado por el sistema para
 * almacenar expresiones compiladas durante la evaluación actual.
 *
 * El parámetro `env` es el entorno completo del lenguaje. El adaptador
 * nativo lo necesita para resolver $/@/%alias; los demás lo ignoran.
 *
 * @property {FallbackPolicyObject} fallbackPolicy -
 * Documentación legible por humanos del comportamiento del adaptador.
 * Campos requeridos: missing, multipleMatches, typeError, nullInput.
**/

/* ------------------------------------------------------------------ */

/**
 * @typedef {object} QueryAdapter
 * @memberof module:jm2mp/adapters/registry
 * @description
 * Contrato que todo adaptador de sintaxis debe implementar.
 * @property {string} name
 * Unique syntax identifier
 * It is used as `syntax` clause for `get` _templante command_.
 * @property {string} description
 * Shrot description for documenting purposes.
 * @property {ValidateFunction} validate
 * It validates (tests) the path expression.
 * @property {EvaluateFunction} evaluate
 * It evaluates (runs) the path expression.
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * Registro de adaptadores. Mantiene un mapa nombre → adaptador.
 *
 * Esta clase NO es singleton. Cada instancia es independiente, lo que
 * permite pruebas aisladas y configuraciones distintas por contexto
 * de evaluación.
**/
export class AdapterRegistry
{

/* ------------------------------------------------------------------ */

  /**
   * @constructor
   * @description
   * Default constructor for 'AdapterRegistry' class.
   */
  constructor() {
    /**
     * @type {Map<string, QueryAdapter>}
     * @description
     * Field to reference all registered 'QueryAdapter's.
    **/
    this._adapters = new Map();
  }

/* ------------------------------------------------------------------ */

  /**
   * @description
   * Registra un adaptador. Lanza AdapterError si ya hay uno con el
   * mismo nombre o si el adaptador no cumple el contrato mínimo.
   * @param {QueryAdapter} adapter
   * The 'QueryAdapter' to be registered.
   */
  register(adapter) {
    // Validación del contrato del adaptador.
    if (!adapter || typeof adapter !== "object") {
      throw new AdapterError("El adaptador debe ser un objeto.");
    }
    if (typeof adapter.name !== "string" || adapter.name.length === 0) {
      throw new AdapterError("El adaptador debe tener una propiedad 'name' no vacía.");
    }
    if (typeof adapter.evaluate !== "function") {
      throw new AdapterError(
        `El adaptador "${adapter.name}" debe implementar 'evaluate'.`
      );
    }
    if (typeof adapter.validate !== "function") {
      throw new AdapterError(
        `El adaptador "${adapter.name}" debe implementar 'validate'.`
      );
    }
    if (this._adapters.has(adapter.name)) {
      throw new AdapterError(
        `Ya existe un adaptador registrado con el nombre "${adapter.name}".`
      );
    }
    // Guardamos en el mapa interno.
    this._adapters.set(adapter.name, adapter);
  }

/* ------------------------------------------------------------------ */

  /**
   * @description
   * Obtiene un adaptador por su nombre. Lanza AdapterError si no está
   * registrado, con mensaje informativo que lista los adaptadores disponibles.
   * @param {string} name -
   * @returns {QueryAdapter} -
   * Previously registered 'QueryAdapter'; otherwise, an 'AdapterError' exception will be raised.
   */
  get(name) {
    const adapter = this._adapters.get(name);
    if (!adapter) {
      throw new AdapterError(
        `No hay adaptador registrado con el nombre "${name}". ` +
        `Adaptadores disponibles: ${[...this._adapters.keys()].join(", ") || "(ninguno)"}.`
      );
    }
    return adapter;
  }

/* ------------------------------------------------------------------ */

  /**
   * @description
   * Comprueba si existe un adaptador con el nombre dado.
   * @param {string} name -
   * @returns {boolean} -
   */
  has(name) {
    return this._adapters.has(name);
  }

/* ------------------------------------------------------------------ */

  /**
   * @description
   * Devuelve la lista de nombres de adaptadores registrados.
   * @returns {string[]} -
   */
  names() {
    return [...this._adapters.keys()];
  }

/* ------------------------------------------------------------------ */

}  // export class AdapterRegistry //

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/adapters/registry.js                  */
