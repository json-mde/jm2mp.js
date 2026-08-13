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
    <mrow>
      <mo>&#x27E6;</mo>
      <ms>pipe</ms>
      <mo>(</mo>
      <msub><mi>&#x2119;</mi><mn>1</mn></msub>
      <mo>,</mo>
      <mo>&hellip;</mo>
      <mo>,</mo>
      <msub><mi>&#x2119;</mi><mn>n</mn></msub>
      <mo>)</mo>
      <mo>&#x27E7;</mo>
    </mrow>
    <mrow>
      <mo>(</mo>
      <mi>&rho;</mi>
      <mo>)</mo>
    </mrow>
  </mrow>
  <mo>=</mo>
  <mrow>
    <msub><mi>&#x2119;</mi><mn>n</mn></msub>
    <mo>&#x2218;</mo>
    <mi>&hellip;</mi>
    <mo>&#x2218;</mo>
    <msub><mi>&#x2119;</mi><mn>1</mn></msub>
    <mo>(</mo>
    <mi>&rho;</mi>
    <mo>)</mo>
  </mrow>
  <mo>=</mo>
  <mrow>
    <msub><mi>&#x2119;</mi><mn>n</mn></msub>
    <mo>(</mo>
    <mi>&hellip;</mi>
    <mo>(</mo>
    <msub><mi>&#x2119;</mi><mn>1</mn></msub>
    <mo>(</mo>
    <mi>&rho;</mi>
    <mo>)</mo>
    <mo>)</mo>
    <mi>&hellip;</mi>
    <mo>)</mo>
  </mrow>
</math>

### JSONC and JSON5

...

### JSON Lines

...

### YAML

...

### TOML

...

### XML

For XML, please... use XSLT!
