/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @module adapters/registry
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

import { AdapterError } from "../errors.js";

/**
 * @description FallbackPolicyObject
 *   Objeto descriptivo con documentación legible por humanos del comportamiento del adaptador.
 * @typedef {object} FallbackPolicyObject
 * @property {!string} missing
 * @property {!string} multipleMatches
 * @property {!string} typeError
 * @property {!string} nullInput
 *
**/

/**
 * Contrato que todo adaptador de sintaxis debe implementar.
 *
 * @typedef {object} QueryAdapter
 *
 * @property {string} name
 *   Identificador de la sintaxis. Se usa como valor de $syntax en $get.
 *
 * @property {string} description
 *   Descripción breve para documentación.
 *
 * *typedef {(path: any) => Promise<void>} ValidateFunction
 * @typedef {Function} ValidateFunction
 * @property {ValidateFunction} validate
 *   Valida una expresión $path estáticamente. Lanza ValidationError si
 *   es inválida. Es async para permitir adaptadores cuyo parser es async.
 *
 * *typedef {(path: any, input: any, cache: Map<string, any>, env: object) => Promise<any>} EvaluateFunction
 * @typedef {Function} EvaluateFunction
 * @property {EvaluateFunction} evaluate
 *   Evalúa la expresión sobre el input proporcionado. SIEMPRE async.
 *
 *   Garantías que todo adaptador debe satisfacer (contrato uniforme):
 *     - Si input es null, devuelve null sin invocar la librería subyacente.
 *     - Si la expresión no encuentra resultado, devuelve null.
 *     - Si la expresión encuentra un escalar único, devuelve el escalar
 *       (no envuelto en array).
 *     - Si la expresión encuentra múltiples matches, devuelve un array.
 *     - Errores de la librería se envuelven en EvaluationError o
 *       ValidationError según corresponda.
 *
 *   El parámetro `cache` es un Map proporcionado por el sistema para
 *   almacenar expresiones compiladas durante la evaluación actual.
 *
 *   El parámetro `env` es el entorno completo del lenguaje. El adaptador
 *   nativo lo necesita para resolver $/@/%alias; los demás lo ignoran.
 *
 * @property {FallbackPolicyObject} fallbackPolicy
 *   Documentación legible por humanos del comportamiento del adaptador.
 *   Campos requeridos: missing, multipleMatches, typeError, nullInput.
 */

/**
 * Registro de adaptadores. Mantiene un mapa nombre → adaptador.
 *
 * Esta clase NO es singleton. Cada instancia es independiente, lo que
 * permite pruebas aisladas y configuraciones distintas por contexto
 * de evaluación.
 */
export class AdapterRegistry {
  constructor() {
    /** @type {Map<string, QueryAdapter>} */
    this._adapters = new Map();
  }

  /**
   * Registra un adaptador. Lanza AdapterError si ya hay uno con el
   * mismo nombre o si el adaptador no cumple el contrato mínimo.
   *
   * @param {QueryAdapter} adapter
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

  /**
   * Obtiene un adaptador por su nombre. Lanza AdapterError si no está
   * registrado, con mensaje informativo que lista los adaptadores disponibles.
   *
   * @param {string} name
   * @returns {QueryAdapter}
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

  /**
   * Comprueba si existe un adaptador con el nombre dado.
   *
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this._adapters.has(name);
  }

  /**
   * Devuelve la lista de nombres de adaptadores registrados.
   *
   * @returns {string[]}
   */
  names() {
    return [...this._adapters.keys()];
  }
}
