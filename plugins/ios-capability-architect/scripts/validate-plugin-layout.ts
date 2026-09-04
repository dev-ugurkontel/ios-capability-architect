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
  "evals/trigger-cases.json",
  "skills/ios-capability-architect/SKILL.md",
  "skills/ios-capability-architect/agents/openai.yaml",
  "skills/ios-capability-architect/assets/icon.svg"
];

await Promise.all(requiredPaths.map((path) => access(new URL(path, pluginRoot))));

const manifest = JSON.parse(await readFile(new URL(".codex-plugin/plugin.json", pluginRoot), "utf8")) as {
  name?: string;
  version?: string;
  author?: { name?: string; email?: string; url?: string };
  homepage?: string;
  repository?: string;
  keywords?: string[];
  skills?: string;
  mcpServers?: string;
  interface?: {
    displayName?: string;
    shortDescription?: string;
    websiteURL?: string;
    privacyPolicyURL?: string;
    termsOfServiceURL?: string;
    defaultPrompt?: string[];
    composerIcon?: string;
    logo?: string;
  };
};
if (manifest.name !== "ios-capability-architect") throw new Error("Plugin manifest name is invalid");
if (!/^\d+\.\d+\.\d+(?:\+[0-9A-Za-z.-]+)?$/.test(manifest.version ?? ""))
  throw new Error("Plugin manifest version must use SemVer");
if (manifest.skills !== "./skills/") throw new Error("Plugin manifest must expose ./skills/");
if (manifest.mcpServers !== "./.mcp.json") throw new Error("Plugin manifest must expose ./.mcp.json");
if (manifest.author?.name !== "Fillbyte" || manifest.author.email !== "support@fillbyte.com")
  throw new Error("Plugin manifest publisher metadata is incomplete");
if (manifest.homepage !== "https://github.com/fillbyte/skills/tree/main/plugins/ios-capability-architect")
  throw new Error("Plugin manifest homepage is not canonical");
if (manifest.repository !== "https://github.com/fillbyte/skills")
  throw new Error("Plugin manifest repository is not canonical");
if (!manifest.keywords?.includes("agent-skills") || !manifest.keywords.includes("ios"))
  throw new Error("Plugin manifest discovery keywords are incomplete");

const interfaceMetadata = manifest.interface;
if (!interfaceMetadata?.displayName || !interfaceMetadata.shortDescription)
  throw new Error("Plugin interface display metadata is incomplete");
for (const field of ["websiteURL", "privacyPolicyURL", "termsOfServiceURL"] as const) {
  const value = interfaceMetadata[field];
  if (!value || new URL(value).protocol !== "https:") throw new Error(`Plugin interface ${field} must be HTTPS`);
}
if (!interfaceMetadata.defaultPrompt?.length || interfaceMetadata.defaultPrompt.length > 3)
  throw new Error("Plugin interface must expose one through three default prompts");
if (interfaceMetadata.defaultPrompt.some((prompt) => prompt.length > 128))
  throw new Error("Plugin interface default prompts must not exceed 128 characters");
for (const field of ["composerIcon", "logo"] as const) {
  const path = interfaceMetadata[field];
  if (!path?.startsWith("./")) throw new Error(`Plugin interface ${field} must be a relative asset path`);
  await access(new URL(path.slice(2), pluginRoot));
}

const skill = await readFile(new URL("skills/ios-capability-architect/SKILL.md", pluginRoot), "utf8");
if (!skill.startsWith("---\n")) throw new Error("Skill must start with YAML frontmatter");
if (!/\nname:\s*ios-capability-architect\s*\n/.test(skill)) throw new Error("Skill frontmatter name is invalid");
if (!/\ndescription:\s*.+\n/.test(skill)) throw new Error("Skill frontmatter description is missing");

const skillMetadata = await readFile(new URL("skills/ios-capability-architect/agents/openai.yaml", pluginRoot), "utf8");
if (!skillMetadata.includes('default_prompt: "Use $ios-capability-architect'))
  throw new Error("Skill UI metadata must explicitly invoke $ios-capability-architect");
if (!skillMetadata.includes('short_description: "Plan Apple capabilities and audit Xcode projects"'))
  throw new Error("Skill and plugin short descriptions must remain synchronized");
if (!skillMetadata.includes("allow_implicit_invocation: true"))
  throw new Error("Skill UI metadata must allow relevant implicit invocation");

const triggerCases = JSON.parse(await readFile(new URL("evals/trigger-cases.json", pluginRoot), "utf8")) as {
  skill?: string;
  cases?: Array<{ id?: string; kind?: string; prompt?: string; should_invoke?: boolean }>;
};
if (triggerCases.skill !== "ios-capability-architect" || !triggerCases.cases)
  throw new Error("Skill trigger evaluation metadata is invalid");
const triggerKinds = new Set(triggerCases.cases.map(({ kind }) => kind));
if (!["direct", "indirect", "negative"].every((kind) => triggerKinds.has(kind)))
  throw new Error("Skill trigger evaluations must cover direct, indirect, and negative prompts");
if (triggerCases.cases.some(({ id, prompt, should_invoke }) => !id || !prompt || typeof should_invoke !== "boolean"))
  throw new Error("Skill trigger evaluation cases are incomplete");

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
