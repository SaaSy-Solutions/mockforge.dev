# Release Notes: gRPC Dynamic Routing, $ref Resolution, and Protocol Handler Refactor (v0.3.70–v0.3.75)

Date: 2026-05-22
Status: Draft

The v0.3.70 through v0.3.75 range was a consolidation release focused on the gRPC layer, spec resolution correctness, and conformance testing infrastructure. This note covers the changes that mattered most.

## gRPC Dynamic Routing

The gRPC listener was routing by service/method name via a fixed mapping table. That approach worked for simple protos but broke on any service definition that used package nesting, imported types from other protos, or had methods with complex input types.

The new `dynamic/routing.rs` introduces a routing layer that inspects the incoming gRPC request's service name and method against the registered services at request time — a 476-line module that replaced the static mapping approach. Key behaviors:

- **Method-level routing** by full qualified service name (`package.ServiceName/Method`)
- **Schema-aware response generation** using the reflected proto descriptor — the mock generates type-correct responses with field-level defaults from the proto
- **Streaming response support** — both server-streaming and client-streaming RPCs now have response patterns defined at the method level rather than being treated as unit-delimited message sequences

The change was driven by the HTTP bridge feature. When the bridge converts a REST-style request into a gRPC call, the target service and method are determined at runtime, not at startup — the routing layer had to support late-binding dispatch.

## $ref Resolution for Specs

OpenAPI specs that use `$ref` extensively — especially cross-file and nested references — were causing parsing failures that surfaced as missing routes. We resolved one-level `$ref` for security schemes, parameters, request bodies, and responses across the core spec parser.

The conformance spec-driven ref resolver now also supports recursive resolution for nested `$ref` chains. The practical effect: specs exported from Stoplight, Postman, and SwaggerHub — which use `$ref` heavily — now load without manual patching.

## Protocol Handler Interior Mutability

A subtle but consequential refactor: `ProtocolHandler` trait methods `set_enabled` and `update_configuration` changed from `&mut self` to `&self`. This means protocol handlers can now be reconfigured without holding exclusive references, which unblocks concurrent protocol state changes — enabling live config updates through the admin UI without restarting the mock server. The change rippled through the core protocol registry and all seven protocol handler implementations.

## Schema-Aware HTTP Bridge Responses

The HTTP bridge (automatic gRPC-to-REST conversion) previously returned a generic JSON structure for gRPC responses. The bridge now uses the proto schema to generate response bodies with the correct field types, names, and default values — so a REST client consuming the bridged endpoint gets payloads that match the proto definition.

## CTA

- [gRPC mocking docs](https://docs.mockforge.dev/user-guide/grpc-mocking.html)
- [Conformance testing guide](https://docs.mockforge.dev/CONFORMANCE_TESTING.html)
- [View on GitHub](https://github.com/SaaSy-Solutions/mockforge)
- [View Pricing](/pricing.html)