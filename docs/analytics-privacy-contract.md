# Analytics Privacy Contract

Slice 940 defines a privacy-aware analytics baseline.

## Event catalog

See `contracts/analytics-events.json` for the authoritative event dictionary.

## Guardrails

- No direct PII fields in telemetry payloads.
- Disallowed keys: `email`, `ip`, `name`, `fullName`, `phone`, `address`, `freeform`, `message`.
- Only contracted events may be emitted from website surfaces.
- Trust/legal routes (`/rules`, `/privacy`, `/terms`) are monitored by accessibility and smoke gates.
