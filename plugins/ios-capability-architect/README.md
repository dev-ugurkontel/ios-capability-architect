# @fillbyte/ios-capability-architect

The distributable package for [iOS Capability Architect](https://github.com/fillbyte/ios-capability-architect): a read-only MCP server and Codex skill that maps Apple-platform product requirements to evidence-backed capabilities, permissions, entitlements, architecture, and implementation plans.

The package contains standalone Node.js 24 MCP and CLI bundles, the plugin manifest, skill instructions, reviewed capability profiles, Apple technology discovery catalog, documentation, and examples. Its project audit can compare selected profiles with local Xcode/XcodeGen source configuration using a bounded, symlink-safe, content-redacting scan. The runtimes perform no registry mutation, telemetry, authentication, or remote data storage. Public releases also include a validated skills-only ZIP for reviewed directory submission and hosts without bundled MCP support.

The discovery catalog and reviewed capability registry have deliberately different trust levels. `search_apple_technology_catalog`, `get_apple_technology`, and the CLI `catalog` and `technology` commands can expose catalog-only research leads across the broader Apple technology index. A catalog-only result is never implementation evidence or an architecture recommendation: verify it against current, technology-specific official Apple documentation before recommending it. Profile-dependent tools continue to accept only reviewed capability profiles.

For Codex installation, development, security, contribution, and release instructions, use the canonical repository README. GitHub release assets include a checksum and CycloneDX SBOM.

License: MIT.
