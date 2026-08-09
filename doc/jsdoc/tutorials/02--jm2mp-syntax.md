## Table of Contents

- [Introduction](#introduction)
- [Basic Terminology](#basic-terminology)

## Introduction

In this tutorial, we will explain the syntax of the `JSON Model-to-Model
Projections (JM2MP)` format, which is based entirely on the _de jure_
[ECMA-404: The JSON data interchange syntax (2nd edition, December 2017)](https://ecma-international.org/publications-and-standards/standards/ecma-404/)
and _de facto_
[RFC 8259: STD 90: The JavaScript Object Notation (JSON) Data Interchange Format](https://www.rfc-editor.org/info/rfc8259/)
standards.

You can find more information about the JSON format at
[JSON.org](https://www.json.org/).

## Basic Terminology

The following concepts are important terms defined as part of `JM2MP`:

- **Source**

  The **source** is the _input_ JSON document that is transformed by a
  **projection** JSON document to obtain the **resultant** _output_ JSON
  document.

- **Resultant**

  Similarly, the **resultant** is the _output_ JSON document transformed
  by the **projection**.

- **Projection**

  It is the algebraic concept of a (macro) function, a JSON document used
  to transform a **source** input JSON document into a **resultant**
  output JSON document.

  A **projection document** is composed by at least one **named template**
  (called the **root template**) and which composes the functions (each
  one called **template command**) that actually transforms specified input
  JSON values into the desired output.

- **Template Command**

  It is the algebraic concept equivalent to a transformation function.
  `JM2MP` defines a number of **template commands**, each of which performs a
  specific operation.

- **Named Template**

  Just as in most programming languages with functions or procedures,
  when you want to reuse the functionality provided by the composition
  of multiple instructions in JM2MP, you can declare _named templates_.

## Notation

We denote as <span style="font-size:larger;">&#x1D541;</span> the complete set of all possible JSON values.

We denote as <span style="font-size:larger;">&#x2119;</span> the complete set of all _template commands_.

Due to the literality and homoiconicity of `JM2MP` respect to JSON, actually
<span style="font-size:larger;">&#x1D541;&sube;&#x2119;</span>, meaning that
any JSON value can be considered as a _projection_ which _resultant_ is itself.

## Template Commands

**Template commands** are the functions that transforms JSON values.


We divide _template commands_ in different families due of the nature
of its intentions inside `JM2MP` syntax:
[execution environment](#execution-environment),
[projections](#projections),
[predicates](#predicates), and [operators](#operators).

### Execution environment

Every _projection_ in `JM2MP` is applied (executed) inside an **execution
environment** &rho; which maintains:

- The **current context**...
- The **root context**...
- The **alias** bindings...

#### let

The `let` _template command_ is used to create new _alias bindings_.

Its JSON form is:

```JSON
{
  "$op" : "let",
  "$bindings": [
    "<alias_1>" : &#x2119;,
    "..."       : &#x2119;,
    "<alias_n>" : &#x2119;
  ],
  "$in": &#x2119;
}
```


#### call

The `call` _template command_ is sed to invoke an existing _named template_.

Its basic JSON form is:

```JSON
{
  "$op"  : "call",
  "$ref" : "<Declared named template>"
}
```

Optionally, it allows to change the _current context_ using its `at` clause:

```JSON
{
  "$op"  : "call",
  "$ref" : "<Declared named template>",
  "$at"  :  &#x2119;
}
```

### Projections

**Projections** are operations that actually transform an input JSON value
(or values) into an output JSON value.

#### pipe

The `pipe` _template command_ is the _projection_ that represents the
sequential associative composition and, as its name implies, composes
all declared transformations left to right.

Its JSON form is:

```JSON
{
  "$op"     : "pipe",
  "$stages" : [ &#x2119;1, ..., &#x2119;n]
}
```

#### get

The `get` _template command_ is the _projection_ that does a selection
of values in the specified path and, optionally, from the specified
_environment_ (context, root or alias).

Its basic JSON form is:

```JSON
{
  "$op"   : "get",
  "$path" : "<Path to the specified source values>"
}
```

It is also possible to define which _query language_ is used (clause
`syntax`), and also change its _current context_ (clause `from`):

```JSON
{
  "$op"     : "get",
  "$syntax" : "<Name of the query language used in $path>",
  "$path"   : "<Path to the specified source values>",
  "$from"   : &#x2119;
}
```

Please, refer below to [Query Languages](#query-languages) section in this
tutorial for more information.

#### if

The `if` _template command_ is the _projection_ that projects its `then`
clause when the `cond` clause is evaluated as `true`; otherwise, it
projects its `else` clause.

Its JSON form is:

```JSON
{
  "$op"   : "if",
  "$cond" : &#x2119,
  "$then" : &#x2119,
  "$else" : &#x2119
}
```

##### coalesce

The `coalesce` _template command_ mix `if` and `get` _projections_ in
order to simplify obtaining a `default` value only when it is not
possible getting the specified one.

Its JSON form is:

```JSON
{
  "$op"      : "coalesce",
  "$value"   : &#x2119,
  "$default" : &#x2119
}
```

#### foldArr

The `foldArr` _template command_ is the _projection_ that projects its
`step` clause over all items of array `over`, starting by `init`.

It is a _catamorphism_ over ARRAY(&#x1D541;),
meaning that `step` is actually a _template command_ used as a function
to reduce, transform or eliminate every item of `over`:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mi>foldArr</mi>
  <mo>:</mo>
  <mn> A* &times; B &times; ( ( A &times; B ) &rarr; B ) &rarr; B</mn>
</math>

where: A,B&sube;&#x2119;.

Its JSON form is:

```JSON
{
  "$op"   : "foldArr",
  "$over" : &#x2119,
  "$init" : &#x2119,
  "$step" : &#x2119
}
```

#### foldObj

Similarly, the `foldArr` _template command_ is the _projection_ that projects its
`step` clause over all properties of object `over`, starting by `init`.

It is a _catamorphism_ over MAP(&Sigma;*&#x21C0;&#x1D541;),
meaning that `step` is actually a _template command_ used as a function
to reduce, transform or eliminate every property of `over`:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mi>foldObj</mi>
  <mo>:</mo>
  <mn>( &Sigma;* &#x21C0; A )* &times; B &times; ( ( &Sigma;* &times; A &times; B ) &rarr; B ) &rarr; B</mn>
</math>

where: A,B&sube;&#x2119;.

Becase `foldObj` operates over objects (the finite set of partial
functions from keys to values), its `step` operation must be commutative
respect property names (distinct key-values pairs). It is responsibility
of the author of such projection to guarantee this restriction;
otherwise, `JM2MP.JS` will not guarantee deterministic results.

Its JSON form is:

```JSON
{
  "$op"   : "foldObj",
  "$over" : &#x2119,
  "$init" : &#x2119,
  "$step" : &#x2119
}
```

#### cons

...

Its JSON form is:

```JSON
{
  "$op"   : "cons",
  "$head" : &#x2119,
  "$tail" : &#x2119
}
```

#### insert

...

Its JSON form is:

```JSON
{
  "$op"    : "insert",
  "$key"   : &#x2119,
  "$value" : &#x2119,
  "$into"  : &#x2119
}
```

#### sort

...

Its JSON form is:

```JSON
{
  "$op"   : "sort",
  "$over" : &#x2119,
  "$by"   : &#x2119,
  "$desc" : &#x2119
}
```

where `desc` clause must be evaluated as a _logic predicate_ (Boolean).

#### lookup

...

Its JSON form is:

```JSON
{
  "$op"    : "lookup",
  "$key"   : &#x2119,
  "$value" : &#x2119,
  "$into"  : &#x2119
}
```

#### merge

...

Its JSON form is:

```JSON
{
  "$op"    : "merge",
  "$key"   : &#x2119,
  "$value" : &#x2119,
  "$into"  : &#x2119
}
```

### Predicates

...

#### Boolean logic

...

##### not

...

Its JSON form is:

```JSON
{
  "$op"    : "not",
  "$value" : &#x2119
}
```

##### and

...

Its JSON form is:

```JSON
{
  "$op"    : "and",
  "$left"  : &#x2119,
  "$right" : &#x2119
}
```

##### or

...

Its JSON form is:

```JSON
{
  "$op"    : "or",
  "$left"  : &#x2119,
  "$right" : &#x2119
}
```

#### Logic predicates

...

##### has

...

Its JSON form is:

```JSON
{
  "$op"  : "has",
  "$key" : &#x2119,
  "$in"  : &#x2119
}
```

##### eq

...

Its JSON form is:

```JSON
{
  "$op"    : "eq",
  "$left"  : &#x2119,
  "$right" : &#x2119
}
```

##### lt

...

Its JSON form is:

```JSON
{
  "$op"    : "lt",
  "$left"  : &#x2119,
  "$right" : &#x2119
}
```

##### gt

...

Its JSON form is:

```JSON
{
  "$op"    : "gt",
  "$left"  : &#x2119,
  "$right" : &#x2119
}
```

##### lte

...

Its JSON form is:

```JSON
{
  "$op"    : "lte",
  "$left"  : &#x2119,
  "$right" : &#x2119
}
```

##### gte

...

Its JSON form is:

```JSON
{
  "$op"    : "gte",
  "$left"  : &#x2119,
  "$right" : &#x2119
}
```

##### neq

...

Its JSON form is:

```JSON
{
  "$op"    : "neq",
  "$left"  : &#x2119,
  "$right" : &#x2119
}
```

#### Aritmetic Operators (for Numbers)

...

##### add

...

Its JSON form is:

```JSON
{
  "$op"    : "add",
  "$left"  : &#x2119,
  "$right" : &#x2119
}
```

##### sub

...

Its JSON form is:

```JSON
{
  "$op"    : "sub",
  "$left"  : &#x2119,
  "$right" : &#x2119
}
```

##### mul

...

Its JSON form is:

```JSON
{
  "$op"    : "mul",
  "$left"  : &#x2119,
  "$right" : &#x2119
}
```

##### div

...

Its JSON form is:

```JSON
{
  "$op"    : "div",
  "$left"  : &#x2119,
  "$right" : &#x2119
}
```

##### mod

...

Its JSON form is:

```JSON
{
  "$op"    : "mod",
  "$left"  : &#x2119,
  "$right" : &#x2119
}
```

##### neg

...

Its JSON form is:

```JSON
{
  "$op"    : "neg",
  "$left"  : &#x2119,
  "$right" : &#x2119
}
```

##### abs

...

Its JSON form is:

```JSON
{
  "$op"    : "abs",
  "$left"  : &#x2119,
  "$right" : &#x2119
}
```

#### Aritmetic Operators (for Strings)

...

##### concat

...

Its JSON form is:

```JSON
{
  "$op"    : "concat",
  "$parts" : &#x2119
}
```

##### lenght

...

Its JSON form is:

```JSON
{
  "$op"    : "length",
  "$value" : &#x2119
}
```

##### substring

...

Its JSON form is:

```JSON
{
  "$op"    : "substring",
  "$value" : &#x2119,
  "$start" : &#x2119,
  "$end"   : &#x2119
}
```

##### upper

...

Its JSON form is:

```JSON
{
  "$op"    : "upper",
  "$value" : &#x2119
}
```

##### lower

...

Its JSON form is:

```JSON
{
  "$op"    : "lower",
  "$value" : &#x2119
}
```

#### Miscelaneous

...

##### typeof

...

Its JSON form is:

```JSON
{
  "$op"    : "typeof",
  "$value" : &#x2119
}
```

## Named Templates

...

## Query Languages

...

### Native

`JM2MP` offers a `native query language`...

### External References

The `JM2MP.JS` library references itself several external libraries in
order to allow usage of different _query languages_ as part of `JM2MP`
projections.

At the same time, it is possible to use additional _query languages_
if proper _adapter class_ is developed. Please, refer to any _external
reference_ to see how to do so.

#### JSONquery

See [@jsonquerylang/jsonquery](./external-@jsonquerylang_jsonquery.html) _external reference_ for more information.

#### JSONata

See [JSONata](./external-JSONata.html) _external reference_ for more information.

#### JMESpath

See [@jsonquerylang/jsonquery](./external-jmespath.html) _external reference_ for more information.

#### JSON Pointer

See [@jsonquerylang/jsonquery](./external-json-pointer.html) _external reference_ for more information.

#### JSON Path Plus

See [@jsonquerylang/jsonquery](./external-jsonpath-plus.html) _external reference_ for more information.

### Other Query Languages

It is possible to use other query languages not initially referenced by
`JM2MP.JS`. In order to do that, it is required to develop an _adapter
class_, sames as any other external reference previosly mentioned.

Remember that any _JM2MP module_ that will use such query language,
needs to declare its usage as part of [$options](#options) _root
property_ or as part of any [$get](#get) projection.

## Modularization

...

- Root template
- `$options`
- `$schema`
- _Projection document_ vs _projection module_
- _Right prevalence_

...

## Examples

Please, refer to the [examples tutorial](./tutorial-03--examples.html)
for various examples of how to use the `JM2MP` format to transform JSON
documents.

