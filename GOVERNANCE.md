# Project Governance

## Mission

iOS Capability Architect provides evidence-backed, conservative, and actionable mappings from Apple-platform product ideas to frameworks, permissions, entitlements, architecture, and delivery plans.

The project is stewarded in the Fillbyte GitHub organization. Copyright and authorship remain attributed to their respective individual contributors.

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

Repository branch protection is the enforcement source of truth. The default branch currently requires pull requests, current status checks, linear history, resolved review conversations, and protection from force-push and deletion. Contributor commits may be signed but are not required to be; GitHub's squash merge produces the verified commit that reaches the default branch. `CODEOWNERS` routes sensitive changes to the responsible maintainer; whether owner approval is mandatory is controlled by the live branch-protection settings.

## Releases

Releases follow Semantic Versioning once the public API is declared stable. Until 1.0, minor versions may include deliberate contract changes, but every breaking change must be documented. Release notes summarize behavior, schema, registry, compatibility, privacy, and security changes.

Maintainers authorize a release by reviewing and merging the Release Please pull request. Automation then creates the tagged GitHub release, verifies the tagged source, publishes the scoped GitHub npm package, and attaches the tarball, checksums, and SBOM. A failed publication job does not justify moving or recreating an existing tag; fix the pipeline and use GitHub's explicit rerun mechanism or publish a subsequent version according to the incident decision.

Plugin marketplace submission, remote hosting, credentials, and production deployment are separate privileged operations and are never implied by merging ordinary code.

## Amendments

Governance changes follow the proposal process and require explicit maintainer approval. The repository history is the authoritative record of amendments.
