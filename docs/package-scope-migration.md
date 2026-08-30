# Fillbyte repository and package migration

This document defines the one-time cutover from `dev-ugurkontel/ios-capability-architect` and `@dev-ugurkontel/ios-capability-architect` to the Fillbyte organization. It deliberately separates repository transfer, package publication, and historical attribution.

## Canonical identities after cutover

- Repository: `fillbyte/ios-capability-architect`
- GitHub Packages npm package: `@fillbyte/ios-capability-architect`
- Codex plugin and marketplace name: `ios-capability-architect`
- Package and plugin author: Ugur Kontel
- Default code owner: `@dev-ugurkontel`, as an individual Fillbyte organization member

The Codex plugin name, marketplace name, authorship, copyright, historical release tags, and commit authors do not change as part of the organization transfer.

## Why the npm scope is a migration

GitHub repository transfer preserves repository history and redirects from the previous repository URL. An npm package scope is part of the package name, however, so `@fillbyte/ios-capability-architect` is a new package identity rather than a rename of `@dev-ugurkontel/ios-capability-architect`.

Existing consumers may continue using a previously published legacy version. New releases must use the Fillbyte scope, and documentation should direct all new installations there. Do not republish different content under an already published legacy version.

Historical `CHANGELOG.md` links intentionally retain the repository identity under which those releases were created. GitHub's transfer redirect preserves them; Release Please will generate Fillbyte links for releases created after cutover.

## Cutover sequence

The live steps below require explicit repository-owner authorization and are not performed by this repository change:

1. Confirm that `fillbyte/ios-capability-architect` and `@fillbyte/ios-capability-architect` are still unclaimed.
2. Confirm Fillbyte organization Actions policy permits the pinned actions in this repository, workflow pull-request writes, release creation, and package creation with `packages: write`.
3. Transfer the repository to the Fillbyte organization without renaming it.
4. Update local clones to use `https://github.com/fillbyte/ios-capability-architect.git` and verify the default branch, branch protection, Discussions, private vulnerability reporting, environments, repository secrets, Dependabot, and Release Please access.
5. Merge the identity migration through the protected default branch if it was prepared before transfer.
6. Create the next patch release through Release Please. This must be a new version after `0.2.0`; it becomes the first `@fillbyte` package and avoids rewriting the historical `0.2.0` release.
7. Verify the new GitHub release, tarball, checksum, SBOM, package repository association, public visibility, and authenticated installation from the Fillbyte scope.
8. Mark the legacy package deprecated with a migration message if GitHub Packages supports that operation for the package. Do not delete it while consumers may rely on historical builds.
9. Verify that old repository links redirect and that new documentation, issue forms, release notes, and package metadata resolve directly to Fillbyte.

The package workflow refuses to run outside the Fillbyte repository owner and refuses to publish `0.2.0` under the new scope. If a release is accidentally created before transfer, complete the transfer and use the workflow's explicit dispatch input with that new post-`0.2.0` tag; do not recreate the tag.

## Consumer migration

Update npm scope configuration and dependency references together:

```ini
@fillbyte:registry=https://npm.pkg.github.com
```

```json
{
  "dependencies": {
    "@fillbyte/ios-capability-architect": "<supported-version>"
  }
}
```

Provide a GitHub token with `read:packages` outside the repository. Remove `@dev-ugurkontel/ios-capability-architect` only after the new dependency installs and the MCP smoke test passes.

## Rollback boundary

Repository transfer and package publication are separate operations. If the transfer succeeds but Fillbyte package publication fails, keep the transferred repository canonical, fix the organization or workflow policy, and publish a subsequent version. Do not move release tags, overwrite a published package version, or transfer the repository back merely to preserve the old npm scope.
