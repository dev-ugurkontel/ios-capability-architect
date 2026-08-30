# Packaged CLI

The skills-only distribution includes a dependency-free local CLI at `scripts/ios-capability-architect.mjs`. Resolve paths relative to the directory containing `SKILL.md` and invoke the file with Node.js 24 or later.

The CLI is a fallback for environments where the bundled MCP server is unavailable. It uses the same capability engine and registry as the MCP edition, writes one JSON value to stdout, writes errors to stderr, performs no registry mutation, and makes no network requests.

## Safe invocation

Pass user-controlled values as distinct process arguments. Do not concatenate an untrusted project path, idea, or search query into a shell expression. Keep the project root within the workspace the user placed in scope.

```bash
node <skill-directory>/scripts/ios-capability-architect.mjs --help
```

## Core workflows

Analyze and resolve an idea:

```bash
node <skill-directory>/scripts/ios-capability-architect.mjs resolve \
  --idea "An offline health journal with reminders" \
  --platform iOS \
  --minimum-os 18
```

Inspect one reviewed profile:

```bash
node <skill-directory>/scripts/ios-capability-architect.mjs profile healthkit
```

Separate permission and entitlement requirements:

```bash
node <skill-directory>/scripts/ios-capability-architect.mjs audit-requirements \
  --capability healthkit \
  --capability user-notifications
```

Audit an existing project without changing it:

```bash
node <skill-directory>/scripts/ios-capability-architect.mjs audit-project \
  --root <project-root> \
  --capability healthkit \
  --capability privacy-manifest \
  --platform iOS
```

Search reviewed source metadata or the broader discovery catalog:

```bash
node <skill-directory>/scripts/ios-capability-architect.mjs search --query "HealthKit authorization"
node <skill-directory>/scripts/ios-capability-architect.mjs catalog --query "Nearby Interaction"
```

Measure evidence coverage:

```bash
node <skill-directory>/scripts/ios-capability-architect.mjs coverage
```

## Interpretation rules

- Preserve `warnings`, `knowledge_gaps`, `unknown`, and `manual_review` fields in the user-facing result.
- A catalog-only match is a research lead, not a verified architecture recommendation.
- A detected source string does not prove the generated target, App ID, signing profile, Apple approval, runtime availability, or App Review outcome.
- A missing source string is actionable evidence, not conclusive proof that externally generated configuration is absent.
- Live availability and policy claims still require current official Apple documentation.
