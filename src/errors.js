/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @module errors
 * @file Jerarquía de errores específicos del dominio del lenguaje de proyecciones.
 *
 * Todos los errores derivan de ProjectionError, lo que permite a los consumidores
 * capturar cualquier error del sistema con un solo catch (ProjectionError).
 *
 * Las subclases categorizan el error según su origen:
 *  - ParseError: errores sintácticos durante el parseo (rutas, expresiones).
 *  - ResolutionError: errores durante la resolución de módulos (ciclos, no encontrado).
 *  - ValidationError: errores semánticos previos a la evaluación (alcance, referencias).
 *  - EvaluationError: errores en tiempo de evaluación (tipos, división por cero, etc.).
 *  - AdapterError: errores específicos de un adaptador de sintaxis (registro, librería).
 */

/**
 * Error raíz de la jerarquía. Todos los demás errores del sistema heredan de esta clase.
 */
export class ProjectionError extends Error {
  /**
   * @param {string} message - Mensaje descriptivo del error.
   * @param {object} [metadata] - Información contextual adicional.
   * @param {string} [metadata.path] - Ruta lógica dentro de la proyección donde ocurrió el error.
   * @param {Error}  [metadata.cause] - Error subyacente que provocó este error, si lo hay.
   */
  constructor(message, metadata = {}) {
    // Pasamos a Error la opción cause si fue proporcionada (estándar ES2022).
    super(message, metadata.cause ? { cause: metadata.cause } : undefined);
    // Asignamos el nombre del error a partir del nombre de la clase concreta.
    this.name = this.constructor.name;
    // Guardamos la ruta lógica para diagnósticos (puede ser null si no aplica).
    this.path = metadata.path ?? null;
  }
}

/**
 * Error de parseo sintáctico. Se lanza al analizar rutas o expresiones malformadas.
 */
export class ParseError extends ProjectionError {}

/**
 * Error durante la resolución de módulos: ciclos, módulo no encontrado,
 * o ausencia de plantilla raíz "@" en el módulo final.
 */
export class ResolutionError extends ProjectionError {}

/**
 * Error de validación semántica previa a la evaluación: alias no definido,
 * referencia $call apuntando a plantilla inexistente, sintaxis no registrada, etc.
 */
export class ValidationError extends ProjectionError {}

/**
 * Error en tiempo de evaluación: tipos incorrectos, operación inválida,
 * división por cero, profundidad de pila excedida, etc.
 */
export class EvaluationError extends ProjectionError {}

/**
 * Error específico de un adaptador de sintaxis: librería no instalada,
 * adaptador ya registrado, fallo en la carga dinámica, etc.
 */
export class AdapterError extends ProjectionError {}
