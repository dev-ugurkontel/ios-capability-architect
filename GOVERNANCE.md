# Project Governance

## Mission

iOS Capability Architect provides evidence-backed, conservative, and actionable mappings from Apple-platform product ideas to frameworks, permissions, entitlements, architecture, and delivery plans.

## Roles

### Contributors

Anyone who reports issues, proposes changes, reviews work, improves documentation, or submits code or capability evidence is a contributor.

### Maintainers

Maintainers steward the repository, review and merge pull requests, manage releases, moderate community spaces, handle security reports, and protect the project's evidence and quality standards. Maintainers are listed in `.github/CODEOWNERS`.

Additional maintainers may be invited based on sustained, constructive contributions, sound technical judgment, reliable review participation, and alignment with the project's conduct and evidence standards. Maintainer status may be relinquished voluntarily or removed for prolonged inactivity, repeated policy violations, or loss of community trust.

## Decision making

Routine fixes, documentation changes, and verified registry additions use normal pull-request review. Maintainers seek consensus and document material tradeoffs in the pull request.

Changes to the capability schema, MCP tool contract, trust boundaries, licensing, governance, release policy, or compatibility baseline require a public proposal issue before implementation. The proposal should define the problem, alternatives, compatibility impact, migration plan, and acceptance criteria. The lead maintainer makes the final decision when consensus cannot be reached, and records the rationale publicly.

Security response and conduct enforcement may be handled privately until disclosure is safe and appropriate.

## Review and merge policy

- Authors do not approve their own pull requests when another maintainer is available.
- Required automated checks must pass before merge.
- Apple-platform claims require current official evidence and human semantic review.
- Breaking changes require migration notes and an appropriate release plan.
- Generated bundle changes must be traceable to reviewed source changes.
- Maintainers may close stale or out-of-scope proposals with a clear explanation.

## Releases

Releases follow Semantic Versioning once the public API is declared stable. Until 1.0, minor versions may include deliberate contract changes, but every breaking change must be documented. Release notes summarize behavior, schema, registry, compatibility, privacy, and security changes.

Only maintainers publish releases. Plugin marketplace submission, remote hosting, credentials, and production deployment are separate privileged operations and are never implied by merging code.

## Amendments

Governance changes follow the proposal process and require explicit maintainer approval. The repository history is the authoritative record of amendments.
