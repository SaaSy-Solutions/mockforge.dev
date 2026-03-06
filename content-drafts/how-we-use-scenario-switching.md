# How We Use Scenario Switching to Keep Mocks Honest

Date: 2026-03-11
Status: Draft

Real APIs don’t stay in one state. Your mocks shouldn’t either.

Scenario switching in MockForge exists for one reason: your test environment should reflect changing application conditions, not static happy-path responses.

## Why this matters

When teams rely on fixed mock payloads:
- frontend state handling is under-tested
- retry/failure paths are skipped
- release confidence drops at integration time

## Practical pattern

Define a small set of scenario states:
- `initial`
- `in_progress`
- `degraded`
- `recovered`

Then map response behavior by scenario, not by one static fixture.

## Result

You get test flows that look like real system behavior, with less drift between local dev and integration.

## CTA
- Docs: https://docs.mockforge.dev
- GitHub: https://github.com/SaaSy-Solutions/mockforge
