import rawRegistryData from "@data/capabilities.json" with { type: "json" };
import rawTaxonomyData from "@data/taxonomy.json" with { type: "json" };
import { capabilityRegistrySchema } from "@/schema.js";
import {
  knowledgeTrackedFields,
  type CapabilityKnowledgeState,
  type CapabilityRecord,
  type CapabilityRelationship,
  type DocumentationReference,
  type KnowledgeState,
  type RegistryCoverage,
  type TechnologyCatalogEntry
} from "@/types.js";

type RawRecord = Omit<Partial<CapabilityRecord>, "knowledge_state" | "relationships"> &
  Pick<
    CapabilityRecord,
    "id" | "name" | "category" | "entity_type" | "summary" | "platforms" | "keywords" | "official_documentation"
  >;

interface RawRegistry {
  schema_version: "1.0";
  generated_at: string;
  records: RawRecord[];
}

interface RawTaxonomy {
  official_index_sources: string[];
  categories: Array<{ id: string; name: string; examples: string[] }>;
}

const emptyArrays = {
  aliases: [],
  supported_use_cases: [],
  unsupported_use_cases: [],
  related_frameworks: [],
  related_capabilities: [],
  related_entitlements: [],
  related_extensions: [],
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

function hasOwn(record: RawRecord, field: keyof CapabilityRecord): boolean {
  return Object.prototype.hasOwnProperty.call(record, field);
}

function classifyKnowledge(value: unknown): KnowledgeState {
  if (value === null || value === "") return "verified_none";
  if (Array.isArray(value) && value.length === 0) return "verified_none";
  if (typeof value === "object" && value !== null && Object.keys(value).length === 0) return "verified_none";
  return "verified_value";
}

function buildKnowledgeState(raw: RawRecord): CapabilityKnowledgeState {
  const fields = Object.fromEntries(
    knowledgeTrackedFields.map((field) => [field, hasOwn(raw, field) ? classifyKnowledge(raw[field]) : "unknown"])
  ) as CapabilityKnowledgeState["fields"];
  return {
    completeness: Object.values(fields).includes("unknown") ? "partial" : "complete",
    fields
  };
}

function buildRelationships(raw: RawRecord): CapabilityRelationship[] {
  const sources: Array<[CapabilityRelationship["type"], string[] | undefined]> = [
    ["related_framework", raw.related_frameworks],
    ["related_capability", raw.related_capabilities],
    ["related_entitlement", raw.related_entitlements],
    ["related_extension", raw.related_extensions]
  ];
  const relationships = sources.flatMap(([type, targets]) => (targets ?? []).map((target) => ({ type, target })));
  return [
    ...new Map(
      relationships.map((relationship) => [`${relationship.type}:${relationship.target}`, relationship])
    ).values()
  ];
}

function normalizeRecord(raw: RawRecord): CapabilityRecord {
  const sourceDates = [...raw.official_documentation, ...(raw.release_notes ?? [])].map((source) => source.verified_at);
  const lastVerifiedAt = raw.last_verified_at ?? sourceDates.sort().at(-1);
  if (!lastVerifiedAt) {
    throw new Error(`Record ${raw.id} has no source verification date`);
  }

  return {
    ...emptyArrays,
    relationships: buildRelationships(raw),
    minimum_os_version: {},
    sdk_availability: "Verify availability against the current stable SDK before implementation.",
    stable_or_beta: "unknown",
    deprecated_status: null,
    on_device_level: "unknown",
    network_requirement: "Depends on the selected API and feature configuration.",
    cloud_dependency: null,
    ...raw,
    last_verified_at: lastVerifiedAt,
    knowledge_state: buildKnowledgeState(raw)
  } satisfies CapabilityRecord;
}

let cachedRecords: CapabilityRecord[] | undefined;

export async function loadRegistry(): Promise<CapabilityRecord[]> {
  if (cachedRecords) return structuredClone(cachedRecords);

  const raw = rawRegistryData as unknown as RawRegistry;
  const normalized = {
    schema_version: raw.schema_version,
    generated_at: raw.generated_at,
    records: raw.records.map(normalizeRecord)
  };
  cachedRecords = capabilityRegistrySchema.parse(normalized).records;
  return structuredClone(cachedRecords);
}

export function resetRegistryCache(): void {
  cachedRecords = undefined;
}

function searchableText(record: CapabilityRecord): string {
  return [record.id, record.name, ...record.aliases, ...record.keywords, record.summary]
    .join(" ")
    .toLocaleLowerCase("en-US");
}

export async function findRecord(idOrName: string): Promise<CapabilityRecord | undefined> {
  const query = idOrName.trim().toLocaleLowerCase("en-US");
  if (!query) return undefined;
  const records = await loadRegistry();
  return (
    records.find(
      (record) =>
        record.id === query ||
        record.name.toLocaleLowerCase("en-US") === query ||
        record.aliases.some((alias) => alias.toLocaleLowerCase("en-US") === query)
    ) ?? records.find((record) => searchableText(record).includes(query))
  );
}

export async function searchRecords(query: string, limit = 10): Promise<CapabilityRecord[]> {
  const tokens = query
    .toLocaleLowerCase("en-US")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 2);
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

function normalizedCatalogKey(value: string): string {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "");
}

function catalogId(name: string): string {
  return name
    .normalize("NFKD")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function loadTechnologyCatalog(): Promise<TechnologyCatalogEntry[]> {
  const taxonomy = rawTaxonomyData as RawTaxonomy;
  const profiles = await loadRegistry();
  const byName = new Map<string, TechnologyCatalogEntry>();

  for (const category of taxonomy.categories) {
    for (const name of category.examples) {
      const key = normalizedCatalogKey(name);
      const matchingProfiles = profiles.filter((profile) =>
        [profile.id, profile.name, ...profile.aliases].some((candidate) => normalizedCatalogKey(candidate) === key)
      );
      const existing = byName.get(key);
      if (existing) {
        existing.category_ids.push(category.id);
        existing.category_names.push(category.name);
        existing.profile_ids = [
          ...new Set([...existing.profile_ids, ...matchingProfiles.map((profile) => profile.id)])
        ];
        if (existing.profile_ids.length > 0) existing.coverage_status = "profiled";
        continue;
      }
      byName.set(key, {
        id: `technology.${catalogId(name)}`,
        name,
        category_ids: [category.id],
        category_names: [category.name],
        coverage_status: matchingProfiles.length > 0 ? "profiled" : "catalogued",
        profile_ids: matchingProfiles.map((profile) => profile.id),
        source_urls: [...taxonomy.official_index_sources]
      });
    }
  }

  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name, "en-US"));
}

export async function getRegistryCoverage(): Promise<RegistryCoverage> {
  const taxonomy = rawTaxonomyData as RawTaxonomy;
  const [catalog, profiles] = await Promise.all([loadTechnologyCatalog(), loadRegistry()]);
  const profiled = catalog.filter((entry) => entry.coverage_status === "profiled").length;
  return {
    category_count: taxonomy.categories.length,
    catalogued_technology_count: catalog.length,
    profiled_technology_count: profiled,
    catalog_only_technology_count: catalog.length - profiled,
    profile_coverage_percent: Number(((profiled / catalog.length) * 100).toFixed(1)),
    verified_profile_count: profiles.length,
    official_index_sources: [...taxonomy.official_index_sources]
  };
}

export async function searchTechnologyCatalog(query: string, limit = 20): Promise<TechnologyCatalogEntry[]> {
  const tokens = query
    .trim()
    .toLocaleLowerCase("en-US")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 1);
  if (tokens.length === 0) return [];
  const catalog = await loadTechnologyCatalog();
  return catalog
    .map((entry) => {
      const haystack = [entry.id, entry.name, ...entry.category_ids, ...entry.category_names]
        .join(" ")
        .toLocaleLowerCase("en-US");
      return { entry, score: tokens.filter((token) => haystack.includes(token)).length };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.entry.name.localeCompare(right.entry.name, "en-US"))
    .slice(0, limit)
    .map(({ entry }) => entry);
}
