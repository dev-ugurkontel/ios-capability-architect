# Reviewer guide

## Package identity

The uploaded archive name is `ios-capability-architect-skill-<version>.zip`. It contains one skill root, a dependency-free local CLI, two versioned data files, references, a manifest, and the MIT License. It contains no MCP configuration or server, executable installer, native binary, credential, network client, or generated user data.

## Reproduce the package

From a clean checkout using Node.js 24 and npm 11:

```bash
npm ci
npm run verify
npm run verify:docs
```

`npm run verify` builds and validates the skills archive, checks its safe paths and size limits, and executes CLI smoke tests. `npm run verify:docs` makes allowlisted requests to current Apple Developer documentation; it is intentionally separate from normal runtime behavior.

For a released archive, verify both the checksum and GitHub build provenance before upload:

```bash
shasum -a 256 -c SHA256SUMS
gh attestation verify ios-capability-architect-skill-<version>.zip \
  -R fillbyte/skills
```

## CLI checks

After extracting the archive:

```bash
node scripts/ios-capability-architect.mjs coverage
node scripts/ios-capability-architect.mjs profile healthkit
node scripts/ios-capability-architect.mjs resolve --idea "An offline health journal with reminders"
```

For the project-audit scenario, use a sanitized fixture and run:

```bash
node scripts/ios-capability-architect.mjs audit-project \
  --root <fixture-root> \
  --capability healthkit \
  --capability privacy-manifest
```

Confirm that output contains only relative file paths and structured findings, never file contents. Add a symlink that points outside the fixture and confirm it is reported as skipped rather than followed.

## Expected boundaries

- The package does not browse; verify time-sensitive claims with the host's official-source browsing capability.
- The package does not modify project files or Apple resources.
- Empty or missing evidence is not converted into certainty when the corresponding registry field is unknown.
- Beta profiles are excluded by default.
- Managed entitlements and App Review decisions are never represented as granted or guaranteed.
