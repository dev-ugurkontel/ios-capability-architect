import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { build } from "esbuild";

const bundleRoot = new URL("../bundle/", import.meta.url);
const bundleTargets = [
  { entry: "../src/server.ts", output: "../bundle/server.mjs" },
  { entry: "../src/cli.ts", output: "../bundle/cli.mjs" }
];

await mkdir(bundleRoot, { recursive: true });
await Promise.all(
  bundleTargets.map(({ entry, output }) =>
    build({
      entryPoints: [fileURLToPath(new URL(entry, import.meta.url))],
      outfile: fileURLToPath(new URL(output, import.meta.url)),
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node24",
      packages: "bundle",
      sourcemap: false,
      minify: false,
      legalComments: "external"
    })
  )
);

for (const { output } of bundleTargets) {
  const outputUrl = new URL(output, import.meta.url);
  const source = await readFile(outputUrl, "utf8");
  const normalized = `${source
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join("\n")
    .trimEnd()}\n`;
  if (source !== normalized) await writeFile(outputUrl, normalized, "utf8");
}

const dependencyQuery = execFileSync(
  "npm",
  ["query", ":not(.dev)", "--workspace", "plugins/ios-capability-architect", "--json"],
  {
    cwd: fileURLToPath(new URL("../../..", import.meta.url)),
    encoding: "utf8"
  }
);

const dependencies = JSON.parse(dependencyQuery)
  .filter(
    (dependency) =>
      dependency.name !== "ios-capability-architect-workspace" &&
      dependency.name !== "@fillbyte/ios-capability-architect"
  )
  .filter(
    (dependency, index, all) =>
      all.findIndex((candidate) => candidate.name === dependency.name && candidate.version === dependency.version) ===
      index
  )
  .sort((left, right) => `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`));

const noticeSections = [
  "THIRD-PARTY SOFTWARE NOTICES",
  "",
  "This distributable bundles the production dependencies listed below. License texts are copied from the locked installation used to build the package.",
  ""
];

for (const dependency of dependencies) {
  const files = await readdir(dependency.path);
  const licenseFile = files
    .filter((file) => /^(license|licence|copying)(\..*)?$/i.test(file))
    .sort((left, right) => left.localeCompare(right))[0];

  if (!licenseFile) {
    throw new Error(`Missing license text for bundled dependency ${dependency.name}@${dependency.version}`);
  }

  const licenseText = (await readFile(join(dependency.path, licenseFile), "utf8"))
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
  noticeSections.push(
    "=".repeat(80),
    `${dependency.name}@${dependency.version}`,
    `Declared license: ${dependency.license ?? "UNKNOWN"}`,
    `Source: ${dependency.homepage ?? dependency.repository?.url ?? "See package metadata"}`,
    "-".repeat(80),
    licenseText,
    ""
  );
}

await writeFile(new URL("THIRD_PARTY_NOTICES.txt", bundleRoot), `${noticeSections.join("\n").trimEnd()}\n`, "utf8");
