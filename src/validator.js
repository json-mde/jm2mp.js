/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The module [validator]{@link module:jm2mp/validator} implements the
 * structural and semantic validation of solved modules, the second
 * stage in the processing of the _projection language_ JM2MP.
**/

/**
 * @module jm2mp/validator
 * @description
 * This module implements the structural and semantic validation of
 * solved modules, the second stage in the processing of the
 * _projection language_ JM2MP.
 * 
 * The **validation process** is _asynchronous_ because the signature of
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}'s
 * [ValidateFunction]{@link module:jm2mp/adapters/registry.ValidateFunction}
 * is `async`.
 *
 * It traverses every _named template_ of every _projection module_
 * to validate:
 * - That each _template command_ and _operator_ is recognized and have
 *   the required clauses.
 * - That there must be no unrecognized clauses in _template commands_
 *   and _operators_.
 * - That all references to _aliases_ are within lexical _scope_.
 * - That the reference to a _named templates_ in every `$ref` clause of
 *   a `call` _template command_ actually points to an existing
 *   (declared) _named template_.
 * - That every object literal key does not begin with an unescaped `$`
 *   character.
 * - That every `get` _template command_ have its own `$syntax` clause
 *   (after _normalization stage_), and that all _syntaxes_ correspond
 *   to a registered _query adapter_. But it delegates the specific
 *   validation of `$path` clauses to such adapter.
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

import { ValidationError } from "./errors.js";
import { ROOT_TEMPLATE_NAME, AssertIsModule } from "./modules/helpers.js";
import { parsePath } from "./adapters/native-paths.js";

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @constant {Set<string>}
 * @description
 * All the recognized _template commands_ and _operators_.
 * 
 * It **must** be stay in sync with the evaluator's
 * [JM2MP_PROJECTIONS]{@link module:jm2mp/evaluator~JM2MP_PROJECTIONS}
 * and
 * [OP_ARGS]{@link module:jm2mp/validator~OP_ARGS}.
**/
const KNOWN_OPS = new Set([
  // Núcleo
  "pipe", "get", "if", "foldArr", "foldObj", "cons", "insert", "let", "call",
  "eq", "lt", "gt", "lte", "gte", "neq", "not", "and", "or",
  "add", "sub", "mul", "div", "mod", "neg", "abs",
  "concat", "length", "substring", "upper", "lower",
  "typeof", "coalesce", "has",
  // Extensión
  "sort", "lookup", "merge",
]);

/* ------------------------------------------------------------------ */

/**
 * @typedef {Object} OP_ARGS_OPERATOR
 * @property {Array<string>} required
 * The list of required clauses' names for such _template command_
 * or _operator_.
 * @property {Array<string>} optional
 * The list of optional clauses' names for such _template command_
 * or _operator_.
 * @description
 * It describes the required and optional clauses' names for a single
 * _template command_ or _operator_ defined in `JM2MP`.
**/

/**
 * @typedef {Object} OP_ARGS_TABLE
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} get
 * Both required and optional clauses for the `get` _template command_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} if
 * Both required and optional clauses for the `if` _template command_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} foldArr
 * Both required and optional clauses for the `foldArr` _template command_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} foldObj
 * Both required and optional clauses for the `foldObj` _template command_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} cons
 * Both required and optional clauses for the `cons` _template command_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} insert
 * Both required and optional clauses for the `insert` _template command_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} let
 * Both required and optional clauses for the `let` _template command_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} call
 * Both required and optional clauses for the `call` _template command_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} eq
 * Both required and optional clauses for the `eq` _template command_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} lt
 * Both required and optional clauses for the `lt` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} gt
 * Both required and optional clauses for the `gt` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} lte
 * Both required and optional clauses for the `lte` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} gte
 * Both required and optional clauses for the `gte` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} neq
 * Both required and optional clauses for the `neq` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} not
 * Both required and optional clauses for the `not` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} and
 * Both required and optional clauses for the `and` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} or
 * Both required and optional clauses for the `or` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} add
 * Both required and optional clauses for the `add` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} sub
 * Both required and optional clauses for the `sub` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} mul
 * Both required and optional clauses for the `mul` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} div
 * Both required and optional clauses for the `div` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} mod
 * Both required and optional clauses for the `mod` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} neg
 * Both required and optional clauses for the `neg` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} abs
 * Both required and optional clauses for the `abs` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} concat
 * Both required and optional clauses for the `concat` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} length
 * Both required and optional clauses for the `length` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} substring
 * Both required and optional clauses for the `substring` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} upper
 * Both required and optional clauses for the `upper` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} lower
 * Both required and optional clauses for the `lower` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} typeof
 * Both required and optional clauses for the `typeof` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} coalesce
 * Both required and optional clauses for the `coalesce` _operator_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} has
 * Both required and optional clauses for the `has` _template command_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} sort
 * Both required and optional clauses for the `sort` _template command_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} lookup
 * Both required and optional clauses for the `lookup` _template command_.
 * @property {module:jm2mp/validator~OP_ARGS_OPERATOR} merge
 * Both required and optional clauses for the `merge` _template command_.
 * @description
 * It describes the required and optional clauses' names for every
 * _template command_ and _operator_ defined in `JM2MP`.
**/

/* ------------------------------------------------------------------ */

/**
 * @constant {module:jm2mp/validator~OP_ARGS_TABLE}
 * @description
 * It describes the required and optional clauses' names for every
 * _template command_ and _operator_ defined in `JM2MP`.
 * 
 * The always required `$op` clause is not included, because the
 * names of every _template command_ and _operator_ themselves are the
 * keys of this constant object.
 * 
 * It **must** be stay in sync with the evaluator's
 * [JM2MP_PROJECTIONS]{@link module:jm2mp/evaluator~JM2MP_PROJECTIONS}
 * and
 * [KNOWN_OPS]{@link module:jm2mp/validator~KNOWN_OPS}.
**/
const OP_ARGS = {
  pipe:      { required: ["$stages"],                 optional: [] },
  get:       { required: ["$path"],                   optional: ["$from", "$syntax"] },
  if:        { required: ["$cond", "$then", "$else"], optional: [] },
  foldArr:   { required: ["$over", "$init", "$step"], optional: [] },
  foldObj:   { required: ["$over", "$init", "$step"], optional: [] },
  cons:      { required: ["$head", "$tail"],          optional: [] },
  insert:    { required: ["$key", "$value", "$into"], optional: [] },
  let:       { required: ["$bindings", "$in"],        optional: [] },
  call:      { required: ["$ref"],                    optional: ["$at"] },
  eq:        { required: ["$left", "$right"],         optional: [] },
  lt:        { required: ["$left", "$right"],         optional: [] },
  gt:        { required: ["$left", "$right"],         optional: [] },
  lte:       { required: ["$left", "$right"],         optional: [] },
  gte:       { required: ["$left", "$right"],         optional: [] },
  neq:       { required: ["$left", "$right"],         optional: [] },
  not:       { required: ["$value"],                  optional: [] },
  and:       { required: ["$left", "$right"],         optional: [] },
  or:        { required: ["$left", "$right"],         optional: [] },
  add:       { required: ["$left", "$right"],         optional: [] },
  sub:       { required: ["$left", "$right"],         optional: [] },
  mul:       { required: ["$left", "$right"],         optional: [] },
  div:       { required: ["$left", "$right"],         optional: [] },
  mod:       { required: ["$left", "$right"],         optional: [] },
  neg:       { required: ["$value"],                  optional: [] },
  abs:       { required: ["$value"],                  optional: [] },
  concat:    { required: ["$parts"],                  optional: [] },
  length:    { required: ["$value"],                  optional: [] },
  substring: { required: ["$value", "$start"],        optional: ["$end"] },
  upper:     { required: ["$value"],                  optional: [] },
  lower:     { required: ["$value"],                  optional: [] },
  typeof:    { required: ["$value"],                  optional: [] },
  coalesce:  { required: ["$value", "$default"],      optional: [] },
  has:       { required: ["$key", "$in"],             optional: [] },
  sort:      { required: ["$over"],                   optional: ["$by", "$desc"] },
  lookup:    { required: ["$key", "$in"],             optional: [] },
  merge:     { required: ["$left", "$right"],         optional: [] },
};

/* ------------------------------------------------------------------ */

/**
 * @description
 * It checks whether an object is a _template command_ or an _operator_,
 * that is: if it contains the key `$op`.
 * @param {*} obj
 * The object to test.
 * @returns {boolean}
 * `true` whenever `obj` is a _template command_ or _operator_;
 * otherwise, `false`.
**/
export function isOperation(obj)
{
  return (
    (typeof obj === "object") &&
    ( obj !== null ) &&
    ( ! Array.isArray(obj) ) &&
    Object.hasOwn(obj, "$op")
  );
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It checks whether a text string can be used as a name (for _named
 * templates_ or _aliases_), that is:
 * - It is non-empty.
 * - It does not starts by: '$', '@' or '%'.
 * @param {string} name
 * The `string` to check.
 * @returns {boolean}
 * `true` whenever `name` can be a valid name;
 * otherwise, `false`.
**/
export function isValidName(name)
{
  let result = false;
  if ( ((typeof name) === "string") && (name.length > 0) )
  {
    const first = name[0];
    result = (
      (first !== "$") &&
      (first !== "@") &&
      (first !== "%")
    );
  }
  return result;
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It validates a previously resolved _projection module_ along with all
 * its _named templates_ (and recursively, their _template commands_ and
 * _operators_).
 *
 * The **validation process** is _asynchronous_ because the signature of
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}'s
 * [ValidateFunction]{@link module:jm2mp/adapters/registry.ValidateFunction}
 * is `async`.
 *
 * @param {object} module
 * The previously resolved _projection module_.
 * @param {module:jm2mp/adapters/registry.AdapterRegistry} registry
 * The
 * [AdapterRegistry]{@link module:jm2mp/adapters/registry.AdapterRegistry}
 * used to validate all expressions from any declared _query language_
 * syntax.
 * @returns {Promise<void>}
 * This function should be `await`ed.
 * @throws {ValidationError}
 * - Whenever the name of any _named template_ is not valid.
 * - If no _root template_ is found in the _projection module_.
**/
export async function validateModule(module, registry)
{
  // It checks if it is a valid module.
  AssertIsModule(module) ;
  // All named templates within the module.
  const templateNames = Object.keys(module);
  // It checks whether the projection contains the root template.
  if ( ! templateNames.includes(ROOT_TEMPLATE_NAME) )
  {
    throw new ValidationError(
      `validateModule: the projection must contain the root template '${ROOT_TEMPLATE_NAME}'.`
    );
  }
  else
  {
    // It validates the name of all named templates.
    for (const name of templateNames)
    {
      if (name === ROOT_TEMPLATE_NAME) { continue; }
      else if ( ! isValidName(name) )
      {
        throw new ValidationError(
          `validateModule: invalid name '${name}' for a named template: "${name}". ` +
          `Valid names must be non-empty and must not start by: '$', '@' or '%'.`
        );
      }
    }
    // It validates the content of all named templates.
    for (const name of templateNames)
    {
      await validateProjection(module[name], {
        module,
        registry,
        aliasesInScope: new Set(),
        path: name,
      });
    }
  }
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It validates recursively a _projection_.
 * @param {*} proj
 * The _projection_ (that can be any valid JSON value), to validate.
 * @param {object} ctx
 * The _execution context_ used for validation.
 * @throws {ValidationError}
 * Whenever the type of `proj` is not supported by JSON
 * (what should never happen).
**/
async function validateProjection(proj, ctx)
{
  // Scalar (primitive) data types.
  if ( (proj === null) || ((typeof proj) === "boolean") ||
       ((typeof proj) === "number") || ((typeof proj) === "string") )
  {
    // Is valid; it does nothing and just return.
  }
  // Arrays: it validates recursively every item.
  else if ( Array.isArray(proj) )
  {
    for (let i = 0; i < proj.length; i++)
    {
      await validateProjection(proj[i], { ...ctx, path: `${ctx.path}[${i}]` });
    }
  }
  // Objects: it validates recursively every property (key).
  else if ( (typeof proj) === "object")
  {
    if ( isOperation(proj) )
    {
      await validateOperation(proj, ctx);
    }
    else
    {
      await validateLiteralObject(proj, ctx);
    }
  }
  // Error: is not a valid JSON data type.
  else
  {
    throw new ValidationError(
      `validateProjection: type '${typeof proj}' not supported at path '${ctx.path}'.`
    );
  }
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * If validates recursively a _projection_ considering it specifically
 * as a _template command_ or _operator_.
 * 
 * It validates several operational aspects: known name, required and
 * optional arguments, and not additional unknown arguments.
 * 
 * It deeply validates _template commands_ with special semantics:
 * `let`, `call`, and `get`.
 * 
 * Structural data types (arrays and objects) are traversed recursively
 * in a generic manner.
 * @param {*} op
 * The _template command_ or _operator_ to validate.
 * @param {Object} ctx
 * The _execution context_ used for validation.
 * @throws {ValidationError}
 * Whenever an error is detected during the validation process. Its
 * `message` will contain the kind of error found and the _execution
 * environment_ `path` where it was found.
**/
async function validateOperation(op, ctx)
{
  // It vaidates the operator's name.
  const opName = op.$op;
  if (typeof opName !== "string")
  {
    throw new ValidationError(
      `validateOperation: the value of the '$op' clause at '${ctx.path}' must be a string.`
    );
  }
  else if ( ! KNOWN_OPS.has(opName) )
  {
    throw new ValidationError(
      `validateOperation: unknown template command or operator '${opName}' at ${ctx.path}.`
    );
  }
  else
  {
    // It validates the specific template command (or operator).
    const spec = OP_ARGS[opName];
    const allowed = new Set(["$op", ...spec.required, ...spec.optional]);
    // Valid arguments.
    for (const key of Object.keys(op))
    {
      if ( ! allowed.has(key) )
      {
        throw new ValidationError(
          `validateOperation: unknown argument '${key}' in operator '${opName}' at ${ctx.path}.`
        );
      }
    }
    // Required arguments.
    for (const req of spec.required)
    {
      if ( ! Object.hasOwn(op, req) )
      {
        throw new ValidationError(
          `validateOperation: missing required argument '${req}' in operator '${opName}' at ${ctx.path}.`
        );
      }
    }
    // It deeply validates template commands with special semantics.
    switch (opName)
    {
      case "let":
      {
        await validateLet(op, ctx);
        break;
      }
      case "call":
      {
        await validateCall(op, ctx);
        break;
      }
      case "get":
      {
        await validateGet(op, ctx);
        break;
      }
      default:
      {
        // It recursively validates each argument that can be a projection.
        for (const argName of [...spec.required, ...spec.optional])
        {
          if ( Object.hasOwn(op, argName) )
          {
            await validateProjection( op[argName], { ...ctx, path: `${ctx.path}.${argName}`, } );
          }
        }
        break;
      }
    }
  }
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * If validates deeply and recursively a `let` _template command_
 * due to its special semantics.
 * 
 * It validates several operational aspects: valid aliases names,
 * parallel binding evaluation at outer scope, and $in evaluation
 * at inner (extended) scope (including new aliases).
 * @param {*} op
 * The `let` _template command_ to validate.
 * @param {Object} ctx
 * The _execution environment_ used to validate.
 * @throws {ValidationError}
 * Whenever an error is detected during the validation process. Its
 * `message` will contain the kind of error found and the _execution
 * environment_ `path` where it was found.
**/
async function validateLet(op, ctx)
{
  // It validates aliases bindings.
  const bindings = op.$bindings;
  if ( ((typeof bindings) !== "object") || (bindings === null) || Array.isArray(bindings) )
  {
    throw new ValidationError(
      `validateLet: $bindings clause of let template command at ${ctx.path} must be an object.`
    );
  }
  // It validates the name of each alias bound.
  for (const aliasName of Object.keys(bindings))
  {
    if ( ! isValidName(aliasName) )
    {
      throw new ValidationError(
        `validateLet: invalid alias name '${aliasName}' at ${ctx.path}.`
      );
    }
  }
  // It validates the bindings of aliases in a parallel manner:
  // each one is validated within the outer scope.
  for (const [aliasName, bindingProj] of Object.entries(bindings))
  {
    await validateProjection(bindingProj, { ...ctx, path:`${ctx.path}.$bindings.${aliasName}`, });
  }
  // It validates the $in clause within the inner scope.
  const newScope = new Set(ctx.aliasesInScope);
  for (const aliasName of Object.keys(bindings))
  {
    newScope.add(aliasName);
  }
  await validateProjection(op.$in, { ...ctx, aliasesInScope:newScope, path:`${ctx.path}.$in`, });
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * If validates deeply and recursively a `call` _template command_
 * due to its special semantics.
 * 
 * It validates several operational aspects: valid reference name,
 * existing referenced _named template_, and recursively over the
 * `$at` _projection_.
 * 
 * It is **important** to note that the validation about the existence
 * of the referenced _named template_ is made only at this point. If
 * validation is ommited, then invoking a non-existent _named template_
 * will raise an
 * [EvaluationError]{@link module:jm2mp/errors.EvaluationError} at
 * runtime.
 * @param {*} op
 * The `let` _template command_ to validate.
 * @param {Object} ctx
 * The _execution environment_ used to validate.
 * @throws {ValidationError}
 * Whenever an error is detected during the validation process. Its
 * `message` will contain the kind of error found and the _execution
 * environment_ `path` where it was found.
**/
async function validateCall(op, ctx)
{
  // It validates the reference clause.
  const ref = op.$ref;
  if ( ((typeof ref) !== "string") || ( ! isValidName(ref)) )
  {
    throw new ValidationError(
      `validateCall: $ref clause of call template commant at '${ctx.path}' must be a valid name (non empty string).`
    );
  }
  else if ( ! Object.hasOwn(ctx.module, ref) )
  {
    throw new ValidationError(
      `validateCall: $ref clause '${ref}' of call template commant at '${ctx.path}' must reference an existing named template.`
    );
  }
  else if (Object.hasOwn(op, "$at"))
  {
    await validateProjection(op.$at, { ...ctx, path:`${ctx.path}.$at` });
  }
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * If validates deeply and recursively a `get` _template command_
 * due to its special semantics.
 *
 * It validates several operational aspects: registered `$syntax`,
 * validates `$path` using the right
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter},
 * scope of _aliases_ when using the `native` string-variant syntax,
 * and recursive valiation over the `$from` _projection_.
 * @param {*} op
 * The `let` _template command_ to validate.
 * @param {Object} ctx
 * The _execution environment_ used to validate.
 * @throws {ValidationError}
 * Whenever an error is detected during the validation process. Its
 * `message` will contain the kind of error found and the _execution
 * environment_ `path` where it was found.
**/
async function validateGet(op, ctx)
{
  // After normalization, the `$syntax` clause must always be included
  // as a non-empty string.
  const syntax = op.$syntax;
  if ( ((typeof syntax) !== "string") || (syntax.length === 0) )
  {
    throw new ValidationError(
      `validateGet: $syntax clause of get template command at '${ctx.path}' must be a non-empty string. ` +
      `Was the normalization stage skipped for this module?`
    );
  }
  else if ( ! ctx.registry.has(syntax) )
  {
    throw new ValidationError(
      `validateGet: $syntax '${syntax}' at ${ctx.path} does not have any registered query-adapter.`
    );
  }
  // It validates $path delegating in the registered query-adapter.
  const adapter = ctx.registry.get(syntax);
  try
  {
    await adapter.validate(op.$path);
  }
  catch (cause)
  {
    if (cause instanceof ValidationError)
    {
      throw new ValidationError(
        `validateGet: error validating $path at '${ctx.path}' due to '${cause.message}'.`,
        { cause }
      );
    }
    else
    {
      throw new ValidationError(
        `validateGet: error validating $path at ${ctx.path}.`,
        { cause }
      );
    }
  }
  // Only for native syntax, it validates aliases and their scope.
  // Rest of syntaxes do not use aliases and only project $from clause.
  if ((syntax === "native") && ((typeof op.$path) === "string"))
  {
    const parsed = parsePath(op.$path);
    if ( (parsed.kind === "alias") && ( ! ctx.aliasesInScope.has(parsed.aliasName)) )
    {
      throw new ValidationError(
        `validateGet: alias '%${parsed.aliasName}' at '${ctx.path}.$path' is out of scope.`
      );
    }
  }
  // It also validates recursively the $from clause.
  if (Object.hasOwn(op, "$from"))
  {
    await validateProjection(op.$from, {...ctx, path:`${ctx.path}.$from`});
  }
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It validates recursively a _projection_ that is a literal object but
 * neither a _template command_ nor _operator_:
 * - It validates that all its keys (property names) must not start by
 *   unescaped '$' character; they must use '\$' instead.
 * - It validates recursively the value of all its properties as
 *   _projections_.
 * @param {*} obj
 * The _projection_ (which is a literal object), to validate.
 * @param {object} ctx
 * The _execution context_ used for validation.
 * @throws {ValidationError}
 * Whenever an unescaped invalid key is found.
**/
async function validateLiteralObject(obj, ctx)
{
  // It validates all its keys (looking for unescaped invalid prefixes).
  for (const key of Object.keys(obj))
  {
    if ((key.length > 0) && (key[0] === "$"))
    {
      throw new ValidationError(
        `validateLiteralObject: key '${key}' in literal object at ${ctx.path} starts by unescaped '$' invalid character. ` +
        `Use '\\$${key.slice(1)}' to declare a literal key instead.`
      );
    }
    await validateProjection(obj[key], {...ctx, path:`${ctx.path}.${key}`});
  }
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/validator.js                          */
