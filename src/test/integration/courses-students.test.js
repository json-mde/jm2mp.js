/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file Test de integración: ejercicio 3 (cursos × alumnos con $let).
 *
 * Reproduce el ejercicio donde la información dispersa en cursos × inscripciones
 * se reorganiza por alumno, calculando créditos aprobados, suma de notas,
 * cursos terminados y nota media.
 *
 * Ejercita:
 *   - foldObj (cursos) × fold (inscripciones) anidados.
 *   - $let para capturar contexto exterior (créditos del curso actual).
 *   - lookup O(1) sobre el acumulador por nombre de alumno.
 *   - Doble pasada: acumulación + cálculo derivado (nota_media).
 *
 * Resultado esperado:
 *   - Luis María:    15 cred, 16.5 notas, 2 cursos, media 8.25.
 *   - Inés:           6 cred, 11.0 notas, 2 cursos, media 5.50.
 *   - Elena:         15 cred, 18.0 notas, 3 cursos, media 6.00.
 *   - José Antonio:  15 cred, 13.5 notas, 2 cursos, media 6.75.
 */

/**
 * @module jm2mp/test/integration/cursos_alumnos
 * @description
 * Test de integración: ejercicio 3 (cursos × alumnos con $let).
**/

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { evaluate } from "../../evaluator.js";
import { normalizeModule } from "../../modules/normalizer.js";
import { createNativeRegistry } from "../../adapters/helpers.js";
import { moduleOf } from "../../modules/helpers.js";

const registry = createNativeRegistry();

describe("Integration test: courses per student", () => {
  const documento = {
    "university": "Universidad Nacional de Educación a Distancia (U.N.E.D.)",
    "period": "2026-Q1",
    "passing_grade": 5.0,
    "courses": {
      "ALG-101": {
        "title": "Linear Algebra",
        "credits": 4,
        "enrollments": [
          { "student": "Luis María",   "grade": 7.5 },
          { "student": "Inés",         "grade": 4.0 },
          { "student": "Elena",        "grade": 8.5 },
          { "student": "José Antonio", "grade": null }
        ]
      },
      "PROG-201": {
        "title": "Functional Programming",
        "credits": 6,
        "enrollments": [
          { "student": "Luis María",   "grade": 9.0 },
          { "student": "Elena",        "grade": 6.5 },
          { "student": "José Antonio", "grade": 5.5 }
        ]
      },
      "BD-301": {
        "title": "Databases",
        "credits": 9,
        "enrollments": [
          { "student": "Inés",         "grade": 7.0 },
          { "student": "Elena",        "grade": 3.0 },
          { "student": "José Antonio", "grade": 8.0 }
        ]
      }
    }
  };

  it("agrega cursos por alumno con créditos, suma_notas, cursos_terminados y nota_media", async () => {
    // Plantilla raíz: foldObj sobre cursos, dentro $let para capturar créditos,
    // dentro fold sobre inscripciones que actualiza el acumulador por alumno.
    // Tras todos los cursos, segundo foldObj para añadir nota_media a cada alumno.

    const mod = normalizeModule(moduleOf({
      "university":  { "$op": "get", "$path": "$.university" },
      "period": { "$op": "get", "$path": "$.period" },
      "students": {
          // Pasada 2: añadir nota_media a cada alumno del resultado de pasada 1.
          "$op": "foldObj",
          "$over": {
            // Pasada 1: agrega cursos × inscripciones por alumno.
            "$op": "foldObj",
            "$over": { "$op": "get", "$path": "$.courses" },
            "$init": {},
            "$step": {
              // Capturamos los créditos del curso actual.
              "$op": "let",
              "$bindings": {
                "credits": { "$op": "get", "$path": "@.value.credits" }
              },
              "$in": {
                // Recorremos las inscripciones del curso actual.
                "$op": "foldArr",
                "$over": { "$op": "get", "$path": "@.value.enrollments" },
                "$init": { "$op": "get", "$path": "@.acc" },
                "$step": {
                  // Si la nota es null, esta inscripción no cuenta.
                  "$op": "if",
                  "$cond": {
                    "$op": "eq",
                    "$left":  { "$op": "get", "$path": "@.item.grade" },
                    "$right": null
                  },
                  "$then": { "$op": "get", "$path": "@.acc" },
                  "$else": {
                    // Capturamos el alumno, la nota y el acc.
                    "$op": "let",
                    "$bindings": {
                      "student": { "$op": "get", "$path": "@.item.student" },
                      "grade":   { "$op": "get", "$path": "@.item.grade" },
                      "accI":   { "$op": "get", "$path": "@.acc" }
                    },
                    "$in": {
                      // Lookup O(1) sobre el acumulador por nombre de alumno.
                      "$op": "let",
                      "$bindings": {
                        "previous_step": {
                          "$op": "lookup",
                          "$key": { "$op": "get", "$path": "%student" },
                          "$in":  { "$op": "get", "$path": "%accI" }
                        }
                      },
                      "$in": {
                        "$op": "insert",
                        "$key": { "$op": "get", "$path": "%student" },
                        "$value": {
                          "passing_credits": {
                            "$op": "add",
                            "$left": {
                              "$op": "coalesce",
                              "$value": {
                                "$op": "lookup",
                                "$key": "passing_credits",
                                "$in":  { "$op": "get", "$path": "%previous_step" }
                              },
                              "$default": 0
                            },
                            "$right": {
                              "$op": "if",
                              "$cond": {
                                "$op": "gte",
                                "$left":  { "$op": "get", "$path": "%grade" },
                                "$right": { "$op": "get", "$path": "$.passing_grade" }
                              },
                              "$then": { "$op": "get", "$path": "%credits" },
                              "$else": 0
                            }
                          },
                          "sum_of_grades": {
                            "$op": "add",
                            "$left": {
                              "$op": "coalesce",
                              "$value": {
                                "$op": "lookup",
                                "$key": "sum_of_grades",
                                "$in":  { "$op": "get", "$path": "%previous_step" }
                              },
                              "$default": 0
                            },
                            "$right": { "$op": "get", "$path": "%grade" }
                          },
                          "enrolled_courses": {
                            "$op": "add",
                            "$left": {
                              "$op": "coalesce",
                              "$value": {
                                "$op": "lookup",
                                "$key": "enrolled_courses",
                                "$in":  { "$op": "get", "$path": "%previous_step" }
                              },
                              "$default": 0
                            },
                            "$right": 1
                          }
                        },
                        "$into": { "$op": "get", "$path": "%accI" }
                      }
                    }
                  }
                }
              }
            }
          },
          "$init": {},
          "$step": {
            // Para cada alumno del resultado de pasada 1, añadimos nota_media.
            "$op": "insert",
            "$key": { "$op": "get", "$path": "@.key" },
            "$value": {
              "passing_credits": { "$op": "get", "$path": "@.value.passing_credits" },
              "sum_of_grades": { "$op": "get", "$path": "@.value.sum_of_grades" },
              "enrolled_courses": { "$op": "get", "$path": "@.value.enrolled_courses" },
              "average_grade": {
                "$op": "div",
                "$left":  { "$op": "get", "$path": "@.value.sum_of_grades" },
                "$right": { "$op": "get", "$path": "@.value.enrolled_courses" }
              }
            },
            "$into": { "$op": "get", "$path": "@.acc" }
          }
        }
      }));

    const result = await evaluate(mod, documento, { registry });

    assert.equal(result.university, "Universidad Nacional de Educación a Distancia (U.N.E.D.)");
    assert.equal(result.period, "2026-Q1");

    assert.deepEqual(Object.keys(result.students).sort(), [
      "Elena", "Inés", "José Antonio", "Luis María"
    ]);

    // Luis María.
    assert.equal(result.students["Luis María"].passing_credits, 10);
    assert.equal(result.students["Luis María"].sum_of_grades, 16.5);
    assert.equal(result.students["Luis María"].enrolled_courses, 2);
    assert.equal(result.students["Luis María"].average_grade, 8.25);

    // Inés.
    assert.equal(result.students["Inés"].passing_credits, 9);
    assert.equal(result.students["Inés"].sum_of_grades, 11.0);
    assert.equal(result.students["Inés"].enrolled_courses, 2);
    assert.equal(result.students["Inés"].average_grade, 5.5);

    // Elena (BD-301 no aprobado, no suma créditos pero sí cuenta como terminado).
    assert.equal(result.students["Elena"].passing_credits, 10);
    assert.equal(result.students["Elena"].sum_of_grades, 18.0);
    assert.equal(result.students["Elena"].enrolled_courses, 3);
    assert.equal(result.students["Elena"].average_grade, 6.0);

    // José Antonio (ALG-101 sin nota, excluido).
    assert.equal(result.students["José Antonio"].passing_credits, 15);
    assert.equal(result.students["José Antonio"].sum_of_grades, 13.5);
    assert.equal(result.students["José Antonio"].enrolled_courses, 2);
    assert.equal(result.students["José Antonio"].average_grade, 6.75);
  });
});
