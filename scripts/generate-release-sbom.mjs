import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";

const packageUrl = new URL("../plugins/ios-capability-architect/package.json", import.meta.url);
const packageManifest = JSON.parse(await readFile(packageUrl, "utf8"));
const rawSbom = execFileSync(
  "npm",
  ["sbom", "--workspace", "plugins/ios-capability-architect", "--omit=dev", "--sbom-format", "cyclonedx"],
  { encoding: "utf8" }
);
const sbom = JSON.parse(rawSbom);
const [scope, unscopedName] = packageManifest.name.split("/");
sbom.metadata.component.name = packageManifest.name;
sbom.metadata.component.version = packageManifest.version;
sbom.metadata.component.purl = `pkg:npm/${encodeURIComponent(scope)}/${unscopedName}@${packageManifest.version}`;

process.stdout.write(`${JSON.stringify(sbom, null, 2)}\n`);
