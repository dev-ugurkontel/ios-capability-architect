import rawRegistryData from "../data/capabilities.json" with { type: "json" };
import { capabilityRegistrySchema } from "./schema.js";
import type { CapabilityRecord, DocumentationReference } from "./types.js";

type RawRecord = Partial<CapabilityRecord> & Pick<CapabilityRecord, "id" | "name" | "category" | "entity_type" | "summary" | "keywords" | "official_documentation">;

interface RawRegistry {
  schema_version: "1.0";
  generated_at: string;
  records: RawRecord[];
}

const emptyArrays = {
  aliases: [],
  supported_use_cases: [],
  unsupported_use_cases: [],
  related_frameworks: [],
  related_capabilities: [],
  related_entitlements: [],
  related_extensions: [],
  platforms: ["iOS"],
  supported_devices: [],
  hardware_requirements: [],
  region_restrictions: [],
  language_restrictions: [],
  user_permissions: [],
  info_plist_keys: [],
  xcode_capabilities: [],
  entitlements: [],
  managed_entitlements: [],
  background_modes: [],
  privacy_manifest_requirements: [],
  required_reason_apis: [],
  app_review_considerations: [],
  security_considerations: [],
  implementation_notes: [],
  limitations: [],
  recommended_alternatives: [],
  release_notes: []
} satisfies Partial<CapabilityRecord>;

function normalizeRecord(raw: RawRecord): CapabilityRecord {
  const sourceDates = [...raw.official_documentation, ...(raw.release_notes ?? [])].map((source) => source.verified_at);
  const lastVerifiedAt = raw.last_verified_at ?? sourceDates.sort().at(-1);
  if (!lastVerifiedAt) {
    throw new Error(`Record ${raw.id} has no source verification date`);
  }

  return {
    ...emptyArrays,
    minimum_os_version: {},
    sdk_availability: "Verify availability against the current stable SDK before implementation.",
    stable_or_beta: "stable",
    deprecated_status: null,
    on_device_level: "unknown",
    network_requirement: "Depends on the selected API and feature configuration.",
    cloud_dependency: null,
    ...raw,
    last_verified_at: lastVerifiedAt
  } as CapabilityRecord;
}

let cachedRecords: CapabilityRecord[] | undefined;

export async function loadRegistry(): Promise<CapabilityRecord[]> {
  if (cachedRecords) return cachedRecords;

  const raw = rawRegistryData as unknown as RawRegistry;
  const normalized = {
    schema_version: raw.schema_version,
    generated_at: raw.generated_at,
    records: raw.records.map(normalizeRecord)
  };
  cachedRecords = capabilityRegistrySchema.parse(normalized).records;
  return cachedRecords;
}

export function resetRegistryCache(): void {
  cachedRecords = undefined;
}

function searchableText(record: CapabilityRecord): string {
  return [record.id, record.name, ...record.aliases, ...record.keywords, record.summary].join(" ").toLocaleLowerCase("en-US");
}

export async function findRecord(idOrName: string): Promise<CapabilityRecord | undefined> {
  const query = idOrName.trim().toLocaleLowerCase("en-US");
  const records = await loadRegistry();
  return records.find((record) =>
    record.id === query ||
    record.name.toLocaleLowerCase("en-US") === query ||
    record.aliases.some((alias) => alias.toLocaleLowerCase("en-US") === query)
  ) ?? records.find((record) => searchableText(record).includes(query));
}

export async function searchRecords(query: string, limit = 10): Promise<CapabilityRecord[]> {
  const tokens = query.toLocaleLowerCase("en-US").split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 1);
  const records = await loadRegistry();
  return records
    .map((record) => {
      const haystack = searchableText(record);
      const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
      return { record, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.record.name.localeCompare(right.record.name))
    .slice(0, limit)
    .map(({ record }) => record);
}

export function deduplicateDocumentation(records: CapabilityRecord[]): DocumentationReference[] {
  const byUrl = new Map<string, DocumentationReference>();
  for (const record of records) {
    for (const reference of [...record.official_documentation, ...record.release_notes]) {
      byUrl.set(reference.url, reference);
    }
  }
  return [...byUrl.values()];
}
