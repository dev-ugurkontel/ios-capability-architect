# Roadmap

This roadmap communicates direction, not delivery guarantees. Accepted issues and milestones are the source of truth for scheduled work.

## Completed: open-source foundation

- Establish automated type, test, registry, bundle, and documentation validation.
- Publish contribution, governance, security, support, and release policies.
- Make verified-registry coverage measurable and distinguish it clearly from taxonomy-only discovery entries.
- Strengthen regression coverage for tool schemas, protocol behavior, and acceptance scenarios.
- Document reproducible plugin packaging and local installation.

## Now: registry depth and maintainability

- Expand evidence-backed profiles across Apple frameworks, services, extensions, and entitlement classes.
- Add machine-readable provenance and change-review metadata without implying automatic factual verification.
- Improve availability modeling for devices, hardware, regions, languages, accounts, managed entitlements, and beta SDKs.
- Add safe tooling that identifies stale sources and produces a review queue without rewriting claims automatically.
- Publish contributor guidance for researching and reviewing capability records.

## Next: distribution assurance

- Exercise upgrade and rollback procedures across consecutive tagged releases.
- Add reproducible verification guidance for release tarballs, checksums, and SBOMs.
- Review GitHub Packages authentication ergonomics and keep unauthenticated release artifacts available.
- Track release-pipeline failures and document recovery decisions without rewriting published tags.

## Later: ecosystem integration

- Evaluate a skills-only public package and a reviewed remote MCP transport independently.
- Define privacy-preserving deployment and authentication requirements before any hosted service exists.
- Add versioned registry exports for external auditing and reproducible analysis.
- Explore additional Apple platforms when their behavior can be represented without weakening iOS guidance.
- Prepare public marketplace metadata, test cases, policy attestations, and release automation.

## Non-goals

- Private API recommendations, review bypasses, or hidden entitlement acquisition.
- Claims of guaranteed App Review approval, background execution, or entitlement access.
- Automatic promotion of unreviewed web content into verified records.
- Collection of application ideas, telemetry, credentials, or personal data by default.
- Replacing Apple documentation, legal counsel, privacy review, or testing on real target devices.

Propose roadmap changes through the feature proposal template and explain the user need, evidence, risks, and measurable completion criteria.
