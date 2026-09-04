# Fillbyte Skills

[![CI](https://github.com/fillbyte/skills/actions/workflows/ci.yml/badge.svg)](https://github.com/fillbyte/skills/actions/workflows/ci.yml)
[![CodeQL](https://github.com/fillbyte/skills/actions/workflows/codeql.yml/badge.svg)](https://github.com/fillbyte/skills/actions/workflows/codeql.yml)
[![Release](https://img.shields.io/github/v/release/fillbyte/skills)](https://github.com/fillbyte/skills/releases)
[![skills.sh](https://skills.sh/b/fillbyte/skills)](https://skills.sh/fillbyte/skills)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Production-grade agent skills and Codex plugins from Fillbyte.

Fillbyte Skills is an open-source collection of focused workflows and local tools for software engineering agents. Each skill is independently discoverable and installable; related skills, MCP servers, CLIs, and assets can also ship together as a versioned plugin.

## Catalog

| Skill                                                        | Use when                                                                                                                                                               | Available as                                                |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [iOS Capability Architect](plugins/ios-capability-architect) | Planning an Apple-platform app, selecting public APIs, auditing Xcode configuration, or reviewing permissions, entitlements, privacy, availability, and App Store risk | Agent skill, Codex plugin, local MCP server, standalone CLI |

The current catalog starts with Apple-platform engineering. Future skills will remain separate, narrowly triggered components under the same collection identity.

## Install

### Agent skill

Install the individual skill with the open `skills` CLI for Codex, Claude Code, Cursor, GitHub Copilot, and other compatible agents:

```bash
npx skills add https://github.com/fillbyte/skills --skill ios-capability-architect
```

Browse its canonical directory page at [skills.sh/fillbyte/skills/ios-capability-architect](https://skills.sh/fillbyte/skills/ios-capability-architect).

### Codex plugin

Install the repository marketplace and then the plugin:

```bash
codex plugin marketplace add fillbyte/skills
codex plugin add ios-capability-architect@fillbyte-skills
```

Start a new Codex task after installation so the skill and MCP tool inventory are loaded. For a reproducible installation, add `--ref <release-tag>` when adding the marketplace and choose a tag whose release notes use the `fillbyte-skills` marketplace identity.

Releases through `v0.9.0` used the legacy marketplace name `ios-capability-architect`. Existing users can migrate once to the collection identity:

```bash
codex plugin remove ios-capability-architect@ios-capability-architect
codex plugin marketplace remove ios-capability-architect
codex plugin marketplace add fillbyte/skills
codex plugin add ios-capability-architect@fillbyte-skills
```

## iOS Capability Architect

iOS Capability Architect turns an iOS, iPadOS, watchOS, or visionOS product idea into an evidence-backed capability map, proportionate SwiftUI-first architecture, implementation sequence, and test plan. Against an existing Apple-platform project, it can audit supported Xcode and XcodeGen source configuration without modifying files or returning their contents.

It keeps commonly conflated concepts separate:

- runtime user permissions;
- Info.plist purpose strings;
- Xcode Signing & Capabilities settings;
- ordinary and Apple-managed entitlements;
- background modes and extension targets;
- privacy manifests, required-reason APIs, and App Store review risks.

The local MCP server exposes fifteen read-only tools for idea analysis, capability resolution, availability, project configuration, privacy, architecture, implementation planning, official-source lookup, and catalog coverage. A dependency-free CLI provides the same deterministic evidence workflows to skills-only installations.

### Evidence model

The committed Apple technology catalog and reviewed capability registry have deliberately different trust levels:

- **193 catalog identities** support discovery across 32 categories.
- **46 evidence-backed profiles** map 48 catalog identities into recommendation workflows.
- **24.9% profile coverage** is reported explicitly; catalog-only entries remain research leads and are never promoted to recommendations automatically.

Platform claims cite dated, technology-specific Apple sources. Unknown, beta, deprecated, hardware-, region-, language-, account-, or approval-constrained behavior remains visible instead of being silently normalized into certainty. Link reachability does not replace human semantic review.

See the [architecture](plugins/ios-capability-architect/docs/architecture.md), [tool contracts](plugins/ios-capability-architect/docs/tool-contracts.md), [project audit contract](plugins/ios-capability-architect/docs/project-configuration-audit.md), and [platform verification](plugins/ios-capability-architect/docs/platform-verification.md).

## Repository design

```text
.agents/plugins/marketplace.json        # Fillbyte Skills marketplace
skills.sh.json                          # skills.sh catalog grouping
plugins/
└── ios-capability-architect/
    ├── .codex-plugin/plugin.json       # plugin identity and discovery metadata
    ├── .mcp.json                       # local MCP runtime declaration
    ├── skills/ios-capability-architect/
    │   ├── SKILL.md                    # canonical agent workflow
    │   ├── agents/openai.yaml          # skill UI and invocation metadata
    │   ├── assets/                     # packaged skill assets
    │   └── references/                 # progressively loaded guidance
    ├── src/                            # typed deterministic engine and CLI
    ├── data/                           # reviewed registry and discovery catalog
    ├── bundle/                         # committed dependency-free runtimes
    ├── tests/                          # behavior and boundary regression tests
    └── docs/                           # technical contracts and evidence policy
```

The canonical skill stays inside its owning plugin so instructions, local tools, assets, and release metadata version together. Discovery tools already locate the nested skill, so a duplicate root copy would create drift without improving installation.

## Safety and privacy

The current plugin is local, deterministic, and read-only:

- no hosted service, account, authentication, telemetry, advertising, or remote data store;
- no runtime registry mutation or hidden web requests;
- bounded project scanning with no symbolic-link traversal;
- relative paths and structured findings in audit output, never source contents;
- no private APIs, hidden entitlement acquisition, permission manipulation, App Review bypasses, or background-execution guarantees.

Tool results are architectural evidence, not proof of a specific App ID's provisioning, a managed entitlement grant, real-device behavior, or App Review approval. Runtime availability, authorization, hardware, region, language, signing, and device tests remain mandatory.

Read [PRIVACY.md](PRIVACY.md), [SECURITY.md](SECURITY.md), and the plugin [threat model](plugins/ios-capability-architect/docs/security.md) before changing these boundaries.

## Development

Requirements:

- Node.js 24.x and npm 11.x;
- network access only for the explicit Apple documentation link check.

Install and run the complete local gate:

```bash
npm ci
npm run verify
npm run verify:docs
```

`npm run verify` checks formatting, lint, TypeScript, release and submission metadata, registry integrity, plugin layout, coverage, deterministic bundles, MCP protocol behavior, and the skills-only archive. `npm run verify:docs` performs allowlisted conditional requests to `developer.apple.com`; success proves reachability, not that a source still supports every recorded claim.

The repository uses Node.js 24 as a tested project baseline, TypeScript 7 strict mode, typed ESLint, Prettier, Zod contracts, Vitest coverage thresholds, CodeQL, dependency auditing, deterministic archives, checksums, SBOMs, and GitHub build-provenance attestations.

## Distribution

Each GitHub release includes:

- the GitHub npm package tarball for `@fillbyte/ios-capability-architect`;
- a standalone skills-only ZIP with the skill, references, UI metadata, evidence data, and local CLI;
- `SHA256SUMS`;
- a CycloneDX SBOM;
- GitHub build-provenance attestations.

Verify a downloaded release asset with:

```bash
shasum -a 256 -c SHA256SUMS
gh attestation verify <downloaded-asset> -R fillbyte/skills
```

GitHub Packages requires an authenticated npm client even for this public scoped package. Configure the `@fillbyte` scope for `https://npm.pkg.github.com`, keep tokens outside the repository, and use release assets when an unauthenticated archive is preferable.

Release Please owns version and changelog updates. Merging its release pull request creates the tag and GitHub release; publication then verifies the tagged source before attaching artifacts and publishing the package. OpenAI directory review is a separate human-authorized process documented in [docs/openai-submission](docs/openai-submission).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a skill, plugin, tool, or capability record. Changes must preserve focused invocation, explicit trust boundaries, current primary evidence, deterministic behavior, and regression coverage.

Project policy and support are documented in [GOVERNANCE.md](GOVERNANCE.md), [ROADMAP.md](ROADMAP.md), [SUPPORT.md](SUPPORT.md), [TERMS.md](TERMS.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [CITATION.cff](CITATION.cff).

## License

MIT. See [LICENSE](LICENSE).
