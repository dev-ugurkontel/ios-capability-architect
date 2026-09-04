#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync } from "node:fs";
import { z } from "zod";
import {
  analyzeIdeaInputSchema,
  architectureInputSchema,
  auditInputSchema,
  checkAvailabilityInputSchema,
  compareOptionsInputSchema,
  getAppleTechnologyInputSchema,
  getAppleTechnologyResultSchema,
  getProfileInputSchema,
  implementationPlanInputSchema,
  officialDocsSearchInputSchema,
  projectConfigurationAuditInputSchema,
  refreshRegistryInputSchema,
  registryCoverageInputSchema,
  resolveCapabilitiesInputSchema,
  technologyCatalogSearchInputSchema
} from "@/schema.js";
import {
  analyzeAppIdea,
  auditProjectConfiguration,
  auditPermissionsAndEntitlements,
  auditPrivacyAndReview,
  checkAvailability,
  compareImplementationOptions,
  generateArchitecture,
  generateImplementationPlan,
  getAppleTechnology,
  getCapabilityProfile,
  refreshCapabilityRegistry,
  reportRegistryCoverage,
  resolveCapabilities,
  searchAppleTechnologyCatalog,
  searchOfficialAppleDocs
} from "@/engine.js";
import type { ToolEnvelope } from "@/types.js";

function loadPackageVersion(): string {
  const metadata: unknown = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  if (
    typeof metadata !== "object" ||
    metadata === null ||
    !("version" in metadata) ||
    typeof metadata.version !== "string"
  ) {
    throw new Error("Package metadata has no string version");
  }
  return metadata.version;
}

const server = new McpServer({
  name: "ios-capability-architect",
  version: loadPackageVersion()
});

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false
};

const outputSchema = {
  schema_version: z.literal("1.0"),
  generated_at: z.string(),
  documentation_cutoff: z.string(),
  data: z.unknown(),
  warnings: z.array(z.string())
};

function result<T>(payload: ToolEnvelope<T>) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as unknown as Record<string, unknown>
  };
}

server.registerTool(
  "analyze_app_idea",
  {
    title: "Analyze an iOS app idea",
    description:
      "Use this before capability selection to turn an Apple-platform app idea into explicit requirements, assumptions, constraints, and at most three architecture-changing questions.",
    inputSchema: analyzeIdeaInputSchema,
    outputSchema,
    annotations: readOnlyAnnotations
  },
  (input) => result(analyzeAppIdea(input))
);

server.registerTool(
  "resolve_ios_capabilities",
  {
    title: "Resolve iOS capabilities",
    description:
      "Use this when structured product requirements need verified Apple frameworks, APIs, capabilities, entitlements, permissions, or extensions. Beta records stay excluded unless requested.",
    inputSchema: resolveCapabilitiesInputSchema,
    outputSchema,
    annotations: readOnlyAnnotations
  },
  async (input) => result(await resolveCapabilities(input))
);

server.registerTool(
  "get_capability_profile",
  {
    title: "Get an Apple capability profile",
    description:
      "Use this when one reviewed Apple capability needs its complete availability, permission, entitlement, constraint, review-risk, and official-source profile.",
    inputSchema: getProfileInputSchema,
    outputSchema,
    annotations: readOnlyAnnotations
  },
  async ({ capability_id_or_name }) => result(await getCapabilityProfile(capability_id_or_name))
);

server.registerTool(
  "get_apple_technology",
  {
    title: "Get an Apple technology",
    description:
      "Use this when one exact Apple technology needs catalog lookup. It returns a reviewed profile or an explicitly non-recommendable research lead without inventing evidence.",
    inputSchema: getAppleTechnologyInputSchema,
    outputSchema: { ...outputSchema, data: getAppleTechnologyResultSchema },
    annotations: readOnlyAnnotations
  },
  async ({ technology_id_or_name }) => result(await getAppleTechnology(technology_id_or_name))
);

server.registerTool(
  "compare_implementation_options",
  {
    title: "Compare iOS implementation options",
    description:
      "Use this when choosing among two to six reviewed Apple technologies across deployment, on-device, privacy, hardware, entitlement, review, and maintenance constraints.",
    inputSchema: compareOptionsInputSchema,
    outputSchema,
    annotations: readOnlyAnnotations
  },
  async ({ capability_ids, criteria }) => result(await compareImplementationOptions(capability_ids, criteria))
);

server.registerTool(
  "check_availability",
  {
    title: "Check Apple API availability",
    description:
      "Use this when selected capabilities must be checked against a declared platform, OS version, device, region, language, or beta policy. Results remain advisory.",
    inputSchema: checkAvailabilityInputSchema,
    outputSchema,
    annotations: readOnlyAnnotations
  },
  async (input) => result(await checkAvailability(input))
);

server.registerTool(
  "audit_permissions_and_entitlements",
  {
    title: "Audit permissions and entitlements",
    description:
      "Use this when selected capabilities need a separated inventory of permissions, Info.plist keys, Xcode capabilities, entitlements, background modes, and extensions.",
    inputSchema: auditInputSchema,
    outputSchema,
    annotations: readOnlyAnnotations
  },
  async ({ capability_ids }) => result(await auditPermissionsAndEntitlements(capability_ids))
);

server.registerTool(
  "audit_ios_project_configuration",
  {
    title: "Audit an iOS project's capability configuration",
    description:
      "Use this when an existing local Apple project needs a read-only capability configuration audit. The bounded scan follows no symlinks, returns no file contents, and makes no changes.",
    inputSchema: projectConfigurationAuditInputSchema,
    outputSchema,
    annotations: readOnlyAnnotations
  },
  async (input) => result(await auditProjectConfiguration(input))
);

server.registerTool(
  "audit_privacy_and_app_review",
  {
    title: "Audit privacy and App Review risks",
    description:
      "Use this when selected capabilities involve privacy manifests, required-reason APIs, sensitive data, security controls, disclosures, or App Store review risk.",
    inputSchema: auditInputSchema,
    outputSchema,
    annotations: readOnlyAnnotations
  },
  async ({ capability_ids }) => result(await auditPrivacyAndReview(capability_ids))
);

server.registerTool(
  "generate_ios_architecture",
  {
    title: "Generate an iOS architecture",
    description:
      "Use this after capability selection to generate a proportionate SwiftUI-first architecture and data flow for the product idea.",
    inputSchema: architectureInputSchema,
    outputSchema,
    annotations: readOnlyAnnotations
  },
  async ({ idea, capability_ids, project_scale }) =>
    result(await generateArchitecture(idea, capability_ids, project_scale))
);

server.registerTool(
  "generate_implementation_plan",
  {
    title: "Generate an iOS implementation plan",
    description:
      "Use this after capability selection to create a dependency-ordered feasibility, MVP, integration, permission, background, privacy, testing, and release plan.",
    inputSchema: implementationPlanInputSchema,
    outputSchema,
    annotations: readOnlyAnnotations
  },
  async ({ capability_ids, include_code_spike }) =>
    result(await generateImplementationPlan(capability_ids, include_code_spike))
);

server.registerTool(
  "search_official_apple_docs",
  {
    title: "Search verified Apple documentation",
    description:
      "Use this when selected capabilities need references from the verified local Apple source index. It is not live web search and does not prove current semantics.",
    inputSchema: officialDocsSearchInputSchema,
    outputSchema,
    annotations: readOnlyAnnotations
  },
  async ({ query, capability_ids, maximum_results }) =>
    result(await searchOfficialAppleDocs(query, capability_ids, maximum_results))
);

server.registerTool(
  "search_apple_technology_catalog",
  {
    title: "Search the Apple technology catalog",
    description:
      "Use this for broad Apple technology discovery when the exact capability is unknown. Catalog-only results are research leads, not implementation evidence.",
    inputSchema: technologyCatalogSearchInputSchema,
    outputSchema,
    annotations: readOnlyAnnotations
  },
  async ({ query, coverage_status, maximum_results }) =>
    result(await searchAppleTechnologyCatalog(query, coverage_status, maximum_results))
);

server.registerTool(
  "get_registry_coverage",
  {
    title: "Measure registry coverage",
    description:
      "Use this when measuring the reviewed registry against the committed Apple technology catalog, including counts, coverage percentage, categories, and index sources.",
    inputSchema: registryCoverageInputSchema,
    outputSchema,
    annotations: readOnlyAnnotations
  },
  async () => result(await reportRegistryCoverage())
);

server.registerTool(
  "refresh_capability_registry",
  {
    title: "Plan a capability registry refresh",
    description:
      "Use this when maintainers need a non-mutating source inventory and conservative registry refresh plan. Runtime mutation is intentionally disabled.",
    inputSchema: refreshRegistryInputSchema,
    outputSchema,
    annotations: readOnlyAnnotations
  },
  async ({ dry_run, source_urls }) => result(await refreshCapabilityRegistry(dry_run, source_urls))
);

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
  console.error("ios-capability-architect MCP server running on stdio");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ios-capability-architect failed: ${message}`);
  process.exitCode = 1;
});
