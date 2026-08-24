## Table of Contents

- [Introduction](#introduction)
- [Data processing](#data-processing)
  - [Batch Processing](#batch-processing)
- [API Gateway](#api-gateway)
- [Infrastructure as Code](#infrastructure-as-code)

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

The [How to Project Other Usual Document Formats](./tutorial-04--how-to-project-other-formats.html)
tutorial offers ideas about combining `JM2MP` format when also other
file formats are involved.

### Batch processing

As a special subcase of [data processing](#data-processing), **batch
processing** is essential in more traditional contexts, where _shell
scripts_, _process schedulers_ and _file access_ are used.

Therefore, it is equally important that the `JM2MP.JS` library provides
its functionality through a _command line interface_ (CLI).

Alternatives like [jq](https://jqlang.org/) or
[JMESPath jp](https://jmespath.org/libraries.html#jmespath-tools)
can handle the query or even the aggregation part of the processing, but
a complete transformation of the data files will require combining
several steps and, possibly, a complex script to link them together.

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
specific _framework_), available in the `${JM2MP.JS}/src/api/`
subdirectory.

## Infrastructure as Code

[Infrastructure as Code (IaC)](https://www.ibm.com/think/topics/infrastructure-as-code)
is the practice of managing infrastructure resources as if they were
source code (that is, using configuration files and scripts, properly
automated with tools designed for these tasks) rather than managing
infrastructure assets manually.

Thus, instead of installing and configuring each software intensive
system using _point and click_ or _interactive shells sessions_, every
configuration detail and decision can be properly documented and
recorded in an IaC file.

These files are then managed as if they were source code (they undergo
version control and testing) and are processed by specific IaC tools
(such as [Ansible](https://docs.ansible.com/) or [Terraform](https://developer.hashicorp.com/terraform)),
which execute these configurations and validate the resulting systems
against the expected specifications, thereby creating, updating or
shutting down platforms composed from a single system to an entire
platform with hundreds of components.

The main advantages of treating infrastructure as code can be summarized
as follows:

- Since these IaC files are usually written in text formats, it is
  possible to track changes to the specifications (for instance, using
  [Git](https://git-scm.com/)), as well as detect and validate any
  configuration to be deployed.

- Thanks to the automation provided by dedicated IaC tools, a given
  configuration always results in the deployment of exactly the same
  platform (or the deploy will be _rolled back_), thereby preventing
  manual errors.

There are several approaches about IaC files:

- One approach involves using only configuration files that contain all
  the specifications of the target platform to be managed. These
  configuration files use more or less structured text formats (such as
  [XML](https://www.w3.org/XML/), [JSON](https://www.json.org/json-en.html),
  [YAML](https://yaml.org/), or [TOML](https://toml.io/en/), to name the
  usual ones).

- Another approach involves the providers of the target infrastructure
  offering a platform-specific _application programming interface_ (API)
  or _software development kit_ (SDK), which requires users to develop
  scripts or applications using programming languages (such as
  [C# (Microsoft Azure)](https://learn.microsoft.com/en-us/dotnet/azure/sdk/azure-sdk-for-dotnet),
  [Java (Oracle OCI)](https://docs.oracle.com/es-ww/iaas/Content/API/SDKDocs/javasdk.htm),
  [Go (DigitalOcean)](https://docs.digitalocean.com/reference/libraries/),
  [Python (Amazon AWS)](https://docs.aws.amazon.com/cdk/v2/guide/work-with-cdk-python.html),
  or [JavaScript (Salesforce Heroku)](https://devcenter.heroku.com/articles/platform-api-quickstart),
  just to show some real examples) making use of these APIs and SDKs to
  automate its deployments.

- A third approach (which arises precisely from the proliferation of
  IaC-specific tools and platforms, many of which come from vendors for
  working only in their own platforms) involves the creation of tools
  that define their own IaC files, promising greater generality,
  interoperability, and ease of use than those of the various target
  platforms. Languages like
  [Terraform Configuration Language](https://developer.hashicorp.com/terraform/language)
  and tools like [OpenTofu](https://opentofu.org/) are trying to
  fullfill this function.

The [Abstract Behavioral Specification (ABS) Language](#https://abs-models.org/publications-and-workshops.html)
is an example of academic formalization of several aspects linked to IaC,
combining specification and verification of infrastructure models.

Thanks to `JM2MP`'s ability to modularize its _projection documents_, it
is possible to design a cross-platform system for the design and
deployment of multi-cloud infrastructures. Following the principles of
the [OMG's Model Driven Architecture (MDA)](https://www.omg.org/mda/),
you can build a workflow that translates your own deployment model
(written in JSON) into the formats supported by these cloud platforms
(such as [AWS CloudFormation Templates](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-overview.html#cfn-concepts-templates)
or [Azure ARM Templates](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/overview), to name two examples).
This way, it would be enough to simply update the JSON model with the
desired changes to the architecture and the translation system would
update the code needed to implement them.

