## Table of Contents

- [Introduction](#introduction)
- [About](#about)
- [Licensing](#licensing)
- [Basic terminology](#basic-concepts)
- [Usage](#usage)
  - [Direct web access](#direct-web-access)
    - [GitHub Pages](#github-pages)
    - [Content Delivery Network (CDN)](#content-delivery-network-cdn)
  - [Installation](#installation)
    - [GitHub download](#github-download)
    - [Node.JS and Node Package Manager (NPM)](#nodejs-and-node-package-manager-npm)

## Introduction

**JSON Model-to-Model Projections** (`JM2MP`) is both a JSON-based format
to transform algebraically any input JSON document into another output
JSON document and the JavaScript library `JM2MP.JS` to execute such
transformations.

`JM2MP.JS` offers you:

- A JavaScript [EM2024](https://tc39.es/ecma262/2024/) library to execute
  `JM2MP` transformations as part of your applications and services.

- An script `./cli.js` to execute transformations (using, for instance,
  [Node.JS](https://NodeJS.ORG/en)) as part of an on-line and interactive
  _command-line interface_ (CLI), or as part of a batch processing in a
  _shell script_.

- A web page `./web/index.html` to test interactively in your own web
  browser how to use `JM2MP`.

- Examples of [Express.JS](https://Express.JS/) middleware, written with
  subtle variations for versions
  [4](https://expressjs.com/en/4x/guide/using-middleware/) and
  [5](https://expressjs.com/en/5x/guide/using-middleware/) of this
  specific framework.

## About

`JM2MP` and `JM2MP.JS` has been design and develop by
[Luis Maria CAMARA ROSSI](mailto:lcamara8@alumno.uned.es) as part of his
work toward a **Doctor in Philosophy (Ph.D.) degree** in
**Doctoral Programme in Engineering of Systems and Control**<sup>[[1](https://www.uned.es/universidad/facultades/en/escueladoctorado/programas-de-doctorado/doctorado-en-ingenieria-de-sistemas-y-control.html)]</sup><sup>[[2](https://blogs.uned.es/doct-ing-sist-cont/)]</sup>.

I would like to extend special thanks to my tutor
[Elena RUIZ LARROCHA](https://www.uned.es/universidad/docentes/informatica/elena-ruiz-larrocha.html)
and my director
[José Antonio CERRADA SOMOLINOS](https://www.uned.es/universidad/docentes/informatica/jose-antonio-cerrada-somolinos.html)
for their contributions throughout my doctoral studies, as well as to all other members of the
[ISSI](https://www.uned.es/universidad/facultades/en/departamentos/ingenieria-del-softw-y-sist-informaticos.html)
and rest of Departments in the [School of Computer Science](https://www.uned.es/universidad/facultades/informatica.html).

I would also like to thank _María Isabel Cámara_ and _Kulvir Sroy_ for
their invaluable assistance during the translation of this article and
other texts I wrote as part of my doctoral studies.

## Licensing

Both `JM2MP` format and `JM2MP.JS` library are licensed under
[BSD-3-Clause](https://spdx.org/licenses/BSD-3-Clause.html), so you can
get the source code and all its products, and derive it for your own
specific needs. But, please, remember the conditions under such
license about redistribution, attribution and endorsement.

## Basic concepts

Using `JM2MP.JS` JavaScript library anyone can transforms **source**
(_input_) JSON documents declared in a **projection** (_transformation_)
JSON document into **resultant** (_output_) JSON documents.

The **projection documents** use the `JM2MP` syntax, which is entirely
based on JSON, to perform these transformations.

A _projection_ is a composition of **command templates**, which are the
actual operations that you can use to transform JSON values.

Several _command templates_ would be combined into a **named template**,
similar to a (macro) function, that can be invoked several times during
a _projection_.

Complex _projections_ can be divided into separate files called
**projection modules**, which makes it easier to reuse _named templates_
and, at the same time, reduces the complexity that would be involved in
working with a single, large projection.

The tutorial [JM2MP Syntax](./tutorial-02--jm2mp-syntax.html)
discusses all of these topics in greater detail.

## Usage

There are several ways to use `JM2MP.JS` directly from any modern web
browser: direct web access (vía GitHub raw user content or CDN) or
installation (manually downloading source code or installing it using
NPM).

### Direct web access

#### GitHub Pages

Everyone can access specific files from a GitHub repository using
[https://raw.githubusercontent.com/lmcamara-aldeas/pixel-aid-connect/main/src/assets/hero-image.jpg](https://raw.githubusercontent.com/lmcamara-aldeas/pixel-aid-connect/main/src/assets/hero-image.jpg)
instead of usual
[https://github.com/lmcamara-aldeas/pixel-aid-connect/blob/main/src/assets/hero-image.jpg](https://github.com/lmcamara-aldeas/pixel-aid-connect/blob/main/src/assets/hero-image.jpg)
URL.

This way, you can link to specific files of `JM2MP.JS` library to use
them from your own applications and services.


##### Content Delivery Network (CDN)

Using [CDN](https://www.akamai.com/glossary/what-is-a-cdn) services like
[jsDelivr](https://www.jsdelivr.com/) allows the `JM2MP.JS` library to
be used in web applications without the need for prior installation, <span style="background:yellow">
thanks to the use of [WebPack](https://webpack.js.org/concepts/) as a
code _bundler_</span>.

Next, you can see an extract from file `./web/jm2mp-cdn.html`. You can
save it to your hard disk drive and open it with any modern browser to
see it working:

```html
<script type="module">
  import JM2MP from 'https://cdn.jsdelivr.net/npm/@json-mde/jm2mp@1.0.0/+esm' ;
</script>
```

As previuosly mentioned, you can access the full file from
([https://raw.githubusercontent.com/lmcamara-aldeas/pixel-aid-connect/main/src/assets/hero-image.jpg](https://raw.githubusercontent.com/lmcamara-aldeas/pixel-aid-connect/main/src/assets/hero-image.jpg)) URL.

### Installation

#### GitHub download

Source code of the `JM2MP.JS` library is published in [GitHub](https://github.com/):

- [https://github.com/json-mde/jm2mp.js/](https://github.com/json-mde/jm2mp.js/)

You can directly download (only but all) source code as one single ZIP compressed file.

An [inmutable](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
[release](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
tagged as `1.0.0` has also been published; it consists of several files
to make it easier to download the desired content: everything, only the
source code, or only this documentation.

#### Node.JS and Node Package Manager (NPM)

You can install `JM2MP.JS` using [Node Package Manager (NPM)](https://npmjs.org/) for [Node.JS](https://nodejs.org/en/download) (version 22, at least) runtime.

```bash
npm install --save @json-mde/jm2mp
```

This is the way how to use `JM2MP.JS` library as part of a project that
isn't just a simple web page, such as complex applications or services.
