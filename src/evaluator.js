/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The module [evaluator]{@link module:jm2mp/evaluator} implements the
 * evaluation process of the _projection language_ JM2MP.
**/

/**
 * @module jm2mp/evaluator
 * @description
 * This module implements the **evaluation process** of the _projection
 * language_ `JM2MP`: given a resolved and normalized _projection
 * document_, it evaluates its _root template_ over a _source document_.
 *
 * The **evaluation process** is _asynchronous_ because the
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}'s
 * contract is `async`.
 *
 * **Two API levels:**
 *
 * - The [evaluate]{@link module:jm2mp/evaluator.evaluate} function is
 *   part of the **low level API**. If it is invoked without first
 *   passing through
 *   [validateModule]{@link module:jm2mp/validator.validateModule},
 *   errors that **validation** would have detected (like non-existent
 *   references or out-of-scope aliases) will manifest as
 *   [EvaluationError]{@link module:jm2mp/errors.EvaluationError}
 *   at runtime.
 *
 * - Use [project]{@link module:jm2mp/index.project} as the **high level
 *   API** for the full workflow with: module resolution, projection
 *   validation and projection evaluation.
 *
 * **Adapter error handling:**
 * 
 * - The `get` _template command_ wraps any
 *   [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}
 *   exception that is **not** a
 *   [ProjectionError]{@link module:jm2mp/errors.ProjectionError}
 *   in an
 *   [EvaluationError]{@link module:jm2mp/errors.EvaluationError}.
 *   This ensures that the language’s error hierarchy is closed: any
 *   error catchable in a `try/catch` block (and of type
 *   [ProjectionError]{@link module:jm2mp/errors.ProjectionError})
 *   will be one of JM2MP's.
 * 
 * **Isolation between evaluations:**
 * 
 * - Each call to 
 *   [evaluate]{@link module:jm2mp/evaluator.evaluate}
 *   creates its own `cache` of compiled expressions (independent
 *   by `$syntax`). There is no shared state between concurrent
 *   evaluations; two
 *   [evaluate]{@link module:jm2mp/evaluator.evaluate}
 *   calls running in parallel do not interfere with each other.
 *   This allows for safe use in concurrent applications (such as
 *   web servers) without the need for an additional synchronization
 *   mechanism.
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

import { ProjectionError, EvaluationError } from "./errors.js";
import { ROOT_TEMPLATE_NAME } from "./modules/helpers.js";
import { isOperation } from "./validator.js";

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @constant {integer}
 * @description
 * It sets the default value to `1000` for the maximum logical nesting
 * depth of expressions evaluated by `JM2MP.JS`.
 * 
 * This serves as a safeguard against infinite recursion and extremely
 * nested logical expressions, whether created inadvertently or
 * maliciously.
 * 
 * It is not affected by the JavaScript stack, since evaluation is
 * performed asynchronously (`async/await`).
 **/
export const DEFAULT_MAX_DEPTH = 1000;

/* ------------------------------------------------------------------ */

/**
 * @description
 * Evalúa un módulo resuelto sobre un documento de origen.
 * @param {object} module
 * A _projection module_ previously resolved and normalized.
 * @param {*} document
 * The _source document_.
 * @param {object} options
 * Mandatory options for evaluation.
 * @param {AdapterRegistry} options.registry
 * The mandatory
 * [AdapterRegistry]{@link module:jm2mp/adapters/registry.AdapterRegistry}
 * used to evaluate each _query language_ expression.
 * @param {number} [options.maxDepth=1000]
 * See [DEFAULT_MAX_DEPTH]{@link DEFAULT_MAX_DEPTH}.
 * @returns {Promise<*>}
 * The (promised) _resultant document_ of apply the _root template_
 * from `module`.
**/
export async function evaluate(module, document, options)
{
  // It validates the adapter's registry existence.
  if (!options || !options.registry)
  {
    throw new EvaluationError("evaluate: 'options.registry' is required to evaluate.");
  }
  // It configures the maximum depth for logical evaluation.
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
  // It creates a new cache for query language expressions,
  // locally (and independent) to every evaluation, avoiding
  // concurrency synch mechanisms.
  const queryCaches = new Map();
  // Helper function to get a specific expressions' cache for
  // each query syntaxes (adapters).
  const getCacheFor = (syntax) => {
    let cache = queryCaches.get(syntax);
    if (!cache) {
      cache = new Map();
      queryCaches.set(syntax, cache);
    }
    return cache;
  };
  // The execution environment (rho+).
  const env = {
    ctx: document,
    root: document,
    aliases: Object.create(null),
    module,
    registry: options.registry,
    getCacheFor,
    depth: 0,
    maxDepth,
  };
  // It evaluates the projection document over the source document,
  // and returns the resultant document.
  return evalProjection(module[ROOT_TEMPLATE_NAME], env);
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It evaluates the _projection_ `proj` over the _execution environment_
 * `env` and returns its _resultant value_.
 * 
 * It is `async` to support asynchronous
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}s.
 * @param {*} proj
 * The _projection_ to evaluatue.
 * @param {*} env
 * The _execution environment_ where `proj` is evaluated.
 * @returns {*}
 * The result of the `proj` over `env`.
**/
async function evalProjection(proj, env)
{
  // The resultan value of the projection over the execution environment.
  let resultant_value;
  // It verifies the current logical level againts the maximum depth. */
  if (env.depth >= env.maxDepth) {
    throw new EvaluationError(
      `evalProjection: current depth exceeds the maximum depth specified '${env.maxDepth}'. ` +
      `Please check whether this is a case of infinite recursion or an overly nested logical expression.`
    );
  }
  // Scalar (primitive) types are considered as literal constants,
  // which projects their respective value itself.
  else if (proj === null || typeof proj === "boolean" ||
      typeof proj === "number" || typeof proj === "string")
  {
    resultant_value = proj;
  }
  // Arrays: they project each item.
  else if (Array.isArray(proj))
  {
    resultant_value = [];
    for (const p of proj)
    {
      resultant_value.push(await evalProjection(p, deepen(env)));
    }
  }
  // Objects: they can be template commands or literal ones (that project each property).
  else if (typeof proj === "object")
  {
    if (isOperation(proj))
    {
      resultant_value = await evalOperation(proj, env);
    }
    else
    {
      resultant_value = await evalLiteralObject(proj, env);
    }
  }
  // Other kind of values are not supported by JSON.
  else
  {
    throw new EvaluationError(`Type not supported: '${typeof(proj)}'.`);
  }
  //
  return resultant_value;
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It returns an _execution environment_ with its _depth_ value
 * increased by one (1).
 * @param {*} env
 * The JM2MP's _execution environment_.
 * @returns {object}
 * Same as `env` but with `env.depth` increased by `1`.
**/
function deepen(env)
{
  return { ...env, depth: env.depth + 1 };
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It _projects_ (evaluates) a literal object (JSON value) `obj` over
 * the _execution environment_ `env` and returns its _resultant value_.
 * 
 * For literal objects: each property's value is projected and each
 * property's name (key) can be escaped (using '\$' to start literally
 * by '$').
 * @param {*} obj
 * The literal object (JSON value) to _project_.
 * @param {*} env
 * The _execution environment_
 * @returns {*}
 * It returns the _resultant value_ of _project_ every object's property.
**/
async function evalLiteralObject(obj, env)
{
  const resultant_value = {};
  for (const key of Object.keys(obj))
  {
    // It supports escaping keys: \$name --> name starting with $ literally.
    const escaped_key = (
      ((key.length >= 2) && (key[0] === "\\") && (key[1] === "$"))
      ? key.slice(1)
      : key
    );
    // Each property's value is projected.
    resultant_value[escaped_key] = await evalProjection(obj[key], deepen(env));
  }
  return resultant_value;
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It invokes the specified operation handler from the specified
 * operation's name.
 * @param {Function} op
 * The name of the operation (_template command_, _predicate_ or
 * _operator_) to evaluate.
 * @param {*} env
 * The _execution environment_ where the operation will be evaluated.
 * @returns {*}
 * The _resultant value_ obtained.
**/
async function evalOperation(op, env)
{
  const handler = JM2MP_PROJECTIONS[op.$op];
  if (!handler)
  {
    throw new EvaluationError(`Unknown operation '${op.$op}'.`);
  }
  else
  {
    return handler(op, env);
  }
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * Asegura que `value` sea del tipo esperado o lanza EvaluationError.
 * @param {*} value
 * The JSON value to test its type.
 * @param {*} expectedType
 * The expected type's name.
 * @param {*} opName
 * The name of the operation in which the value is evaluated.
 * @param {*} argName
 * The argument's name.
**/
function expectType(value, expectedType, opName, argName)
{
  // It gets the actual data type.
  let actual;
  if (value === null) { actual = "null"; }
  else if (Array.isArray(value)) { actual = "array"; }
  else { actual = (typeof value); }
  // It asserts against the expected type.
  if (actual !== expectedType)
  {
    throw new EvaluationError(
      `${opName}: ${argName} was expected to be of type '${expectedType}' rather than '${actual}'.`
    );
  }
}

/* ------------------------------------------------------------------ */
/* PROJECTIONS, TEMPLATE COMMANDS AND OPERATORS                       */
/* ------------------------------------------------------------------ */

/**
 * @namespace
 * @description
 * Operators table.
 * Each entry is asynchronous to maintain consistency with the
 * [QueryAdapter]{@link module:jm2mp/adapters/registry.QueryAdapter}'s
 * contract.
 * 
 * It **must** be stay in sync with the validator's
 * [KNOWN_OPS]{@link module:jm2mp/validator~KNOWN_OPS}
 * and
 * [OP_ARGS]{@link module:jm2mp/validator~OP_ARGS}.
**/
const JM2MP_PROJECTIONS = {

/* ------------------------------------------------------------------ */

/* Categorical kernel */

  /**
   * @description The PIPE template command.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async pipe(op, env)
  {
    let currentCtx = env.ctx;
    for (const stage of op.$stages)
    {
      const stageEnv = { ...env, ctx: currentCtx, depth: env.depth + 1 };
      currentCtx = await evalProjection(stage, stageEnv);
    }
    return currentCtx;
  },

/* ------------------------------------------------------------------ */

/* Access */

  /**
   * @description The GET template command.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async get(op, env)
  {
    const syntax = op.$syntax;
    const adapter = env.registry.get(syntax);
    const input = (
      Object.hasOwn(op, "$from")
      ? await evalProjection(op.$from, deepen(env))
      : env.ctx
    );
    const cache = env.getCacheFor(syntax);
    // It wraps non-ProjectionError errors to warranty a closed hierarchy.
    try
    {
      return await adapter.evaluate(op.$path, input, cache, env);
    }
    catch (err)
    {
      if (err instanceof ProjectionError)
      {
        throw err;
      }
      else
      {
        throw new EvaluationError(
          `Adapter '${syntax}' fails during evaluation.`,
          { cause: err }
        );
      }
    }
  },

/* ------------------------------------------------------------------ */
/* Eliminators (conditional/if and catamorphisms/foldArr/foldObj) */

  /**
   * @description The IF template command.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async if(op, env)
  {
    const cond = await evalProjection(op.$cond, deepen(env));
    if (typeof cond !== "boolean")
    {
      throw new EvaluationError(
        `if: type mistamtch, $cond must be Boolean instead of '${((cond === null)?"null":typeName(cond))}'.`
      );
    }
    return (
      cond
      ? await evalProjection(op.$then, deepen(env))
      : await evalProjection(op.$else, deepen(env))
    );
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The FOLDARR template command.
   * @param {object} op Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async foldArr(op, env)
  {
    const over_clause = await evalProjection(op.$over, deepen(env));
    if (over_clause === null)
    {
      return await evalProjection(op.$init, deepen(env));
    }
    else if ( ! Array.isArray(over_clause) )
    {
      throw new EvaluationError("fold: $over must be an array or null.");
    }
    else
    {
      let acc = await evalProjection(op.$init, deepen(env));
      // Fold over arrays from right-to-left.
      for (let i = over_clause.length - 1; i >= 0; i--)
      {
        const stepCtx = { item: over_clause[i], acc, index: i };
        const stepEnv = { ...env, ctx: stepCtx, depth: env.depth + 1 };
        acc = await evalProjection(op.$step, stepEnv);
      }
      return acc;
    }
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The FOLDOBJ template command.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async foldObj(op, env)
  {
    const obj = await evalProjection(op.$over, deepen(env));
    if (obj === null)
    {
      return await evalProjection(op.$init, deepen(env));
    }
    else if (typeof obj !== "object" || Array.isArray(obj))
    {
      throw new EvaluationError("foldObj: $over must be an object or null.");
    }
    else
    {
      let acc = await evalProjection(op.$init, deepen(env));
      for (const key of Object.keys(obj))
      {
        const stepCtx = { key, value: obj[key], acc };
        const stepEnv = { ...env, ctx: stepCtx, depth: env.depth + 1 };
        acc = await evalProjection(op.$step, stepEnv);
      }
      return acc;
    }
  },

/* ------------------------------------------------------------------ */
/* Dynamic constructors (introduction of values). */

  /**
   * @description The CONS template command.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async cons(op, env)
  {
    const head = await evalProjection(op.$head, deepen(env));
    const tail = await evalProjection(op.$tail, deepen(env));
    if ( ! Array.isArray(tail) )
    {
      throw new EvaluationError("cons: $tail must be an array.");
    }
    else
    {
      return [head, ...tail];
    }
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The INSERT template command.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async insert(op, env)
  {
    const key = await evalProjection(op.$key, deepen(env));
    if (typeof key !== "string")
    {
      throw new EvaluationError("insert: $key must be a string.");
    }
    else
    {
      const value = await evalProjection(op.$value, deepen(env));
      const into = await evalProjection(op.$into, deepen(env));
      if ( (typeof into !== "object") || (into === null) || Array.isArray(into) )
      {
        throw new EvaluationError("insert: $into must be an object.");
      }
      else
      {
        return { ...into, [key]: value };
      }
    }
  },

/* ------------------------------------------------------------------ */
/* Control of the execution environment. */

  /**
   * @description The LET template command.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async let(op, env)
  {
    // Parallel bindings (no let*).
    const newAliases = { ...env.aliases };
    for (const [name, projection] of Object.entries(op.$bindings))
    {
      newAliases[name] = await evalProjection(projection, deepen(env));
    }
    const innerEnv = { ...env, aliases: newAliases, depth: env.depth + 1 };
    return await evalProjection(op.$in, innerEnv);
  },

/* ------------------------------------------------------------------ */
/* Template invocation. */

  /**
   * @description The CALL template command.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async call(op, env)
  {
    const ref = op.$ref;
    if ( ! Object.hasOwn(env.module, ref) )
    {
      throw new EvaluationError(
        `call: named template '${ref}' not found.`
      );
    }
    else
    {
      const template = env.module[ref];
      const newCtx = (
        Object.hasOwn(op, "$at")
        ? await evalProjection(op.$at, deepen(env))
        : env.ctx
      );
      // Calling a named template resets aliases
      // (lexical closure over the module).
      const callEnv = {
        ctx: newCtx,
        root: env.root,
        aliases: Object.create(null),
        module: env.module,
        registry: env.registry,
        getCacheFor: env.getCacheFor,
        depth: env.depth + 1,
        maxDepth: env.maxDepth,
      };
      return await evalProjection(template, callEnv);
    }
  },

/* ------------------------------------------------------------------ */
/* Logical predicates. */

  /**
   * @description The EQ predicate.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async eq(op, env)
  {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    return deepEqual(l, r);
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The LT predicate.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async lt(op, env)
  {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    return (compareOrdered(l, r, "lt") < 0);
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The GT predicate.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async gt(op, env)
  {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    return (compareOrdered(l, r, "gt") > 0);
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The LTE predicate.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async lte(op, env)
  {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    return (compareOrdered(l, r, "lte") <= 0);
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The GTE predicate.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async gte(op, env)
  {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    return (compareOrdered(l, r, "gte") >= 0);
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The NEQ predicate.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async neq(op, env)
  {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    return ( ! deepEqual(l, r) );
  },

/* ------------------------------------------------------------------ */
/* Boolean connectives and operators */

  /**
   * @description The NOT logical operator.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async not(op, env)
  {
    const v = await evalProjection(op.$value, deepen(env));
    expectType(v, "boolean", "not", "$value");
    return ( ! v );
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The AND logical operator.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async and(op, env)
  {
    // Short-circuit evaluation.
    const l = await evalProjection(op.$left, deepen(env));
    expectType(l, "boolean", "and", "$left");
    if (!l)
    {
      return false;
    }
    else
    {
      const r = await evalProjection(op.$right, deepen(env));
      expectType(r, "boolean", "and", "$right");
      return r;
    }
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The OR logical operator.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async or(op, env)
  {
    // Short-circuit evaluation.
    const l = await evalProjection(op.$left, deepen(env));
    expectType(l, "boolean", "or", "$left");
    if (l)
    {
      return true;
    }
    else
    {
      const r = await evalProjection(op.$right, deepen(env));
      expectType(r, "boolean", "or", "$right");
      return r;
    }
  },

/* ------------------------------------------------------------------ */
/* Arithmetic operators. */

  /**
   * @description The ADD arithmetic operator.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async add(op, env)
  {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    expectType(l, "number", "add", "$left");
    expectType(r, "number", "add", "$right");
    return (l + r);
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The SUB arithmetic operator.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async sub(op, env)
  {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    expectType(l, "number", "sub", "$left");
    expectType(r, "number", "sub", "$right");
    return (l - r);
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The MUL arithmetic operator.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async mul(op, env)
  {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    expectType(l, "number", "mul", "$left");
    expectType(r, "number", "mul", "$right");
    return (l * r);
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The DIV arithmetic operator.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async div(op, env)
  {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    expectType(l, "number", "div", "$left");
    expectType(r, "number", "div", "$right");
    if (r === 0)
    {
      throw new EvaluationError("div: division by zero.");
    }
    else
    {
      const result = ( l / r );
      if ( ! Number.isFinite(result) )
      {
        throw EvaluationError("div: non-finite result.");
      }
      return result;
    }
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The MOD arithmetic operator.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async mod(op, env)
  {
    const l = await evalProjection(op.$left, deepen(env));
    const r = await evalProjection(op.$right, deepen(env));
    expectType(l, "number", "mod", "$left");
    expectType(r, "number", "mod", "$right");
    if (r === 0)
    {
      throw new EvaluationError("mod: módulo con divisor cero.");
    }
    else
    {
      const result = ( l % r );
      if ( ! Number.isFinite(result) )
      {
        throw EvaluationError("mod: resultado no finito.");
      }
      return result;
    }
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The NEG arithmetic operator.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async neg(op, env)
  {
    const v = await evalProjection(op.$value, deepen(env));
    expectType(v, "number", "neg", "$value");
    return (-v);
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The ABS arithmetic operator.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async abs(op, env)
  {
    const v = await evalProjection(op.$value, deepen(env));
    expectType(v, "number", "abs", "$value");
    return Math.abs(v);
  },

/* ------------------------------------------------------------------ */
/* Strings operators */

  /**
   * @description The CONCAT string operator.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async concat(op, env)
  {
    if ( ! Array.isArray(op.$parts) )
    {
      throw new EvaluationError("concat: $parts must be an array.");
    }
    else
    {
      let result = "";
      for (let i = 0; i < op.$parts.length; i++)
      {
        const part = await evalProjection(op.$parts[i], deepen(env));
        if (typeof part !== "string")
        {
          throw new EvaluationError(
            `concat: type mismatch in $parts[${i}], must be a 'string' instead of '${typeof part}'.`
          );
        }
        result += part;
      }
      return result;
    }
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The LENGTH operator.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async length(op, env)
  {
    const v = await evalProjection(op.$value, deepen(env));
    // It counts real characters, not code-points neither graphemes.
    if (typeof v === "string") { return Array.from(v).length; }
    // It counts array's items.
    else if (Array.isArray(v)) { return v.length; }
    // Otherwise, an exception is raised.
    else { throw new EvaluationError("length: $value must be an array or a string."); }
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The SUBSTRING string operator.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async substring(op, env)
  {
    const v = await evalProjection(op.$value, deepen(env));
    expectType(v, "string", "substring", "$value");
    const start = await evalProjection(op.$start, deepen(env));
    if ( ( ! Number.isInteger(start) ) || (start < 0) )
    {
      throw new EvaluationError("substring: $start must be a natural number (>=0).");
    }
    else
    {
      const codepoints = Array.from(v);
      let end;
      if ( Object.hasOwn(op, "$end") )
      {
        end = await evalProjection(op.$end, deepen(env));
        if ( ( ! Number.isInteger(end) ) || (end < 0) )
        {
          throw new EvaluationError("substring: $end must be a natural number (>=0).");
        }
      }
      else
      {
        end = codepoints.length;
      }
      const realStart = Math.min(start, codepoints.length);
      const realEnd = Math.min(Math.max(end, realStart), codepoints.length);
      return codepoints.slice(realStart, realEnd).join("");
    }
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The TO-UPPER-CASE string operator.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async upper(op, env)
  {
    const v = await evalProjection(op.$value, deepen(env));
    expectType(v, "string", "upper", "$value");
    return (v.toUpperCase());
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The TO-LOWER-CASE string operator.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async lower(op, env)
  {
    const v = await evalProjection(op.$value, deepen(env));
    expectType(v, "string", "lower", "$value");
    return (v.toLowerCase());
  },

/* ------------------------------------------------------------------ */
/* Miscelaneous: types and reflection. */

  /**
   * @description The TYPE-OF operator.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async typeof(op, env)
  {
    const v = await evalProjection(op.$value, deepen(env));
    if (v === null) { return "null"; }
    else if (Array.isArray(v)) { return "array"; }
    else { return typeof(v); }
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The COALESCE template command.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async coalesce(op, env)
  {
    // Only when $value were null, $default is evaluated (lazyness).
    let v = await evalProjection(op.$value, deepen(env));
    if (v === null)
    {
      v = await evalProjection(op.$default, deepen(env));
    }
    return v;
  },

/* ------------------------------------------------------------------ */

  /**
   * @description The HAS predicate.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async has(op, env)
  {
    const key = await evalProjection(op.$key, deepen(env));
    expectType(key, "string", "has", "$key");
    const inObj = await evalProjection(op.$in, deepen(env));
    if ( ((typeof inObj) !== "object") || (inObj === null) || Array.isArray(inObj) )
    {
      throw new EvaluationError("has: $in must be an object.");
    }
    else
      {
      return Object.hasOwn(inObj, key);
    }
  },

/* ------------------------------------------------------------------ */
/* List (extension commands) */

  /**
   * @description The SORT template command.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async sort(op, env)
  {
    const over = await evalProjection(op.$over, deepen(env));
    if (over === null)
    {
      return null;
    }
    else if (!Array.isArray(over))
    {
      throw new EvaluationError("sort: $over must be an array or null.");
    }
    else
    {
      // Ascending or descending order?
      let desc = false;
      if (Object.hasOwn(op, "$desc"))
      {
        desc = await evalProjection(op.$desc, deepen(env));
        expectType(desc, "boolean", "sort", "$desc");
      }
      // Specific criteria?
      const hasBy = Object.hasOwn(op, "$by");
      // It decorates each element based on the criteria.
      const decorated = [];
      for (let i = 0; i < over.length; i++)
      {
        const key = (
          hasBy
          ? await evalProjection(op.$by, { ...env, ctx: over[i], depth: env.depth + 1 })
          : over[i]
        );
        decorated.push({ x: over[i], key, i });
      }
      decorated.sort( (a, b) => {
        const cmp = compareOrdered(a.key, b.key, "sort");
        if (cmp !== 0) { return (desc ? -cmp : cmp); }
        else { return (a.i - b.i); /*stable*/ }
      });
      return decorated.map( (item) => item.x );
    }
  },

/* ------------------------------------------------------------------ */
/* Access by key (extension command, advantage of O(1) complexity over fold) */

  /**
   * @description The LOOKUP template command.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async lookup(op, env)
  {
    const key = await evalProjection(op.$key, deepen(env));
    expectType(key, "string", "lookup", "$key");
    const inObj = await evalProjection(op.$in, deepen(env));
    // Null absorption propagation.
    if (inObj === null)
    {
      return null;
    }
    else if ( ((typeof inObj) !== "object") || Array.isArray(inObj) )
    {
      throw new EvaluationError("lookup: $in must be an objet or null.");
    }
    else
    {
      return (
        Object.hasOwn(inObj, key)
        ? inObj[key]
        : null
      );
    }
  },

/* ------------------------------------------------------------------ */
/* Fusión de objetos (extensión, O(m+n)) */

  /**
   * @description The MERGE template command.
   * @param {object} op  Template command to execute.
   * @param {object} env Runtime execution environment.
   * @returns {*} Resultant JSON value from projection.
   * @async
  **/
  async merge(op, env)
  {
    const left = await evalProjection(op.$left, deepen(env));
    const right = await evalProjection(op.$right, deepen(env));
    // Avoiding null absorption propagation,
    // transforming null into an empty object.
    const leftObj = ( (left === null) ? {} : left );
    const rightObj = ( (right === null) ? {} : right );
    if ( ((typeof leftObj) !== "object") || Array.isArray(leftObj) )
    {
      throw new EvaluationError("merge: $left must be an objet or null.");
    }
    else if ( ((typeof rightObj) !== "object") || Array.isArray(rightObj) )
    {
      throw new EvaluationError("merge: $right must be an objet or null.");
    }
    // Spread operator: complexity O(m+n); key prevalence from right to left.
    else
    {
      return { ...leftObj, ...rightObj };
    }
  },

/* ------------------------------------------------------------------ */

};  // const JM2MP_PROJECTIONS

/* ------------------------------------------------------------------ */
/* UTILITIES */
/* ------------------------------------------------------------------ */

/**
 * @description
 * It test the recursive structural equality over JSON values.
 * 
 * The rules are:
 * - For scalar (primitive) types it applies `equal` according to `===`.
 * - Arrays are equal if they have the same length and corresponding
 *   elements are equal.
 * - Objects are equal if they have the same set of keys and
 *   corresponding values are equal.
 * - Different types means that they never are equal (type casting
 *   neither implicit nor explicit is implemented in JM2MP 1.0).
 * @param {*} a
 * The left operand.
 * @param {*} b
 * The right operand.
 * @returns {boolean}
 * (a==b)
 */
function deepEqual(a, b)
{
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  const aIsArray = Array.isArray(a);
  const bIsArray = Array.isArray(b);
  if (aIsArray !== bIsArray) return false;
  if (aIsArray) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const k of aKeys) {
      if (!Object.hasOwn(b, k)) return false;
      if (!deepEqual(a[k], b[k])) return false;
    }
    return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It compares two ordinal values (sortables):
 * number/number or string/string.
 * @param {*} a
 * The left operand.
 * @param {*} b
 * The right operand.
 * @param {*} opName
 * The name of the operation/operator.
 * @returns {integer}
 * (-1)|(+1)|(0) when (a<b)|(a>b)|(a===b)
 * @throws {EvaluationError}
 * Whenever types of a/b are neither number/number nor string/string.
**/
function compareOrdered(a, b, opName)
{
  if (typeof a === "number" && typeof b === "number")
  {
    return a < b ? -1 : (a > b ? 1 : 0);
  }
  else if (typeof a === "string" && typeof b === "string")
  {
    return a < b ? -1 : (a > b ? 1 : 0);
  }
  else
  {
    throw new EvaluationError(
      `${opName}: arguments to compare order must be both the same and ` +
      `only 'number' or 'string' are accepted ` +
      `(received instead '${typeName(a)}' and '${typeName(b)}').`
    );
  }
}

/* ------------------------------------------------------------------ */

/**
 * @description
 * It returns the name of the JSON data type associated to `v`, one of:
 * - null
 * - boolean
 * - number
 * - string
 * - array
 * - object
 * @param {*} v
 * The value to be tested.
 * @returns {string}
 * A text string with the corresponding JSON data type
 * (not exactly like JavaScript).
**/
function typeName(v)
{
  let result ;
  if (v === null) { result = "null"; }
  else if (Array.isArray(v)) { result = "array"; }
  else { result = typeof(v); }
  return result;
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/evaluator.js                          */
