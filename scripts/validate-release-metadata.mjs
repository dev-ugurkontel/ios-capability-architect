import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const repositoryUrl = "https://github.com/fillbyte/ios-capability-architect";
const semverPattern = /^\d+\.\d+\.\d+(?:\+[0-9A-Za-z.-]+)?$/;
const write = process.argv.includes("--write");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function compareVersions(left, right) {
  const leftParts = left.split("+")[0].split(".").map(Number);
  const rightParts = right.split("+")[0].split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return rightParts[index] - leftParts[index];
  }
  return 0;
}

const manifestPath = "plugins/ios-capability-architect/.codex-plugin/plugin.json";
const manifest = await readJson(manifestPath);
const canonicalManifest = `${JSON.stringify(manifest, null, 2)}\n`;
const manifestSource = await readFile(manifestPath, "utf8");

if (write && manifestSource !== canonicalManifest) await writeFile(manifestPath, canonicalManifest);
if (!write) {
  assert(
    manifestSource === canonicalManifest,
    `${manifestPath} must use release-please's deterministic JSON representation; run npm run format`
  );
}

const [rootPackage, pluginPackage, packageLock, releaseManifest] = await Promise.all([
  readJson("package.json"),
  readJson("plugins/ios-capability-architect/package.json"),
  readJson("package-lock.json"),
  readJson(".release-please-manifest.json")
]);

const version = rootPackage.version;
assert(semverPattern.test(version), `package.json version is not valid SemVer: ${version}`);

const versionSurfaces = new Map([
  [".release-please-manifest.json", releaseManifest["."]],
  ["package-lock.json root package", packageLock.packages?.[""]?.version],
  ["package-lock.json plugin workspace", packageLock.packages?.["plugins/ios-capability-architect"]?.version],
  ["plugins/ios-capability-architect/package.json", pluginPackage.version],
  [manifestPath, manifest.version]
]);

for (const [surface, surfaceVersion] of versionSurfaces) {
  assert(surfaceVersion === version, `${surface} version ${surfaceVersion ?? "<missing>"} does not match ${version}`);
}

const changelog = await readFile("CHANGELOG.md", "utf8");
assert(changelog.endsWith("\n"), "CHANGELOG.md must end with a newline");
assert(!changelog.includes("\r"), "CHANGELOG.md must use LF line endings");
assert(changelog.startsWith("# Changelog\n\n"), "CHANGELOG.md must start with the canonical heading");
assert(!changelog.includes("https://github.com/dev-ugurkontel/"), "CHANGELOG.md contains a legacy repository URL");

const releaseHeadingPattern = new RegExp(
  `^## \\[(\\d+\\.\\d+\\.\\d+(?:\\+[0-9A-Za-z.-]+)?)\\]\\(${repositoryUrl.replaceAll("/", "\\/")}\\/compare\\/([^)]*)\\) \\((\\d{4}-\\d{2}-\\d{2})\\)$`,
  "gm"
);
const releases = [...changelog.matchAll(releaseHeadingPattern)].map((match) => ({
  version: match[1],
  comparison: match[2],
  date: match[3]
}));

assert(releases.length > 0, "CHANGELOG.md does not contain a release-please release heading");
assert(releases[0].version === version, `CHANGELOG.md latest release ${releases[0].version} does not match ${version}`);
assert(
  new Set(releases.map(({ version: releaseVersion }) => releaseVersion)).size === releases.length,
  "CHANGELOG.md contains duplicate release versions"
);

for (let index = 0; index < releases.length; index += 1) {
  const release = releases[index];
  const comparisonParts = release.comparison.split("...");
  assert(
    comparisonParts.length === 2 && comparisonParts[1].endsWith(`v${release.version}`),
    `CHANGELOG.md comparison target is invalid for ${release.version}`
  );
  assert(
    !Number.isNaN(Date.parse(`${release.date}T00:00:00Z`)),
    `CHANGELOG.md release date is invalid for ${release.version}`
  );
  if (index > 0) {
    assert(
      compareVersions(releases[index - 1].version, release.version) < 0,
      "CHANGELOG.md releases must be newest first"
    );
  }
}

process.stdout.write(
  `${JSON.stringify(
    {
      valid: true,
      version,
      checked_version_surfaces: versionSurfaces.size + 1,
      release_headings: releases.length,
      wrote_manifest: write && manifestSource !== canonicalManifest
    },
    null,
    2
  )}\n`
);
