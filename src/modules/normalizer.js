/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The file `normalizer.js` contains the module
 * [normalizer]{@link module:jm2mp/modules/normalizer}, which implements
 * the standardization process over the `JM2MP` _projection modules_
 * content in the stage of resolution, before it will be evaluated.
**/

/**
 * @module jm2mp/modules/normalizer
 * @description
 * The module [normalizer]{@link module:jm2mp/modules/normalizer}
 * implements the standardization process over the `JM2MP` _projection
 * modules_ content in the stage of resolution, before it will be evaluated.
 *
 * Each module can declare a _default query language_ (in
 * `$.$options.$default-query-language` path). Such _syntax_ is applied
 * inside the _module_ to every `get` _template command_ that omit their
 * `$syntax`clause, adding to it in its absence.
 *
 * So, after normalization, every `get` _template command_ in the
 * _projection module_ will carry an explicit `$syntax`clause;
 * therefore, all the `get` _templates_ will be self-explanatory and can
 * be merged across different _projection modules_ each one with different
 * syntaxes without ambiguity.
 * 
 * The two meta-data properties that will be ignored by the normalizer are:
 * - `$options`: used for _module_ configuration (dependencies, default syntax, ...).
 * - `$schema`: used to add an optional reference to an external JSON Schema.
 *
 * These two meta-data properties are never considered as _named
 * templates_ and only affects to the current _projection module_.
 * The normalizer preserves them without processing their content.
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

import { ThrowsValidationErrorWhenIsNotAModule } from "./helpers.js";

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @constant {Set.<string>}
 * @description
 * The set of keys (property names) considered as _module_ meta-data
 * and not as _names templates_.
 * 
 * This keys are preserved as is, without traversing its content during
 * the normalization process.
 */
export const MODULE_METADATA_KEYS = new Set(["$options", "$schema"]);

/* ------------------------------------------------------------------ */

/**
 * @description
 * It normalizes a complete _projection module_, adding `$syntax`clauses
 * to every `get`_template command_ that ommits it.
 *
 * It never modifies the original _module_; it always returns a new
 * structured object.
 * @param {object} module
 * The _projection module_ to mormalize (so it must be a JSON root object).
 * @returns {object}
 * The just created and normalized _projection module_.
**/
export function normalizeModule(module)
{
  // It validates if it is actually a valid module.
  ThrowsValidationErrorWhenIsNotAModule(module);
  // It gets the default query language declared for the module.
  const defaultSyntax = getDefaultSyntax(module);
  // It builds a new (resultant) projection module.
  const result = {};
  // It traverses all keys of the module-root-object.
  for (const key of Object.keys(module))
  {
    if (MODULE_METADATA_KEYS.has(key))
    {
      // Meta-data keys are preserved as-is, without traversing its
      // content. It is decision of the resolver if they will be
      // discarded when importing modules.
      result[key] = module[key];
    }
    // The rest of keys are named templates, including the root
    // template, so they must be recursively normalized.
    else
    {
      result[key] = normalizeNode(module[key], defaultSyntax);
    }
  }
  // It returns the new normalized module.
  return result;
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It extracts the optionally declared default _query language_,
 * which if if exists must be declared in path
 * `$.$options.$default-query-language`. If it is not declared or is
 * not considered as valid, the `native` syntax will be used by default.
 * @param {object} module
 * The _projection module_ to normalize (so it must be a JSON root
 * object).
 * @returns {string}
 * The name of the _query language_ to be used by default.
 */
function getDefaultSyntax(module)
{
  // Bu default, 'native' query language will be used.
  let default_query_language = 'native' ;
  // It tries to locate an optional default syntax.
  const module_options = ( ("$options" in module)
                           ? module["$options"]
                           : undefined );
  if (module_options
      && (typeof module_options === "object")
      && !Array.isArray(module_options))
  {
    const default_query_language_declared = module_options["$default-query-language"];
    // It validates the found default syntax.
    if ( ((typeof default_query_language_declared) === "string") &&
         (default_query_language_declared.length > 0) )
    {
      default_query_language = default_query_language_declared;
    }
  }
  // It returns the result.
  return default_query_language;
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It recursively normalizes a node of the entire tree of JSON values
 * (named templates and command templates of the projection module).
 * 
 * It only modifies nodes that represent actual `get` _template
 * commands_ without a `$syntax` clause; every other node is just
 * traversed to normalize their children.
 * @param {*} node
 * The current node (JSON value) a normalize.
 * @param {string} defaultSyntax
 * The default _query language_ declared (or considered) for this
 * _projection module_.
 * @returns {*}
 * The normalized node.
 */
function normalizeNode(node, defaultSyntax)
{
  let result;
  // Scalar (primitive) data types do not need normalization.
  if (node === null || typeof node !== "object")
  {
    result = node;
  }
  // For arrays, it normalizes all their children (recursively).
  else if (Array.isArray(node))
  {
    result = node.map( (child) => normalizeNode(child, defaultSyntax) );
  }
  // For objects...
  else
  {
    // ...first, you must distinguish between a literal object and a
    // _template command_ (by checking for the presence of a `$op` key).
    const isOperation = Object.hasOwn(node, "$op") &&
                        ((typeof node.$op) === "string");
    if (isOperation && (node.$op === "get"))
    {
      // In case of 'get' template commands without '$syntax', such
      // clause will be added with the default value for the module.
      result = normalizeGet(node, defaultSyntax);
    }
    else
    {
      // In case of any other command template, it recursively traverses
      // al its keys (childrens).
      result = {};
      for (const key of Object.keys(node))
      {
        result[key] = normalizeNode(node[key], defaultSyntax);
      }
    }
  }
  return result;
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It normalizes a `get` _template command_, adding a new `$syntax`
 * clause if missing; rest of clauses will be also traversed (for if
 * inner get commands are present).
 * @param {object} getOp
 * The current `get` _template command_ to normalize.
 * @param {string} defaultSyntax
 * The default _query language_ for the _projection module_.
 * @returns {object}
 * A new object, equivalent to 'getOp' but with a `$syntax` clause
 * present.
 */
function normalizeGet(getOp, defaultSyntax)
{
  // The resultant template command.
  const result = {};
  // It copies all its properties, recursively traversing
  // inner projections.
  for (const key of Object.keys(getOp))
  {
    // $op:get as-is (literal)
    if (key === "$op")
    {
      result[key] = getOp[key];
    }
    // $path as-is (considered as literal)
    else if (key === "$path")
    {
      result[key] = getOp[key];
    }
    // If $syntax is already present, it is preserved (explicitly authored).
    else if (key === "$syntax")
    {
      result[key] = getOp[key];
    }
    // $from is a projection, so it must be traversed.
    else if (key === "$from")
    {
      result[key] = normalizeNode(getOp[key], defaultSyntax);
    }
    // Any other key will be also traversed, but in this version of
    // JM2MP will be considered as invalid during validation stage.
    else
    {
      result[key] = normalizeNode(getOp[key], defaultSyntax);
    }
  }
  // If no $syntax clause is found, then the default syntax will be considered.
  if ( ! Object.hasOwn(result, "$syntax") )
  {
    result.$syntax = defaultSyntax;
  }
  // it returns the resultant template command.
  return result;
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/modules/normalizer.js                 */
