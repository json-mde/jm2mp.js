/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The file `helpers.js` contains the module
 * [helpers]{@link module:jm2mp/modules/helpers}, which implements
 * helper functions related with `JM2MP` _projection modules_.
**/

/**
 * @module jm2mp/modules/helpers
 * @description
 * The module [helpers]{@link module:jm2mp/modules/helpers} implements
 * helper functions related with `JM2MP` _projection modules_.
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

import { ValidationError } from "../errors.js";

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @constant {string}
 * @description
 * The name of the **root template** of any **JM2MP projection**.
 * Its value is `'$'`.
 */
export const ROOT_TEMPLATE_NAME = '$' ;

/* ------------------------------------------------------------------ */

/**
 * @description
 * It tests if the `module` JSON value can be used (considered) as a
 * _projection module_ or not.
 * 
 * A JSON value can be used as a _projection module_ if:
 * - It is an object.
 * - It is not `null`.
 * - It is not an array.
 * 
 * @param {*} module
 * The actual JSON value to test as a valid _projection module_.
 * @returns {boolean}
 * `true` whenever `module` is valid as a _projection module_;
 * `false` otherwise.
 */
export function isModule(module)
{
  return (
    (typeof module === "object") &&
    (module !== null) &&
    ( ! Array.isArray(module) )
  );
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It throws an [ValidationError]{@link module:jm2mp/errors.ValidationError}
 * whenever `module` is not a valid module.
 * @param {*} module
 * The actual JSON value to test as a valid _projection module_.
 * @throws {module:jm2mp/errors.ValidationError}
 * Raised whenever `module` is not a valid module.
 * @see {@link module:jm2mp/modules/helpers.isModule}
 */
export function AssertIsModule(module)
{
  if ( ! isModule(module) )
  {
    throw new ValidationError("A module must be a non-null JSON object.");
  }
}

/* ------------------------------------------------------------------ */

/**
* It builds a simple _projection module_ starting from the _root
 * template_, neither adding _options_, _schema_ nor _named templates_.
 *
 * It is usually used as part of unit and integrations tests.
 *
 * @param {*} rootProjection
 * The JSON value for the _root projection_ of the _projection module_
 * built by this function.
 * @returns {object}
 * The _projection module_ built using `rootProjection`'s value as its
 * _root projection_.
 */
export function moduleOf(rootProjection)
{
  const result = new Object();
  result[ROOT_TEMPLATE_NAME] = rootProjection ;
  return result ;
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It builds a _projection module_ using `rootProjection`'s value as its
 * _root projection_ and `namedTemplates` as the rest of templates.
 * 
 * If `namedTemplates` also contains a _root projection_ it will be
 * lost, overriden by `rootProjection`.
 *
 * @param {*} rootProjection
 * The JSON value for the _root projection_ of the _projection module_
 * built by this function.
 * @param {object} [namedTemplates]
 * Other _named templates_ to be added to the resulting _projection
 * module_.
 * @returns {object}
 * The _projection module_ built using `rootProjection`'s value as its
 * _root projection_ and `namedTemplates` as the rest of templates.
**/
export function moduleWith(rootProjection, namedTemplates = {})
{
  return { ...namedTemplates, ...moduleOf(rootProjection) };
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It detects if a package (ESM module) can be imported dynamically.
 *
 * It is usefull for skip tests whenever an optional dependency is not
 * installed.
 *
 * @param {string} moduleName
 * @returns {Promise<boolean>}
 * `true` whenever `moduleName` can be
 * [import]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import}'ed;
 * `false` otherwise.
**/
export async function isPackageAvailable(moduleName)
{
  try
  {
    await import(moduleName);
    return true;
  }
  catch
  {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/modules/helpers.js                    */
