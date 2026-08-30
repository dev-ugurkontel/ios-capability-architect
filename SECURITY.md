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

Security-relevant areas include:

- MCP input validation, tool annotations, and protocol handling;
- unexpected file, process, network, or registry mutation;
- command, path, or prompt injection that crosses a documented trust boundary;
- exposure of secrets, personal data, or private app details;
- dependency or build-chain compromise;
- misleading permission, entitlement, privacy, or App Review guidance with a plausible security impact.

Incorrect but non-security-sensitive Apple-platform facts should be reported through the capability correction issue template. Vulnerabilities in Apple, OpenAI, Node.js, or another dependency should be reported to the owning project unless this repository introduces or amplifies the issue.

## Security expectations

The bundled MCP server is designed to be local, read-only, deterministic, and free of telemetry or authentication secrets. Documentation link verification is an explicit developer action restricted to an allowlisted Apple host. Contributions that change these boundaries require a documented threat-model update and maintainer review.
