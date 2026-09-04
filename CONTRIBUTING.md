# Contributing to Fillbyte Skills

Thank you for helping make Fillbyte's agent skills accurate, useful, and trustworthy. Contributions of focused skills, plugin tooling, code, verified evidence, tests, documentation, and review feedback are welcome.

## Project principles

Every contribution should preserve these properties:

- **Evidence before assertion.** Platform claims must be supported by current, official Apple documentation.
- **Conservative recommendations.** Unknown, beta, region-limited, managed, or entitlement-gated behavior must be identified explicitly.
- **Deterministic tooling.** The MCP server is read-only and must not silently mutate the registry, contact unrelated services, or depend on model-generated facts.
- **Privacy by default.** Collect, expose, and retain no more information than the requested analysis requires.
- **Focused changes.** Keep pull requests reviewable and avoid unrelated formatting or refactoring.
- **One source of truth.** A skill lives inside its owning plugin; generated bundles and archives are rebuilt from reviewed source.

## Before you start

Search existing issues and pull requests before opening new work. For a new skill or plugin, substantial behavior change, new tool, schema migration, or governance decision, open a proposal issue first so maintainers and contributors can agree on scope.

Security vulnerabilities must follow [SECURITY.md](SECURITY.md), not the public issue tracker. General usage questions belong in the support channels described in [SUPPORT.md](SUPPORT.md).

## Development setup

Requirements:

- Node.js 24.x
- npm 11.x
- Network access only when running the explicit Apple documentation link check

Install and run the local quality gates:

```bash
npm ci
npm run verify
npm run verify:docs
```

`npm run verify` runs formatting, lint, type, registry, plugin-layout, coverage, build, and MCP smoke checks. The final documentation command accesses only the allowlisted Apple Developer documentation host. It verifies reachability, not the meaning of a source; factual changes still require human review.

Verification also builds the public skills-only archive, rejects unsafe archive paths and symlinks, and runs the packaged CLI from the generated distribution. Submission-facing changes must update and validate `docs/openai-submission` without weakening the local-first privacy boundary.

## Adding a skill or plugin

Every new skill must:

1. solve one focused job and use a unique kebab-case name;
2. state clear positive and negative triggers in its frontmatter description;
3. keep `SKILL.md` concise and load detailed references progressively;
4. provide `agents/openai.yaml` with accurate display metadata, an explicit `$skill-name` starter prompt, and existing packaged assets;
5. include tests or evaluation fixtures for direct, indirect, and out-of-scope prompts;
6. be listed in the root catalog and `skills.sh.json` without duplicating its canonical files.

A plugin that distributes skills or local tools must also have a complete `.codex-plugin/plugin.json`, a `.agents/plugins/marketplace.json` entry, public support and legal links, validated asset paths, reproducible packaging, and documented privacy and security boundaries. Update workspace automation to discover additional components rather than hard-coding copies of the first plugin's scripts.

## Adding or changing a capability record

Capability data is product behavior, not incidental content. A record change must:

1. Use a stable, descriptive identifier and the existing normalized schema.
2. Separate frameworks, capabilities, permissions, Info.plist keys, entitlements, managed entitlements, background modes, and extensions correctly.
3. State minimum OS and SDK constraints without guessing future availability.
4. Mark beta, deprecated, device-, hardware-, region-, language-, account-, or authorization-dependent behavior explicitly.
5. Describe privacy, security, App Review, and fallback implications where relevant.
6. Link to the narrowest applicable official Apple source. Third-party articles may help investigation but are not registry evidence.
7. Set `verified_at` to the date on which a human checked the claims against those sources.
8. Add or update tests that demonstrate intended recommendation, exclusion, and failure behavior.

Do not promote an item from the taxonomy into the verified registry merely because its documentation URL resolves. Do not infer access to restricted or managed entitlements.

## Code changes

- Use strict TypeScript and preserve explicit input/output schemas.
- Keep MCP tool annotations accurate, especially read-only and side-effect declarations.
- Return structured, actionable errors; do not hide invalid input behind guessed defaults.
- Keep protocol output on `stdout` and diagnostics on `stderr`.
- Rebuild `plugins/ios-capability-architect/bundle/server.mjs` after source changes.
- Rebuild `plugins/ios-capability-architect/bundle/cli.mjs` after engine or CLI changes and keep the skills-only smoke test passing.
- Add regression tests for bug fixes and acceptance tests for observable behavior changes.
- Never commit credentials, signing assets, tokens, private identifiers, or generated link-verification reports.

## Documentation changes

Write concise, inclusive English. Distinguish verified behavior, assumptions, limitations, and future plans. Use relative links for repository content and stable official URLs for external technical claims.

## Commits and pull requests

Use focused commits with imperative Conventional Commit-style subjects, for example:

```text
feat(registry): add verified Nearby Interaction profile
fix(engine): exclude beta records by default
docs(contributing): clarify entitlement evidence rules
```

The release pipeline derives versions and changelog entries from these commits. Use `feat!:` or a `BREAKING CHANGE:` footer only for an intentional contract break with migration guidance. Sign commits when practical. The protected default branch requires pull requests, linear squash merges, current required checks, and resolved review conversations; GitHub records the resulting merge commit as verified.

A pull request should:

- explain the problem and why the chosen solution is appropriate;
- list user-visible and schema changes;
- identify official evidence for platform claims;
- include tests and the exact commands run;
- note compatibility, privacy, security, and App Review implications;
- update documentation and the committed runtime bundle when applicable;
- remain free of unrelated changes.

By contributing, you agree that your contribution is licensed under the repository's [MIT License](LICENSE).
