## Table of Contents

- [Introduction](#introduction)
- [Other usual document formats](#other-usual-document-formats)
  - [JSONC and JSON5](#jsonc-and-json5)
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
    <mi>s</mi>
    <mo>=</mo>
    <mrow>
      <msub><mi>Convert-To-JSON</mi><ms>Other-Format</ms></msub>
      <mo>(</mo>
      <msub><mi>source</mi><ms>Other-Format</ms></msub>
      <mo>)</mo>
    </mrow>
  </mrow>
</math>
<br />
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mi>p</mi>
    <mo>=</mo>
    <mrow>
      <msub><mi>Project</mi><ms>JM2MP</ms></msub>
      <mo>(</mo>
      <mi>s</mi>>
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
      <msub><mi>resultant</mi><ms>Other-Format</ms></msub>
    </mrow>
  </mrow>
  <mo>=</mo>
  <mrow>
    <msub><mi>Convert-From-JSON</mi><ms>Other-Format</ms></msub>
    <mo>(</mo>
    <mi>p</mi>
    <mo>)</mo>
  </mrow>
</math>

### JSONC and JSON5

Both [JSONC](#) and [JSON5](https://json5.org/) ...

```javascript
```

```javascript
// How to install JSON5 using NPM.
npm install json5

// How to use JSON5 in Node.JS.
import JSON5 from 'json5'
// Import JSON5 file.
const json5_register = require('json5/lib/register') ;
const json5_content_one = require('${FILE_PATH}/file.json5') ;
const json5_content_two = JSON5.parse() ;
const json5_string = JSON5.stringify() ;
```

### JSON Lines

...

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

