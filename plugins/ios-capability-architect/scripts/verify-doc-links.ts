import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { deduplicateDocumentation, loadRegistry } from "../src/registry.js";

interface PreviousResult {
  url: string;
  etag?: string;
  last_modified?: string;
}

interface LinkResult extends PreviousResult {
  ok: boolean;
  status: number;
  final_url: string;
  checked_at: string;
  error?: string;
}

const reportUrl = new URL("../data/link-verification-report.json", import.meta.url);
let previous = new Map<string, PreviousResult>();
try {
  const parsed = JSON.parse(await readFile(fileURLToPath(reportUrl), "utf8")) as { results: PreviousResult[] };
  previous = new Map(parsed.results.map((result) => [result.url, result]));
} catch {
  // A first run has no cache.
}

async function verify(url: string): Promise<LinkResult> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "developer.apple.com") {
    return { url, ok: false, status: 0, final_url: url, checked_at: new Date().toISOString(), error: "Source host is not allowlisted" };
  }

  const cached = previous.get(url);
  const headers = new Headers({
    "User-Agent": "ios-capability-architect-link-verifier/0.1",
    Accept: "text/html,application/json;q=0.9,*/*;q=0.1"
  });
  if (cached?.etag) headers.set("If-None-Match", cached.etag);
  if (cached?.last_modified) headers.set("If-Modified-Since", cached.last_modified);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(15_000)
    });
    const ok = response.status === 304 || response.ok;
    await response.body?.cancel();
    return {
      url,
      ok,
      status: response.status,
      final_url: response.url || url,
      checked_at: new Date().toISOString(),
      ...(response.headers.get("etag") ? { etag: response.headers.get("etag")! } : {}),
      ...(response.headers.get("last-modified") ? { last_modified: response.headers.get("last-modified")! } : {})
    };
  } catch (error) {
    return {
      url,
      ok: false,
      status: 0,
      final_url: url,
      checked_at: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

const urls = deduplicateDocumentation(await loadRegistry()).map((reference) => reference.url);
const results: LinkResult[] = [];
for (let index = 0; index < urls.length; index += 6) {
  results.push(...await Promise.all(urls.slice(index, index + 6).map(verify)));
}

const report = {
  schema_version: "1.0",
  generated_at: new Date().toISOString(),
  strategy: "Conditional GET with ETag/Last-Modified cache; developer.apple.com allowlist; 15-second timeout; no registry mutation.",
  results
};
await writeFile(fileURLToPath(reportUrl), `${JSON.stringify(report, null, 2)}\n`, "utf8");

const failed = results.filter((result) => !result.ok);
console.log(JSON.stringify({ checked: results.length, passed: results.length - failed.length, failed }, null, 2));
if (failed.length > 0) process.exitCode = 1;
