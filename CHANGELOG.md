# Changelog

All notable changes to this project are documented in this file. The project follows [Semantic Versioning](https://semver.org/) and uses Conventional Commit messages to drive release automation.

## [0.2.2](https://github.com/fillbyte/ios-capability-architect/compare/v0.2.1...v0.2.2) (2026-08-30)


### Bug Fixes

* **release:** make package publication idempotent ([#14](https://github.com/fillbyte/ios-capability-architect/issues/14)) ([898f592](https://github.com/fillbyte/ios-capability-architect/commit/898f592ada3a35d023a8094dc876d05b28b786b6))
* **release:** target workflow dispatch repository ([#18](https://github.com/fillbyte/ios-capability-architect/issues/18)) ([056e381](https://github.com/fillbyte/ios-capability-architect/commit/056e381f06ce43b6486642201a3bc906aa9d9146))
* **release:** validate generated metadata deterministically ([#17](https://github.com/fillbyte/ios-capability-architect/issues/17)) ([5ac14dc](https://github.com/fillbyte/ios-capability-architect/commit/5ac14dc7917fa33b4f0269b230d61ddff7b14528))

## [0.2.1](https://github.com/fillbyte/ios-capability-architect/compare/v0.2.0...v0.2.1) (2026-08-30)

### Bug Fixes

- **packaging:** migrate distribution to Fillbyte ([#12](https://github.com/fillbyte/ios-capability-architect/issues/12)) ([c23a72f](https://github.com/fillbyte/ios-capability-architect/commit/c23a72f9d9993bf7527396c5162df15c9c259082))

## [0.2.0](https://github.com/fillbyte/ios-capability-architect/compare/ios-capability-architect-v0.1.0...ios-capability-architect-v0.2.0) (2026-08-30)

### Features

- harden registry integrity and Apple catalog coverage ([#8](https://github.com/fillbyte/ios-capability-architect/issues/8)) ([eb08867](https://github.com/fillbyte/ios-capability-architect/commit/eb0886777fdab5aa5a7ecb5267ab83d1bf530737))
- **plugin:** establish the iOS capability architect foundation ([231cb7d](https://github.com/fillbyte/ios-capability-architect/commit/231cb7d03605f250e2913ebdcd250a78df912e85))
- **registry:** measure Apple technology coverage safely ([d3f83e3](https://github.com/fillbyte/ios-capability-architect/commit/d3f83e305c771ea6652bbe59e16b74c39f4512e4))

### Bug Fixes

- **release:** publish the generated tarball by filesystem path ([bdfbfe0](https://github.com/fillbyte/ios-capability-architect/commit/bdfbfe002c6e08d5037673f0fa3fe3427f58b892))

## 0.1.0 - 2026-08-30

### Added

- Initial iOS Capability Architect skill and read-only MCP server.
- Evidence-backed capability profiles, Apple technology discovery taxonomy, validation scripts, and acceptance tests.
- Local Codex marketplace metadata and a standalone bundled runtime.
