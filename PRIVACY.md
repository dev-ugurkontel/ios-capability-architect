# Privacy Notice for iOS Capability Architect

Last updated: August 30, 2026

iOS Capability Architect is an open-source, local-first plugin maintained by Fillbyte. This notice describes the plugin's own data behavior; the Codex or ChatGPT host and any websites you choose to open have separate policies.

## Data collected by the plugin

The plugin does not operate a hosted service and does not collect accounts, analytics, telemetry, identifiers, credentials, application ideas, project files, or tool results on Fillbyte infrastructure.

The bundled MCP server and skills-only CLI run locally. They use a packaged, versioned Apple capability registry and do not make network requests. They do not require authentication.

## Existing-project audits

When you explicitly ask for a project audit, the local process reads supported Apple configuration files inside the project root supplied to it. The scan is bounded, does not follow symbolic links, excludes common dependency and build directories, and does not modify the project. Results contain relative paths and configuration findings, not source-file contents.

The host application may include your prompt and relevant results in its model context to answer your request. Consult the host product's privacy and workspace controls for that processing. Do not provide secrets, signing credentials, private keys, personal data, or unrelated confidential source material.

## Live documentation

The packaged tools do not browse the web. If you ask the host to verify current Apple documentation, the host's browsing feature accesses the selected public pages under the host's own data controls.

## Retention and deletion

Because Fillbyte receives no plugin data, Fillbyte has no plugin account or hosted plugin record to export or delete. Local files, task history, caches, and model context are controlled by the host application and your device.

## Changes and contact

Material changes to the plugin's data boundaries will be documented in this file, the security documentation, and release notes. Questions may be sent to support@fillbyte.com. Security reports should follow [SECURITY.md](SECURITY.md).
