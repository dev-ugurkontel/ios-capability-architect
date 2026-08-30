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

| Tool | Required input | Optional input | Output data | Failure behavior |
|---|---|---|---|---|
| `analyze_app_idea` | `idea` | platform, deployment target, UI preference, on-device priority, privacy level | requirements, assumptions, constraints, up to three questions | Rejects short/oversize idea |
| `resolve_ios_capabilities` | requirements | beta flag, result limit | scored matches with complete records | Empty result plus warning; never invents a match |
| `get_capability_profile` | ID or name | — | full normalized record | Unknown capability error |
| `compare_implementation_options` | 2-6 IDs | criteria | aligned option facts | Unknown capability error |
| `check_availability` | IDs | platform, OS, device, region, language, beta flag | per-capability conditional status | Unknown capability error |
| `audit_permissions_and_entitlements` | IDs | — | permissions, Info.plist, capabilities, entitlements, managed entitlements, modes, extensions | Unknown capability error |
| `audit_privacy_and_app_review` | IDs | — | manifests, required reasons, review, security, minimization | Unknown capability error |
| `generate_ios_architecture` | idea, IDs | project scale | layers, data flow, Mermaid | Unknown capability error |
| `generate_implementation_plan` | IDs | code-spike flag | dependency-ordered phases | Unknown capability error |
| `search_official_apple_docs` | query | IDs, result limit | verified local source-index matches | Empty result; no live browsing claim |
| `refresh_capability_registry` | — | dry-run, source URLs | source inventory and reviewed refresh workflow | Non-dry-run remains nonmutating and warns |

Authorization is `none` because the server reads only packaged public data. Side effects are `none`. External action is `none`; live URL checks are a separate developer CLI command, not an MCP tool call.
