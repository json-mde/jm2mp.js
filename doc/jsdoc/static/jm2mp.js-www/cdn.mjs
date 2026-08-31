/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file ${JM2MP.JS}/doc/jsdoc/static/jm2mp.js-www/cdn.mjs
**/

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

// It imports the JM2MP.JS library; both options: packed and minifyed
// or from the single root-of-package file.
import * as JM2MP from 'https://cdn.jsdelivr.net/npm/@json-mde/jm2mp@1.0.0/+esm';
//// import * as JM2MP from 'https://cdn.jsdelivr.net/npm/@json-mde/jm2mp@1.0.0/src/index.js'
//// import * as JM2MP from ''


/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

// It defines the source document.
export const source = {
  "Author": { "Name":"Luis", "Institution":"U.N.E.D." }
};

/* ------------------------------------------------------------------ */

// It defines the projection document.
export const projection = {
  "$" : {
    "People" : [
      {
        "Name" : { "$op": "get", "$path": "$.Author.Name" },
        "University" : { "$op": "get", "$path": "@.Author.Institution" }
      }
    ]
  }
}

/* ------------------------------------------------------------------ */

// It defines how to project.
export async function ProjectItAll()
{
  const string_loader = await JM2MP.createStringLoader(
    { "$" : JSON.stringify(projection) }
  );
  const resultant = await JM2MP.project({
                                          rootName: "$",
                                          loader: string_loader,
                                          document: source,
                                          registry: undefined,
                                          options: {}
                                       });
  return resultant;
}

/* ------------------------------------------------------------------ */

// Unobtrusive JavaScript for onLoad page's event.
window.addEventListener('DOMContentLoaded', async function()
{
  // Source
  try {
    const source_content = JSON.stringify(source,undefined,'    ');
    const source_placeholder = document.getElementById("source_placeholder");
    if (source_placeholder){ source_placeholder.innerText = source_content; }
  }
  catch (error) {
    console.log("ERROR @ Source -->",error);
    alert("Error at source! Please inspect the console.");
  }
  // Projection
  try {
    const projection_content = JSON.stringify(projection,undefined,'    ');
    const projection_placeholder = document.getElementById("projection_placeholder");
    if (source_placeholder){ projection_placeholder.innerText = projection_content; }
  }
  catch (error) {
    console.log("ERROR @ Projection -->",error);
    alert("Error at projection! Please inspect the console.");
  }
  // Resultant
  try {
    const resultant = await ProjectItAll();
    const resultant_content = JSON.stringify(resultant,undefined,'    ');
    const resultant_placeholder = document.getElementById("resultant_placeholder");
    if (resultant_placeholder){ resultant_placeholder.innerText = resultant_content; }
  }
  catch (error) {
    console.log("ERROR @ Resultant -->",error);
    alert("Error at resultant ! Please inspect the console.");
  }
});


/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* End of file: ${JM2MP.JS}/doc/jsdoc/static/jm2mp.js-www/cdn.mjs */