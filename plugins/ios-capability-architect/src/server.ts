#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  analyzeIdeaInputSchema,
  architectureInputSchema,
  auditInputSchema,
  checkAvailabilityInputSchema,
  compareOptionsInputSchema,
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
  getCapabilityProfile,
  refreshCapabilityRegistry,
  reportRegistryCoverage,
  resolveCapabilities,
  searchAppleTechnologyCatalog,
  searchOfficialAppleDocs
} from "@/engine.js";
import type { ToolEnvelope } from "@/types.js";

declare const __PLUGIN_VERSION__: string;

const server = new McpServer({
  name: "ios-capability-architect",
  version: __PLUGIN_VERSION__
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
      "Turn a natural-language Apple-platform app idea into explicit requirements, assumptions, constraints, and at most three architecture-changing questions. Use before capability resolution.",
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
      "Match structured requirements to relevant verified Apple frameworks, APIs, capabilities, entitlements, permissions, and extensions. Excludes beta records unless explicitly requested.",
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
      "Return the full verified registry profile for one Apple technology or capability, including availability, permissions, entitlements, constraints, review risks, and official sources.",
    inputSchema: getProfileInputSchema,
    outputSchema,
    annotations: readOnlyAnnotations
  },
  async ({ capability_id_or_name }) => result(await getCapabilityProfile(capability_id_or_name))
);

server.registerTool(
  "compare_implementation_options",
  {
    title: "Compare iOS implementation options",
    description:
      "Compare two to six verified Apple technology options across deployment, on-device behavior, privacy, hardware, entitlement, review, and maintenance constraints.",
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
      "Check selected records against declared platform, OS, device, region, language, and beta constraints. Results are advisory and identify required runtime checks.",
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
      "Separate and aggregate runtime user permissions, Info.plist keys, Xcode capabilities, ordinary entitlements, managed entitlements, background modes, and extension targets.",
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
      "Read a local Apple-platform project configuration and compare its deployment target, plist keys, entitlements, background modes, and privacy manifest presence with selected verified capability profiles. The bounded scan follows no symlinks, returns no file contents, and makes no changes.",
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
      "Assess privacy manifests, required-reason APIs, sensitive data handling, security controls, and App Store review considerations for selected capabilities.",
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
      "Generate a proportionate SwiftUI-first layered architecture and data flow from a product idea and selected verified Apple capabilities.",
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
      "Create a dependency-ordered proof-of-concept, MVP, integration, permission, background, privacy, testing, and release plan for selected capabilities.",
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
      "Search the plugin's verified local index of official Apple documentation. This does not perform live web search; use the link-verification workflow to refresh source status.",
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
      "Discover profiled and catalog-only Apple technologies without treating catalog presence as implementation evidence.",
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
      "Report catalog size, reviewed profile count, profile coverage percentage, categories, and official index sources.",
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
      "Return a dry-run refresh plan and source inventory. Runtime mutation is intentionally disabled; reviewed repository changes are required for registry updates.",
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
