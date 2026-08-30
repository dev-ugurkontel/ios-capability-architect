import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
// eslint-disable-next-line no-restricted-imports -- This test exercises a script-only gate; source aliases intentionally do not expose scripts.
import {
  buildCoverageReport,
  canonicalTechnologyId,
  extractAppleTechnologyIndex,
  type Registry,
  type Taxonomy,
  type UpstreamSnapshot
} from "../scripts/catalog-coverage-core.js";

const pluginRoot = new URL("../", import.meta.url);
const readJson = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(new URL(path, pluginRoot), "utf8")) as T;

describe("deterministic Apple catalog coverage gate", () => {
  it("assigns every taxonomy example a stable canonical identity and honest monotonic status", async () => {
    const [taxonomy, registry, upstream] = await Promise.all([
      readJson<Taxonomy>("data/taxonomy.json"),
      readJson<Registry>("data/capabilities.json"),
      readJson<UpstreamSnapshot>("docs/apple-technologies.snapshot.json")
    ]);
    const report = buildCoverageReport(taxonomy, registry, upstream);
    const taxonomyOccurrences = taxonomy.categories.flatMap((category) =>
      category.examples.map((name) => canonicalTechnologyId(name))
    );

    expect(report.counts.taxonomy_occurrence_count).toBe(taxonomyOccurrences.length);
    expect(report.counts.catalogued_technology_count).toBe(new Set(taxonomyOccurrences).size);
    expect(canonicalTechnologyId("NowPlaying")).toBe(canonicalTechnologyId("Now Playing"));
    expect(report.entries.every((entry) => /^technology\.[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.canonical_id))).toBe(
      true
    );
    expect(report.entries.every((entry) => !entry.reviewed || entry.profiled)).toBe(true);
    expect(report.entries.every((entry) => !entry.profiled || entry.catalogued)).toBe(true);
    expect(report.entries.every((entry) => entry.status !== "discovered" || !entry.catalogued)).toBe(true);
  });

  it("matches the reviewed committed coverage baseline exactly", async () => {
    const [taxonomy, registry, upstream, committed] = await Promise.all([
      readJson<Taxonomy>("data/taxonomy.json"),
      readJson<Registry>("data/capabilities.json"),
      readJson<UpstreamSnapshot>("docs/apple-technologies.snapshot.json"),
      readJson("docs/catalog-coverage.json")
    ]);
    expect(buildCoverageReport(taxonomy, registry, upstream)).toEqual(committed);
  });

  it("fails closed when Apple's reviewed HTML extraction contract changes", () => {
    expect(() => extractAppleTechnologyIndex("<html><body>changed</body></html>")).toThrow("no longer matches");
  });
});
