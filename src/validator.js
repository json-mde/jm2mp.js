/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @module validator
 * @file Validación estructural y semántica de módulos resueltos.
 *
 * Recorre cada plantilla validando:
 *  - Que cada operador sea conocido y tenga los argumentos requeridos.
 *  - Que no haya argumentos no reconocidos.
 *  - Que las referencias a alias estén en alcance léxico.
 *  - Que las referencias $call.$ref apunten a plantillas existentes.
 *  - Que las claves de objetos literales no empiecen por '$' sin escape.
 *  - Que las operaciones $get tengan $syntax (tras la normalización) y que
 *    dicha sintaxis corresponda a un adaptador registrado. Delega en el
 *    adaptador la validación específica del $path.
 *
 * Esta función es ASÍNCRONA porque internamente puede invocar
 * adapter.validate() de adaptadores que son async.
 */

import { ValidationError } from "./errors.js";
import { ThrowsValidationErrorWhenIsNotAModule } from "./modules/helpers.js";
import { parsePath } from "./paths.js";

/**
 * Operadores reconocidos. Mantener sincronizado con el evaluador.
 */
const KNOWN_OPS = new Set([
  // Núcleo
  "pipe", "get", "if", "fold", "foldObj", "cons", "insert", "let", "call",
  "eq", "lt", "gt", "lte", "gte", "neq", "not", "and", "or",
  "add", "sub", "mul", "div", "mod", "neg", "abs",
  "concat", "length", "substring", "upper", "lower",
  "typeof", "coalesce", "has",
  // Extensión
  "sort", "lookup", "merge",
]);

/**
 * Argumentos requeridos y opcionales por operador.
 * El campo principal $op no se incluye (es siempre necesario).
 */
const OP_ARGS = {
  pipe:      { required: ["$stages"], optional: [] },
  get:       { required: ["$path"],   optional: ["$from", "$syntax"] },
  if:        { required: ["$cond", "$then", "$else"], optional: [] },
  fold:      { required: ["$over", "$init", "$step"], optional: [] },
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
  sort:      { required: ["$value"],                  optional: ["$by", "$desc"] },
  lookup:    { required: ["$key", "$in"],             optional: [] },
  merge:     { required: ["$left", "$right"],         optional: [] },
};

/**
 * Determina si un objeto JSON es un objeto-operación.
 * Regla: contiene la clave "$op".
 *
 * @param {*} obj
 * @returns {boolean}
 */
export function isOperation(obj)
{
  return (
    (typeof obj === "object") &&
    ( obj !== null ) &&
    ( ! Array.isArray(obj) ) &&
    Object.hasOwn(obj, "$op")
  );
}

/**
 * Valida un nombre (de plantilla o de alias):
 * - No vacío.
 * - No empieza por '$', '@' ni '%'.
 *
 * @param {string} name
 * @returns {boolean}
 */
export function isValidName(name)
{
  if (typeof name !== "string" || name.length === 0) return false;
  const first = name[0];
  return first !== "$" && first !== "@" && first !== "%";
}

/**
 * Valida un módulo resuelto y todas sus plantillas.
 *
 * Esta función es ASÍNCRONA porque internamente puede invocar
 * adapter.validate() de adaptadores que son async.
 *
 * @param {object} module - Módulo resuelto.
 * @param {import("./adapters/registry.js").AdapterRegistry} registry
 * @returns {Promise<void>}
 */
export async function validateModule(module, registry)
{
  //
  ThrowsValidationErrorWhenIsNotAModule(module) ;

  const templateNames = Object.keys(module);

  if (!templateNames.includes("@")) {
    throw new ValidationError('El módulo final no contiene la plantilla raíz "@".');
  }

  for (const name of templateNames) {
    if (name === "@") continue;
    if (!isValidName(name)) {
      throw new ValidationError(
        `Nombre de plantilla inválido: "${name}". Los nombres no pueden ` +
        `estar vacíos ni empezar por '$', '@' o '%'.`
      );
    }
  }

  for (const name of templateNames) {
    await validateProjection(module[name], {
      module,
      registry,
      aliasesInScope: new Set(),
      path: name,
    });
  }
}

/**
 * Valida recursivamente una proyección.
 *
 * @param {*} proj
 * @param {object} ctx
 */
async function validateProjection(proj, ctx) {
  // Tipos primitivos: literales válidos.
  if (proj === null || typeof proj === "boolean" ||
      typeof proj === "number" || typeof proj === "string") {
    return;
  }

  if (Array.isArray(proj)) {
    for (let i = 0; i < proj.length; i++) {
      await validateProjection(proj[i], { ...ctx, path: `${ctx.path}[${i}]` });
    }
    return;
  }

  if (typeof proj === "object") {
    if (isOperation(proj)) {
      await validateOperation(proj, ctx);
    } else {
      await validateLiteralObject(proj, ctx);
    }
    return;
  }

  throw new ValidationError(
    `Tipo no soportado en proyección en ${ctx.path}: ${typeof proj}.`
  );
}

/**
 * Valida una operación: comprueba que sea conocida, que tenga los argumentos
 * requeridos y ningún argumento no reconocido. Despacha a validadores
 * específicos para let/call/get; los demás se recorren genéricamente.
 */
async function validateOperation(op, ctx) {
  const opName = op.$op;
  if (typeof opName !== "string") {
    throw new ValidationError(`El valor de $op en ${ctx.path} debe ser un string.`);
  }
  if (!KNOWN_OPS.has(opName)) {
    throw new ValidationError(`Operador desconocido '${opName}' en ${ctx.path}.`);
  }

  const spec = OP_ARGS[opName];
  const allowed = new Set(["$op", ...spec.required, ...spec.optional]);

  for (const key of Object.keys(op)) {
    if (!allowed.has(key)) {
      throw new ValidationError(
        `Argumento '${key}' no reconocido para operador '${opName}' en ${ctx.path}.`
      );
    }
  }
  for (const req of spec.required) {
    if (!Object.hasOwn(op, req)) {
      throw new ValidationError(
        `Falta el argumento requerido '${req}' para operador '${opName}' en ${ctx.path}.`
      );
    }
  }

  switch (opName) {
    case "let":   await validateLet(op, ctx);  break;
    case "call":  await validateCall(op, ctx); break;
    case "get":   await validateGet(op, ctx);  break;
    default:
      // Validar recursivamente cada argumento que sea proyección.
      for (const argName of [...spec.required, ...spec.optional]) {
        if (Object.hasOwn(op, argName)) {
          await validateProjection(op[argName], {
            ...ctx, path: `${ctx.path}.${argName}`,
          });
        }
      }
  }
}

/**
 * Valida un $let, comprobando que los nombres de alias sean válidos,
 * que los bindings se evalúen en el alcance EXTERIOR (paralelos),
 * y que $in se evalúe en el alcance EXTENDIDO con los nuevos alias.
 */
async function validateLet(op, ctx) {
  const bindings = op.$bindings;
  if (typeof bindings !== "object" || bindings === null || Array.isArray(bindings)) {
    throw new ValidationError(`$bindings de let en ${ctx.path} debe ser un objeto.`);
  }
  for (const aliasName of Object.keys(bindings)) {
    if (!isValidName(aliasName)) {
      throw new ValidationError(
        `Nombre de alias inválido '${aliasName}' en ${ctx.path}.`
      );
    }
  }
  // Bindings paralelos: cada uno se valida en el alcance EXTERIOR.
  for (const [aliasName, bindingProj] of Object.entries(bindings)) {
    await validateProjection(bindingProj, {
      ...ctx,
      path: `${ctx.path}.$bindings.${aliasName}`,
    });
  }
  // $in se valida en alcance extendido.
  const newScope = new Set(ctx.aliasesInScope);
  for (const aliasName of Object.keys(bindings)) {
    newScope.add(aliasName);
  }
  await validateProjection(op.$in, {
    ...ctx,
    aliasesInScope: newScope,
    path: `${ctx.path}.$in`,
  });
}

/**
 * Valida un $call, comprobando que la plantilla referenciada exista en el módulo.
 *
 * CRÍTICO: aquí (y SOLO aquí) se valida que la plantilla referenciada
 * exista en el módulo. Si se omite la validación, $call apuntando a
 * plantilla inexistente lanzará EvaluationError en runtime.
 */
async function validateCall(op, ctx) {
  const ref = op.$ref;
  if (typeof ref !== "string" || !isValidName(ref)) {
    throw new ValidationError(
      `$ref de call en ${ctx.path} debe ser un nombre válido.`
    );
  }
  if (!Object.hasOwn(ctx.module, ref)) {
    throw new ValidationError(
      `$call.$ref '${ref}' en ${ctx.path} no apunta a ninguna plantilla del módulo.`
    );
  }
  if (Object.hasOwn(op, "$at")) {
    await validateProjection(op.$at, { ...ctx, path: `${ctx.path}.$at` });
  }
}

/**
 * Valida un $get: $syntax presente y registrado, $path validado por el adaptador,
 * alcance de alias verificado para sintaxis nativa con $path string,
 * y $from validado recursivamente si presente.
 */
async function validateGet(op, ctx) {
  // Tras la normalización del módulo, $syntax SIEMPRE está presente.
  const syntax = op.$syntax;
  if (typeof syntax !== "string") {
    throw new ValidationError(
      `$syntax de get en ${ctx.path} debe ser un string ` +
      `(¿se omitió la normalización del módulo?).`
    );
  }
  if (!ctx.registry.has(syntax)) {
    throw new ValidationError(
      `$syntax '${syntax}' en ${ctx.path} no corresponde a ningún adaptador registrado.`
    );
  }

  // Delegamos la validación de $path al adaptador.
  const adapter = ctx.registry.get(syntax);
  try {
    await adapter.validate(op.$path);
  } catch (cause) {
    if (cause instanceof ValidationError) {
      throw new ValidationError(
        `Validación de $path falló en ${ctx.path}: ${cause.message}`,
        { cause }
      );
    }
    throw new ValidationError(
      `Error validando $path en ${ctx.path}.`,
      { cause }
    );
  }

  // Para sintaxis nativa con $path string, validamos alcance de alias usados.
  // Esta validación es exclusiva del adaptador nativo porque es el único
  // que entiende el concepto de alias del lenguaje anfitrión. Las sintaxis
  // foráneas reciben un valor único de entrada (vía $from) y no pueden
  // referenciar alias.
  if (syntax === "native" && typeof op.$path === "string") {
    const parsed = parsePath(op.$path);
    if (parsed.kind === "alias" && !ctx.aliasesInScope.has(parsed.aliasName)) {
      throw new ValidationError(
        `Alias '%${parsed.aliasName}' usado en ${ctx.path}.$path no está en alcance.`
      );
    }
  }

  // $from, si está, es proyección normal.
  if (Object.hasOwn(op, "$from")) {
    await validateProjection(op.$from, { ...ctx, path: `${ctx.path}.$from` });
  }
}

/**
 * Valida un objeto literal (no operación). Las claves no deben empezar por '$'
 * sin escape; el escape consiste en prefijar con '\' (backslash) en el JSON
 * crudo, que tras el parser aparece como "\$..." en memoria.
 */
async function validateLiteralObject(obj, ctx) {
  for (const key of Object.keys(obj)) {
    // Las claves no deben empezar por '$' a menos que estén escapadas con '\$'.
    if (key.length > 0 && key[0] === "$") {
      throw new ValidationError(
        `Clave '${key}' en objeto literal en ${ctx.path} empieza por '$' sin escape. ` +
        `Use '\\$${key.slice(1)}' para crear una clave literal.`
      );
    }
    await validateProjection(obj[key], { ...ctx, path: `${ctx.path}.${key}` });
  }
}
