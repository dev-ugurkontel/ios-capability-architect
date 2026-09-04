import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { packageVersionFromMetadata, runServer } from "@/server.js";

class MemoryTransport implements Transport {
  peer?: MemoryTransport;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: <T extends JSONRPCMessage>(message: T) => void;

  async start(): Promise<void> {}

  async send(message: JSONRPCMessage): Promise<void> {
    this.peer?.onmessage?.(structuredClone(message));
  }

  async close(): Promise<void> {
    this.onclose?.();
  }
}

function linkedTransports(): [MemoryTransport, MemoryTransport] {
  const client = new MemoryTransport();
  const server = new MemoryTransport();
  client.peer = server;
  server.peer = client;
  return [client, server];
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MCP server source", () => {
  it("validates package metadata defensively", () => {
    expect(packageVersionFromMetadata({ version: "0.9.0" })).toBe("0.9.0");
    for (const metadata of ["0.9.0", null, {}, { version: 9 }]) {
      expect(() => packageVersionFromMetadata(metadata)).toThrow("Package metadata has no string version");
    }
  });

  it("registers and executes every shipped tool over MCP", async () => {
    const [clientTransport, serverTransport] = linkedTransports();
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await runServer(serverTransport);

    const client = new Client({ name: "source-coverage", version: "1.0.0" });
    await client.connect(clientTransport);

    try {
      expect(client.getServerVersion()).toMatchObject({ name: "ios-capability-architect" });
      expect(client.getServerVersion()?.version).toMatch(/^\d+\.\d+\.\d+/);
      const tools = await client.listTools();
      expect(tools.tools).toHaveLength(15);
      expect(tools.tools.every((tool) => tool.annotations?.readOnlyHint === true)).toBe(true);

      const calls: Array<{ name: string; arguments: Record<string, unknown> }> = [
        ["analyze_app_idea", { idea: "An offline health journal" }],
        [
          "resolve_ios_capabilities",
          {
            requirements: [
              {
                id: "req-health",
                kind: "data",
                description: "Read health data",
                keywords: ["health"],
                confidence: "explicit"
              }
            ]
          }
        ],
        ["get_capability_profile", { capability_id_or_name: "healthkit" }],
        ["get_apple_technology", { technology_id_or_name: "HealthKit" }],
        ["compare_implementation_options", { capability_ids: ["healthkit", "core-location"] }],
        ["check_availability", { capability_ids: ["healthkit"], platform: "iOS", os_version: "18.0" }],
        ["audit_permissions_and_entitlements", { capability_ids: ["healthkit"] }],
        [
          "audit_ios_project_configuration",
          { project_root: process.cwd(), capability_ids: ["privacy-manifest"], platform: "iOS" }
        ],
        ["audit_privacy_and_app_review", { capability_ids: ["healthkit"] }],
        [
          "generate_ios_architecture",
          { idea: "An offline health journal", capability_ids: ["healthkit"], project_scale: "small" }
        ],
        ["generate_implementation_plan", { capability_ids: ["healthkit"], include_code_spike: true }],
        ["search_official_apple_docs", { query: "HealthKit", capability_ids: ["healthkit"] }],
        ["search_apple_technology_catalog", { query: "HealthKit", coverage_status: "all" }],
        ["get_registry_coverage", {}],
        ["refresh_capability_registry", { dry_run: true, source_urls: [] }]
      ].map(([name, arguments_]) => ({ name: name as string, arguments: arguments_ as Record<string, unknown> }));

      for (const call of calls) {
        const response = await client.callTool(call);
        expect(response.isError, call.name).not.toBe(true);
        expect(response.structuredContent, call.name).toMatchObject({ schema_version: "1.0" });
        expect(response.content, call.name).toEqual(
          expect.arrayContaining([expect.objectContaining({ type: "text" })])
        );
      }
    } finally {
      await client.close();
    }

    expect(diagnostic).toHaveBeenCalledWith("ios-capability-architect MCP server running on stdio");
  });
});
