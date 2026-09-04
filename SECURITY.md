# Security Policy

## Supported versions

Security fixes are applied to the latest non-prerelease minor line shown on the repository's Releases page and to the default development branch. Older release lines may not receive patches. Before 1.0, a new minor release replaces the previous minor line as the supported release.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub's **Report a vulnerability** feature in the repository's Security tab. Include:

- the affected version, commit, tool, or data path;
- a clear description of the impact and threat model;
- reproducible steps or a minimal proof of concept;
- any known mitigations;
- whether the report or proof of concept has been shared elsewhere.

If private vulnerability reporting is unavailable, open a minimal public issue requesting a private maintainer contact channel. Do not include exploit details, secrets, personal data, or vulnerable deployment information in that issue.

You should receive an acknowledgement within 5 business days and an initial assessment within 10 business days. Timelines for remediation and disclosure depend on severity and complexity. Please allow maintainers a reasonable opportunity to investigate and publish a fix before public disclosure.

## Scope

Security-relevant areas include every distributed skill and plugin, especially:

- MCP input validation, tool annotations, and protocol handling;
- CLI argument handling, archive paths, filesystem boundaries, and project audits;
- unexpected file, process, network, or registry mutation;
- command, path, or prompt injection that crosses a documented trust boundary;
- exposure of secrets, personal data, or private project details;
- dependency or build-chain compromise;
- misleading technical, permission, privacy, or platform guidance with a plausible security impact.

Incorrect but non-security-sensitive domain facts should use the most specific issue template available. Vulnerabilities in a platform, host, runtime, or dependency should be reported to the owning project unless this repository introduces or amplifies the issue.

## Security expectations

Every component must document its permissions, side effects, network behavior, authentication, data flow, and failure modes. Generated artifacts must be reproducible from reviewed source, dependency changes must remain locked and auditable, and release assets must carry integrity and provenance evidence appropriate to their format.

The current iOS Capability Architect MCP server and skills-only CLI are local, read-only, deterministic, and free of telemetry or authentication secrets. Its documentation link verification is a separate developer action restricted to an allowlisted Apple host. Contributions that change a component boundary require a threat-model update and maintainer review. See [PRIVACY.md](PRIVACY.md) for the public data-handling notice.
