## Table of Contents

- [Introduction](#introduction)
- [Basic Capabilities](#basic-capabilities)
- [JSON Variant](#json-variant)
- [Textual String Variant](#textual-string-variant)
- [Combining Operations](#combining-operations)
  - [Filtering](#filtering)
  - [Aggregation](#aggregation)
  - [Composition](#composition)


## Introduction

A _query language_ is the mechanism used to locate (search for and
select) JSON values within a JSON document.

The `JM2MP` format offers its own _query language_, just named
`native path syntax` (or `native` for short). Both formats, `JM2MP` and
`native`, have been designed to be algebraically complete, in the sense
that they provide, with mathematical rigor, at least the minimal set of
operations necessary to achieve a complete transformation of JSON
documents from the _source_ (or _input_) to the _resultant_ (or
_output_), using a third document called the _projection_ (which
contains the desired _transformations_).

There are several _query languages_ designed for this purpose, ranging
from the simplest (which simply allow you to locate any element in the
document, like this `native` or the standard
[JSON Pointer](./tutorial-02--jm2mp-syntax.html#json-pointer)) to the
most sophisticated (like
[JMESPath](./tutorial-02--jm2mp-syntax.html#jmespath) or
[JSONata](./tutorial-02--jm2mp-syntax.html#jsonata), for instance,
which offer pattern-based searches, as well as additional filtering and
sorting operations, among others).

Each _query language_ offers its own syntax (or set of syntaxes) for
writing a (simple) **path** or a (more complex) **workflow**, comprising
of a sequence of **steps** necessary to locate (and perhaps process) one
(or more) JSON _input_ values from the _source document_, so that the
_query language engine_ (typically, the library that interprets such
_query language_) can return them as the result (_output_) of that
navigation, location or process.

The `native` _query language_ features two syntactically different but
semantically equivalent notations: one based on text strings and another
based on an structured JSON syntax.

In addition, the `JM2MP.JS` library allows you to use several _external
query languages_ by default (see
[external references](./tutorial-02--jm2mp-syntax.html#external-references)
section from
[JM2MP Syntax](./tutorial-02--jm2mp-syntax.html) tutorial for more details):

- [JMESPath](./tutorial-02--jm2mp-syntax.html#jmespath)
- [JSONata](./tutorial-02--jm2mp-syntax.html#jsonata)
- [JSONPath](./tutorial-02--jm2mp-syntax.html#jsonpath)
- [JSON Pointer](./tutorial-02--jm2mp-syntax.html#json-pointer)
- [JSON Query](./tutorial-02--jm2mp-syntax.html#json-query)

The following section presents the basic concepts and capabilities of
the `native` _query language_.


## Basic Capabilities

The `native path syntax` is a simple _query language_ designed to
unambiguously select a _single JSON value_ within a document, and it
offers two easy-to-read syntaxes: one based on JSON arrays and the
other based on text string.

The `native` _query language_ is designed for the `null` _absorption
propagation_ of values. This means that, when it does not find the
specified value for a _step_, the _resultant_ JSON value will always be
`null`, even if the _path_ still has remaining _steps_ (nodes not yet
traversed).

The concept of `null` _absorption propagation_ is important to the
`JM2MP` format, as it ensures that any `undefined` _result_ will be
returned as `null`, so: no errors will be raised due to an inapplicable
_path_ and every _template command_ will always return a valid JSON
value (remember that `undefined` is not a valid JSON value) or at least
a `null` one.

But errors will still occur when _path_ is not in the correct or valid
format!

Actually, the
[QueryAdapter interface](./module-jm2mp_adapters_registry.html#.QueryAdapter)
described in the section about
[Other Query Languages](./tutorial-02--jm2mp-syntax.html#other-query-languages)
of the [JM2MP Syntax](./tutorial-02--jm2mp-syntax.html) tutorial is the
way to standardize the behavior of any external _query languages_ that
can be incorporated into the `JM2MP.JS` library, so that they can then
be used from `JM2MP` _projection documents_.

In the following sections, we'll show several examples of _paths_ using
the `native` _query language_. For all of these examples, we will always
use the JSON document shown next as our (simple but representative)
_source document_:

```JSON
{
  "SubRootObject": {
    "NullProperty" : null,
    "FalseProperty" : false,
    "TrueProperty" : true,
    "TextProperty" : "Text value.",
    "IntegerProperty" : 12,
    "RealProperty" : Math.PI,
    "EmptyArrayProperty" : [],
    "ArrayProperty" : [ 1, "Two", { "Three" : 3 } ],
    "EmptyObjectProperty": {},
    "ObjectProperty": {
      "Alpha" : 1,
      "Bravo" : "B",
      "Charlie" : 3.33
    }
  }
}
```

Next, we will present each notation of the `native` _query language_:

- [JSON Variant](#json-variant)
- [Textual String Variant](#textual-string-variant)


## JSON Variant

The JSON-based syntactic variant of the `native` _query language_ is
represented as an `array` whose items' values (called **accessors**) can
be of only two types:

- **Natural numbers**: when referring to the zero-based **index** of an
  _item_ within an _array_.

- **Text strings**: when referring to the **name** of an _object's
  property_.

An _empty array_ is considered as the **empty path**, which is a valid
_path_ that returns the same _source value_ (_input_) as the _resultant
value_ (_output_).

Therefore, this JSON-based variant will only _navigate_ (or _locate_)
from the _current context_ where it is being used.

Below are several valid examples of how to locate values in the _source
document_ presented above:

```JSON
// Query:
[ "SubRootObject", "IntegerProperty" ]
// Resultant value:
12
```

```JSON
// Query:
[ "SubRootObject", "ArrayProperty" ]
// Resultant value:
[ 1, "Two", { "Three" : 3 } ]
```

```JSON
// Query:
[ "SubRootObject", "ArrayProperty", 2, "Three" ]
// Resultant value:
3
```

```JSON
// Query:
[ "SubRootObject", "ObjectProperty" ]
// Resultant value:
{
      "Alpha" : 1,
      "Bravo" : "B",
      "Charlie" : 3.33
}
```

```JSON
// Query:
[ "SubRootObject", "ObjectProperty", "Bravo" ]
// Resultant value:
"B"
```

And, due to the `null` _absorption propagation_, inaccessible _paths_
will always return `null`:

```JSON
// Query (index 5 is out of range):
[ "SubRootObject", "ArrayProperty", 5, "Single" ]
// Resultant value:
null
```

```JSON
// Query (neither NonExistentObject nor Omega exists):
[ "SubRootObject", "NonExistentObject", "Omega" ]
// Resultant value:
null
```

But it is possible to declare an invalid `native` _path_ that will raise
a [ParseError](./module-jm2mp_errors.ParseError.html) exception:

```JSON
// Invalid query:
[ false ]
// ParseError exception will be raised!
```



## Textual String Variant

The textual syntactic variant of the `native` _query language_ is
represented as a text `string` whose content is a complete _path_ with
all its _steps_, always beginning with a selector from the
[execution environment](./tutorial-02--jm2mp-syntax.html#execution-environment)
considered for _input_:

- `$`: it always references the _root value_ of the _source document_.

- `@`: refers to the _current context_ of the _source document_
in which the _template command_ is being execute;
[foldArr](./tutorial-02--jm2mp-syntax.html#foldarr) and
[foldObj](./tutorial-02--jm2mp-syntax.html#foldobj) _template commands_
each define their own _current step context_ due to their transformative
nature.

- `%AliasName`: which must reference one of the previously defined
(bound) _alias_.

An _empty string_ is considered invalid (a syntax error), same as
reference an undefined _alias_.

Again, due to the `null` _absorption propagation_, inaccessible _paths_
will always return `null`.

Below are the same examples from the previous section, but this time
written using textual string variant:

```JSON
// Query:
"$.SubRootObject.IntegerProperty"
// Resultant value:
12
```

```JSON
// Query:
"$.SubRootObject.ArrayProperty"
// Resultant value:
[ 1, "Two", { "Three" : 3 } ]
```

```JSON
// Query:
"$.SubRootObject.ArrayProperty.2.Three"
// Resultant value:
3
```

```JSON
// Query:
"$.SubRootObject.ObjectProperty"
// Resultant value:
{
      "Alpha" : 1,
      "Bravo" : "B",
      "Charlie" : 3.33
}
```

```JSON
// Query:
"$.SubRootObject.ObjectProperty.Bravo"
// Resultant value:
"B"
```

## Combining Operations

To fully understand the potential and versatility of `JM2MP`, it is
helpful to show some examples of how, by combining it with the `native`
_query language_ (but also with any other equally capable language), it
is possible to perform and link common data processing operations, such
as _compose_ (_pipe_), _filter_ (_map_) and _aggregate_ (_reduce_) data.

For all the examples presented below, we will always consider the
following _source document_:

```JSON
{
  "Name": "Map-Reduce first example.",
  "Records": [
    { "Id":1, "Title":"One",   "Group":"Alpha",   "Value": 3.00 },
    { "Id":2, "Title":"Two",   "Group":"Alpha",   "Value": 5.00 },
    { "Id":3, "Title":"Three", "Group":"Bravo",   "Value": 7.00 },
    { "Id":4, "Title":"Four",  "Group":"Bravo",   "Value": 9.00 },
    { "Id":5, "Title":"Five",  "Group":"Charlie", "Value":11.00 },
  ]
}
```

To embed _comments_ within JSON values, all `JM2MP` _projection
documents_ that are displayed will use the
[JSONC](./tutorial-05--how-to-project-other-formats.html#jsonc) format;
simply remove those comments to obtain fully compliant JSON documents.


### Filtering

A typical filter operation to get only records with a value less than or
equal to 6 should be like this:

```JavaScript
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter
const expected_document = {
  Name: source_document.Name,
  Records: source_document.Records
                          .filter( (i) => (i.Value <= 6) )
};
```

where its equivalent `JM2MP` _projection document_ would be (using the
appropriate _template command_ [foldArr](./tutorial-02--jm2mp-syntax.html#foldarr)):

```JSON
{
  // The root template, always mandatory!
  "$": {
    // Literal property name, which copies its property name.
    "Name": { "$op":"get", "$path":"@.Name" },
    // Literal property name, which iterates each item (FoldArr)
    // filtering using a condition.
    "Records":
      { "$op" : "foldArr",
        // Array to iterate over; remember that 'foldArr'
        // is a from-right-to-left operation.
        "$over": { "$op":"get", "$path":"@.Records" },
        // The initial value defines the data type of the result;
        // in this case it will be an array.
        // An the initial value is the empty array because it
        // serves as the neutral element of array concatenation.
        "$init": [],
        // Step function, which actually is the filter.
        "$step": {
          // Condition to filter: value <= 6.
          "$op": "if",
          "$cond":
            // LTE (less-than-or-equal) between current item's Value and
            // constant 6 (literal number).
            { "$op"    : "lte",
              "$left"  : { "$op":"get", "$path":"@.item.Value"},
              "$right" : 6 },
          // If passes the filter, then the current item is inserted at
          // the beginning of the current aggregation.
          "$then":
            { "$op" : "cons",
              "$head" : { "$op":"get", "$path":"@.item" },
              "$tail" : { "$op":"get", "$path":"@.acc" } },
          // Otherwise, just pass the current aggregation to the next step.
          "$else":
            { "$op":"get", "$path":"@.acc" }
        }
    }
  }
}
```

### Aggregation

Then, we can include the _aggregation_ operation (sometimes called
_reduce_ or _fold_) using the appropriate _template commands_
[if](./tutorial-02--jm2mp-syntax.html#if) and
[add](./tutorial-02--jm2mp-syntax.html#foldarr):

```JSON
{
  // The root template, always mandatory!
  "$": {
    // Literal property name, which copies its property name.
    "Name": { "$op":"get", "$path":"@.Name" },
    // Literal property name, which iterates each item (foldArr)
    // filtering using a condition... and then aggregates them all
    // (reducing them to just a number).
    "SumOfRecordValues":
      { "$op" : "foldArr",
         // Array to iterate over; remember that 'foldArr'
         // is a from-right-to-left operation.
        "$over": { "$op":"get", "$path":"@.Records" },
        // Because the final result will be a number, we need the
        // neutral element for the addition of numbers, that is, zero.
        "$init": 0 ,
        "$step": {
          // In this case, we are composing two operations: 'if'
          // and 'add'; this way, we are making just one pass.
          "$op": "if",
          // First, we filter: value <= 6.
          "$cond":
            { "$op"    : "gt",
              "$left"  : { "$op":"get", "$path":"@.item.Value"},
              "$right" : 6 },
          // Second, but at the same time, we aggregate
          // the value from the filtered items.
          "$then":
            { "$op"    : "add",
              "$left"  : { "$op":"get", "$path":"@.item.Value" },
              "$right" : { "$op":"get", "$path":"@.acc" } },
          "$else":
            { "$op":"get", "$path":"@.acc" }
        }
    }
  }
}
```

The JavaScript code equivalent to filtering all records whose value is
strictly greater than 6 and then adding all their values to return a
single aggregate result would be as follows:

```JavaScript
// The algorithm actually defined using JM2MP that
// requires only a single pass.
const expected_document = {
  Name: source_document.Name,
  SumOfRecordValues: source_document
                     .Records
                     .reduceRight( (acc, i)=>( (i.Value > 6)
                                               ? (acc + i.Value)
                                               : acc ),
                                   0 ) 
};
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduceRight
```

### Composition

However, another way to _compose_ (combine) _filtering_ and _aggregation_
operations (although potentially less efficient, since each operation
requires its own pass over the results) could be as follows:

```JavaScript
// Another similar algorithm, but it requires two passes:
// filtering and reduction.
const expected_document_two_passes = {
  Name: source_document.Name,
  SumOfRecordValues: source_document
                     .Records
                     .filter( (i)=>(i.Value > 6) )
                     .reduceRight( (acc, i)=>(acc + i.Value),
                                   0 )
};
```

which `JM2MP` equivalence involves the use of the
[pipe](./tutorial-02--jm2mp-syntax.html#pipe) _template command_:

```JSON
{
  // The root template, always mandatory!
  "$": {
    // Literal property name, which copies its property name.
    "Name": { "$op":"get", "$path":"@.Name" },
    // Literal property name for the final combined result (pipe).
    "SumOfRecordValues": {
      "$op" : "pipe",
      "$stages" : [
        // First stage: filtering (i-th.Value > 6).
        {
          "$op" : "foldArr",
          "$over": { "$op":"get", "$path":"@.Records" },
          // The resultant JSON value from
          // this stage will be an array.
          "$init": [],
          "$step": {
            // Actual filter.
            "$op": "if",
            "$cond": {
              "$op"    : "gt",
              "$left"  : { "$op":"get", "$path":"@.item.Value"},
              "$right" : 6
            },
            // Preliminary results.
            "$then": {
              "$op" : "cons",
              "$head" : { "$op":"get", "$path":"@.item" },
              "$tail" : { "$op":"get", "$path":"@.acc"  }
            },
            "$else": {
              "$op":"get", "$path":"@.acc"
            }
          }
        },
        // Second stage: aggregation (0 + acc + i-th.Value).
        {
          "$op" : "foldArr",
          // Its input will be the output from the previous stage;
          // that is, the current context.
          "$over": { "$op":"get", "$path":"@" },
          "$init": 0,
          "$step": {
            "$op": "if",
            "$cond": {
              "$op"    : "gt",
              "$left"  : { "$op":"get", "$path":"@.item.Value"},
              "$right" : 6
            },
            "$then": {
              "$op" : "add",
              "$left" : { "$op":"get", "$path":"@.item.Value" },
              "$right" : { "$op":"get", "$path":"@.acc" }
            },
            "$else":
              { "$op":"get", "$path":"@.acc" }
          }
        }
      ]
    }
  }
}
```

