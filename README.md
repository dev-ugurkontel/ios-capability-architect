# iOS Capability Architect

[![CI](https://github.com/fillbyte/ios-capability-architect/actions/workflows/ci.yml/badge.svg)](https://github.com/fillbyte/ios-capability-architect/actions/workflows/ci.yml)
[![CodeQL](https://github.com/fillbyte/ios-capability-architect/actions/workflows/codeql.yml/badge.svg)](https://github.com/fillbyte/ios-capability-architect/actions/workflows/codeql.yml)
[![Release](https://img.shields.io/github/v/release/fillbyte/ios-capability-architect)](https://github.com/fillbyte/ios-capability-architect/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

`iOS Capability Architect` is a production-oriented Codex and ChatGPT plugin that turns an Apple-platform app idea into a verified capability map, architecture, configuration audit, implementation sequence, and test plan. It can also compare selected capabilities with an existing local project's source configuration, exposing missing plist keys, entitlements, background modes, privacy-manifest review, and deployment-target conflicts before release.

The repository is a Codex marketplace containing one skills-plus-MCP plugin. Its MCP server is local, read-only, and deterministic: it analyzes ideas and queries a versioned registry without sending user content to a backend.

## Platform verification summary

Verified on 2026-08-30 against current official OpenAI plugin documentation and the installed Codex validator:

- Every native plugin requires `.codex-plugin/plugin.json`.
- A plugin may contain skills, a bundled MCP server, or both. This plugin uses both.
- Bundled MCP server configuration belongs in `.mcp.json`; the manifest points to it with `mcpServers`.
- Tools use explicit input and output schemas and MCP safety annotations.
- A repository marketplace uses `.agents/plugins/marketplace.json`.
- Public publishing is performed through OpenAI's plugin submission portal and review process; local marketplace installation is not public publication.
- Authentication is optional. This local read-only server needs none. Remote service-backed plugins can use the authentication mechanisms supported by the registered MCP connection.
- Skills can include instructions and packaged reference files. The plugin itself does not receive arbitrary persistent file storage; a bundled local process uses the plugin package read-only and would use the product-provided plugin data directory only if writable state were later required.
- Bundled local MCP servers make a plugin desktop/local-runtime dependent. A public web-capable submission would need a reviewed remote MCP server or skills-only package.
- Submission requires accurate listing metadata, test cases, country availability, policy attestations, a verified developer/business identity, and the applicable organization permission.

`agent-plugins.com` did not resolve in DNS from the development environment and no official documentation for a separate `agent-plugins.com` manifest or runtime was discoverable. That surface is therefore **unverified**. The implementation makes the conservative assumption that the requested target is the current OpenAI plugin ecosystem and intentionally omits unverified fields or APIs.

Official platform sources:

- [Plugin architecture](https://developers.openai.com/plugins/concepts/plugins)
- [Define tools](https://developers.openai.com/plugins/plan/tools)
- [Package your plugin](https://developers.openai.com/plugins/build/plugins)
- [Submit plugins](https://developers.openai.com/plugins/deploy/submission)
- [Security and privacy](https://developers.openai.com/plugins/guides/security-privacy)
- [MCP server review requirements](https://developers.openai.com/plugins/deploy/app-review)

## Architecture

```text
.agents/plugins/marketplace.json
└── plugins/ios-capability-architect
    ├── .codex-plugin/plugin.json
    ├── .mcp.json
    ├── skills/ios-capability-architect
    │   ├── SKILL.md
    │   └── references/
    ├── data/capabilities.json
    ├── src/
    │   ├── server.ts
    │   ├── engine.ts
    │   ├── registry.ts
    │   ├── schema.ts
    │   └── types.ts
    ├── scripts/
    ├── tests/
    ├── examples/
    └── docs/
```

The skill supplies the full system workflow and output contract. The MCP server supplies fifteen focused, read-only tools. The registry loader preserves explicit evidence gaps, validates every normalized field with Zod, and refuses duplicate or malformed records. The recommendation engine is deliberately deterministic; the model provides product reasoning while the server supplies verified facts and structured audits.

### Why use it instead of generic iOS advice?

- It separates user permission, Info.plist, Xcode capability, entitlement, managed entitlement, background mode, and extension requirements instead of treating them as synonyms.
- It exposes evidence gaps and unknown registry fields rather than interpreting an empty list as proof that no configuration is needed.
- It checks a real project's configuration without modifying it, following symlinks, or returning source contents.
- It keeps beta, deprecated, hardware-, region-, language-, and approval-constrained technologies explicit.
- It connects architecture advice to dated official Apple sources, privacy review, App Store constraints, and a concrete delivery order.

See [architecture.md](plugins/ios-capability-architect/docs/architecture.md), [tool-contracts.md](plugins/ios-capability-architect/docs/tool-contracts.md), [project-configuration-audit.md](plugins/ios-capability-architect/docs/project-configuration-audit.md), and [platform-verification.md](plugins/ios-capability-architect/docs/platform-verification.md).

## Technical assumptions

- Node.js 24 is the current LTS baseline used by this repository.
- SwiftUI is the default UI recommendation; UIKit is introduced only for an API or compatibility need.
- Stable Apple SDK behavior is the default. iOS 27 and Xcode 27 capabilities remain beta on the verification date and are isolated from stable records.
- The committed discovery catalog currently names 193 technologies across 32 categories, while 38 evidence-backed profiles map 40 catalog identities into recommendation workflows. The measured catalog-to-profile coverage is 20.7%; this is intentionally reported instead of claiming a permanently complete Apple catalog.
- Catalog-only technologies must produce an explicit evidence gap and official-source research, never an invented recommendation.
- Tool outputs are architectural advice, not proof that a specific App ID has an entitlement or that App Review will approve a design.
- Runtime `#available`, hardware, region, language, authorization, and service-availability checks remain mandatory in the iOS app.

## Local development

Requirements:

- macOS or another Node-compatible development host
- Node.js 24.x and npm 11.x
- Codex desktop/CLI for plugin installation
- Network access only for live documentation-link verification

Install and verify:

```bash
npm ci
npm run build
npm run check
npm run validate:registry
npm test
npm run verify:docs
npm run validate:plugin
```

The `verify:docs` command performs allowlisted conditional GETs against `developer.apple.com`, writes an ignored `data/link-verification-report.json`, and fails when a source is unreachable or invalid. A successful link check proves reachability, not semantic correctness; source changes still require human review.

## Install in Codex

The committed single-file runtime at `bundle/server.mjs` has no runtime `node_modules` dependency. Install the versioned public marketplace directly from GitHub:

```bash
codex plugin marketplace add fillbyte/ios-capability-architect --ref v0.8.0 # x-release-please-version
codex plugin add ios-capability-architect@ios-capability-architect
```

The command pins a reproducible non-prerelease release. To install a newer version, replace it with the exact tag shown on the [Releases page](https://github.com/fillbyte/ios-capability-architect/releases). Then start a new Codex task so the skill and MCP tool inventory are loaded from the installed package.

Contributors working from a checkout can pass the repository path instead of the GitHub source. Do not hand-edit Codex `config.toml`.

## Release artifacts and npm package

Each GitHub release includes the packed npm tarball, a public skills-only archive, a CycloneDX SBOM, and `SHA256SUMS`. The skills archive contains the canonical skill, its references and evidence data, and a dependency-free local CLI; it contains no MCP server or hosted-service credential. Release assets are the simplest unauthenticated way to inspect or archive the exact published package. Verify downloaded assets before use:

```bash
shasum -a 256 -c SHA256SUMS
```

Release workflows also create GitHub build-provenance attestations for every attached asset. Online consumers with GitHub CLI can independently bind a downloaded file to this repository and release workflow:

```bash
gh attestation verify <downloaded-asset> -R fillbyte/ios-capability-architect
```

New releases are published as `@fillbyte/ios-capability-architect` on GitHub Packages. GitHub's npm registry requires an authenticated npm client, including for this public package. Configure the `@fillbyte` scope for `https://npm.pkg.github.com`, provide a GitHub token with `read:packages` through your environment or user-level npm configuration, and never commit that token or a credential-bearing `.npmrc` file. Releases published before the Fillbyte transfer remain under the legacy `@dev-ugurkontel` scope; all current installations should use the Fillbyte package.

Release Please owns version and changelog updates after the `0.2.0` baseline. Conventional `feat`, `fix`, and breaking-change commits merged after the latest tag determine the next release pull request. Merging that release pull request publishes the GitHub release; the release event then verifies and publishes the package and attaches its provenance artifacts.

## Tool surface

- `analyze_app_idea`
- `resolve_ios_capabilities`
- `get_capability_profile`
- `get_apple_technology`
- `compare_implementation_options`
- `check_availability`
- `audit_permissions_and_entitlements`
- `audit_ios_project_configuration`
- `audit_privacy_and_app_review`
- `generate_ios_architecture`
- `generate_implementation_plan`
- `search_official_apple_docs`
- `search_apple_technology_catalog`
- `get_registry_coverage`
- `refresh_capability_registry`

All tools have `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, and `openWorldHint: false`. The last tool returns only a refresh plan; it cannot change the registry.

## Capability registry

The normalized `CapabilityRecord` contains all fields requested by the product brief, including entity type, framework/capability/entitlement relations, OS and SDK availability, beta/deprecation status, devices and hardware, region/language restrictions, on-device level, network/cloud needs, permissions, Info.plist keys, capabilities, entitlements, managed entitlements, background modes, privacy manifests, required-reason APIs, review and security considerations, alternatives, official sources, release notes, and verification date.

The 38 reviewed records cover the seven acceptance scenarios, their supporting technologies, the foundational Swift, Swift Concurrency, SwiftUI, UIKit, and Foundation layers, the URLSession, Core Data, CloudKit, Keychain Services, AuthenticationServices, and CryptoKit data/security profiles, and the APNs, AVFoundation, PhotoKit, Vision, MapKit, Core Bluetooth, Accessibility, AppTrackingTransparency, and App Attest platform profiles. Extend the recommendation registry by adding evidence-backed records to `plugins/ios-capability-architect/data/capabilities.json`; omitted stability normalizes to `unknown`, not `stable`. Run the full validation suite before merging.

`plugins/ios-capability-architect/data/taxonomy.json` models the broader Apple ecosystem, including the current official iOS provisioning-capability list and emerging technology families. Its 193 deduplicated entries are discovery aids, not verified recommendation records. `get_apple_technology` performs an exact identity lookup, while `resolve_ios_capabilities` exposes unprofiled names only as separate, non-recommendable `catalog_research_leads`; neither path fabricates availability or configuration facts. Promote a technology to `capabilities.json` only with technology-specific official evidence. `get_registry_coverage` keeps that distinction machine-visible.

## Engineering quality

- TypeScript 7 strict mode, typed ESLint, Prettier, and `@/` plus `@data/` aliases share one resolver contract across TypeScript, Vitest, tsx, and esbuild.
- The only distribution artifact is `bundle/server.mjs`; `tsc` performs type checking without emitting a second, potentially incompatible runtime tree.
- Vitest enforces 85% line/function/statement and 75% branch coverage. Current measured coverage exceeds those thresholds.
- CI runs locked installs, formatting, linting, type checks, registry/plugin validation, coverage, deterministic bundle rebuild, MCP smoke tests, and production dependency audit.
- Scheduled workflows verify official Apple links and run CodeQL. Dependabot and Release Please maintain dependencies and releases.
- Bundling generates `bundle/THIRD_PARTY_NOTICES.txt` from the locked production dependency graph and fails if a bundled dependency has no discoverable license text.

## Documentation refresh and cache strategy

1. Watch Apple release notes, framework update pages, WWDC guides, App Store Review Guidelines, and privacy requirement pages.
2. Fetch only official allowlisted sources with conditional requests using saved `ETag` and `Last-Modified` values.
3. Record final URL, status, redirect, check time, and response validators in the ignored report.
4. Flag changed sources for review. Do not automatically rewrite capability claims or promote beta records.
5. Update the record and `verified_at` only after a human checks the exact claim.
6. Validate the normalized registry, run acceptance tests, and review the diff.

This separates link freshness from factual verification and avoids turning transient web content into unreviewed architecture advice.

## Error handling

- Invalid tool input is rejected by MCP/Zod before execution.
- Unknown capability IDs produce a clear recoverable error instead of a guessed match.
- No recommendation match returns a warning and an empty result.
- Beta records are excluded unless explicitly allowed.
- Availability results distinguish compatible declared constraints from conditional or incompatible cases.
- Link verification has an allowlist, timeout, bounded concurrency, and nonzero failure exit.
- Registry mutation is disabled at runtime.
- MCP diagnostics go to `stderr`; `stdout` is reserved for protocol messages.

## Security and privacy model

- No authentication, account, external database, telemetry, or cloud backend is used.
- Idea text and results remain inside the local MCP process and host model context.
- Every tool is read-only and has no external side effect.
- Live link verification runs only as an explicit developer command and only against `developer.apple.com`.
- Tool output excludes secrets, tokens, internal diagnostics, and unnecessary personal data.
- The skill refuses private APIs, hidden entitlement acquisition, App Review bypasses, permission manipulation, and unsupported background claims.
- Sensitive Apple-platform use cases trigger stricter permission, privacy, security, retention, and review analysis.

See [security.md](plugins/ios-capability-architect/docs/security.md) for the threat model.

## Testing

`npm test` covers:

- HealthKit permissions, sensitive data, and bounded background delivery
- offline/on-device AI and hardware availability
- background location permissions, energy, and review risk
- separation of WidgetKit, ActivityKit, App Intents, Widget Extension, and App Groups
- managed Family Controls entitlement handling
- deprecated UIWebView migration
- ambiguous ideas with assumptions and no more than three questions
- default exclusion of iOS 27 beta records

## Distribution and publishing

The source repository, tagged GitHub releases, skills-only archives, release checksums, CycloneDX SBOM, and scoped GitHub npm package are public distribution surfaces. Release Please maintains version changes and changelog entries; publishing a GitHub release triggers source verification, npm package publication, and release-asset attachment.

Publishing into OpenAI's reviewed plugin directory remains a separate process. The reviewer-ready field source, tests, attestations, icon, and release notes live in [docs/openai-submission](docs/openai-submission):

1. Build and validate the skills-only archive with `npm run verify`.
2. Confirm public developer, support, privacy-policy, terms, listing metadata, and release checksums.
3. Verify the Fillbyte business identity and the submitter's required OpenAI organization role.
4. Upload the exact released skills archive, enter the maintained starter prompts and tests, and confirm availability and policy attestations.
5. Submit through the OpenAI plugin submission portal, complete review, then explicitly publish the approved version.

The initial public submission is deliberately skills-only. The bundled stdio MCP remains the richer local Codex edition; a remote MCP cannot interpret a user's local project path and would require a materially different privacy-preserving evidence-transfer design.

Deploying a remote MCP service, creating external service accounts, or changing DNS is intentionally outside this repository release process.

See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), [PRIVACY.md](PRIVACY.md), [TERMS.md](TERMS.md), [SUPPORT.md](SUPPORT.md), [GOVERNANCE.md](GOVERNANCE.md), and [CITATION.cff](CITATION.cff) for contribution, usage, and maintenance policy.

## License

MIT. See [LICENSE](LICENSE).
