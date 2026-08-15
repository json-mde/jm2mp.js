## Table of Contents

- [Introduction](#introduction)
- [Other usual document formats](#other-usual-document-formats)
  - [Variants of JSON](#variants-of-json)
    - [JSONC](#jsonc)
    - [JSON5](#json5)
  - [JSON Lines](#json-lines)
  - [YAML](#yaml)
  - [TOML](#toml)
  - [XML](#toml)

## Introduction

As you can read in the [Use Cases](./tutorial-05--use-cases.html) tutorial,
several file formats are commonly used today to manage configurations and
data. In addition to [JSON](https://www.json.org/json-en.html) itself,
these include [XML](https://www.w3.org/XML/), [YAML](https://yaml.org/),
and [TOML](https://toml.io/en/), to name just a few of the most widely
used ones.

## Other usual document formats

This tutorial presents several ideas for using the `JM2MP.JS` library to
perform data transformations also on these formats, albeit indirectly.

The general idea is to convert such formats to JSON, transform it using
`JM2MP` and finally convert back to the original file format:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <msub><mi>source</mi><ms>JM2MP</ms></msub>
    <mo>=</mo>
    <mrow>
      <msub><mi>Load-To-JavaScript</mi><ms>Other-Format</ms></msub>
      <mo>(</mo>
      <msub><mi>input</mi><ms>Other-Format</ms></msub>
      <mo>)</mo>
    </mrow>
  </mrow>
</math>
<br />
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <msub><mi>resultant</mi><ms>JM2MP</ms></msub>
    <mo>=</mo>
    <mrow>
      <msub><mi>Project</mi><ms>JM2MP</ms></msub>
      <mo>(</mo>
      <msub><mi>source</mi><ms>JM2MP</ms></msub>
      <mo>,</mo>
      <msub><mi>projection</mi><ms>JM2MP</ms></msub>
      <mo>)</mo>
    </mrow>
  </mrow>
</math>
<br />
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mrow>
      <msub><mi>output</mi><ms>Other-Format</ms></msub>
    </mrow>
  </mrow>
  <mo>=</mo>
  <mrow>
    <msub><mi>Save-From-JavaScript</mi><ms>Other-Format</ms></msub>
    <mo>(</mo>
    <msub><mi>resultant</mi><ms>JM2MP</ms></msub>
    <mo>)</mo>
  </mrow>
</math>

### Variants of JSON

Debido a que el formato JSON se consideró como un subconjunto de JavaScript
pero dejó fuera del mismo determinadas cuestiones que facilitan bastante
la labor de los usuarios, como son, por un lado, el uso de comentarios y, por otro,
el uso de comas como terminadores en lugar de como separadores (lo que permite escribir una coma al final de un elemento de un array, o al final de la última propiedad de un objeto)
se han creado pequeñas variaciones de JSON para dar cabida a estas cuestiones.

Dos de las más conocidas y extendidas son [JSONC](#jsonc) y [JSON5](#json5), las cuales presentamos a continuación.

#### JSONC

El formato [JSONC](https://jsonc.org/) fue creado por [Microsoft](https://www.microsoft.com/) como parte de su entorno de desarrollo [Visual Studio Code](https://code.visualstudio.com/) con el objetivo inicial de admitir comentarios y hoy en día admite también el uso de la coma como terminador además de como separador.

Because comments and trailing commas are lost, saving _resultan document_
as JSON or as JSONC is irrelevant.


```bash
# How to install JSONC using NPM.
npm install --save jsonc-parser
```

```javascript
import jsonc from 'jsonc-parser' ;
// It reads the JSONC file using Node.JS.
const jsonc_content = fs.readFileSync('./sample-source.jsonc', 'utf8');
// It parses its JSONC content as a real JSON object.
const parse_errors = [] ;
const jsonc_parse_options = {
  disallowComments : false,
  allowTrailingComma: true,
  allowEmptyContent : true,
};
const actual_json = jsonc.parse(jsonc_content, parse_errors, jsonc_parse_options );
if (parse_errors.length === 0)
{
  // You can use actual JSON as source document for JM2MP.JS library.
  //// ...
}
```


Véanse:

- [The JSON5 Data Interchange Format (1.0.0, March 2018)](https://spec.json5.org/)
- [https://github.com/JSONC-org/JSONC](https://github.com/JSONC-org/JSONC)
- [https://www.npmjs.com/package/jsonc-parser](https://www.npmjs.com/package/jsonc-parser)
- [https://github.com/microsoft/node-jsonc-parser](https://github.com/microsoft/node-jsonc-parser)

#### JSON5

and [JSON5](https://json5.org/) ...

```bash
# How to install JSON5 using NPM.
npm install --save json5
```

```javascript
// How to use JSON5 in Node.JS.
import JSON5 from 'json5'
// Import JSON5 file.
const json5_register = require('json5/lib/register') ;
const json5_content_one = require('${FILE_PATH}/file.json5') ;
const json5_content_two = JSON5.parse() ;
const json5_string = JSON5.stringify() ;
```

### JSON Lines

The [JSON Lines](https://jsonlines.org/) ...

```javascript
```

### YAML

...

[js-yaml](https://www.npmjs.com/package/js-yaml)

```javascript
```

### TOML

...

[toml](https://www.npmjs.com/package/toml)

```javascript
```

### XML

For [XML](https://www.w3.org/XML/), please... use [XSLT](https://www.w3.org/TR/xslt/)! &#x1F600;

Packages like [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser)
and [fast-xml-builder](https://www.npmjs.com/package/fast-xml-builder)
from [NaturalIntelligence](https://github.com/NaturalIntelligence) can
help you loading and saving XML data. See
[Round-tripping XML → JSON → XML (XML declaration)](https://github.com/NaturalIntelligence/fast-xml-builder/blob/main/docs/Builder_v1.md#round-tripping-xml--json--xml-xml-declaration)
for more information.

However, the data structures of XML and JSON are not exactly the same,
so first it is necessary to make certain design decisions. There are
many online tools that can help you make these decisions; for
instance: [https://jsonlint.com/xml-to-json](https://jsonlint.com/xml-to-json).

