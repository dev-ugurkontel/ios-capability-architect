# Fillbyte Skills Roadmap

This roadmap describes collection-level direction, not delivery guarantees. Accepted issues and milestones are the source of truth for scheduled work. Domain-specific plans belong to their owning components.

## Completed: open-source collection foundation

- Establish the `fillbyte/skills` collection, marketplace, and canonical skills.sh identity.
- Keep every skill inside its owning component with independent discovery and packaging.
- Publish contribution, governance, privacy, security, support, release, and conduct policies.
- Validate manifests, metadata, links, generated artifacts, packages, archives, and protocol behavior.
- Produce reproducible release assets with checksums, SBOMs, and build provenance.

## Now: collection-scale quality

- Keep root messaging, automation, package metadata, and GitHub surfaces independent of any one catalog entry.
- Require 100% statement, branch, function, and line coverage for hand-written TypeScript runtime code.
- Make workspace commands discover component scripts instead of naming the first plugin.
- Publish direct, indirect, and negative invocation evals for every skill.
- Exercise clean install, upgrade, rollback, and uninstall paths for released components.
- Report component evidence, freshness, false-positive, false-negative, and unsupported rates separately from repository quality gates.

Completion signal: adding a conforming component requires no collection-level code fork, every measured quality gate is fully satisfied, and a clean consumer can reproduce the documented installation and behavior.

## Next: full software-lifecycle coverage

Grow the catalog through focused components selected by demonstrated developer need. Candidate areas include:

- software discovery, requirements, architecture, and technical decision records;
- implementation workflows across languages, frameworks, platforms, and infrastructure;
- tests, debugging, performance, accessibility, compatibility, and release confidence;
- application, dependency, supply-chain, cloud, and operational security;
- documentation, migration, maintenance, observability, incident response, and delivery;
- data engineering, developer experience, automation, and repository governance.

New components must remain narrow enough to route reliably. The collection will not create a catch-all skill or duplicate mature capabilities merely to increase catalog size.

Completion signal: the catalog covers multiple independent software-lifecycle domains while every component retains a precise trigger, explicit trust boundary, reproducible verification, and accountable maintainer surface.

## Later: ecosystem interoperability

- Publish versioned machine-readable catalog and compatibility metadata.
- Evaluate additional agent hosts and open interoperability standards without weakening component contracts.
- Add privacy-preserving hosted capabilities only when a local or static workflow cannot satisfy a demonstrated need.
- Publish comparative evaluations and adoption evidence without turning benchmark scores into unsupported quality claims.

## Component roadmaps

- [iOS Capability Architect](plugins/ios-capability-architect/ROADMAP.md)

Propose collection roadmap changes through the feature proposal template and explain the user need, alternatives, risks, ownership, and measurable completion criteria.
