/**
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
 *   - Luis María: 15 cred, 16.5 notas, 2 cursos, media 8.25.
 *   - Inés:        6 cred, 11.0 notas, 2 cursos, media 5.5.
 *   - Marta:      15 cred, 18.0 notas, 3 cursos, media 6.0.
 *   - Pedro:      15 cred, 13.5 notas, 2 cursos, media 6.75.
 */

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { evaluate } from "../../evaluator.js";
import { normalizeModule } from "../../modules/normalizer.js";
import { createNativeRegistry } from "../../adapters/helpers.js";

const registry = createNativeRegistry();

describe("Integración: cursos × alumnos", () => {
  const documento = {
    "centro": "Academia Madrid",
    "periodo": "2026-Q1",
    "nota_aprobado": 5.0,
    "cursos": {
      "ALG-101": {
        "titulo": "Álgebra lineal",
        "creditos": 6,
        "inscripciones": [
          { "alumno": "Luis María", "nota": 7.5 },
          { "alumno": "Inés",       "nota": 4.0 },
          { "alumno": "Marta",      "nota": 8.5 },
          { "alumno": "Pedro",      "nota": null }
        ]
      },
      "PROG-201": {
        "titulo": "Programación funcional",
        "creditos": 9,
        "inscripciones": [
          { "alumno": "Luis María", "nota": 9.0 },
          { "alumno": "Marta",      "nota": 6.5 },
          { "alumno": "Pedro",      "nota": 5.5 }
        ]
      },
      "BD-301": {
        "titulo": "Bases de datos",
        "creditos": 6,
        "inscripciones": [
          { "alumno": "Inés",  "nota": 7.0 },
          { "alumno": "Marta", "nota": 3.0 },
          { "alumno": "Pedro", "nota": 8.0 }
        ]
      }
    }
  };

  it("agrega cursos por alumno con créditos, suma_notas, cursos_terminados y nota_media", async () => {
    // Plantilla raíz: foldObj sobre cursos, dentro $let para capturar créditos,
    // dentro fold sobre inscripciones que actualiza el acumulador por alumno.
    // Tras todos los cursos, segundo foldObj para añadir nota_media a cada alumno.

    const mod = normalizeModule({
      "@": {
        "centro":  { "$op": "get", "$path": "$.centro" },
        "periodo": { "$op": "get", "$path": "$.periodo" },

        "alumnos": {
          // Pasada 2: añadir nota_media a cada alumno del resultado de pasada 1.
          "$op": "foldObj",
          "$over": {
            // Pasada 1: agrega cursos × inscripciones por alumno.
            "$op": "foldObj",
            "$over": { "$op": "get", "$path": "$.cursos" },
            "$init": {},
            "$step": {
              // Capturamos los créditos del curso actual.
              "$op": "let",
              "$bindings": {
                "creditos": { "$op": "get", "$path": "@.value.creditos" }
              },
              "$in": {
                // Recorremos las inscripciones del curso actual.
                "$op": "fold",
                "$over": { "$op": "get", "$path": "@.value.inscripciones" },
                "$init": { "$op": "get", "$path": "@.acc" },
                "$step": {
                  // Si la nota es null, esta inscripción no cuenta.
                  "$op": "if",
                  "$cond": {
                    "$op": "eq",
                    "$left":  { "$op": "get", "$path": "@.item.nota" },
                    "$right": null
                  },
                  "$then": { "$op": "get", "$path": "@.acc" },
                  "$else": {
                    // Capturamos el alumno, la nota y el acc.
                    "$op": "let",
                    "$bindings": {
                      "alumno": { "$op": "get", "$path": "@.item.alumno" },
                      "nota":   { "$op": "get", "$path": "@.item.nota" },
                      "accI":   { "$op": "get", "$path": "@.acc" }
                    },
                    "$in": {
                      // Lookup O(1) sobre el acumulador por nombre de alumno.
                      "$op": "let",
                      "$bindings": {
                        "previo": {
                          "$op": "lookup",
                          "$key": { "$op": "get", "$path": "%alumno" },
                          "$in":  { "$op": "get", "$path": "%accI" }
                        }
                      },
                      "$in": {
                        "$op": "insert",
                        "$key": { "$op": "get", "$path": "%alumno" },
                        "$value": {
                          "creditos_aprobados": {
                            "$op": "add",
                            "$left": {
                              "$op": "coalesce",
                              "$value": {
                                "$op": "lookup",
                                "$key": "creditos_aprobados",
                                "$in":  { "$op": "get", "$path": "%previo" }
                              },
                              "$default": 0
                            },
                            "$right": {
                              "$op": "if",
                              "$cond": {
                                "$op": "gte",
                                "$left":  { "$op": "get", "$path": "%nota" },
                                "$right": { "$op": "get", "$path": "$.nota_aprobado" }
                              },
                              "$then": { "$op": "get", "$path": "%creditos" },
                              "$else": 0
                            }
                          },
                          "suma_notas": {
                            "$op": "add",
                            "$left": {
                              "$op": "coalesce",
                              "$value": {
                                "$op": "lookup",
                                "$key": "suma_notas",
                                "$in":  { "$op": "get", "$path": "%previo" }
                              },
                              "$default": 0
                            },
                            "$right": { "$op": "get", "$path": "%nota" }
                          },
                          "cursos_terminados": {
                            "$op": "add",
                            "$left": {
                              "$op": "coalesce",
                              "$value": {
                                "$op": "lookup",
                                "$key": "cursos_terminados",
                                "$in":  { "$op": "get", "$path": "%previo" }
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
              "creditos_aprobados": { "$op": "get", "$path": "@.value.creditos_aprobados" },
              "suma_notas":         { "$op": "get", "$path": "@.value.suma_notas" },
              "cursos_terminados":  { "$op": "get", "$path": "@.value.cursos_terminados" },
              "nota_media": {
                "$op": "div",
                "$left":  { "$op": "get", "$path": "@.value.suma_notas" },
                "$right": { "$op": "get", "$path": "@.value.cursos_terminados" }
              }
            },
            "$into": { "$op": "get", "$path": "@.acc" }
          }
        }
      }
    });

    const result = await evaluate(mod, documento, { registry });

    assert.equal(result.centro, "Academia Madrid");
    assert.equal(result.periodo, "2026-Q1");

    assert.deepEqual(Object.keys(result.alumnos).sort(), [
      "Inés", "Luis María", "Marta", "Pedro"
    ]);

    // Luis María.
    assert.equal(result.alumnos["Luis María"].creditos_aprobados, 15);
    assert.equal(result.alumnos["Luis María"].suma_notas, 16.5);
    assert.equal(result.alumnos["Luis María"].cursos_terminados, 2);
    assert.equal(result.alumnos["Luis María"].nota_media, 8.25);

    // Inés.
    assert.equal(result.alumnos["Inés"].creditos_aprobados, 6);
    assert.equal(result.alumnos["Inés"].suma_notas, 11.0);
    assert.equal(result.alumnos["Inés"].cursos_terminados, 2);
    assert.equal(result.alumnos["Inés"].nota_media, 5.5);

    // Marta (BD-301 no aprobado, no suma créditos pero sí cuenta como terminado).
    assert.equal(result.alumnos["Marta"].creditos_aprobados, 15);
    assert.equal(result.alumnos["Marta"].suma_notas, 18.0);
    assert.equal(result.alumnos["Marta"].cursos_terminados, 3);
    assert.equal(result.alumnos["Marta"].nota_media, 6.0);

    // Pedro (ALG-101 sin nota, excluido).
    assert.equal(result.alumnos["Pedro"].creditos_aprobados, 15);
    assert.equal(result.alumnos["Pedro"].suma_notas, 13.5);
    assert.equal(result.alumnos["Pedro"].cursos_terminados, 2);
    assert.equal(result.alumnos["Pedro"].nota_media, 6.75);
  });
});
