#!/usr/bin/env node

/**
 * @author Luis Maria CAMARA ROSSI
 * @copyright Universidad Nacional de Educación a Distancia (U.N.E.D.) 2026
 * @license BSD-3-Clause
 * @module cli
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
