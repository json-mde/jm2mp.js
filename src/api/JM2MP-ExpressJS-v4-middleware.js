/**
 * @file JM2MP-Express-v4-Middleware.js
 *
 * Middleware de Express.js v4 que expone el sistema de proyecciones JSON
 * (del chat "Álgebra lineal y programación en JSON") como servicio HTTP.
 *
 * CONTRATO HTTP
 * -------------
 * El cliente envía una petición cuyo cuerpo (Content-Type: application/json)
 * es el **documento origen** que se va a proyectar. El nombre del módulo de
 * proyección a aplicar se toma de un parámetro de ruta (:projection) o, en
 * su defecto, de la cabecera "X-Projection" o del campo `projection` de la
 * query-string. El resultado se devuelve como JSON al cliente.
 *
 * CARGA DE MÓDULOS DE PROYECCIÓN
 * ------------------------------
 * Los módulos residen en un **directorio constante** en disco. Se usa
 * `createFileLoader({ baseDir })` de la librería, lo que garantiza:
 *   - Cada módulo es un fichero JSON dentro de PROJECTIONS_DIR.
 *   - Los `$depends-on` se resuelven relativos a ese mismo directorio.
 *   - El documento origen sigue siendo de sólo lectura (transparencia
 *     referencial garantizada por el evaluador).
 *
 * DIFERENCIAS RELEVANTES CON v5
 * -----------------------------
 * Express 4 NO captura rechazos de promesas devueltas por handlers `async`.
 * Por eso el middleware se envuelve en un pequeño helper `asyncHandler` que
 * hace `Promise.resolve(fn(...)).catch(next)`. Sin esto, cualquier error
 * asíncrono (proyección inexistente, JSON mal formado, error de evaluación)
 * dejaría la petición colgada hasta el timeout.
**/

/**
 * @module jm2mp/api/express/v4/middleware
**/

// ---------------------------------------------------------------------

import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import {
  project,
  createFileLoader,
  createDefaultRegistry,
  ProjectionError,
  ResolutionError,
  ValidationError,
  EvaluationError,
  AdapterError,
} from "../index.js";

// ---------------------------------------------------------------------

/**
 * @constant {string} __dirname
 * @description
 * Directorio donde viven los ficheros de proyección.
 * Resuelto una sola vez al cargar el módulo. Se puede sobreescribir por
 * variable de entorno para despliegues, pero permanece constante durante la
 * vida del proceso.
**/
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------

/**
 * @constant {string} PROJECTIONS_DIR
 * @description
 * Ruta absoluta al directorio de proyecciones.
**/
export const PROJECTIONS_DIR = path.resolve(
  process.env.PROJECTIONS_DIR ?? path.join(__dirname, "projections"),
);

// ---------------------------------------------------------------------

/**
 * @description
 * Adaptador async como middleware para Express 4.
 * Express 4 sólo entiende errores propagados vía `next(err)`. Este envoltorio
 * convierte cualquier rechazo de promesa en una llamada a `next`, delegando
 * el manejo al pipeline de error de Express.
 * @param {Function} fn Async middleware daisychaining.
 * @returns {*} Resolves 'Promise<fn>' and catches any raised exception.
**/
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ---------------------------------------------------------------------

/**
 * @description
 * It maps JM2MP domain exceptions toward standard HTTP error codes.
 * @param {*} err The JM2MP domain exception to be returned.
 * @returns {integer} The equivalent standard HTTP error code.
 */
const statusForError = (err) => {
       if (err instanceof ResolutionError) { return 404; }  // módulo no encontrado / JSON inválido
  else if (err instanceof ValidationError) { return 400; }  // módulo mal formado
  else if (err instanceof AdapterError)    { return 400; }  // sintaxis no soportada
  else if (err instanceof EvaluationError) { return 422; }  // fallo semántico en runtime
  else if (err instanceof ProjectionError) { return 500; }  // cajón de sastre del dominio
  else                                     { return 500; }  // Cualquier otro error detectado.
};

// ---------------------------------------------------------------------

/**
 * @description
 * Crea el middleware de proyección.
 * @param {object} [opts]
 * @param {string} [opts.baseDir=PROJECTIONS_DIR] - Directorio de módulos.
 * @param {string} [opts.paramName="projection"]  - Nombre del route param.
 * @param {AdapterRegistry} [opts.registry] -
 *   Registro de adaptadores. Si este parámetro se omite, por defecto se crea uno sólo con el nativo.
 * @returns {Promise<express.RequestHandler>}
 */
export async function JM2MP_CreateMiddleware(opts = {}) {
  const baseDir   = opts.baseDir   ?? PROJECTIONS_DIR;
  const paramName = opts.paramName ?? "projection";
  const registry  = opts.registry  ?? await createDefaultRegistry();

  // El loader se crea UNA sola vez y se reutiliza en cada petición.
  // Los ficheros se releen del disco en cada llamada — el resolver interno
  // de la librería ya cachea dentro de una misma evaluación.
  const loader = await createFileLoader({
    baseDir,
    encoding: "utf8",
  });

  return asyncHandler(async (req, res) => {
    // 1. Determinar qué proyección aplicar.
    const projectionName =
      req.params[paramName] ??
      req.get("X-JM2MP-Projection") ??
      (typeof req.query.projection === "string" ? req.query.projection : null);

    if (!projectionName || typeof projectionName !== "string") {
      const err = new Error(
        "No se ha especificado ninguna proyección (usa el path param, " +
        "la cabecera X-JM2MP-Projection o el query `projection`).",
      );
      err.status = 400;
      throw err;
    }

    // 2. El body ya viene parseado por `express.json()` (montado aguas arriba).
    //    Aceptamos cualquier valor JSON como documento (objeto, array, escalar
    //    o null). Si el cliente no envió body, Express 4 deja `req.body`
    //    como `{}` por defecto, cosa que respetamos.
    const document = req.body;

    // 3. Ejecutar el pipeline resolve → validate → evaluate.
    let result;
    try {
      result = await project({
        rootName: projectionName,
        loader,
        document,
        registry,
      });
    } catch (cause) {
      // Enriquecemos el error con status HTTP para el error-handler.
      cause.status = statusForError(cause);
      throw cause;
    }

    // 4. Devolver el resultado como JSON.
    //    `res.json` serializa cualquier valor JSON válido, incluyendo null,
    //    arrays y escalares — coherente con la definición de "resultado" en
    //    el modelo de proyecciones.
    res.status(200).json(result);
  });
}

// ---------------------------------------------------------------------

/**
 * Error handler compatible con Express 4. Se monta tras el middleware
 * principal para transformar los errores del dominio en respuestas JSON
 * estables. Cuatro parámetros — Express usa la aridad para identificarlo.
 *
 * @type {express.ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
export function projectionErrorHandler(err, req, res, next) {
  const status = err.status ?? statusForError(err);
  res.status(status).json({
    error: err.name ?? "Error",
    message: err.message,
    // La cadena de `cause` se serializa como string para no filtrar objetos
    // internos, pero preserva la traza lógica.
    cause: err.cause ? String(err.cause.message ?? err.cause) : undefined,
  });
}

// ---------------------------------------------------------------------

/**
 * @description
 * Ejemplo de cómo configurar una aplicación en Express v4
 * con el middleware JM2MP sobre una ruta concreta. *
 * @param {object} [opts] -
 * *param {Parameters<typeof JM2MP_CreateMiddleware>[0]} [opts]
 * @returns {express.Express} The sample Express application.
 */
export async function createApp(opts = {}) {
  const app = express();
  app.use(express.json({ limit: "25mb" }));

  const middleware = await JM2MP_CreateMiddleware(opts);
  app.post("/project/:projection", middleware);
  app.post("/project", middleware); // proyección vía header o query

  app.use(projectionErrorHandler);
  return app;
}

// ---------------------------------------------------------------------
// End of file: ${JM2MP.JS}/src/api/JM2MP-Exress-v4-middleware.js */
