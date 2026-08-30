import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const pluginRoot = new URL("..", import.meta.url);
const requiredPaths = [
  ".codex-plugin/plugin.json",
  ".mcp.json",
  "bundle/cli.mjs",
  "bundle/server.mjs",
  "data/capabilities.json",
  "data/taxonomy.json",
  "skills/ios-capability-architect/SKILL.md"
];

await Promise.all(requiredPaths.map((path) => access(new URL(path, pluginRoot))));

const manifest = JSON.parse(await readFile(new URL(".codex-plugin/plugin.json", pluginRoot), "utf8")) as {
  name?: string;
  version?: string;
  skills?: string;
  mcpServers?: string;
};
if (manifest.name !== "ios-capability-architect") throw new Error("Plugin manifest name is invalid");
if (!/^\d+\.\d+\.\d+(?:\+[0-9A-Za-z.-]+)?$/.test(manifest.version ?? ""))
  throw new Error("Plugin manifest version must use SemVer");
if (manifest.skills !== "./skills/") throw new Error("Plugin manifest must expose ./skills/");
if (manifest.mcpServers !== "./.mcp.json") throw new Error("Plugin manifest must expose ./.mcp.json");

const skill = await readFile(new URL("skills/ios-capability-architect/SKILL.md", pluginRoot), "utf8");
if (!skill.startsWith("---\n")) throw new Error("Skill must start with YAML frontmatter");
if (!/\nname:\s*ios-capability-architect\s*\n/.test(skill)) throw new Error("Skill frontmatter name is invalid");
if (!/\ndescription:\s*.+\n/.test(skill)) throw new Error("Skill frontmatter description is missing");

console.log(
  JSON.stringify(
    {
      valid: true,
      plugin_root: fileURLToPath(pluginRoot),
      required_paths: requiredPaths.length,
      manifest_version: manifest.version
    },
    null,
    2
  )
);
