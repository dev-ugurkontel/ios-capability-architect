import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extractAppleTechnologyIndex, type UpstreamSnapshot } from "./catalog-coverage-core.js";

const sourceUrl = "https://developer.apple.com/technologies/";
const snapshotUrl = new URL("../docs/apple-technologies.snapshot.json", import.meta.url);
const response = await fetch(sourceUrl, {
  headers: { "User-Agent": "ios-capability-architect-upstream-monitor/1.0", Accept: "text/html" },
  signal: AbortSignal.timeout(30_000)
});
if (!response.ok) throw new Error(`Apple technologies index returned HTTP ${response.status}`);
const entries = extractAppleTechnologyIndex(await response.text());

if (process.argv.includes("--write")) {
  const observedAt = new Date().toISOString().slice(0, 10);
  const snapshot: UpstreamSnapshot = {
    schema_version: "1.0",
    source_url: sourceUrl,
    observed_at: observedAt,
    extraction_contract: "Links inside the Tools and frameworks section of developer.apple.com/technologies/.",
    entries
  };
  await writeFile(fileURLToPath(snapshotUrl), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  console.log(`Updated Apple upstream snapshot with ${entries.length} entries.`);
} else {
  const snapshot = JSON.parse(await readFile(snapshotUrl, "utf8")) as UpstreamSnapshot;
  const expected = JSON.stringify(snapshot.entries);
  const actual = JSON.stringify(entries);
  if (actual !== expected) {
    const oldIds = new Set(snapshot.entries.map((entry) => entry.canonical_id));
    const newIds = new Set(entries.map((entry) => entry.canonical_id));
    const added = entries.filter((entry) => !oldIds.has(entry.canonical_id));
    const removed = snapshot.entries.filter((entry) => !newIds.has(entry.canonical_id));
    throw new Error(
      `Apple technology index drift detected. Added: ${JSON.stringify(added)} Removed: ${JSON.stringify(removed)}. Review upstream changes before updating the snapshot.`
    );
  }
  console.log(JSON.stringify({ unchanged: true, source_url: sourceUrl, entry_count: entries.length }, null, 2));
}
