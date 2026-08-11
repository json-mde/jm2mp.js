## Table of Contents

- [Introduction](#introduction)
- [Basic Terminology](#basic-terminology)
- [Notation](#notation)
- [Data Types](#data-types)
- [Template Commands](#template-commands)
  - [Execution Environment](#execution-environment)
    - [let](#let)
    - [call](#call)
  - [Projections](#projections)
    - [pipe](#pipe)
    - [get](#get)
    - [if](#if)
    - [coalesce](#coalesce)
    - [foldArr](#foldarr)
    - [foldObj](#foldobj)
    - [cons](#cons)
    - [insert](#insert)
    - [sort](#sort)
    - [lookup](#lookup)
    - [merge](#merge)
  - [Predicates and Operators](#predicates-and-operators)
    - [Boolean logic operators](#boolean-logic-operators)
      - [not](#not)
      - [and](#and)
      - [or](#or)
    - [Logic predicates](#logic-predicates)
      - [has](#has)
      - [eq](#eq)
      - [lt](#lt)
      - [gt](#gt)
      - [lte](#lte)
      - [gte](#gte)
      - [neq](#neq)
    - [Aritmetic Operators (for Numbers)](#aritmetic-operators-for-numbers)
      - [add](#add)
      - [sub](#sub)
      - [mul](#mul)
      - [div](#div)
      - [mod](#mod)
      - [neg](#neg)
      - [abs](#abs)
    - [Operators (for Strings)](#operators-for-strings)
      - [concat](#concat)
      - [lenght](#lenght)
      - [substring](#substring)
      - [upper](#upper)
      - [lower](#lower)
    - [Miscellaneous](#miscellaneous)
      - [typeof](#typeof)
- [Named Templates](#named-templates)
- [Query Languages](#query-languages)
  - [Native](#native)
  - [External References](#external-references)
    - [JSONquery](#jsonquery)
    - [JSONata](#jsonata)
    - [JMESpath](#jmespath)
    - [JSON Pointer](#json-pointer)
    - [JSON Path Plus](#json-path-plus)
  - [Other Query Languages](#other-query-languages)
- [Modularization](#modularization)
- [Examples](#examples)

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

We denote &#x1D541; as the complete set of all possible JSON values.

We denote &#x2119; as the complete set of all _template commands_.

Due to the literality and homoiconicity of `JM2MP` with respect to JSON,
this means that any `JM2MP` _projection_ is a valid JSON value, and since
its _resultant_ value of such a _projection_ must also be a valid JSON
value, we can therefore conclude that &#x2119;&sube;&#x1D541;.

## Data types

The [JSON](https://www.json.org/json-en.html) standard only considers
following data types:

- Scalar values:
  - `null`
  - Boolean: `true` and `false`
  - `string`
  - `number`
- Complex values:
  - Array
  - Object

Current versions of `JM2MP` and `JM2MP.JS` are strict handling data
types, providing a function to identify the type of a value (see
[typeof projection](#typeof)) but not providing functions to implictly
cast neither explicitly convert values from one type to another.

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

- The **current context**... is represented by prefix `@`...
- The **root context**... is represented by prefix `$`...
- The **alias** bindings... is represented by prefix `%`...

#### let

The `let` _template command_ is used to create new _alias bindings_.

An _alias_ is an immutable expression that substitute such expression
whenever is used.

Every `let` creates a new _scope_ where _bindings_ are defined.

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

All _alias_ is computed in parallel, so two sibling aliases (defined in
same scope) cannot depend on each another.

When it is needed to create a second _alias_ that depends on a first
_alias_, it is neccessary to define an inner scope (for the second
alias) inside the outer scope (where the first alias is defined),
because `bindings` clause is evaluated before than `in` clause.

For instance:

```JSON
{ "$op" : "let",
  "$bindings": [
    "outer_alias" : "<Free expression>"
   ],
  "$in" : {
    "$op" : "let",
    "$bindings" : [
      "inner_alias" : "<Dependant expression of %outer_alias>"
    ],
    "$in" : &#x2119;
  }
}
```

#### call

The `call` _template command_ is used to invoke an existing _named
template_, just as if it were a function.

Its basic JSON form is:

```JSON
{
  "$op"  : "call",
  "$ref" : "<Declared named template>"
}
```

Optionally, it allows to change the _current context_ using its `at`
clause:

```JSON
{
  "$op"  : "call",
  "$ref" : "<Declared named template>",
  "$at"  :  &#x2119;
}
```

In [Named Templates](#named-templates) section, you can learn more about
this concept.

### Projections

**Projections** are operations that actually transform an input JSON
value (or values) into an output JSON value.

#### pipe

The `pipe` _template command_ is the _projection_ that represents the
sequential associative composition and, as its name implies, it composes
all declared transformations left to right.

Its JSON form is:

```JSON
{
  "$op"     : "pipe",
  "$stages" : [ &#x2119;_1 , &hellip; , &#x2119;_n ]
}
```

where its algebraic equivalence is as follows:

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

Please, refer below to [Query Languages](#query-languages) section in
this tutorial for more information.

#### if

The `if` _template command_ is the _projection_ that projects its `then`
clause when the `cond` clause is evaluated as `true`; otherwise, it
projects its `else` clause.

Its JSON form is:

```JSON
{
  "$op"   : "if",
  "$cond" : &#x2119;,
  "$then" : &#x2119;,
  "$else" : &#x2119;
}
```

where its algebraic equivalence is as follows:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mrow>
      <mo>&#x27E6;</mo>
      <ms>if</ms>
      <mrow>
        <mo>(</mo>
        <ms>cond</ms>
        <mo>,</mo>
        <ms>then</ms>
        <mo>,</mo>
        <ms>else</ms>
        <mo>)</mo>
      </mrow>
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
    <mo>{</mo>
    <mtable columnalign="left">
      <mtr>
        <mtd>
          <mo>&#x27E6;</mo>
          <ms>then</ms>
          <mo>&#x27E7;</mo>
          <mrow>
            <mo>(</mo>
            <mi>&rho;</mi>
            <mo>)</mo>
          </mrow>
        </mtd>
        <mtd>
          <mrow>
            <ms>, when </ms>
            <mo>&#x27E6;</mo>
            <ms>cond</ms>
            <mo>&#x27E7;</mo>
            <mrow>
              <mo>(</mo>
              <mi>&rho;</mi>
              <mo>)</mo>
            </mrow>
            <mo>=</mo>
            <mi>true</mi>
          </mrow>
        </mtd>
      </mtr>
      <mtr>
        <mtd>
          <mo>&#x27E6;</mo>
          <ms>else</ms>
          <mo>&#x27E7;</mo>
          <mrow>
            <mo>(</mo>
            <mi>&rho;</mi>
            <mo>)</mo>
          </mrow>
        </mtd>
        <mtd>
          <ms>, otherwise</ms>
        </mtd>
      </mtr>
    </mrow>
  </mrow>
</math>

#### coalesce

The `coalesce` _template command_ mixes the `if` and `get` _projections_
in order to simplify obtaining a `default` value only when it is not
possible getting the specified one.

Its JSON form is:

```JSON
{
  "$op"      : "coalesce",
  "$value"   : &#x2119;,
  "$default" : &#x2119;
}
```

#### foldArr

The `foldArr` _template command_ is the _projection_ that projects its
`step` clause over all items of array `over`, from right to the left,
starting by `init`.

It is a _catamorphism_ over ARRAY(&#x1D541;),
meaning that `step` is actually a _template command_ used as a function
to reduce, transform or eliminate every item resultant from `over` clause:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <ms>foldArr</ms>
    <mo>:</mo>
    <msup>
      <mi>A</mi>
      <mo>*</mo>
    </msup>
    <mo>&times;</mo>
    <mi>B</mi>
    <mo>&times;</mo>
    <mrow>
      <mo>(</mo>
      <mi>A</mi>
      <mo>&times;</mo>
      <mi>B</mi>
      <mo>&rarr;</mo>
      <mi>B</mi>
      <mo>)</mo>
    </mrow>
    <mo>&rarr;</mo>
    <mi>B</mi>
  </mrow>
</math>

where: A,B&sube;&#x2119;.

Its JSON form is:

```JSON
{
  "$op"   : "foldArr",
  "$over" : &#x2119;,
  "$init" : &#x2119;,
  "$step" : &#x2119;
}
```

The `foldArr` _projection_ changes the _context_ in every `step`
evaluation, considering the following object as its _current context_:

```JavaScript
const current_step_context = {
  // The current item from OVER array.
  /** @type {*} */ item: over[i],
  // The current value of the accumulator.
  /** @type {*} */ acc,
  // The index of the current element from OVER array.
  /** @type {integer} */ index: i
};
```

#### foldObj

Similarly, the `foldArr` _template command_ is the _projection_ that projects its
`step` clause over all properties of object `over`, starting by `init`.

It is a _catamorphism_ over MAP(&Sigma;*&#x21C0;&#x1D541;),
meaning that `step` is actually a _template command_ used as a function
to reduce, transform or eliminate every property of `over`:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <ms>foldObj</ms>
    <mo>:</mo>
    <mrow>
      <mrow>
        <mo>{</mo>
        <msup>
          <mi>&Sigma;</mi>
          <mo>*</mo>
        </msup>
        <mo>&#x21C0;</mo>
        <mi>A</mi>
        <mo>}</mo>
      </mrow>
      <mo>&times;</mo>
      <mi>B</mi>
      <mo>&times;</mo>
      <mrow>
        <mo>(</mo>
        <msup>
          <mi>&Sigma;</mi>
          <mo>*</mo>
        </msup>
        <mo>&times;</mo>
        <mi>A</mi>
        <mo>&times;</mo>
        <mi>B</mi>
        <mo>&rarr;</mo>
        <mi>B</mi>
        <mo>)</mo>
      </mrow>
      <mo>&rarr;</mo>
      <mi>B</mi>
    </mrow>
  </mrow>
</math>

where: A,B&sube;&#x2119;.

Becase `foldObj` operates over objects (the finite set of partial
functions from keys to values), its `step` operation must be commutative
respect property names (distinct key-values pairs). It is responsibility
of the author of such projection to guarantee this restriction;
otherwise, `JM2MP.JS` cannot guarantee deterministic results.

Its JSON form is:

```JSON
{
  "$op"   : "foldObj",
  "$over" : &#x2119;,
  "$init" : &#x2119;,
  "$step" : &#x2119;
}
```

The `foldObj` _projection_ changes the _context_ in every `step`
evaluation, considering the following object as its _current context_:

```JavaScript
const current_step_context = {
  // The current property's name from OVER object.
  /** @type {string} */ key,
  // The current property's value from OVER object.
  /** @type {*} */ value: obj[key],
  // The current accumulator.
  /** @type {*} */ acc
};
```

#### cons

The `cons` _template command_ is the _projection_ used to create new a
item into an existing array, and insert it as its first element.

Its JSON form is:

```JSON
{
  "$op"   : "cons",
  "$head" : &#x2119;,
  "$tail" : &#x2119;
}
```

#### insert

The `insert` _template command_ is the _projection_ used to create new a
property into an existing object.

If the existing object `into` already has a property with name `key`,
its old value will be lost and `value` will be its new value
(overriding it).

Its JSON form is:

```JSON
{
  "$op"    : "insert",
  "$key"   : &#x2119;,
  "$value" : &#x2119;,
  "$into"  : &#x2119;
}
```

#### sort

The `sort` _template command_ is a _projection_ used to sort a list
(items of an array, keys of an object) using a specified criteria.

The `sort` _template command_ is actually a derived _projection_,
included by its reduced algorithmic complexity _O(n)_ againts the
non-trivial combination of `foldArr/foldObj`, `if` and `lt` _projections_
of complexity _O(n<sup>2</sup>)_.

Its JSON form is:

```JSON
{
  "$op"   : "sort",
  "$over" : &#x2119;,
  "$by"   : &#x2119;,
  "$desc" : &#x2119;
}
```

where:
- `over` is the mandatory list to sort.
- `by` is an optional _projection_ to produce the ordering key; if
  ommited, then the ordering criteria will be to sort by the items
  themselves.
- `desc` is an optional clause that must be evaluated as a _logic predicate_ (Boolean); by default, its value `false` will order `over` in ascending order.

#### lookup

The `lookup` _template command_ is a _projection_ used to get the value
of the property's name specified by the `key` clause of the object
specified by the `in` clause.

The `lookup` _projection_ can be derived from the `foldObj` _projection_,
but with a higher complexitiy of _O(n)_ instead of just _O(1)_;
nowadays, objects are hash tables and getting any key is considered a
constant-time operation.

Its JSON form is:

```JSON
{
  "$op"  : "lookup",
  "$key" : &#x2119;,
  "$in"  : &#x2119;
}
```

The `lookup` _projection_ returns a `null` value whenever `in` is evaluated to `null` or `key` does not belongs to the resultant (object) value of `in`.

An [EvaluationError](./module-jm2mp_errors.EvaluationError.html) will be raised if the resultant value of `in` were not of _object_ type.

#### merge

The `merge` _template command_ is a _projection_ used to merge two
objects, `left` and `right`, into a newer resultant one, getting all
properties from both but, in case of duplicate keys, returning only the
values from the `right` object (applying priority right-to-left, or
overriding the `left` values with the `right` ones on equally-named
properties).

The `merge` _projection_ can be derived from the `foldObj` and `insert`
_projections_, but with a higher complexitiy of _O(m<sup>2</sup>+m·n)_
instead of just _O(m+n)_; nowadays, objects can be efficiently combined (for instance, using the
[JavaScript's spread syntax in object literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax#spread_in_object_literals)).

Its JSON form is:

```JSON
{
  "$op"    : "merge",
  "$left"  : &#x2119;,
  "$right" : &#x2119;
}
```

### Predicates and Operators

Because some `JM2MP` _projections_ evaluates conditions, it is neccesary
to consider predicates, that is, functions or operations that obtains a
logical value (a Boolean `true` or `false` value) in order to take some
considerations.

At the same time, it is neccessary to offer mechanisms to operate over
scalar values to obtain resultant values derived from one or more source
values.

In general, their algebraic equivalence is as follows:

<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mrow>
      <mo>&#x27E6;</mo>
      <ms>UnaryOperation</ms>
      <mrow>
        <mo>(</mo>
        <ms>value</ms>
        <mo>)</mo>
      </mrow>
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
    <mo>Operator</mo>
    <mo>(</mo>
    <mrow>
      <mo>&#x27E6;</mo>
      <ms>value</ms>
      <mo>&#x27E7;</mo>
      <mrow>
        <mo>(</mo>
        <mi>&rho;</mi>
        <mo>)</mo>
      </mrow>
    </mrow>
    <mo>)</mo>
  </mrow>
</math>
<br />
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mrow>
      <mo>&#x27E6;</mo>
      <ms>BinaryOperator</ms>
      <mrow>
        <mo>(</mo>
        <ms>left</ms>
        <mo>,</mo>
        <ms>right</ms>
        <mo>)</mo>
      </mrow>
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
    <mo>(</mo>
    <mrow>
      <mo>&#x27E6;</mo>
      <ms>left</ms>
      <mo>&#x27E7;</mo>
      <mrow>
        <mo>(</mo>
        <mi>&rho;</mi>
        <mo>)</mo>
      </mrow>
    </mrow>
    <mo>Operator</mo>
    <mrow>
      <mo>&#x27E6;</mo>
      <ms>right</ms>
      <mo>&#x27E7;</mo>
      <mrow>
        <mo>(</mo>
        <mi>&rho;</mi>
        <mo>)</mo>
      </mrow>
    </mrow>
    <mo>)</mo>
  </mrow>
</math>

Predicates and operators are divided in several categories due to its
nature:
[Boolean logic operators](#boolean-logic-operators),
[logic predicates](#logic-predicates),
[aritmetic (for numbers)](#aritmetic-operators-for-numbers),
[operators (for strings)](#operators-for-strings),
and the last one [miscellaneous](#miscellaneous) category.

#### Boolean logic operators

Although, strictly speaking from an algebraic standpoint, only the `not`
and `and` operators are needed to combine any predicate in propositional
logic, the `or` operator has also been added for convenience.

Each of them is explained below.

##### not

The `not` _template command_ _projects_ the negation of its `value` clause.

Only _projections_ that _resultant_ in Boolean values are considered,
raising an [EvaluationError](./module-jm2mp_errors.EvaluationError.html)
exception otherwise.

Its JSON form is:

```JSON
{
  "$op"    : "not",
  "$value" : &#x2119;
}
```

##### and

The `and` _template command_ _projects_ the conjunction of its `left` and `right` clauses.

Only _projections_ that _resultant_ in Boolean values are considered,
raising an [EvaluationError](./module-jm2mp_errors.EvaluationError.html)
exception otherwise.

Its JSON form is:

```JSON
{
  "$op"    : "and",
  "$left"  : &#x2119;,
  "$right" : &#x2119;
}
```

##### or

The `or` _template command_ _projects_ the disjunction of its `left` and `right` clauses.

Only _projections_ that _resultant_ in Boolean values are considered,
raising an [EvaluationError](./module-jm2mp_errors.EvaluationError.html)
exception otherwise.

Its JSON form is:

```JSON
{
  "$op"    : "or",
  "$left"  : &#x2119;,
  "$right" : &#x2119;
}
```

#### Logic predicates

Once again, although strictly speaking from an algebraic point of view,
only the operators `eq` and `lt` are needed to combine any predicate in
propositional logic that involves a numerical order, the rest of the
operators commonly used in these cases have been also defined for the
sake of convenience.

Each of them is explained below.

##### has

Because `JM2MP` provides an algebraic closure for JSON data types, any
_undefined_ operation (such as searching for a value using a path that
does not exist) returns a `null` value.

For this reason, the `has` _projection_ is provided, which determines
whether a `key` exists `in` the specified object.

Its JSON form is:

```JSON
{
  "$op"  : "has",
  "$key" : &#x2119;,
  "$in"  : &#x2119;
}
```

##### eq

The `eq` _projection_ provides in `JM2MP` binary numerical operation _equal_.

Its JSON form is:

```JSON
{
  "$op"    : "eq",
  "$left"  : &#x2119;,
  "$right" : &#x2119;
}
```

##### lt

The `lt` _projection_ provides in `JM2MP` binary numerical operation _less than_.

Its JSON form is:

```JSON
{
  "$op"    : "lt",
  "$left"  : &#x2119;,
  "$right" : &#x2119;
}
```

##### gt

The `lt` _projection_ provides in `JM2MP` binary numerical operation _greater than_.

Its JSON form is:

```JSON
{
  "$op"    : "gt",
  "$left"  : &#x2119;,
  "$right" : &#x2119;
}
```

##### lte

The `lt` _projection_ provides in `JM2MP` binary numerical operation _less than or equal_.

Its JSON form is:

```JSON
{
  "$op"    : "lte",
  "$left"  : &#x2119;,
  "$right" : &#x2119;
}
```

##### gte

The `lt` _projection_ provides in `JM2MP` binary numerical operation _greater than or equal_.

Its JSON form is:

```JSON
{
  "$op"    : "gte",
  "$left"  : &#x2119;,
  "$right" : &#x2119;
}
```

##### neq

The `neq` _projection_ provides in `JM2MP` binary numerical operation _not equal_.

Its JSON form is:

```JSON
{
  "$op"    : "neq",
  "$left"  : &#x2119;,
  "$right" : &#x2119;
}
```

#### Aritmetic Operators (for Numbers)

The classic arithmetic operations, both binary and unary, have been
defined in `JM2MP`, namely: [addition](#add), [subtraction](#sub),
[multiplication](#mul), [division](#div), [modulo](#mod),
[negation](#neg), and [absolute value](#abs).

##### add

The `add` _projection_ provides in `JM2MP` binary numerical operation _addition_.

Its JSON form is:

```JSON
{
  "$op"    : "add",
  "$left"  : &#x2119;,
  "$right" : &#x2119;
}
```

##### sub

The `sub` _projection_ provides in `JM2MP` binary numerical operation _substraction_.

Its JSON form is:

```JSON
{
  "$op"    : "sub",
  "$left"  : &#x2119;,
  "$right" : &#x2119;
}
```

##### mul

The `mul` _projection_ provides in `JM2MP` binary numerical operation _multiplication_.

Its JSON form is:

```JSON
{
  "$op"    : "mul",
  "$left"  : &#x2119;,
  "$right" : &#x2119;
}
```

##### div

The `mul` _projection_ provides in `JM2MP` binary numerical operation _division_.

Its JSON form is:

```JSON
{
  "$op"    : "div",
  "$left"  : &#x2119;,
  "$right" : &#x2119;
}
```

##### mod

The `mul` _projection_ provides in `JM2MP` binary numerical operation _modulo_.

Its JSON form is:

```JSON
{
  "$op"    : "mod",
  "$left"  : &#x2119;,
  "$right" : &#x2119;
}
```

##### neg

The `neg` _projection_ provides in `JM2MP` unary numerical operation _negation_.

Its JSON form is:

```JSON
{
  "$op"    : "neg",
  "$left"  : &#x2119;,
  "$right" : &#x2119;
}
```

##### abs

The `abs` _projection_ provides in `JM2MP` unary numerical operation _absolute value_.

Its JSON form is:

```JSON
{
  "$op"    : "abs",
  "$left"  : &#x2119;,
  "$right" : &#x2119;
}
```

#### Operators (for Strings)

Similar to numbers, but in this case for text strings,
the classic operations, both binary and unary, have been
defined in `JM2MP`, namely:
[concatenation](#concat),
[lenght](#lenght),
[substring](#substring),
[to-upper-case](#upper), and
[to-lower-case](#lower).

##### concat

The `concat` _projection_ provides in `JM2MP` functionality to concatenate several strings into a newer one.

Its JSON form is:

```JSON
{
  "$op"    : "concat",
  "$parts" : &#x2119;
}
```

##### lenght

The `length` _projection_ provides in `JM2MP` the ability to count
characters from a _string_ value, but also items from an array.

Its JSON form is:

```JSON
{
  "$op"    : "length",
  "$value" : &#x2119;
}
```

##### substring

...

Its JSON form is:

```JSON
{
  "$op"    : "substring",
  "$value" : &#x2119;,
  "$start" : &#x2119;,
  "$end"   : &#x2119;
}
```

##### upper

...

Its JSON form is:

```JSON
{
  "$op"    : "upper",
  "$value" : &#x2119;
}
```

##### lower

...

Its JSON form is:

```JSON
{
  "$op"    : "lower",
  "$value" : &#x2119;
}
```

#### Miscellaneous

...

##### typeof

...

Its JSON form is:

```JSON
{
  "$op"    : "typeof",
  "$value" : &#x2119;
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

