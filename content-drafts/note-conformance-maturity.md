# Conformance Testing Maturity: Multi-Protocol Spec Validation and SARIF Reports

Date: 2026-05-23
Status: Draft

Conformance testing was a secondary feature for most of MockForge's early life — check request syntax, validate a few OpenAPI constraints, pass or fail. The v0.3.x cycle turned it into a structured testing framework. This note covers what changed and what the current system does.

## The three problems conformance testing needed to solve

**Spec validation is not the same as mock configuration.** You can have a perfectly valid OpenAPI spec that generates unusable mocks — missing examples, overly broad schemas, recursive definitions that produce infinite response bodies. Conformance testing needed to validate that the mock behavior matched the spec, not that the spec was technically valid.

**Coverage across protocols is uneven.** An HTTP conformance check looks at method, path, status code, and body. A gRPC check needs to validate the proto contract, the streaming direction, and the type-level correctness of responses. A Kafka check validates message schemas against the registered Avro/Protobuf/JSON schema. The framework had to support all three without three separate implementations.

**Output formats matter for CI.** A JSON list of "passed: true/false" is enough for a dev machine. A CI pipeline needs SARIF output for GitHub code scanning alerts, structured failure metadata for team dashboards, and human-readable summaries for PR descriptions.

## What the current framework does

The conformance framework now supports 47 individual checks across 11 categories:

- **Spec validity** — schema parsing, $ref resolution, type checking
- **Content negotiation** — Accept headers, content-type, response encodings
- **Parameter handling** — query, path, header, cookie params against spec constraints
- **Request body validation** — required fields, type constraints, enum values
- **Response schema validation** — response body matches the spec's response schema
- **Status code coverage** — every defined response code is reachable
- **Security scheme validation** — auth headers, API key placement, OAuth2 scopes
- **Example extraction** — spec examples render as valid mock responses
- **Multi-target conformance** — same spec tested against multiple proxy targets
- **SARIF report generation** — structured output for CI integration
- **gRPC/Kafka conformance** — contract-level checks for non-HTTP protocols

## Running checks

The CLI exposes per-category flags for targeted runs:

```bash
# All conformance checks against a spec
mockforge bench --conformance --spec api.yaml

# Only response schema validation
mockforge bench --conformance response-schema --spec api.yaml

# Full report with SARIF output
mockforge bench --conformance --spec api.yaml \
  --conformance-report conformance-report.json \
  --conformance-sarif report.sarif
```

The SARIF output includes endpoint-level metadata: which operation failed, what the spec expected, what the mock returned, and a human-readable explanation of the mismatch.

## Lessons from building it

**Spec examples drift from spec schemas.** We found that many OpenAPI specs have examples that violate the schema they document — extra fields, wrong types, missing required properties. The conformance framework now flags these as warnings rather than failures, because teams generally want to fix the spec, not break CI on existing examples.

**Cross-protocol coverage is mostly about the contract layer.** Once we separated "the spec says X" from "the mock responds with Y," the same validation patterns applied to gRPC and Kafka. The protocol-specific code is limited to the wire format — the contract checking logic is shared.

**SARIF adoption is uneven across platforms.** GitHub Actions natively surfaces SARIF annotations. GitLab CI can ingest it with configuration. Other CI systems need the JSON report instead. We publish both formats from the same run.

## CTA

- [Full conformance testing guide](https://docs.mockforge.dev/CONFORMANCE_TESTING.html)
- [MockForge docs](https://docs.mockforge.dev)
- [GitHub](https://github.com/SaaSy-Solutions/mockforge)
- [View Pricing](/pricing.html)