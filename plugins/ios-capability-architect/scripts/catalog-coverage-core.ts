export interface Taxonomy {
  schema_version: string;
  description: string;
  official_index_sources: string[];
  categories: Array<{ id: string; name: string; examples: string[] }>;
}

export interface CapabilityProfile {
  id: string;
  name: string;
  aliases?: string[];
  official_documentation?: Array<{ url: string; verified_at: string }>;
  release_notes?: Array<{ url: string; verified_at: string }>;
}

export interface Registry {
  schema_version: string;
  generated_at: string;
  records: CapabilityProfile[];
}

export interface UpstreamSnapshot {
  schema_version: "1.0";
  source_url: string;
  observed_at: string;
  extraction_contract: string;
  entries: Array<{ canonical_id: string; name: string; url: string }>;
}

export type CoverageStatus = "discovered" | "catalogued" | "profiled" | "reviewed";

export interface CoverageEntry {
  canonical_id: string;
  name: string;
  status: CoverageStatus;
  discovered: boolean;
  catalogued: boolean;
  profiled: boolean;
  reviewed: boolean;
  taxonomy_names: string[];
  category_ids: string[];
  profile_ids: string[];
  source_urls: string[];
}

export interface CoverageReport {
  schema_version: "1.0";
  as_of: string;
  status_contract: Record<CoverageStatus, string>;
  counts: {
    taxonomy_occurrence_count: number;
    discovered_technology_count: number;
    catalogued_technology_count: number;
    profiled_technology_count: number;
    reviewed_technology_count: number;
    discovered_only_count: number;
    catalog_only_count: number;
  };
  entries: CoverageEntry[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const CANONICAL_SLUG_ALIASES = new Map([["nowplaying", "now-playing"]]);

export function canonicalTechnologyId(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  if (!slug) throw new Error(`Technology name has no canonical identity: ${JSON.stringify(value)}`);
  return `technology.${CANONICAL_SLUG_ALIASES.get(slug.replace(/-/g, "")) ?? slug}`;
}

function canonicalLookupKey(value: string): string {
  return canonicalTechnologyId(value)
    .replace(/^technology\./, "")
    .replace(/-/g, "");
}

function assertOfficialUrl(value: string, label: string): void {
  const url = new URL(value);
  if (url.protocol !== "https:" || !/(^|\.)apple\.com$/.test(url.hostname)) {
    throw new Error(`${label} is not an official HTTPS Apple URL: ${value}`);
  }
}

function isEvidenceReviewed(profile: CapabilityProfile): boolean {
  const references = [...(profile.official_documentation ?? []), ...(profile.release_notes ?? [])];
  if ((profile.official_documentation?.length ?? 0) === 0) return false;
  return references.every((reference) => {
    try {
      assertOfficialUrl(reference.url, `Profile ${profile.id} source`);
      return ISO_DATE.test(reference.verified_at);
    } catch {
      return false;
    }
  });
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "en-US"));
}

export function validateCoverageInputs(taxonomy: Taxonomy, registry: Registry, upstream: UpstreamSnapshot): void {
  if (taxonomy.schema_version !== "1.0" || registry.schema_version !== "1.0") {
    throw new Error("Taxonomy and registry schema_version must be 1.0");
  }
  if (!ISO_DATE.test(upstream.observed_at)) throw new Error("Upstream observed_at must be an ISO date");
  assertOfficialUrl(upstream.source_url, "Upstream source");
  taxonomy.official_index_sources.forEach((url) => assertOfficialUrl(url, "Taxonomy source"));

  const categoryIds = new Set<string>();
  for (const category of taxonomy.categories) {
    if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(category.id)) {
      throw new Error(`Invalid taxonomy category id: ${category.id}`);
    }
    if (categoryIds.has(category.id)) throw new Error(`Duplicate taxonomy category id: ${category.id}`);
    categoryIds.add(category.id);
    if (category.examples.length === 0) throw new Error(`Taxonomy category has no examples: ${category.id}`);
    category.examples.forEach((name) => canonicalTechnologyId(name));
  }

  const upstreamIds = new Set<string>();
  const upstreamUrls = new Set<string>();
  for (const entry of upstream.entries) {
    const expectedId = canonicalTechnologyId(entry.name);
    if (entry.canonical_id !== expectedId) {
      throw new Error(`Upstream canonical id drift for ${entry.name}: expected ${expectedId}`);
    }
    assertOfficialUrl(entry.url, `Upstream entry ${entry.name}`);
    if (upstreamIds.has(entry.canonical_id)) throw new Error(`Duplicate upstream id: ${entry.canonical_id}`);
    if (upstreamUrls.has(entry.url)) throw new Error(`Duplicate upstream URL: ${entry.url}`);
    upstreamIds.add(entry.canonical_id);
    upstreamUrls.add(entry.url);
  }
}

export function buildCoverageReport(
  taxonomy: Taxonomy,
  registry: Registry,
  upstream: UpstreamSnapshot
): CoverageReport {
  validateCoverageInputs(taxonomy, registry, upstream);

  type MutableEntry = {
    canonical_id: string;
    name: string;
    discovered: boolean;
    catalogued: boolean;
    taxonomyNames: Set<string>;
    categoryIds: Set<string>;
    profileIds: Set<string>;
    sourceUrls: Set<string>;
    matchingProfiles: CapabilityProfile[];
  };
  const entries = new Map<string, MutableEntry>();
  const get = (canonicalId: string, name: string): MutableEntry => {
    const existing = entries.get(canonicalId);
    if (existing) return existing;
    const created: MutableEntry = {
      canonical_id: canonicalId,
      name,
      discovered: false,
      catalogued: false,
      taxonomyNames: new Set(),
      categoryIds: new Set(),
      profileIds: new Set(),
      sourceUrls: new Set(),
      matchingProfiles: []
    };
    entries.set(canonicalId, created);
    return created;
  };

  for (const upstreamEntry of upstream.entries) {
    const entry = get(upstreamEntry.canonical_id, upstreamEntry.name);
    entry.discovered = true;
    entry.sourceUrls.add(upstreamEntry.url);
  }

  for (const category of taxonomy.categories) {
    for (const name of category.examples) {
      const canonicalId = canonicalTechnologyId(name);
      const entry = get(canonicalId, name);
      entry.catalogued = true;
      entry.taxonomyNames.add(name);
      entry.categoryIds.add(category.id);
      taxonomy.official_index_sources.forEach((url) => entry.sourceUrls.add(url));
    }
  }

  const profilesByKey = new Map<string, CapabilityProfile[]>();
  for (const profile of registry.records) {
    const keys = uniqueSorted([profile.id, profile.name, ...(profile.aliases ?? [])].map(canonicalLookupKey));
    for (const key of keys) profilesByKey.set(key, [...(profilesByKey.get(key) ?? []), profile]);
  }
  for (const entry of entries.values()) {
    const profiles = profilesByKey.get(canonicalLookupKey(entry.name)) ?? [];
    entry.matchingProfiles = profiles;
    profiles.forEach((profile) => entry.profileIds.add(profile.id));
  }

  const normalizedEntries: CoverageEntry[] = [...entries.values()]
    .map((entry) => {
      const profiled = entry.catalogued && entry.matchingProfiles.length > 0;
      const reviewed = profiled && entry.matchingProfiles.every(isEvidenceReviewed);
      const status: CoverageStatus = reviewed
        ? "reviewed"
        : profiled
          ? "profiled"
          : entry.catalogued
            ? "catalogued"
            : "discovered";
      return {
        canonical_id: entry.canonical_id,
        name: entry.name,
        status,
        discovered: entry.discovered,
        catalogued: entry.catalogued,
        profiled,
        reviewed,
        taxonomy_names: uniqueSorted(entry.taxonomyNames),
        category_ids: uniqueSorted(entry.categoryIds),
        profile_ids: uniqueSorted(entry.profileIds),
        source_urls: uniqueSorted(entry.sourceUrls)
      };
    })
    .sort((left, right) => left.canonical_id.localeCompare(right.canonical_id, "en-US"));

  const catalogued = normalizedEntries.filter((entry) => entry.catalogued);
  const profiled = normalizedEntries.filter((entry) => entry.profiled);
  const reviewed = normalizedEntries.filter((entry) => entry.reviewed);
  return {
    schema_version: "1.0",
    as_of: [upstream.observed_at, registry.generated_at.slice(0, 10)].sort().at(-1)!,
    status_contract: {
      discovered: "Present in the committed snapshot extracted from Apple's official technologies page.",
      catalogued: "Present in taxonomy.json with a deterministic canonical identity; not recommendation evidence.",
      profiled: "Catalogued and matched to at least one capability profile.",
      reviewed: "Profiled and every matched profile has dated official Apple evidence."
    },
    counts: {
      taxonomy_occurrence_count: taxonomy.categories.reduce((sum, category) => sum + category.examples.length, 0),
      discovered_technology_count: normalizedEntries.filter((entry) => entry.discovered).length,
      catalogued_technology_count: catalogued.length,
      profiled_technology_count: profiled.length,
      reviewed_technology_count: reviewed.length,
      discovered_only_count: normalizedEntries.filter((entry) => entry.discovered && !entry.catalogued).length,
      catalog_only_count: catalogued.filter((entry) => !entry.profiled).length
    },
    entries: normalizedEntries
  };
}

export function decodeAppleHtmlText(value: string): string {
  const text: string[] = [];
  let insideTag = false;
  for (const character of value) {
    if (character === "<") {
      insideTag = true;
    } else if (character === ">") {
      insideTag = false;
    } else if (!insideTag) {
      text.push(character);
    }
  }

  const entities: Record<string, string> = {
    "&amp;": "&",
    "&nbsp;": " ",
    "&#x27;": "'",
    "&#39;": "'",
    "&quot;": '"'
  };
  return text
    .join("")
    .replace(/&(?:amp|nbsp|#x27|#39|quot);/g, (entity) => entities[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

export function extractAppleTechnologyIndex(html: string): Array<{ canonical_id: string; name: string; url: string }> {
  const heading = '<h2 class="typography-section-headline">Tools and frameworks</h2>';
  const start = html.indexOf(heading);
  const end = html.indexOf('<link rel="stylesheet" href="/assets/styles/footer', start);
  if (start < 0 || end < 0 || end <= start) {
    throw new Error("Apple technologies page no longer matches the reviewed extraction contract");
  }
  const block = html.slice(start, end);
  const matches = block.matchAll(/<li><a href="([^"]+)">([\s\S]*?)<\/a><\/li>/g);
  const byId = new Map<string, { canonical_id: string; name: string; url: string }>();
  for (const match of matches) {
    const name = decodeAppleHtmlText(match[2] ?? "");
    const href = match[1];
    if (!name || !href) continue;
    const canonicalId = canonicalTechnologyId(name);
    if (byId.has(canonicalId)) throw new Error(`Apple upstream contains duplicate canonical id: ${canonicalId}`);
    const url = new URL(href, "https://developer.apple.com").href;
    assertOfficialUrl(url, `Extracted upstream entry ${name}`);
    byId.set(canonicalId, { canonical_id: canonicalId, name, url });
  }
  if (byId.size < 50) throw new Error(`Apple technologies extraction unexpectedly returned only ${byId.size} entries`);
  return [...byId.values()].sort((left, right) => left.canonical_id.localeCompare(right.canonical_id, "en-US"));
}
