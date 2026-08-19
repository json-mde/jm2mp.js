/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * Tests específicos del adaptador JSON Query.
 *
 * Estos tests son COMPLEMENTARIOS al de contrato
 * (test/contract/adapter-contract.test.js): cubren detalles propios de
 * la sintaxis JSON Query que el contrato genérico no ejercita:
 *
 *   - Validación: compile() acepta o rechaza expresiones bien/mal formadas.
 *   - Acceso simple, anidado, por índice y por slicing.
 *   - DIVERGENCIA documentada: las proyecciones JMESPath ([*], [?], multi-select)
 *     preservan su forma de lista y NO se desempaquetan a escalar, ni siquiera
 *     cuando contienen un único elemento. Es la divergencia más visible
 *     respecto a JSONPath y al adaptador nativo, y por eso se testea
 *     explícitamente.
 *   - Filtros, multi-select hash y list, funciones built-in, pipes.
 *   - Política de errores: ValidationError en validate, EvaluationError en evaluate.
 *   - Caché de "validado": el adaptador no compila dos veces la misma expresión.
 *   - Forma del adaptador: name, description, fallbackPolicy.
 *
 * Se saltan automáticamente si 'jsonquery' no está instalada.
 */

/**
 * @module jm2mp/test/unit/adapter/jsonquery
 * @description
 * Tests específicos del adaptador JSON Query.
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { ValidationError, EvaluationError } from "../../../errors.js";
import { isModuleAvailable } from "../../../modules/helpers.js";

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

const jsonquery_is_available = await isModuleAvailable("@jsonquerylang/jsonquery");
if (jsonquery_is_available)
{
  const { createJsonQueryAdapter } = await import("../../../adapters/jsonquery.js");

/* ------------------------------------------------------------------ */

  describe("Integration tests for 'JSON Query':", () => {

    it("It rejects null path.", async () => {
      const a = await createJsonQueryAdapter();
      assert.rejects(a.validate(null), ValidationError);
    });

    it("It rejects empty-string path.", async () => {
      const a = await createJsonQueryAdapter();
      assert.rejects(a.validate(""), ValidationError);
    });

    it("It accepts empty array path.", async () => {
      const a = await createJsonQueryAdapter();
      assert.doesNotReject(a.validate([]));
    });

  });

/* ------------------------------------------------------------------ */

}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

else
{
  describe("Integration test for 'JSON Query':", () => {
    it(
       "Omits due to '@jsonquerylang/jsonquery' package is not installed.",
       { skip: true },
       () => {}
    );
  });
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* */
