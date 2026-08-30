# Apple catalog coverage governance

The catalog uses four monotonic states and reports them without claiming permanent completeness:

1. **Discovered** — present in the committed snapshot extracted from Apple's official Technologies page.
2. **Catalogued** — present in `data/taxonomy.json` and assigned a deterministic canonical identity.
3. **Profiled** — a catalogued identity matches a capability profile by ID, name, or alias.
4. **Reviewed** — every matched profile includes dated, official Apple evidence.

`catalogued` is not implementation evidence. `profiled` is not automatically `reviewed`. A technology can be discovered upstream but remain intentionally uncatalogued while maintainers determine whether it belongs in this plugin's Apple-platform scope.

Reviewed profiles must state `minimum_os_version`, `sdk_availability`, `stable_or_beta`, and `last_verified_at` explicitly. The loader does not manufacture defaults for these core availability fields. An empty minimum-version map is valid only when the reviewed item is a submission or declaration policy without an independent runtime deployment target.

`minimum_os_version` describes the first OS release on which the profiled use cases are actually usable, not merely the first SDK where a framework can link. Use `null` when Apple exposes the framework on a platform but the profiled capability is unavailable there, and explain the distinction in `sdk_availability` and `limitations`. Apple's unified documentation can label APIs inherited from pre-iPadOS releases with historical versions such as `iPadOS 8.0`; preserve that lineage only when the capability itself worked on iPad at that version. For example, HealthKit links on earlier iPadOS releases but its store requires iPadOS 17, so the profile reports 17.0.

Review is evidence provenance, not a claim that every tracked field is known. Omitted optional fields remain `unknown` in `knowledge_state`; an explicit empty array, empty object, null, or empty string means the source review verified that the field has no applicable value. Never add empty values merely to turn a partial profile into a complete one.

The registry coverage response publishes `complete_profile_count` and `partial_profile_count` separately so consumers cannot mistake dated source review for field-level completeness.

## Discovery and recommendation boundary

Catalog retrieval is intentionally broader than reviewed architecture matching. `resolve_ios_capabilities` can surface unprofiled discoveries only in a separate `catalog_research_leads` collection, with the originating requirement and matched phrase; these leads never enter its capability `matches`. `search_apple_technology_catalog` and `get_apple_technology` can also return catalog-only identities so an agent can discover a relevant Apple technology without fabricating a capability profile. The CLI equivalents are `catalog` and `technology`.

For a catalog-only result:

1. Preserve `coverage_status: catalogued`, `recommendation_eligible: false`, `verified_scope`, `unverified_profile_fields`, `next_step`, and the tool warning in every downstream summary.
2. Describe the result as a research lead, never as a verified match or recommendation.
3. Perform live research against current, technology-specific official Apple documentation before evaluating availability, permissions, entitlements, platform behavior, privacy, App Review risk, or architectural fit.
4. Cite the technology-specific sources and record the actual verification date. A generic Apple Technologies index URL is discovery provenance, not implementation evidence.
5. Keep the item outside profile-dependent comparison, availability, audit, architecture, and planning tools until it is promoted through reviewed source edits and registry validation.

Live research can support an answer without changing the committed registry, but it does not silently promote the catalog record. If the evidence is insufficient or conflicting, keep the technology `catalogued`, label the claim `unverified`, and prefer a conservative recommendation.

## Deterministic pull-request gate

Every ordinary test run rebuilds the report from `taxonomy.json`, `capabilities.json`, and `apple-technologies.snapshot.json`, then compares it byte-for-byte at the JSON data level with `catalog-coverage.json`. This makes category removals, canonical-ID changes, profile promotion, and evidence-status changes visible in review.

After an intentional taxonomy or profile change:

```bash
npx tsx plugins/ios-capability-architect/scripts/validate-catalog-coverage.ts --write
npm test
```

Review the generated report diff. Do not update it merely to make CI green.

## Scheduled upstream drift check

The network-dependent workflow fetches `https://developer.apple.com/technologies/` weekly and compares the reviewed **Tools and frameworks** section with the committed snapshot. Additions, removals, renamed entries, URL changes, and HTML extraction-contract changes fail the scheduled job. They do not make ordinary pull requests flaky because PR validation never requires the network.

After reviewing an upstream change:

```bash
npx tsx plugins/ios-capability-architect/scripts/check-apple-catalog-upstream.ts --write
npx tsx plugins/ios-capability-architect/scripts/validate-catalog-coverage.ts --write
npm test
```

Then either catalogue each new identity, or leave it in `discovered` state so the gap remains measurable. Never promote an item to `profiled` or `reviewed` without the capability-profile evidence required by the registry.
