# Fault Injection and Chaos Patterns Across Protocols

Date: 2026-05-20
Status: Draft

Static mocks give false confidence. They return the same response every time, so your code passes in dev and breaks at the worst possible moment in production because nobody tested a slow database or a dropped connection.

Fault injection is the practice of introducing controlled failures into your mocks to exercise the error-handling paths your code actually ships with. Here's what that looks like across the protocols MockForge supports, with patterns that work in CI.

## Why fault injection matters

A mock that never fails is a mock that trains your team to skip error handling. The patterns here are the ones we see teams discover during incident retrospectives — the retry that was never configured, the backoff that timed out before the actual recovery window, the consumer that silently committed an offset past an unprocessed message.

## Fault injection primitives

MockForge provides four primitives that compose across protocols:

- **Latency injection** — delay responses by a fixed amount or a sampled distribution
- **Failure injection** — return protocol-native errors (HTTP 503, gRPC Unavailable, Kafka NOT_LEADER)
- **Data drift** — corrupt or modify response payloads probabilistically
- **Connection degradation** — drop, throttle, or fragment connections at the transport layer

These are configured per-route or per-topic, not globally, so a slow payment endpoint coexists with a fast health-check endpoint.

## HTTP: playing with timeouts

The most common failure pattern is a backend call that takes longer than the client's timeout. MockForge models this at the route level:

```yaml
http:
  routes:
    - method: GET
      path: /api/orders/:id
      latency:
        min_ms: 2000
        max_ms: 5000
        distribution: uniform
```

The 500ms timeout your client shipped to production will fire on roughly 80% of these requests. Tests that fail under this profile surface hard-coded timeout constants, missing context deadline propagation, and retry loops that never terminate because they use equal timeouts on each attempt.

## gRPC: deadline propagation and Unavailable errors

gRPC's timeout model is richer than HTTP's because clients propagate deadlines across service boundaries. A mock gRPC server that delays responses beyond the propagated deadline reveals whether your service's calls to downstream services have reasonable cascading deadlines, or whether the total timeout chain exceeds the original RPC deadline:

```yaml
grpc:
  services:
    - name: OrderService
      methods:
        - name: CreateOrder
          faults:
            - kind: grpc_unavailable
              probability: 0.1
            - kind: delay
              ms: 3000
              probability: 0.2
```

The 10% Unavailable rate means your client's retry-with-backoff code actually gets tested. The 20% delay over 3 seconds means the call exceeds most reasonable deadlines. Both fire independently on each RPC, so you get combinatorial coverage without writing combinatorial test cases.

## Kafka: broker failures your client can't reproduce on a real broker

Kafka clients handle broker failures through metadata refresh, leader re-election, and retry logic. These paths are critical and almost never tested because reproducing them on a real broker requires a cluster with specific partition assignments:

```yaml
kafka:
  topics:
    - name: orders.created
      faults:
        - kind: produce_not_leader
          probability: 0.05
        - kind: produce_throttle
          delay_ms: 1500
          probability: 0.15
        - kind: offset_out_of_range
          partition: 0
          probability: 0.03
```

The `produce_not_leader` fault triggers the client's metadata refresh and re-targeting logic. The offset-out-of-range fault on the consumer side forces the consumer through its position-reset decision (earliest, latest, or none). These are the two most common Kafka production failures and neither is testable against a single-broker testcontainers setup.

## WebSocket: connection degradation

WebSocket connections degrade in ways that HTTP clients never see — partial message delivery, heartbeats arriving late, reconnection storms after an intermediary drops idle connections:

```yaml
ws:
  endpoints:
    - path: /events
      faults:
        - kind: message_drop
          probability: 0.02
        - kind: connection_drop
          interval:
            min_s: 30
            max_s: 120
```

Enabling these in CI surfaces missing reconnection logic, unbounded buffer growth during reconnection, and UI state that never recovers after a WebSocket reset.

## Wiring fault profiles into CI

The key insight is that fault injection should be *environmental* — your tests don't change, but the mock's configuration changes between pipelines:

```yaml
# ci-faults.yaml — included by the test runner
kafka:
  topics:
    orders.created:
      faults:
        - kind: produce_not_leader
          probability: 0.08
```

Run the same integration tests against this config. The failures you see are real gaps in your production readiness. The passing rate after a week of running this is a better stability metric than any coverage report.

## What this means for test design

Fault injection changes how you think about test coverage. Instead of writing a test for "what happens when the Kafka broker returns NOT_LEADER," you let the mock inject that failure into existing tests and observe whether your code handles it. The tests that flake tell you where the missing error handling is — and once you fix them, they don't flake anymore.

## CTA

- [View Pricing](/pricing.html)
- [MockForge docs](https://docs.mockforge.dev)
- [GitHub](https://github.com/SaaSy-Solutions/mockforge)