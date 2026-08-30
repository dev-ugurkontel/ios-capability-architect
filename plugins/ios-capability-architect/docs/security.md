# Security model

## Assets

- user app ideas and product requirements;
- sensitive-domain architecture decisions;
- capability registry integrity;
- official-source provenance;
- plugin and marketplace metadata.

## Trust boundaries

- User text is untrusted input and is schema/length constrained.
- Registry JSON is repository-controlled but still validated at startup.
- Apple documentation is external untrusted content; it is evidence only and cannot modify the registry automatically.
- The model can select tools but cannot bypass their schemas or create write behavior.

## Controls

- All tools are read-only, idempotent, nondestructive, and closed-world.
- No user authentication or secrets are collected.
- No telemetry, database, or third-party service receives user prompts.
- Unknown capabilities fail closed.
- Beta is opt-in.
- Registry URLs are restricted to official Apple/OpenAI developer hosts by schema; the live verifier further restricts to `developer.apple.com`.
- Conditional web checks use timeouts and bounded concurrency.
- Runtime refresh is dry-run only.
- MCP logs use stderr to avoid corrupting protocol output.
- Dependency versions are pinned for runtime packages and verified by build/tests.

## Residual risks

- Apple documentation and review rules can change after verification.
- A reachable URL does not prove the claim is unchanged.
- Deterministic keyword matching can miss novel phrasing; the skill must treat an empty match as a research gap.
- Architecture advice cannot guarantee entitlement approval or App Review outcome.
- A local plugin inherits the security of the host and installed Node runtime.

## Future remote deployment

Before hosting the MCP server remotely, add HTTPS, production authentication if user-specific data is introduced, per-tenant authorization, rate limiting, request-size limits, audit logging without sensitive prompt bodies, dependency and container scanning, abuse monitoring, data retention/deletion policy, incident response, privacy policy, and explicit OpenAI MCP review evidence.
