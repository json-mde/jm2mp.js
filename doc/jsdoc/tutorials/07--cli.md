## Table of Contents

- [Introduction](#introduction)
- [Software Architecture and Components](#software-architecture-and-components)
- [Options and Arguments](#options-and-arguments)
  - [Version](#version)
  - [Verbose](#verbose)
  - [Source Encoding](#source-encoding)
  - [Source from STDIN](#source-from-stdin)
  - [Source from CLI Argument](#source-from-cli-argument)
  - [Source from File](#source-from-file)
  - [Projection Encoding](#projection-encoding)
  - [Projection Location](#projection-location)
  - [Projection Base URL (Fetch)](#projection-base-url-fetch)
  - [Projection Base Directory (FileSystem)](#projection-base-directory-filesystem)
  - [Resultant Encoding](#resultant-encoding)
  - [Resultant to STDOUT](#resultant-to-stdout)
  - [Resultant to File](#resultant-to-file)
  - [Overwrite Resultant File If Exists](#overwrite-resultant-file-if-exists)
  - [Maximum Number of Modules](#maximum-number-of-modules)
  - [Maximum Depth of Nesting](#maximum-depth-of-nesting)
  - [JMESPath](#jmespath)
  - [JSONata](#jsonata)
  - [JSONata TimeOut](#jsonata-timeout)
  - [JSONPath](#jsonpath)
  - [JSON Pointer](#json-pointer)
  - [JSON Query](#json-query)
  - [Display the Help](#display-the-help)
- [Example of Use](#example-of-use)


## Introduction

The `JM2MP.JS-CLI` project is a **command line interface (CLI)** console
application.

It enables the use of `JM2MP.JS` library an `JM2MP` format in online
interactive _shells_ , or as part of batch processing _scripts_.


## Software Architecture and Components

The `JM2MP.JS-CLI` project uses the following library to build its
command line interface:

- [commander@15.0.x](https://www.npmjs.com/package/commander)


## Installation

To install the project `JM2MP.JS-CLI`, you can download or clone the
_source code_ from its repository on
[GitHub](https://github.com/json-mde/jm2mp.js-cli):

```bash
git clone "https://github.com/json-mde/jm2mp.js-cli" "jm2mp.js-cli"
```

To use it in any _shell_, it is also possible to install this program as a
[global tool](https://docs.npmjs.com/downloading-and-installing-packages-globally)
from its
[NPM package](https://www.npmjs.com/package/@json-mde/jm2mp-cli), or just
executing it directy from the [NPX](https://docs.npmjs.com/cli/v12/commands/npx)
command:

```bash
# Install it as a global tool...
npm install --global @json-mde/jm2mp-cli
# ...or just download and execute it!
npx -- @json-mde/jm2mp-cli --help
```


## Options and Arguments

Execution of the following command line will show the help information
about all its options and arguments.

```bash
node ./index.js --help
```

It is mandatory to use one and only one option to specify the _source
document_ ([stdin](#source-from-stdin), [content](#source-from-cli-argument),
or [source](#source-from-file)).

It is mandatory to specify a [projection document](#projection-location),
that will be loaded using the specified URL of filename; optionally, the
corresponding [base URL](#projection-base-url-fetch) or
[base directory](#projection-base-directory-filesystem) can also be
specified (but not both).

For the _resultant document_, if no output mechanism is specified
([stdout](#resultant-to-stdout) or [resultant](#resultant-to-file)) then
by default a new file `name--resultant--YYYYMMDDThhmmss.json` will be
created at the _working directory_, where `name` will be `stdin`,
`content`, or `basename(file)` depending on the specified input
mechanism.

If any of the _external query languages_ will be used (like
[JMESPath](./tutorial-02--jm2mp-syntax.html#jmespath) or
[JSONPath](./tutorial-02--jm2mp-syntax.html#jsonpath), for instance),
you must first install their respective _packages_. For example, the
following command line does this through
[NPM](https://docs.npmjs.com/cli/v12/commands/npm-install#include):

```bash
npm install --include=optional
```

### Version

- `-V`
- `--version`

It outputs the version number.


### Verbose

- `-v`
- `--verbose`

Writes to `STDERR` more information about the process (especially when
errors happened).

By default: `false`.


### Source Encoding

- `-e`
- `--source-encoding <encoding>`

It specifies the encoding character set of the _source document_.

The available choices come from the `Node.js` platform:
`ascii`, `latin1`, `utf8`, `utf-8`, `ucs2`, `ucs-2`, `utf16le`,
`utf-16le`, `utf16be`, `utf-16be`, `hex`, `base64`, and `base64url`.

By default: `utf8`.


### Source from STDIN

- `-i`
- `--stdin`

It uses the _standard input_ `STDIN` as the _source document_.


### Source from CLI Argument

- `-c`
- `--content <content>`

It uses the command line option argument to express the JSON content of
the _source document_.


### Source from File

- `-s`
- `--source <source>`

The filename of the _source document_ that will be transformed.


### Projection Encoding

- `-f`
- `--projection-encoding <encoding>`

It specifies the encoding character set of the _projection document_.

It offers the same choices as the [source encoding](#source-encoding) option.

By default: `utf8`.


### Projection Location

- `-p`
- `--projection <projection>`

The URL (_fetch_) or the local filename (_filesystem_) of the
_projection document_ that will be used to transform the _source_.

By default: it tries to use a ``projection.json`` file from the working
directory, raising an error if not exists.


### Projection Base URL (Fetch)

- `-u`
- `--projection-base-url <URL>`

The base URL, to (securize) limit access to projection modularization.


### Projection Base Directory (FileSystem)

- `-d`
- `--projection-base-dir <directory>`

The directory name, absolute or relative to the working directory, to
(securize) limit access to projection modularization.

By default: the working directory.


### Resultant Encoding

- `-g`
- `--resultant-encoding <encoding>`

It specifies the encoding character set for the _resultant document_.

It offers the same choices as the [source encoding](#source-encoding) option.

By default: `utf8`.


### Resultant to STDOUT

- `-o`
- `--stdout`

It writes the resultant document into the _standard output_ `STDOUT`
(like `console.log`).


### Resultant to File

- `-r`
- `--resultant <resultant>`

The filename for the _resultant document_ from the transformation; if a
directory is specified, the name will be the default; if a relative
filename is specified, it will be saved into the _working directory_.

By default: it tries to save into the working directory the file
``<stdin|content|basename(source)>--resultant--YYYYMMDDThhmmss.json``.


### Overwrite Resultant File If Exists

- `-w`
- ` --force-resultant`

If the filename for the _resultant document_ already exists, this option
allows that it will be overwritten; otherwise, an error will be raised
avoiding it.

By default: `false`.


### Maximum Number of Modules

- `--max-modules [integer]`

The maximum number of _projection modules_ that a single _projection
document_ can, directly or indirectly, import.

By default: `1000`. But if the option is present but no number is
specified, then the value will be preset to
[Number.MAX_SAFE_INTEGER](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER).


### Maximum Depth of Nesting

- `--max-depth [integer]`

The maximum logical nesting depth that `JM2MP` will evaluated as part of
any _projection document_.

By default: `1000`. But if the option is present but no number is
specified, then the value will be preset to
[Number.MAX_SAFE_INTEGER](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER).


### JMESPath

- `--jmespath`

It imports the _query adapter_ to use `jmespath` syntax as part of any
`JM2MP` _projection module_.

By default: `false`.


### JSONata

- `--jsonata`

It imports the query adapter to use `jsonata` syntax as part of any
`JM2MP` _projection module_.

By default: `false`.


### JSONata TimeOut

- `--jsonata-timeout [seconds]`

If `jsonata` syntax will be used, it allows to configure the _timeout
period (in seconds)_ before an error will be raised.

By default: `60`; also preset to `60` if option is presented but without
any specified value.


### JSONPath

- `--jsonpath`

It imports the query adapter to use `jsonpath` syntax as part of any
`JM2MP` projection module.

By default: `false`.


### JSON Pointer

- `--jsonpointer`

It imports the query adapter to use `jsonpointer` syntax as part of any
`JM2MP` projection module.

By default: `false`.


### JSON Query

- `--jsonquery`

It imports the query adapter to use `jsonquery` syntax as part of any
`JM2MP` projection module.

By default: `false`.


### Display the Help

- `-h, --help`

  It displays this help for command.


## Example of Use

Next screen capture shows how to _project_ (transform) a JSON document
using `JM2MP` syntax via this _command line_ utility `JM2MP.JS-CLI`, which
can be used interactively in any _shell_ or as part of batch processing
using _scripts_.

You can view this complete example of an
[inventory](./tutorial-04--examples.html#inventory-management)
in the corresponding tutorial.

![JM2MP.JS-CLI screen capture](./images/JM2MP.JS-CLI--ScreenCapture.png)

