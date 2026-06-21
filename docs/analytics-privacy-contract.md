# Analytics Privacy Contract

Slice 940 defines a privacy-aware analytics baseline.

## Event catalog

See `contracts/analytics-events.json` for the authoritative event dictionary.

## Guardrails

- No direct PII fields in telemetry payloads.
- Disallowed keys: `email`, `ip`, `name`, `fullName`, `phone`, `address`, `freeform`, `message`.
- Only contracted events may be emitted from website surfaces.
- Campaign attribution emits only `campaign_visit` payloads with the relative
  landing path, referrer host, and sanitized UTM fields.
- The attribution cookie is an opaque first-party id, scoped to
  `.kriegspiel.org`, and may live for up to one year.
- Trust/legal routes (`/rules`, `/privacy`, `/terms`) are monitored by accessibility and smoke gates.
