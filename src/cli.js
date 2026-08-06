#!/usr/bin/env node

/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @file An actual _command-line-interface (CLI)_ to project JSON files using JM2MP.
 * This module **./cli.js** is actually a _command-line-interface (CLI)_
 * script created to ease execution of **JM2MP.JS** projections as part of
 * any _shell script_ on-line interaction or batch processing.
 * 
 * @example
 * #!/usr/bin/env node
 * # The argument -i or --input must be used to specify the JSON file which will be transformed.
 * # The argument -p or --projection must be used to specify the JM2MP file used to transform the input into output.
 * # The argument -o or --output must be used to specify the filename where save the resultant JSON document.
 * node ${JM2MP_HOME}/cli.js -i ./input.json -i -p ./projection.json -o ./output.json
**/

/**
 * @module jm2mp/cli
 * @description
 * An actual _command-line-interface (CLI)_ to project JSON files using JM2MP.
**/

'use strict';

import { project } from "./index.js" ;

const rootName = null;
const loader = null;
const document = null;
const registry = null;
const options = {};
const result = await project({rootName, loader, document, registry, options}) ;
console.log(result);

// EoF
