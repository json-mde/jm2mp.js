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
`JM2MP` and finally convert back to the original file format.

And it's not just a matter of considering the _source_ and _resultant_
documents; the _projection documents_ themselves could be stored in
formats other than pure JSON (such as [JSONC](#jsonc) or [JSON5](#json5)).
It's worth noting, however, that currently the
[modularization mechanism](./tutorial-02--jm2mp-syntax.html#modularization)
of `JM2MP.JS` only supports `JM2MP` as pure JSON.

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <msub><mi>source</mi><ms>JM2MP</ms></msub>
    <mo>=</mo>
    <mrow>
      <msub><mi>Retrieve-As-JSON</mi><ms>Other-Format</ms></msub>
      <mo>(</mo>
      <msub><mi>input</mi><ms>Other-Format</ms></msub>
      <mo>)</mo>
    </mrow>
  </mrow>
</math>
<br />
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <msub><mi>projection</mi><ms>JM2MP</ms></msub>
    <mo>=</mo>
    <mrow>
      <msub><mi>Retrieve-As-JSON</mi><ms>Other-Format</ms></msub>
      <mo>(</mo>
      <msub><mi>projection</mi><ms>Other-Format</ms></msub>
      <mo>)</mo>
    </mrow>
  </mrow>
  <mrow>
    <mspace width="1em" />
    <ms style="color:Orange; background:WhiteSmoke;">Optional!</ms>
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
    <msub><mi>Store-From-JSON</mi><ms>Other-Format</ms></msub>
    <mo>(</mo>
    <msub><mi>resultant</mi><ms>JM2MP</ms></msub>
    <mo>)</mo>
  </mrow>
</math>


### Variants of JSON

Because the JSON format was conceived as a subset of JavaScript but
omitted certain features that greatly simplify users' work, such as,
on the one hand, the use of comments and, on the other, the use of
commas as terminators rather than separators (which allows a comma to be
written at the end of an array element or at the end of an object's last
property), minor variations of JSON have been created to accommodate
these features.

Two of the best-known and most widely used are
[JSONC](#jsonc) and [JSON5](#json5), which we present below. But other
variants exists, like [Amazon Ion](https://amazon-ion.github.io/ion-docs/)
or [MongoDB BSON](https://bsonspec.org/) with also offer binary
serialization.


#### JSONC

The [JSONC](https://jsonc.org/) format was created by
[Microsoft](https://www.microsoft.com/) as part of its
[Visual Studio Code](https://code.visualstudio.com/) integrated
development environment (IDE), initially with the goal of just
supporting comments; nowadays it also supports the use of the trailing
commas (both as terminators and separators).

Since comments and trailing commas are lost during data retrieval and
projection, saving the _resultant document_ as JSON or JSONC should make
no difference.

```bash
# How to install JSONC using NPM.
npm install --save jsonc-parser
```

```javascript
import * as fs from 'node:fs';
import jsonc from 'jsonc-parser';

// It reads the JSONC file using Node.JS.
const jsonc_content = fs.readFileSync('./sample-source.jsonc', 'utf8');
// It parses its JSONC content as a real JSON object.
const jsonc_parse_errors = [] ;
const jsonc_parse_options = {
  disallowComments : false,
  allowTrailingComma: true,
  allowEmptyContent : true,
};
const actual_json = jsonc.parse(
                                jsonc_content,
                                jsonc_parse_errors,
                                jsonc_parse_options);
if (jsonc_parse_errors.length === 0)
{
  // You can now use 'actual_json' as source document
  // for JM2MP.JS library...
}
```

More information about this format can be found in the following references:

- [https://github.com/JSONC-org/JSONC](https://github.com/JSONC-org/JSONC)
- [https://www.npmjs.com/package/jsonc-parser](https://www.npmjs.com/package/jsonc-parser)
- [https://github.com/microsoft/node-jsonc-parser](https://github.com/microsoft/node-jsonc-parser)


#### JSON5

Like [JSONC](#jsonc), the extended [JSON5](https://json5.org/) format
expands the original [JSON](https://www.json.org/json-en.html) syntax to
include some features of [ECMAScript 5.1 (ES5)](https://262.ecma-international.org/5.1/),
notably: the use of comments and trailing commas, the ability to use
both double and single quotes for text strings, the use of multi-line
strings by escaping their line breaks, and the ability to write numeric
values in a wide variety of formats.

```bash
# How to install JSON5 using NPM.
npm install --save json5
```

```javascript
// How to use JSON5 in Node.JS.
import * as JSON5 from 'json5';
// How to import JSON5 files and content.
const json5_register = require('json5/lib/register');
const json5_content_one = require('${FILE_PATH}/file.json5');
const text_string = "...";
const json5_content_two = JSON5.parse(text_string) ;
// How to export to JSON5 format.
let object_model = {...};
const json5_string = JSON5.stringify(object_model) ;
```

More information about this format can be found in the following references:

- [The JSON5 Data Interchange Format (1.0.0, March 2018)](https://spec.json5.org/)
- [https://www.npmjs.com/package/json5](https://www.npmjs.com/package/json5)
- [https://github.com/json5/json5](https://github.com/json5/json5)


### JSON Lines

The [JSON Lines](https://jsonlines.org/) format uses a few conventions
to store a JSON value on each line of a single file. This way, instead
of having many different files, all the content can be stored together
in a contiguous manner.

To do this, it requires adherence to the following conventions:

- All content must be encoded in UTF-8.
- Each line of the file must consist of a single JSON value representing
  a complete, standalone document.
- The file delimiter is the _line feed character_ (`'\n'`).

The `JM2MP` format and the `JM2MP.JS` library always work with complete
documents. If, for example, you wanted to use the `JSON Lines` format to
store multiple _source documents_, you could simply iterate through each
line, applying the same _projection_ to all of them, and saving the
respective _resultant documents_ in a final `JSON Lines` file that
stores them all together again.

```javascript
import * as fs from 'node:fs';
import * as JM2MP from '@json-mde/jm2mp';
// All (future) resultants from JM2MP projections.
const jsonl_resultant_contents = [] ;
// It reads the JSONL file using Node.JS and iterates for each line.
fs.readFileSync('./sample-sources.jsonl')
  .split('\n')
  .forEach( (actual_source) => {
    // Project each source document independently...
    jsonl_resultant_contents.push(
      JSON.stringify(
        JM2MP.project( { actual_source, same_projection, ... } )
      )
    );
  });
// ...and saves them all in a new JSONL file.
const jsonl_resultant_full_content = jsonl_resultant_contents.join('\n')
fs.writeFileSync('./sample-resultants.jsonl', jsonl_resultant_full_content);
```


### YAML

[YAML Ain't Markup Language (YAML)](https://yaml.org/) is a text-based
data serialization format that originally supported both scalar values
and complex data structures (lists and maps) in a manner similar to JSON
(JSON was initially considered as a subset of YAML); its latest
specification [1.2.2](https://yaml.org/spec/1.2.2/) describes a complex
data format with type inference, information node tagging, multiple
representation formats, and directives capable of configuring the
YAML processor in various ways.

[YAML](https://yaml.org/about/#why-yaml-matters-today) has always been
widely used for configuring systems and applications.

Due to its popularity, there are many
[YAML libraries](https://yaml.org/libraries/) available for dozens of
programming languages. For this exercise, we have selected one that is
compatible with both _JavaScript_ and _Node.JS_ (same language and
runtime environment of `JM2MP2.JS`):
[Eemeli's YAML](https://www.npmjs.com/package/yaml).

```bash
# Installing Eemeli's YAML package from NPM.
npm install yaml
```

```javascript
import * as fs from 'node:fs';
import * as YAML from 'yaml';
import * as JM2MP from '@json-mde/jm2mp';
try
{
  // It loads YAML source document.
  const yaml_source_content = fs.readFileSync('./sample-source.yml')
  const yaml_source_document = YAML.parse(yaml_content, undefined, {});
  // It loads JM2MP projection document.
  const jm2mp_projection_content = fs.readFileSync('./sample-jm2mp-proyection.json')
  const jm2mp_projection_document = JSON.parse(jm2mp_projection_content);
  // It projects and gets the resultant document...
  const json_resultant_document = JM2MP.project({yaml_source_document, jm2mp_projection_document});
  // ...and save it back as YAML.
  const yaml_resultant_content = YAML.stringify(json_resultant_document, undefined, {});
  fs.writeFileSync('./sample-resultant.yml', yaml_resultant_content);
}
catch (err)
{
  console.error(`Error ${err} with cause ${err.cause}.`);
}

```

Below, we present some references about the `YAML` language:

- [https://yaml.org/](https://yaml.org/)
  - [https://yaml.org/spec/1.2.2/](https://yaml.org/spec/1.2.2/)
- [https://eemeli.org/yaml/](https://eemeli.org/yaml/)
  - [https://www.npmjs.com/package/yaml](https://www.npmjs.com/package/yaml)
  - [https://github.com/eemeli/yaml](https://github.com/eemeli/yaml)


### TOML

[Tom's Obvious, Minimal Language (TOML)](https://toml.io/en/) is a
document format designed for configuration files, with an easy-to-read
syntax. Unlike JSON, it supports comments and can handle date and time
formats natively, among other features.

```bash
# Installing 'toml' package for Node.JS using NPM.
npm install toml
```

```javascript
import * as fs from 'node:fs';
import * as TOML from 'toml';
try
{
  const toml_content = fs.readFileSync('./sample-source.toml')
  const data = TOML.parse(toml_content, {bigint: true, maxDepth: 100 });
}
catch (err)
{
  console.error(`Parsing error on line ${err.line}, column ${err.column}: ${err.message}`);
}
```

Because working with date and time values are one of strongs of
[TOML](https://github.com/BinaryMuse/toml-node#temporal-support)
format, if you are using modern versions of
[Node.JS](https://nodejs.org/es/blog/release/v26.0.0#temporal-api),
you can use the recently released
[Temporal API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal).
If you are using older versions, it exists a
[polyfill](https://betterstack.com/community/guides/scaling-nodejs/temporal-explained/)
to allow you to work with such functionality.

Additional information about `TOML` can be found in:

- [https://toml.io/en/](https://toml.io/en/)
  - [TOML v1.1.0 Specification](https://toml.io/en/v1.1.0)
- [https://www.npmjs.com/package/toml](https://www.npmjs.com/package/toml)
  - [https://github.com/BinaryMuse/toml-node](https://github.com/BinaryMuse/toml-node)
  - [https://binarymuse.github.io/toml-node/](https://binarymuse.github.io/toml-node/)

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

