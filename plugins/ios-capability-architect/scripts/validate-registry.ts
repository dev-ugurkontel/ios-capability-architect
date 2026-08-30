import { getRegistryCoverage, loadRegistry } from "@/registry.js";

const records = await loadRegistry();
const coverage = await getRegistryCoverage();
if (coverage.catalogued_technology_count < 170)
  throw new Error("Technology catalog unexpectedly shrank below 170 entries");
if (coverage.verified_profile_count !== records.length)
  throw new Error("Coverage profile count does not match registry");
const stability = Object.groupBy(records, (record) => record.stable_or_beta);
const entityTypes = Object.groupBy(records, (record) => record.entity_type);

console.log(
  JSON.stringify(
    {
      valid: true,
      record_count: records.length,
      coverage,
      stability: Object.fromEntries(Object.entries(stability).map(([key, value]) => [key, value?.length ?? 0])),
      entity_types: Object.fromEntries(Object.entries(entityTypes).map(([key, value]) => [key, value?.length ?? 0]))
    },
    null,
    2
  )
);
