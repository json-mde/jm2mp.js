## Table of Contents

- [Introduction](#introduction)
- [Software Architecture and Components](#software-architecture-and-components)
- [Examples of Use](#examples-of-use)

## Introduction

As noted in the [Getting Started](./tutorial-01--getting-started.html)
tutorial, the `JM2MP` format can be used through web services by
utilizing the `JM2MP.JS` library. This kind of client application or
server integration must use the [Node.js](https://nodejs.org/en/about)
(or compatible) platform and the [NPM](https://docs.npmjs.com/about-npm)
_package manager_.

To install `JM2MP.JS` as a dependency of your project, you must first
install it:

```bash
npm install --save @json-mde/jm2mp
```

## Software Architecture and Components

The JavaScript source code of `JM2MP.JS` is based on modern
[ESM modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules).
That means that, as a library, must be imported into other solutions in
this specific way.

The `JM2MP.JS` library offers a two-level _application programming
interface_ (**API**). The documentation contained in the module
[jm2mp/index](./module-jm2mp_index.html) explains how to use each level.


## Examples of Use

The _packages_ [@json-mde/jm2mp-express4](https://www.npmjs.com/package/@json-mde/jm2mp-express4)
and [@json-mde/jm2mp-express5](https://www.npmjs.com/package/@json-mde/jm2mp-express5) have been
developed as examples of the combined use of `JM2MP.JS` as part of the
[middleware](https://expressjs.com/en/5x/guide/using-middleware/) for
the popular _web development framework_ [Express.js](https://expressjs.com/).

Due to the changes in the internal architecture of this framework between
[versions 4 and 5](https://expressjs.com/en/guide/migrating-5/), two
different packages are therefore provided, each one adapted to the
corresponding version of [Express.js](https://expressjs.com/en/resources/).
Note that, for practical purposes, version 4 is designed with synchronous
components in mind, while version 5 has been adapted to primarily support
asynchronous (more modern) components.

```bash
# It clones the source code repository in your own computer.
git clone https://github.com/json-mde/jm2mp.js-express5.git MyJm2mpExpress5;
# It starts the demonstration web server integration JM2MP in it.
cd MyJm2mpExpress5;
npm start;
```
