import { loadRegistry } from "../src/registry.js";

const records = await loadRegistry();
const stability = Object.groupBy(records, (record) => record.stable_or_beta);
const entityTypes = Object.groupBy(records, (record) => record.entity_type);

console.log(JSON.stringify({
  valid: true,
  record_count: records.length,
  stability: Object.fromEntries(Object.entries(stability).map(([key, value]) => [key, value?.length ?? 0])),
  entity_types: Object.fromEntries(Object.entries(entityTypes).map(([key, value]) => [key, value?.length ?? 0]))
}, null, 2));
