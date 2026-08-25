/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The module [errors]{@link module:jm2mp/errors} implements the
 * hierarchy of domain-specific errors (exceptions) in the projection
 * process.
**/

/**
 * @module jm2mp/errors
 * @description
 * This module implements the hierarchy of domain-specific errors
 * (exceptions) in the projection process.
 *
 * All errors are derived from
 * [ProjectionError]{@link module:jm2mp/errors.ProjectionError},
 * which allows consumers to catch any system error with a single catch.
 *
 * Several subclasses has been defined to categorize errors based on
 * their origin:
 *
 * - [ParseError]{@link module:jm2mp/errors.ParseError}:
 *   syntactic errors during parsing (paths, expressions, ...).
 *
 * - [ResolutionError]{@link module:jm2mp/errors.ResolutionError}:
 *   errors during module resolution (cycles, not found, ...).
 *
 * - [ValidationError]{@link module:jm2mp/errors.ValidationError}:
 *   semantic errors prior to evaluation (scope, references, ...).
 *
 * - [EvaluationError]{@link module:jm2mp/errors.EvaluationError}:
 *   errors at evaluation runtime (types, division by zero, ...).
 *
 * - [AdapterError]{@link module:jm2mp/errors.AdapterError}:
 *   errors specific to a syntax adapter (register, library, ...).
 **/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @description
 * The `ProjectionError` is the root level exception of the hierarchy of
 * domain-specific errors (exceptions) in the projection process.
 * 
 * The rest of errors inherits from this class.
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error}
 * @see {@link https://nodejs.org/api/errors.html}
**/
export class ProjectionError extends Error
{

  /**
   * @constructor
   * @description
   * Default constructor for `ProjectionError`.
   * It creates a new instance.
   * @param {string} message
   * Descriptive message about this error's instance.
   * @param {object} [metadata]
   * Additional information about error's context.
   * @param {string} [metadata.path]
   * The logical path inside the _projection document_ where this error
   * occurs.
   * @param {Error} [metadata.cause]
   * Error cause indicating the reason why the current error is thrown,
   * usually another caught error.
  **/
  constructor(message, metadata = {})
  {
    // Constructor inheritance (passing message and cause).
    super(message, ( metadata.cause ? { cause: metadata.cause } : undefined ) );
    // By convention, the name of the error is the name of the class constructed.
    this.name = this.constructor.name;
    // If specified, it stores the logical path where the error was
    // raised (for diagnosis), or null when undefined.
    this.path = ( metadata.path ?? null );
  }

}  // export class ProjectionError

/* ------------------------------------------------------------------ */

/**
 * @description
 * Class for specifying syntactic errors during parsing
 * (paths, expressions, ...).
**/
export class ParseError extends ProjectionError {}

/* ------------------------------------------------------------------ */

/**
 * @description
 * Class for specifying errors during module resolution
 * (cycles, not found, ...).
**/
export class ResolutionError extends ProjectionError {}

/* ------------------------------------------------------------------ */

/**
 * @description
 * Class for specifying semantic errors prior to evaluation
 * (scope, references, ...).
**/
export class ValidationError extends ProjectionError {}

/* ------------------------------------------------------------------ */

/**
 * @description
 * Class for specifying errors at evaluation runtime
 * (types, division by zero, ...).
**/
export class EvaluationError extends ProjectionError {}

/* ------------------------------------------------------------------ */

/**
 * @description
 * Class for specifying errors specific to a syntax adapter
 * (register, library, ...).
**/
export class AdapterError extends ProjectionError {}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/errors.js                             */
