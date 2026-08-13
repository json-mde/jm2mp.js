/**
 * @file JM2MP-Express-v5-Middleware.js
 *
 * Middleware de Express.js v5 que expone el sistema de proyecciones JSON
 * (del chat "Álgebra lineal y programación en JSON") como servicio HTTP.
 *
 * CONTRATO HTTP
 * -------------
 * Idéntico al de la variante v4: el cliente envía un JSON (el documento
 * origen) por el body, y el nombre de la proyección viene por parámetro de
 * ruta `:projection`, cabecera `X-Projection` o query `?projection=...`.
 * La respuesta es el resultado JSON de aplicar la proyección al documento.
 *
 * CARGA DE MÓDULOS
 * ----------------
 * Directorio constante en disco, resuelto vía `createFileLoader({ baseDir })`.
 * El path se congela al importar el módulo (o se toma de la variable de
 * entorno PROJECTIONS_DIR) y no cambia durante la vida del proceso.
 *
 * QUÉ CAMBIA RESPECTO A LA VERSIÓN v4
 * -----------------------------------
 * 1. **Handlers async nativos**: Express 5 propaga automáticamente los
 *    rechazos de promesas devueltas por middlewares/handlers `async` al
 *    pipeline de error. Desaparece el helper `asyncHandler` y el
 *    `try/catch` alrededor de `project()`: basta con `throw` (o dejar
 *    que la promesa rechace) y Express lo enruta al error-handler.
 *
 * 2. **Firma del error-handler**: sigue siendo `(err, req, res, next)`
 *    con cuatro parámetros — Express 5 mantiene esa convención basada en
 *    aridad para distinguirlo del middleware normal.
 *
 * 3. **Rutas**: el path matcher de Express 5 es más estricto (path-to-regexp
 *    v8). Los patrones simples con `:param` siguen funcionando igual.
 *
 * 4. **Body parser**: `express.json()` sigue siendo necesario; no viene
 *    incluido por defecto.
**/

/**
 * @module jm2mp/api/express/v5/middleware
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
 * @description
 * Constante: directorio donde viven los ficheros de proyección.
 * Resuelto una sola vez al cargar el módulo. Se puede sobreescribir por
 * variable de entorno para despliegues, pero permanece constante durante la
 * vida del proceso.
 * @constant {string}
**/
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------

/**
 * @description
 * Ruta absoluta al directorio de proyecciones.
 * @constant {string}
**/
export const PROJECTIONS_DIR = path.resolve(
  process.env.PROJECTIONS_DIR ?? path.join(__dirname, "projections"),
);

// ---------------------------------------------------------------------

/**
 * @description
 * Mapeo de errores del dominio de proyecciones a códigos HTTP.
 * @param {*} err -
 * @returns {integer} -
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
 * @param {object} [opts] - Options.
 * @param {string} [opts.baseDir=PROJECTIONS_DIR] - Directorio de módulos.
 * @param {string} [opts.paramName="projection"]  - Nombre del route param.
 * @param {AdapterRegistry} [opts.registry] -
 * Registro de adaptadores. Si este parámetro se omite, por defecto se crea uno sólo con el nativo.
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

  // Handler async plano: Express 5 se encarga del error routing.
  return async function projectionHandler(req, res) {
    // 1. Selección de la proyección.
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
      throw err; // Express 5 lo captura del async y lo enruta.
    }

    // 2. Documento origen: cualquier valor JSON válido enviado en el body.
    const document = req.body;

    // 3. Ejecutar el pipeline resolve → validate → evaluate.
    //    No hace falta try/catch: Express 5 propaga el rechazo al
    //    error-handler. Sólo anotamos el status HTTP al vuelo mediante
    //    un handler específico más abajo — o lo dejamos que caiga en el
    //    default 500 si el error no es del dominio.
    const result = await project({
      rootName: projectionName,
      loader,
      document,
      registry,
    });

    // 4. Devolver el resultado como JSON.
    //    `res.json` serializa cualquier valor JSON válido, incluyendo null,
    //    arrays y escalares — coherente con la definición de "resultado" en
    //    el modelo de proyecciones.
    res.status(200).json(result);
  };
}

// ---------------------------------------------------------------------

/**
 * @description
 * Error handler compatible con Express 5. Convierte los errores del dominio
 * (jerarquía `ProjectionError`) en respuestas JSON estables y con el código
 * de estado apropiado.
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
 * Ejemplo de cómo configurar una aplicación en Express v5
 * con el middleware JM2MP sobre una ruta concreta.
 * @param {object} [opts] -
 * *param {Parameters<typeof JM2MP_CreateMiddleware>[0]} [opts]
 * @returns {Promise<express.Express>} The sample Express application.
**/
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
// ---------------------------------------------------------------------
// End of file: ${JM2MP.JS}/src/api/JM2MP-ExpressJS-v5-middleware.js
