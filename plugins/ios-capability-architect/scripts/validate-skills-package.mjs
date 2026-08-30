import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

const pluginRoot = fileURLToPath(new URL("../", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("../../../", import.meta.url));
const packageMetadata = JSON.parse(await readFile(join(pluginRoot, "package.json"), "utf8"));
const outputRoot = join(workspaceRoot, "dist", "skills-only");
const skillRoot = join(outputRoot, "ios-capability-architect");
const archivePath = join(outputRoot, `ios-capability-architect-skill-${packageMetadata.version}.zip`);

const requiredPaths = [
  "SKILL.md",
  "LICENSE",
  "manifest.json",
  "scripts/ios-capability-architect.mjs",
  "data/capabilities.json",
  "data/taxonomy.json",
  "references/capability-registry.md",
  "references/response-quality.md",
  "references/cli.md",
  "references/data-handling.md"
];

for (const path of requiredPaths) await stat(join(skillRoot, path));

const skill = await readFile(join(skillRoot, "SKILL.md"), "utf8");
if (!skill.startsWith("---\n")) throw new Error("Packaged SKILL.md has no YAML frontmatter");
if (!skill.includes("scripts/ios-capability-architect.mjs")) {
  throw new Error("Packaged SKILL.md does not route skills-only execution through the local CLI");
}

const manifest = JSON.parse(await readFile(join(skillRoot, "manifest.json"), "utf8"));
if (manifest.version !== packageMetadata.version)
  throw new Error("Skills package version does not match package metadata");
if (manifest.distribution !== "skills-only") throw new Error("Skills package distribution is not skills-only");

async function inspect(root, current = root) {
  let count = 0;
  let bytes = 0;
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    const details = await lstat(path);
    if (details.isSymbolicLink()) throw new Error(`Skills package contains a symbolic link: ${path}`);
    if (entry.isDirectory()) {
      const nested = await inspect(root, path);
      count += nested.count;
      bytes += nested.bytes;
    } else if (entry.isFile()) {
      count += 1;
      bytes += details.size;
      if (details.size > 6 * 1024 * 1024) throw new Error(`Skills package file exceeds 6 MiB: ${path}`);
    }
  }
  return { count, bytes };
}

const inventory = await inspect(skillRoot);
if (inventory.bytes > 15 * 1024 * 1024) throw new Error("Expanded skills package exceeds 15 MiB");

const zipEntries = execFileSync("unzip", ["-Z1", archivePath], { encoding: "utf8" }).trim().split("\n").filter(Boolean);
if (zipEntries.some((entry) => entry.startsWith("/") || entry.split("/").includes(".."))) {
  throw new Error("Skills archive contains an unsafe path");
}
if (zipEntries.includes(".mcp.json") || zipEntries.some((entry) => entry.endsWith("server.mjs"))) {
  throw new Error("Skills-only archive unexpectedly contains an MCP server configuration or runtime");
}
for (const requiredPath of requiredPaths) {
  if (!zipEntries.includes(requiredPath)) throw new Error(`Skills archive is missing ${requiredPath}`);
}

const coverage = JSON.parse(
  execFileSync("node", [join(skillRoot, "scripts", "ios-capability-architect.mjs"), "coverage"], {
    encoding: "utf8"
  })
);
if (coverage.schema_version !== "1.0" || coverage.data.profiled_technology_count < 1) {
  throw new Error("Packaged CLI coverage smoke test failed");
}

const profile = JSON.parse(
  execFileSync("node", [join(skillRoot, "scripts", "ios-capability-architect.mjs"), "profile", "healthkit"], {
    encoding: "utf8"
  })
);
if (profile.data.id !== "healthkit") throw new Error("Packaged CLI profile smoke test failed");

const archive = await readFile(archivePath);
process.stdout.write(
  `${JSON.stringify(
    {
      valid: true,
      version: packageMetadata.version,
      files: inventory.count,
      expanded_bytes: inventory.bytes,
      archive_bytes: archive.length,
      sha256: createHash("sha256").update(archive).digest("hex"),
      cli_smoke: ["coverage", "profile:healthkit"]
    },
    null,
    2
  )}\n`
);
