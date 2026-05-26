# Extending MockForge with WASM Plugins: Custom Mocks Without Forking

Date: 2026-05-21
Status: Draft

Most mock servers let you configure responses. Few let you program them. The gap shows up the moment you need a mock that does something the YAML config can't express — compute a response from a database lookup, generate a payload based on the caller's identity, or implement a custom handshake that no built-in protocol understands.

MockForge's plugin system lets you write custom logic compiled to WebAssembly. The plugin runs inside the mock server process, sharing memory but not trust — the WASM sandbox prevents the plugin from accessing the host system. Here's how it works and what it enables.

## Why WASM, not a scripting language

Three reasons:

- **Sandboxed by default.** A WASM module cannot syscall, open files, or reach the network. It receives only the data the host explicitly passes it — request context, mock state, and plugin inputs. For a tool that teams deploy in CI and internal environments, this matters: a malicious or buggy plugin can't escape its sandbox.
- **Language-agnostic.** Compile to WASM from Rust, Go, C, C++, Zig, AssemblyScript, or any language with a WASM target. Teams already writing their services in Rust can write plugins in the same language.
- **Predictable performance.** WASM runtimes (wasmtime in MockForge's case) compile to native code with predictable overhead — typically microseconds to call a plugin function, no GC pauses.

## How plugins work

A plugin is a WASM module that exports a set of lifecycle functions. MockForge discovers plugins from a configured path, loads them at startup, and calls into them at defined extension points:

```yaml
plugins:
  paths:
    - ./plugins/custom-generator.wasm
    - ./plugins/db-lookup.wasm
```

Each plugin exports a `plugin_metadata` function that declares which extension points it hooks — response generation, request validation, data transformation, or custom protocol handling.

## Writing a custom response generator

A plugin that generates responses based on the request body doesn't need to parse JSON inside the WASM — MockForge passes the parsed request data as typed values. Here's a Rust plugin skeleton:

```rust
use mockforge_plugin_sdk::*;

#[no_mangle]
pub extern "C" fn plugin_metadata() -> Metadata {
    Metadata {
        name: "discount-calculator",
        version: semver!("0.1.0"),
        hooks: &[Hook::ResponseGeneration],
    }
}

#[no_mangle]
pub extern "C" fn generate_response(ctx: &RequestContext) -> Response {
    let tier = ctx.request_body.field("customer_tier").as_str();
    let base_price = ctx.request_body.field("base_price").as_f64();

    let discount = match tier {
        "premium" => 0.20,
        "business" => 0.10,
        _ => 0.0,
    };

    Response::json(serde_json::json!({
        "final_price": base_price * (1.0 - discount),
        "discount_applied": discount > 0.0,
    }))
}
```

Compile with `cargo build --target wasm32-wasip1 --release`, place the `.wasm` in the plugins directory, and the generator is available on every request.

## Practical use cases

**Database-derived responses.** A plugin that connects to a real database (via the host's allowed-socket list, not from inside WASM) to return live reference data within an otherwise mocked environment. This lets you mock the service boundary while keeping the data layer real — useful for integration tests that need to validate against actual reference tables.

**Protocol-specific transforms.** MockForge's HTTP bridge converts gRPC calls to REST automatically. A plugin can add custom header mapping or content negotiation logic for endpoints where the default conversion doesn't match the real API.

**Dynamic scenario selection.** Instead of hardcoding test scenarios in the mock config, a plugin can select a scenario based on the authenticated user, the time of day, or a test-run parameter passed as a custom header. The same mock deployment serves different teams with different scenarios.

## When to use a plugin vs config

If your custom behavior is expressible as a template expansion or a conditional in the YAML config, do that. The config path is simpler, easier to debug, and doesn't require a separate build step. Use a plugin when:

- The response depends on an external data source
- The behavior requires conditional logic across multiple requests (session state)
- You need to implement a protocol or wire format the built-in listeners don't cover

## Growing the system

The plugin SDK is at v0.3 and the hook surface grows with each release. Current extension points cover response generation, request validation, and data transformation. Upcoming releases add plugin access to the mock's stored state and multi-request session tracking, which enables plugin-authored scenario flows.

## CTA

- [Plugin SDK docs](https://docs.mockforge.dev/plugins)
- [GitHub: plugin examples](https://github.com/SaaSy-Solutions/mockforge/tree/main/examples/plugins)
- [View Pricing](/pricing.html)