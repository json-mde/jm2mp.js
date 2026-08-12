## Table of Contents

- [Introduction](#introduction)
- [Dependencies](#dependencies)
- [Customization of the generation template](#customization-of-the-generation-template)
- [Generation and releasing](#generation-and-releasing)

## Introduction

The original repository for the `JM2MP` document format and this `JM2MP.JS` library,
[https://github.com/JSON-MDE/JM2MP.JS](https://github.com/JSON-MDE/JM2MP.JS),
contains not only  the source code but also a complete set of documentation.

This tutorial will guide you through the process of generating that
documentation, combining comments from the original source code with
additional material like all existing tutorials.

## Dependencies

The `JM2MP.JS` library uses the _documentation template_
[tidy-jsdoc](https://julie.io/projects/tools/tidy-jsdoc), which in turn
is based on and uses [JSDoc](https://jsdoc.app/) as _documentation
generation engine_.

Both dependencies parse, extract and manage all
[JSDoc comments](https://jsdoc.app/about-getting-started)
found in the library's source code.

In addition, several tutorials have been written using
[Markdown](https://daringfireball.net/projects/markdown/) (such as this
one), to introduce, guide you through, and document all aspects
of the `JM2MP` document format and this `JM2MP.JS` JavaScript library.

## Customization of the generation template

The [tidy-jsdoc](https://www.npmjs.com/package/tidy-jsdoc) template used
by `JM2MP.JS` requires some customizations in order to produce the
desired results.

The directory `./doc/jsdoc/` contains all these customizations:

- The subdirectory `./doc/jsdoc/static/` is configured to be copied to
  the generated documentation, and as its name implied, contains static
  files (CSS stylesheets, images and TXT website files).

- The subdirectory `./doc/jsdoc/tmpl/tidy-jsdoc/` contains modified
  files to be manually overwritten over the distributed
  [tidy-jsdoc source code](https://github.com/julie-ng/tidy-jsdoc),
  before the generation process runs.

  It's worth noting the JavaScript code injections in `tutorial.tmpl`
  used to properly configure the _table of contents_ and mark _external
  links_ in each [Markdown-based](https://jsdoc.app/plugins-markdown)
  tutorial.

- The subdirectory `./doc/jsdoc/tutorials/` contains all
  [tutorials](https://jsdoc.app/about-tutorials) for `JM2MP.JS`,
  presented using the additional configuration file `tutorials.json`.

The `./src/README.md` and `./src/LICENSE.txt` files are also
[included](https://jsdoc.app/about-including-readme) into the final
documentation generated.

The file `./src/JSDoc.config.json` contains the _configuration_ for both
[JSDoc (about configuring the engine)](https://jsdoc.app/about-configuring-jsdoc) and
[tidy-jsdoc (customize the template)](https://github.com/julie-ng/tidy-jsdoc/blob/main/README.md#customize-the-template),
in order to properly generate the desired final documentation.

## Generation and releasing

The `JM2MP.JS` project file, `./src/package.json`, defines several
[scripts](https://docs.npmjs.com/cli/v12/using-npm/scripts)
to completely generate the project documentation:

```json
  "scripts": {
    "all": "npm run test:coverage && npm run eslint && npm run jsdoc",
    "jsdoc": "npm run jsdoc@windows",
    "jsdoc@windows": "DEL /Q /F /S ..\\doc\\jsdoc-out\\ && .\\node_modules\\.bin\\jsdoc.cmd --configure .\\JSDoc.config.json",
    "jsdoc@linux": "./node_modules/.bin/jsdoc --configure ./JSDoc.config.json",
    // ...other scripts also declared.
  },
```

As you can read, by default documentation generation will execute the
_Windows_ version but it is easy to change such configuration to execute
by default the _Linux/UNIX_ variation. Note that these changes can be
applied to both
[JSDoc (document generation)](https://jsdoc.app/about-commandline) and
[AJV-CLI (CLI for JSON-Schema validator)](https://ajv.js.org/packages/ajv-cli.html).

Executing `npm run jsdoc` in your _shell_ will create a new directory
`./doc/jsdoc-out/` containing the final documentation, which can be
archived using any utility (like
[TAR](https://manpages.debian.org/trixie/tar/tar.1.en.html) or
[GZIP](https://manpages.debian.org/trixie/gzip/gzip.1.en.html), to name
a few) and released as desired.

The original source code repository
[https://github.com/JSON-MDE/JM2MP.JS](https://github.com/JSON-MDE/JM2MP.JS)
contains a copy of all releases made, including both source code and documentation.
