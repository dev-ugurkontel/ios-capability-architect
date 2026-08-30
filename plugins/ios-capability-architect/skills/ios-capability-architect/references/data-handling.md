# Data handling and trust boundaries

The skills-only CLI and bundled MCP server are local, read-only, deterministic utilities. They have no account system, authentication secret, telemetry, remote database, hosted backend, or implicit network request.

## Project audit

Run a project audit only when the user asks to inspect an existing project or clearly places that project in scope.

The audit:

- reads only supported Apple configuration surfaces such as Xcode project files, XcodeGen YAML, plist, entitlements, xcconfig, privacy manifests, and Swift package manifests;
- does not follow symbolic links;
- applies directory, entry, file-count, per-file-size, and total-byte limits;
- skips common dependency, build, and generated-data directories;
- returns relative file paths, matched configuration requirements, findings, limits, and skipped-entry reasons;
- does not return source-file contents;
- does not modify files, build settings, signing, provisioning, App IDs, or Apple Developer resources.

The host application still controls which workspace paths the skill or process may access. Never describe this package as bypassing the host sandbox or granting access to arbitrary local files.

## Model context and live research

User prompts, selected project evidence, and tool output may enter the host model context as part of the requested task. The plugin itself does not separately retain or transmit them. Any live Apple documentation research is performed by the host's browsing capability under its own controls, not by the packaged CLI.

Avoid including secrets, credentials, signing material, personal data, full source contents, or unrelated file paths in prompts or reports. If a project contains sensitive material, minimize the audit scope and report only the evidence needed for the requested capability decision.
