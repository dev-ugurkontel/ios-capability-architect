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

Inspect one technology identity from the broader Apple catalog:

```bash
node <skill-directory>/scripts/ios-capability-architect.mjs technology alarmkit
```

The result is either `kind: reviewed_profile` with `catalog_entry` and `profile`, or a catalog-only research lead with `catalog_entry`, `recommendation_eligible: false`, `verified_scope`, `unverified_profile_fields`, and an official-live-research `next_step`. The latter cannot substitute for `profile`.

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

Generate a small-scale architecture or omit the default feasibility code spike from a plan:

```bash
node <skill-directory>/scripts/ios-capability-architect.mjs architecture \
  --idea "A private health journal" \
  --capability healthkit \
  --scale small
node <skill-directory>/scripts/ios-capability-architect.mjs plan \
  --capability healthkit \
  --no-code-spike
```

Constrained options are validated with the same schemas as the MCP tools. Invalid platforms, OS versions, UI frameworks, privacy levels, on-device priorities, project scales, coverage filters, or result bounds fail instead of being guessed.

## Interpretation rules

- Preserve `warnings`, `knowledge_gaps`, `unknown`, and `manual_review` fields in the user-facing result.
- Keep `resolve` output's `catalog_research_leads` separate from reviewed capability matches; preserve the originating requirement and matched phrase.
- `profile` returns reviewed capability evidence; `technology` returns a catalog identity and may be catalog-only. Do not silently substitute one for the other.
- A catalog-only match is a research lead, not implementation evidence or a verified architecture recommendation. Before recommending it, perform live research against current, technology-specific official Apple documentation and cite the sources and actual verification date. A generic Apple Technologies index URL proves discovery only.
- A detected source string does not prove the generated target, App ID, signing profile, Apple approval, runtime availability, or App Review outcome.
- A missing source string is actionable evidence, not conclusive proof that externally generated configuration is absent.
- Live availability and policy claims still require current official Apple documentation.
