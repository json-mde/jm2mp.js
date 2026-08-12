## Table of Contents

- [Introduction](#introduction)
- [Data processing](#data-processing)
  - [Batch Processing](#batch-processing)
- [API Gateway](#api-gateway)
- [Infraestructure as Code](#infraestructure-as-code)

## Introduction

In this tutorial, we will examine several use cases in which the `JM2MP`
format and its associated `JM2MP.JS` library are of particular interest.

## Data processing

The first use case, perhaps the clearest of all, involves processing
information using the `JM2MP` format and its library.

Today, the JSON data format is ubiquitous in most applications; to name
a few examples, it is commonly used to set configuration parameters,
record log events, store user information, or communicate with external
systems (such as web services, third-party applications, or Internet of
Things -IoT- devices).

Using `JM2MP` allows you to search for data, filter and modify the
information found: whether to reduce it or expand it with new
information, aggregate data from various sources, or summarize it
through specific operations.

### Batch processing

As a special subcase of [data processing](#data-processing), **batch
processing** is essential in more traditional contexts, where _shell
scripts_, _process schedulers_ and _file access_ are used.

Therefore, it is equally important that the `JM2MP.JS` library provide
its functionality through a _command line interface_ (CLI).

## API Gateway

As part of modern web application and service deployments, an
architectural component called [API Gateway](https://www.ibm.com/think/topics/api-gateway)
is used to analyze and route various web requests based on a range of
criteria, such as the path URL, device type, or the client's geographic
location.

Furthermore, these _API Gateways_ are also responsible for processing
output results, filtering or masking information under certain conditions
to prevent, for example, the exfiltration of sensitive information or
error messages that could compromise the platform running the exposed
service.

Again, when these web services use JSON data, rather than requiring each
_API Gateway_ to provide its own syntax for querying, filtering, and
modifying the data, it would be possible to unify all these operations
under a recognized standard, thereby yielding benefits such as avoiding
_vendor lock-in_ to a specific platform.

## Infraestructure as Code

...

<span style="color:yellow;background:red;">FALTA</span>

