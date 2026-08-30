# Tool contracts

Every tool returns:

```json
{
  "schema_version": "1.0",
  "generated_at": "ISO-8601 timestamp",
  "documentation_cutoff": "YYYY-MM-DD",
  "data": {},
  "warnings": []
}
```

All inputs are strict Zod schemas in `src/schema.ts`; all results are available as both MCP structured content and model-readable JSON text.

| Tool                                 | Required input | Optional input                                                                | Output data                                                                                  | Failure behavior                                 |
| ------------------------------------ | -------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `analyze_app_idea`                   | `idea`         | platform, deployment target, UI preference, on-device priority, privacy level | requirements, assumptions, constraints, up to three questions                                | Rejects short/oversize idea                      |
| `resolve_ios_capabilities`           | requirements   | beta flag, result limit                                                       | scored reviewed-profile matches plus separate catalog research leads                         | Empty result plus warning; never invents a match |
| `get_capability_profile`             | ID or name     | —                                                                             | full normalized record                                                                       | Unknown capability error                         |
| `compare_implementation_options`     | 2-6 IDs        | criteria                                                                      | aligned option facts                                                                         | Unknown capability error                         |
| `check_availability`                 | IDs            | platform, OS, device, region, language, beta flag                             | per-capability conditional status                                                            | Unknown capability error                         |
| `audit_permissions_and_entitlements` | IDs            | —                                                                             | permissions, Info.plist, capabilities, entitlements, managed entitlements, modes, extensions | Unknown capability error                         |
| `audit_ios_project_configuration`    | root, IDs      | platform                                                                      | bounded file inventory, detected/missing/incompatible/manual/unknown findings, remediation   | Invalid root or unknown capability error         |
| `audit_privacy_and_app_review`       | IDs            | —                                                                             | manifests, required reasons, review, security, minimization                                  | Unknown capability error                         |
| `generate_ios_architecture`          | idea, IDs      | project scale                                                                 | layers, data flow, Mermaid                                                                   | Unknown capability error                         |
| `generate_implementation_plan`       | IDs            | code-spike flag                                                               | dependency-ordered phases                                                                    | Unknown capability error                         |
| `search_official_apple_docs`         | query          | IDs, result limit                                                             | verified local source-index matches                                                          | Empty result; no live browsing claim             |
| `search_apple_technology_catalog`    | query          | coverage status, result limit                                                 | profiled and catalog-only Apple technology matches                                           | Catalog-only results remain non-recommendations  |
| `get_apple_technology`               | ID or name     | —                                                                             | catalog entry plus either a reviewed profile or an explicitly ineligible catalog-only result | Unknown or ambiguous technology error            |
| `get_registry_coverage`              | —              | —                                                                             | catalog size, profile coverage, categories, official index sources                           | Never inflates catalogued items into profiles    |
| `refresh_capability_registry`        | —              | dry-run, source URLs                                                          | source inventory and reviewed refresh workflow                                               | Non-dry-run remains nonmutating and warns        |

Authorization is `none`. Side effects and external actions are `none`; live URL checks are a separate developer CLI command, not an MCP tool call. The project audit reads only allowlisted configuration filenames beneath the caller-provided local root, follows no symbolic links, enforces per-file and total-size limits, and returns paths and findings rather than file contents.

## Technology discovery boundary

`resolve_ios_capabilities` keeps unprofiled discoveries in `catalog_research_leads`, separate from capability `matches`; each lead identifies the requirement and matched phrase that produced it. `search_apple_technology_catalog` and `get_apple_technology` provide direct discovery access. They preserve the boundary between:

- **reviewed/profiled technology** — linked to a dated capability profile backed by technology-specific official Apple evidence; and
- **catalog-only technology** — a deterministic identity, category assignment, and upstream discovery source that can be used only as a research lead.

`get_apple_technology` returns `kind: reviewed_profile` with both `catalog_entry` and `profile` when reviewed evidence exists. Its catalog-only form returns `catalog_entry`, `recommendation_eligible: false`, the narrow `verified_scope`, explicit `unverified_profile_fields`, and an official-live-research `next_step`.

Catalog-only records are not complete capability profiles. They must not be passed off as proof of availability, API behavior, permissions, entitlements, privacy obligations, background execution, App Review treatment, or architectural suitability. Before recommending a catalog-only technology, perform live research against current, technology-specific official Apple documentation and cite the sources and verification date. A generic Apple Technologies index URL proves discovery only.

Profile-dependent tools continue to reject catalog-only IDs. Promote a technology into those workflows only through the reviewed registry process; do not synthesize a profile or silently convert missing fields into defaults.
