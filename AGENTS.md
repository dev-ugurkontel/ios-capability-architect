# Repository guidance for agents

## Scope

This repository is the Fillbyte Skills collection. Treat each directory under `plugins/` as an independently scoped product surface and each nested `skills/<name>/SKILL.md` as the canonical skill source. Do not create a duplicate root-level skill.

## Source of truth

- Edit TypeScript in `plugins/<plugin>/src/`; never hand-edit `bundle/*.mjs`.
- Edit reviewed Apple capability facts only in `plugins/ios-capability-architect/data/capabilities.json` and preserve dated official evidence.
- Treat `data/taxonomy.json` as discovery metadata, not recommendation evidence.
- Keep plugin identity in `.codex-plugin/plugin.json`, marketplace identity in `.agents/plugins/marketplace.json`, and skills.sh grouping in `skills.sh.json` synchronized.
- Keep skill invocation metadata in `skills/<skill>/agents/openai.yaml` synchronized with its `SKILL.md` description and assets.

## Required validation

Run `npm run verify` after code, data, skill, manifest, or distribution changes. Run `npm run verify:docs` after changing Apple platform claims or source URLs. Inspect the final diff and do not commit generated link reports, credentials, signing material, or private project data.

## Adding a component

New skills must have one focused job, precise positive and negative triggers, progressive reference loading, and regression fixtures. New plugins must include a valid manifest, marketplace entry, public metadata, existing asset paths, documentation, tests, and a reproducible build. Extend workspace scripts generically before adding a second component; do not copy iOS-specific commands under a new name.

## Trust boundaries

Prefer public primary documentation. Keep unknown, beta, deprecated, managed-entitlement, hardware, region, language, account, and runtime constraints explicit. Never convert catalog presence or a reachable URL into verified implementation guidance.
