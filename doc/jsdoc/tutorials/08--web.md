## Table of Contents

- [Introduction](#introduction)
- [Software Architecture and Components](#software-architecture-and-components)
- [Examples of Use](#examples-of-use)

## Introduction

As noted in the [Getting Started](./tutorial-01--getting-started.html)
tutorial, the `JM2MP` format can be used directly on web pages by
utilizing the `JM2MP.JS` library through various _content delivery networks_
(**CDN**) solutions, or even the source code published on
[GitHub](https://github.com/).

Direct use via
[GitHub's Raw User Content](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
is not recommended, since these websites throttle all requests they
receive and, when the number of requests becomes excessive, they block
access.

On the other hand, using _content delivery networks_ such as
[jsDelivr](https://www.jsdelivr.com/about) is an easy and
high-performance solution.


## Software Architecture and Components

The JavaScript source code of `JM2MP.JS` is based on modern
[ESM modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules).
That means that, as a library, must be imported into other solutions in
a specific way.

The [jsDelivr's documentation](https://www.jsdelivr.com/documentation)
is an excellent starting point for learning not only how to integrate
any existing package, such as `JM2MP.JS`, into your own solution, but
also how to publish your solution so that others can integrate it into
theirs.


## Examples of Use

The [JM2MP-JS-WWW](../jm2mp.js-www/index.html) directory offers two
different examples about how to integrate `JM2MP.JS` into web pages:

- [Static Example (CDN)](#static-example-cdn)
- [Interactive Example](#interactive-example)

### Static Example (CDN)

The source code of the [Static Example (CDN)](../jm2mp.js-www/cdn.html)
shows how easy it is to integrate the JavaScript code from the `JM2MP`
library into an HTML web page.

Basically, it involves creating an _ESM module_ in a separate file and
calling it from the HTML page.

Readers should keep in mind that using _ESM modules_ requires meeting
certain conditions. The most notable difference from traditional scripts
(now called _Common JavaScript_, or _CSJ_ for short) is that each module
has its own _scope_, and any element intended for use outside the module
 ust first be _exported_.

### Interactive Example

The [Interactive Example](../jm2mp.js-www/interactive.html) is a
comprehensive example in HTML format that allows you to edit both the
_source document_ and the _projection document_ on a single web page, as
well as validate and execute the _projection_ on the _source_ and
directly obtain the _resultant document_.

Furthermore, thanks to the use of the [Ace9](https://ace.c9.io/)
web-based source code editor, the edited documents feature both **syntax highlighting** and **real-time syntax validation** (JSON in all cases).

Due to the complexity of the source code editor, this example may need
to be viewed on a computer to be fully functional, rather than on mobile
devices.

For the user's convenience, this 
[Interactive Example](../jm2mp.js-www/interactive.html) includes buttons
to immediately load the three main examples used throughout the `JM2MP`
documentation:
[courses and students](./tutorial-04--examples.html#courses-and-students),
[inventory management](./tutorial-04--examples.html#inventory-management), and
[calculating Pi (&pi;) recursively](./tutorial-04--examples.html#calculating-pi-recursively).
Please refer to the [Examples tutorial](./tutorial-04--examples.html) for more details about each one.

![Screen capture of the interactive example](/images/JM2MP.JS-WWW--ScreenCapture-01--InteractiveExample.png)