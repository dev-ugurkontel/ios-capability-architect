import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildCoverageReport, type Registry, type Taxonomy, type UpstreamSnapshot } from "./catalog-coverage-core.js";

const pluginRoot = new URL("../", import.meta.url);
const readJson = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(new URL(path, pluginRoot), "utf8")) as T;

const [taxonomy, registry, upstream, committed] = await Promise.all([
  readJson<Taxonomy>("data/taxonomy.json"),
  readJson<Registry>("data/capabilities.json"),
  readJson<UpstreamSnapshot>("docs/apple-technologies.snapshot.json"),
  readJson<unknown>("docs/catalog-coverage.json").catch(() => undefined)
]);
const report = buildCoverageReport(taxonomy, registry, upstream);
const serialized = `${JSON.stringify(report, null, 2)}\n`;

if (process.argv.includes("--write")) {
  await writeFile(fileURLToPath(new URL("docs/catalog-coverage.json", pluginRoot)), serialized, "utf8");
  console.log(`Updated catalog coverage baseline (${report.entries.length} canonical technologies).`);
} else {
  if (JSON.stringify(committed) !== JSON.stringify(report)) {
    throw new Error(
      "Catalog coverage baseline is stale. Review the status changes, then run `npx tsx plugins/ios-capability-architect/scripts/validate-catalog-coverage.ts --write`."
    );
  }
  console.log(JSON.stringify({ valid: true, counts: report.counts }, null, 2));
}
