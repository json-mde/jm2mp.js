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

Alternatives like [jq](https://jqlang.org/) or
[JMESPath jp](https://jmespath.org/libraries.html#jmespath-tools)
can handle the query or even the aggregation part of the processing, but
a complete transformation of the data files will require combining
several steps and, possibily, a complex script to link them together.

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

Some examples of transformation capabilities are, to show a few:
- [Transform API requests and responses for HTTP APIs in API Gateway (Amazon AWS)](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-parameter-mapping.html)
- [Mapping template transformations for REST APIs in API Gateway (Amazon AWS)](https://docs.aws.amazon.com/apigateway/latest/developerguide/models-mappings.html)
- [Tutorial: Transform and protect your API (Microsoft Azure API Management)](https://learn.microsoft.com/en-us/azure/api-management/transform-api)
- [8 Common API Gateway Request Transformation Policies](https://konghq.com/blog/engineering/api-gateway-request-transformation)
- [Building a Kong Gateway Plugin with JavaScript (Kong)](https://konghq.com/blog/engineering/kong-gateway-plugin-javascript)
- [DataWeave Body Transformation, Inbound Policies Directory for Omni Gateway (MuleSoft from Salesforce)](https://docs.mulesoft.com/gateway/1.13/policies-included-dataweave-body-transformation)
- [DataWeave 2.12 Language Guide (MuleSoft from Salesforce)](https://docs.mulesoft.com/dataweave/2.12/dataweave-language-guide)

Again, when these web services use JSON data, rather than requiring each
_API Gateway_ to provide its own syntax for querying, filtering, and
modifying the data, it would be possible to unify all these operations
under a recognized standard, thereby yielding benefits such as avoiding
_vendor lock-in_ to a specific platform.

The `JM2MP.JS` library also provides an example of how to use the `JM2MP`
format as part of a web service. To do this, it includes the source code
needed to create a module that performs projections using
[Express.JS](https://Express.JS/) _middleware_ (written with slight
variations for versions [4](https://expressjs.com/en/4x/guide/using-middleware/)
and [5](https://expressjs.com/en/5x/guide/using-middleware/) of this
specific _framework_), available in the `${JM2MPJS}/src/api/`
subdirectory.

## Infraestructure as Code

...

<span style="color:yellow;background:red;">FALTA</span>

