/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file
 * The module [courses_students]{@link module:jm2mp/test/integration/courses_students}
 * implements several **integration test** for `courses & students`
 * _use cases_.
**/

/**
 * @module jm2mp/test/integration/courses_students
 * @description
 * This module implements several **integration test** for
 * `courses & students` _use cases_.
 *
 * It exercises when information is scattered across courses & enrollments
 * and then reorganized by student, calculating earned credits, final
 * grades, completed courses, and average marks.
 *
 * It demonstrates:
 * - nested `foldObj` (courses) inside `foldArr` (enrollments).
 * - Use `let` to capture external context (credits for the current course).
 * - Complexity O(1) using `lookup` on the accumulator by student name.
 * - Makes two passes: first for accumulation and second for derived calculation (average_grade).
 *
 * Expected results:
 *   - Luis María:    15 credits, 16.5 grades, 2 courses, average marks 8.25.
 *   - Inés:           6 credits, 11.0 grades, 2 courses, average marks 5.50.
 *   - Elena:         15 credits, 18.0 grades, 3 courses, average marks 6.00.
 *   - José Antonio:  15 credits, 13.5 grades, 2 courses, average marks 6.75.
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { evaluate } from "../../evaluator.js";
import { normalizeModule } from "../../modules/normalizer.js";
import { createNativeRegistry } from "../../adapters/helpers.js";
import { moduleOf } from "../../modules/helpers.js";

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/**
 * @constant {@link module:jm2mp/adapters/registry.AdapterRegistry}
 * @description
 * The [AdapterRegistry]{@link module:jm2mp/adapters/registry.AdapterRegistry}
 * created as _singleton_ an used in every integration test.
**/
const registry = createNativeRegistry();

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

describe("Integration test: courses per student", () => {

/* ------------------------------------------------------------------ */

  /**
   * @constant {object}
   * @description
   * The object used as _source document_ in every integration test.
  **/
  const source_document = {
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

/* ------------------------------------------------------------------ */

  it("agrega cursos por alumno con créditos, suma_notas, cursos_terminados y nota_media", async () => {
    // Plantilla raíz: foldObj sobre cursos, dentro $let para capturar créditos,
    // dentro fold sobre inscripciones que actualiza el acumulador por alumno.
    // Tras todos los cursos, segundo foldObj para añadir nota_media a cada alumno.

    const projection_module = normalizeModule(moduleOf({
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

    // Actual projection's resultant document.
    const resultant_document = await evaluate(projection_module, source_document, { registry });
    // Manually calculated projection's result.
    const all_enrollments =
      Object.entries(source_document.courses)
            .map( ([course_name,course_info]) => (
                    course_info.enrollments
                               .map( (enrollment)=>({
                                       course:course_name,
                                       title:course_info.title,
                                       credits:course_info.credits,
                                       student:enrollment.student,
                                       grade:enrollment.grade
                                     }) )
                  )
            )
            .flat();
    const expected_resultant_document = {
      university: source_document.university,
      period: source_document.period,
      students: {},
    };
    all_enrollments.forEach( (enrollment) => {
      if (!Object.hasOwn(expected_resultant_document.students, enrollment.student)) {
        expected_resultant_document.students[enrollment.student] = {
          /** @type {number} */ passing_credits: 0,
          /** @type {number} */ sum_of_grades: 0,
          /** @type {number} */ enrolled_courses: 0,
          /** @type {number} */ average_grade: 0
        };
      }
      if ( enrollment.grade >= source_document.passing_grade) {
        expected_resultant_document.students[enrollment.student].passing_credits += enrollment.credits;
      }
      if ( enrollment.grade ) {
        expected_resultant_document.students[enrollment.student].sum_of_grades += enrollment.grade;
        expected_resultant_document.students[enrollment.student].enrolled_courses += 1;
      }
    });
    Object.keys(expected_resultant_document.students).forEach( (student) => {
      const current_student = expected_resultant_document.students[student];
      if ( current_student.enrolled_courses > 0 ) {
        current_student.average_grade = ( current_student.sum_of_grades / current_student.enrolled_courses ) ;
      }
    });
    //// console.log('resultant_document',resultant_document);
    //// console.log('all_enrollments',all_enrollments);
    //// console.log('expected_resultant_document',expected_resultant_document);
    assert.deepStrictEqual(resultant_document,expected_resultant_document);

    assert.equal(resultant_document.university, "Universidad Nacional de Educación a Distancia (U.N.E.D.)");
    assert.equal(resultant_document.period, "2026-Q1");

    assert.deepEqual(
      Object.keys(resultant_document.students).sort(),
      [ "Luis María", "Inés", "Elena", "José Antonio" ].sort()
    );

    // Luis María.
    assert.equal(resultant_document.students["Luis María"].passing_credits, 10);
    assert.equal(resultant_document.students["Luis María"].sum_of_grades, 16.5);
    assert.equal(resultant_document.students["Luis María"].enrolled_courses, 2);
    assert.equal(resultant_document.students["Luis María"].average_grade, 8.25);

    // Inés.
    assert.equal(resultant_document.students["Inés"].passing_credits, 9);
    assert.equal(resultant_document.students["Inés"].sum_of_grades, 11.0);
    assert.equal(resultant_document.students["Inés"].enrolled_courses, 2);
    assert.equal(resultant_document.students["Inés"].average_grade, 5.5);

    // Elena (BD-301 not passed, so it not adds credits but it counts as enrolled).
    assert.equal(resultant_document.students["Elena"].passing_credits, 10);
    assert.equal(resultant_document.students["Elena"].sum_of_grades, 18.0);
    assert.equal(resultant_document.students["Elena"].enrolled_courses, 3);
    assert.equal(resultant_document.students["Elena"].average_grade, 6.0);

    // José Antonio (ALG-101 do not have grades, so it is excluded).
    assert.equal(resultant_document.students["José Antonio"].passing_credits, 15);
    assert.equal(resultant_document.students["José Antonio"].sum_of_grades, 13.5);
    assert.equal(resultant_document.students["José Antonio"].enrolled_courses, 2);
    assert.equal(resultant_document.students["José Antonio"].average_grade, 6.75);
  });
});

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/src/test/integration/courses-students.test.js */
