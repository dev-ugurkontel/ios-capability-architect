# Apple catalog coverage governance

The catalog uses four monotonic states and reports them without claiming permanent completeness:

1. **Discovered** — present in the committed snapshot extracted from Apple's official Technologies page.
2. **Catalogued** — present in `data/taxonomy.json` and assigned a deterministic canonical identity.
3. **Profiled** — a catalogued identity matches a capability profile by ID, name, or alias.
4. **Reviewed** — every matched profile includes dated, official Apple evidence.

`catalogued` is not implementation evidence. `profiled` is not automatically `reviewed`. A technology can be discovered upstream but remain intentionally uncatalogued while maintainers determine whether it belongs in this plugin's Apple-platform scope.

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
