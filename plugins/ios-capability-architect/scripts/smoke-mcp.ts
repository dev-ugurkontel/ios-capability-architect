import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

const pluginRoot = process.env.PLUGIN_SMOKE_ROOT ?? fileURLToPath(new URL("..", import.meta.url));
const client = new Client({ name: "ios-capability-architect-smoke", version: "0.1.0" });
const transport = new StdioClientTransport({
  command: "node",
  args: ["./bundle/server.mjs"],
  cwd: pluginRoot,
  stderr: "pipe"
});

try {
  await client.connect(transport);
  const tools = await client.listTools();
  if (tools.tools.length !== 11) throw new Error(`Expected 11 tools, received ${tools.tools.length}`);
  const expected = [
    "analyze_app_idea", "resolve_ios_capabilities", "get_capability_profile",
    "compare_implementation_options", "check_availability", "audit_permissions_and_entitlements",
    "audit_privacy_and_app_review", "generate_ios_architecture", "generate_implementation_plan",
    "search_official_apple_docs", "refresh_capability_registry"
  ];
  for (const name of expected) {
    if (!tools.tools.some((tool) => tool.name === name)) throw new Error(`Missing tool: ${name}`);
  }

  const response = await client.callTool({
    name: "get_capability_profile",
    arguments: { capability_id_or_name: "healthkit" }
  });
  if (response.isError) throw new Error("get_capability_profile returned an MCP error");
  const structuredContent = response.structuredContent as Record<string, unknown> | undefined;
  if (structuredContent?.schema_version !== "1.0") throw new Error("Missing structured output envelope");

  console.log(JSON.stringify({
    connected: true,
    tool_count: tools.tools.length,
    profile_smoke: "healthkit",
    structured_output: true
  }, null, 2));
} finally {
  await client.close();
}
