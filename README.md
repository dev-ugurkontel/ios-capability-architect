# Fillbyte Skills

[![CI](https://github.com/fillbyte/skills/actions/workflows/ci.yml/badge.svg)](https://github.com/fillbyte/skills/actions/workflows/ci.yml)
[![CodeQL](https://github.com/fillbyte/skills/actions/workflows/codeql.yml/badge.svg)](https://github.com/fillbyte/skills/actions/workflows/codeql.yml)
[![Release](https://img.shields.io/github/v/release/fillbyte/skills)](https://github.com/fillbyte/skills/releases)
[![skills.sh](https://skills.sh/b/fillbyte/skills)](https://skills.sh/fillbyte/skills)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Open-source building blocks for capable software-engineering agents.

Fillbyte Skills is a growing collection of production-grade agent skills, Codex plugins, MCP servers, and deterministic developer tools. The collection is designed for the full software lifecycle—from research and architecture through implementation, testing, security, operations, and delivery—without making one platform, stack, vendor, or domain its identity.

Every component remains independently discoverable, installable, testable, and versioned. The catalog below describes what is available today; it does not limit where the collection can grow.

## Principles

- **Focused:** one component owns one clear job and declares when it should and should not run.
- **Composable:** skills, plugins, MCP servers, CLIs, references, and assets can work independently or ship together.
- **Verifiable:** deterministic checks cover behavior, schemas, packaging, documentation, security boundaries, and generated artifacts.
- **Evidence-aware:** material claims identify their source, freshness, uncertainty, and manual verification requirements.
- **Safe by default:** capabilities expose the least authority needed and make external actions, data access, and trust boundaries explicit.
- **Open:** source, contribution rules, release evidence, support paths, and limitations are public.

## Catalog

| Component                                                    | Purpose                                                                                                                                                                | Interfaces                                                  |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [iOS Capability Architect](plugins/ios-capability-architect) | Map Apple-platform product requirements and existing projects to documented capabilities, configuration evidence, architecture, implementation, and verification plans | Agent skill, Codex plugin, local MCP server, standalone CLI |

Browse the canonical collection at [skills.sh/fillbyte/skills](https://skills.sh/fillbyte/skills). Each catalog entry links to its own technical documentation, trust boundary, and installation options.

## Use the collection

Install an individual skill with the open `skills` CLI. For example:

```bash
npx skills add https://github.com/fillbyte/skills --skill ios-capability-architect
```

The component directory page is [skills.sh/fillbyte/skills/ios-capability-architect](https://skills.sh/fillbyte/skills/ios-capability-architect).

Install the Fillbyte Skills marketplace and then a selected Codex plugin:

```bash
codex plugin marketplace add fillbyte/skills
codex plugin add ios-capability-architect@fillbyte-skills
```

Start a new Codex task after installation so its skill and tool inventory can load. For reproducible installs, select a reviewed release tag when adding the marketplace.

Releases through `v0.9.0` used `ios-capability-architect` as the marketplace name. Existing users can migrate once:

```bash
codex plugin remove ios-capability-architect@ios-capability-architect
codex plugin marketplace remove ios-capability-architect
codex plugin marketplace add fillbyte/skills
codex plugin add ios-capability-architect@fillbyte-skills
```

## Collection contract

A component belongs in this collection only when it has:

- a focused, discriminating skill or plugin identity;
- positive, indirect, and negative invocation evidence;
- explicit input, output, data, permission, network, and side-effect boundaries;
- deterministic tests for ordinary, edge, failure, and distribution behavior;
- reproducible generated artifacts with drift detection;
- component-level documentation, ownership, support, privacy, security, and migration guidance;
- root catalog, marketplace, package, and directory metadata that remain synchronized.

The root describes the collection. Domain-specific instructions and implementation details live under their owning component so a current catalog entry never becomes the identity or architectural constraint of future work.

## Repository structure

```text
.agents/plugins/marketplace.json        # collection marketplace
skills.sh.json                          # public catalog groupings
plugins/
└── <component>/
    ├── .codex-plugin/plugin.json       # plugin identity and discovery metadata
    ├── skills/<skill>/                 # canonical skill and UI metadata
    ├── src/                            # reviewed source when executable tooling exists
    ├── tests/                          # behavior and boundary evidence
    ├── docs/                           # component contracts and technical evidence
    └── bundle/                         # reproducibly generated runtime artifacts
```

Canonical skills stay inside their owning components so instructions, tools, assets, and release metadata version together. Discovery tools locate nested skills directly; duplicate root copies are prohibited because they create drift.

## Quality bar

The repository treats a green build as evidence, not ceremony:

- hand-written TypeScript runtime code must maintain **100% statement, branch, function, and line coverage**;
- formatting, lint, strict type checks, schema validation, and behavior tests must pass without warnings;
- generated runtimes and archives must reproduce byte-for-byte from reviewed source;
- installation, protocol, package, and archive smoke tests must exercise the shipped interfaces;
- documentation links, manifests, marketplace metadata, release metadata, checksums, SBOMs, and provenance must be validated;
- CodeQL, dependency auditing, and secret scanning must report no unresolved release-blocking finding.

Coverage is not a substitute for meaningful assertions, real integration tests, security review, source freshness, or target-environment validation. Component-specific evidence metrics describe scope and uncertainty; they are not presented as repository quality scores.

## Development

Requirements:

- Node.js 24.x;
- npm 11.x;
- network access only for explicit, component-owned source-verification commands.

Install and run the complete local gate:

```bash
npm ci
npm run verify
npm run verify:docs
```

Workspace commands discover every component that implements the corresponding script. Adding a component must not require copying the first component's hard-coded root automation.

## Distribution

Release automation verifies tagged source before publishing component packages or attaching release assets. Components can ship skills-only archives, plugin bundles, npm packages, checksums, CycloneDX SBOMs, and GitHub build-provenance attestations when those formats match the component's contract.

Verify a downloaded asset with:

```bash
shasum -a 256 -c SHA256SUMS
gh attestation verify <downloaded-asset> -R fillbyte/skills
```

Release Please owns version and changelog updates. Public directory review, remote hosting, credentials, deployments, and marketplace publication remain separate, explicitly authorized operations.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a skill, plugin, tool, or evidence record. Project policy and support are documented in [GOVERNANCE.md](GOVERNANCE.md), [ROADMAP.md](ROADMAP.md), [SUPPORT.md](SUPPORT.md), [PRIVACY.md](PRIVACY.md), [SECURITY.md](SECURITY.md), [TERMS.md](TERMS.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), and [CITATION.cff](CITATION.cff).

## License

MIT. See [LICENSE](LICENSE).
