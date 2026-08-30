# Roadmap

This roadmap communicates direction, not delivery guarantees. Accepted issues and milestones are the source of truth for scheduled work.

## Completed: open-source foundation

- Establish automated type, test, registry, bundle, and documentation validation.
- Publish contribution, governance, security, support, and release policies.
- Make verified-registry coverage measurable and distinguish it clearly from taxonomy-only discovery entries.
- Strengthen regression coverage for tool schemas, protocol behavior, and acceptance scenarios.
- Document reproducible plugin packaging and local installation.

## Completed: first project-aware vertical slice

- Add a bounded, read-only project configuration audit for `project.yml`, `project.pbxproj`, plist, entitlements, xcconfig, Swift Package, and privacy-manifest surfaces.
- Compare source configuration with selected reviewed capability profiles without returning file contents or following symbolic links.
- Report detected, missing, incompatible, manual-review, and unknown states separately.
- Cover present configuration, missing configuration, deployment-target conflicts, and path-boundary behavior with automated tests.

## Now: make project audits release-decision quality

- Inspect generated Xcode build settings in addition to source configuration, while preserving a clear source-of-truth/generated-output distinction.
- Model targets and build configurations so findings identify the exact app or extension target instead of only the containing file.
- Parse `PrivacyInfo.xcprivacy` declarations semantically and compare required-reason categories with linked dependencies.
- Produce a machine-readable remediation plan with reviewable patch suggestions; keep mutation opt-in and outside the read-only MCP tool.
- Add real-project fixtures for XcodeGen, native `.xcodeproj`, Swift Package dependencies, widgets, Live Activities, HealthKit, and managed entitlements.
- Establish a 100-scenario evaluation set and publish false-positive, false-negative, unsupported, and evidence-gap rates.

Completion signal: an audit of every committed fixture identifies the correct target-level configuration and produces no unsupported certainty claim.

## Next: registry depth and maintainability

- Expand from 18 reviewed profiles to at least 60 high-usage profiles selected by public Apple-platform workflows, not arbitrary catalog order.
- Prioritize APNs, CloudKit, Keychain, AuthenticationServices, App Attest, camera and media, maps and weather, Bluetooth and NFC, Wallet and Apple Pay, testing, accessibility, and extension families.
- Add machine-readable provenance and change-review metadata without implying automatic factual verification.
- Improve availability modeling for devices, hardware, regions, languages, accounts, managed entitlements, and beta SDKs.
- Add safe tooling that identifies stale sources and produces a review queue without rewriting claims automatically.
- Publish contributor guidance and fixtures for researching, reviewing, and superseding capability records.

Completion signal: reviewed profiles cover at least 30% of the committed technology catalog and the public evaluation set passes without catalog-only recommendations.

## Then: distribution and adoption

- Submit the completed skills-only public package before introducing a hosted service, then address review feedback without weakening its local-first boundaries.
- Keep the completed marketplace metadata, starter prompts, five positive and three negative test cases, country policy, attestations, privacy terms, icon, reviewer guide, and release automation synchronized with each submitted version.
- Publish a five-minute end-to-end example that starts with an app idea, audits a real project, and produces a verified remediation plan.
- Exercise install, upgrade, rollback, and uninstall procedures across consecutive tagged releases.
- Keep unauthenticated GitHub release artifacts available even while GitHub Packages requires npm authentication.
- Publish benchmark results that compare generic planning with registry-backed, project-aware auditing.

Completion signal: a new user can install a reviewed package, complete the example without repository knowledge, and reproduce the documented output.

## Later: hosted and ecosystem integration

- Evaluate a reviewed remote MCP transport only after the skills-only package demonstrates demand.
- Define privacy-preserving deployment, authentication, rate limits, observability, retention, and incident-response requirements before hosting exists.
- Add versioned registry exports for external auditing and reproducible analysis.
- Expand iPadOS, watchOS, tvOS, macOS, and visionOS guidance only with platform-specific evidence and evaluation coverage.

## Non-goals

- Private API recommendations, review bypasses, or hidden entitlement acquisition.
- Claims of guaranteed App Review approval, background execution, or entitlement access.
- Automatic promotion of unreviewed web content into verified records.
- Collection of application ideas, telemetry, credentials, or personal data by default.
- Replacing Apple documentation, legal counsel, privacy review, or testing on real target devices.

Propose roadmap changes through the feature proposal template and explain the user need, evidence, risks, and measurable completion criteria.
