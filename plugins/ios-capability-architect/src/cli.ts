#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  analyzeAppIdea,
  auditPermissionsAndEntitlements,
  auditPrivacyAndReview,
  auditProjectConfiguration,
  checkAvailability,
  generateArchitecture,
  generateImplementationPlan,
  getAppleTechnology,
  getCapabilityProfile,
  reportRegistryCoverage,
  resolveCapabilities,
  searchAppleTechnologyCatalog,
  searchOfficialAppleDocs
} from "@/engine.js";
import {
  analyzeIdeaInputSchema,
  architectureInputSchema,
  auditInputSchema,
  checkAvailabilityInputSchema,
  getAppleTechnologyInputSchema,
  getProfileInputSchema,
  implementationPlanInputSchema,
  officialDocsSearchInputSchema,
  projectConfigurationAuditInputSchema,
  resolveCapabilitiesInputSchema,
  technologyCatalogSearchInputSchema
} from "@/schema.js";

const help = `iOS Capability Architect CLI

Usage:
  ios-capability-architect <command> [options]

Commands:
  analyze             Extract requirements and constraints from an app idea.
  resolve             Analyze an idea and match verified capability profiles.
  profile             Return one verified capability profile.
  technology          Return one exact catalog technology as a reviewed profile or research-only entry.
  availability        Check capability availability for a declared target.
  audit-requirements  Separate permissions, plist keys, and entitlements.
  audit-project       Compare selected capabilities with local project configuration.
  audit-privacy       Report privacy, security, and App Review requirements.
  architecture        Generate a proportionate SwiftUI-first architecture.
  plan                Generate an implementation and release sequence.
  search              Search the verified local Apple documentation index.
  catalog             Search both profiled and catalog-only technologies.
  coverage            Report verified-profile coverage.

Common options:
  --idea <text>              App idea for analyze, resolve, or architecture.
  --capability <id>          Capability ID; repeat or comma-separate values.
  --platform <name>          Apple platform; analyze also accepts multi-platform (default: iOS).
  --minimum-os <version>     Deployment target for analyze or availability.
  --ui <framework>           SwiftUI, UIKit, AppKit, or unspecified (default: SwiftUI).
  --on-device <priority>     required, preferred, or neutral (default: preferred).
  --privacy <level>          standard, sensitive, or regulated (default: standard).
  --include-beta             Include beta records during resolution.
  --root <path>              Project root for audit-project.
  --query <text>             Search query.
  --limit <number>           Maximum results (default: 10).
  --scale <size>             prototype, small, medium, or large (default: small).
  --no-code-spike            Omit the feasibility spike from implementation plans.
  --help                     Show this help.

Every successful command writes one JSON value to stdout. Errors go to stderr.
The CLI is local and read-only; audit-project follows no symbolic links and returns no file contents.`;

interface CliStreams {
  stdout: (value: string) => void;
  stderr: (value: string) => void;
}

const defaultStreams: CliStreams = {
  stdout: (value) => process.stdout.write(value),
  stderr: (value) => process.stderr.write(value)
};

function strings(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [
    ...new Set(
      values
        .flatMap((item) => item.split(","))
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ];
}

function requireValue(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new Error(`Missing required option: ${name}`);
  return value.trim();
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new Error("--limit must be an integer from 1 through 100");
  }
  return parsed;
}

export async function runCli(args: string[], streams: CliStreams = defaultStreams): Promise<number> {
  try {
    const { positionals, values } = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: {
        help: { type: "boolean", short: "h" },
        idea: { type: "string" },
        capability: { type: "string", multiple: true },
        platform: { type: "string", default: "iOS" },
        "minimum-os": { type: "string" },
        ui: { type: "string", default: "SwiftUI" },
        "on-device": { type: "string", default: "preferred" },
        privacy: { type: "string", default: "standard" },
        "include-beta": { type: "boolean", default: false },
        root: { type: "string" },
        query: { type: "string" },
        limit: { type: "string" },
        device: { type: "string" },
        region: { type: "string" },
        language: { type: "string" },
        scale: { type: "string", default: "small" },
        "code-spike": { type: "boolean", default: false },
        "no-code-spike": { type: "boolean", default: false },
        coverage: { type: "string", default: "all" }
      }
    });

    const command = positionals[0];
    if (values.help || !command) {
      streams.stdout(`${help}\n`);
      return 0;
    }

    const capabilityIds = strings(values.capability);
    const requireCapabilities = (): string[] => {
      if (capabilityIds.length === 0) throw new Error("Provide at least one --capability");
      return capabilityIds;
    };
    const idea = values.idea?.trim();
    const limit = positiveInteger(values.limit, 10);
    if (values["code-spike"] && values["no-code-spike"]) {
      throw new Error("Use either --code-spike or --no-code-spike, not both");
    }
    let result: unknown;

    const analysisInput = () =>
      analyzeIdeaInputSchema.parse({
        idea: requireValue(idea, "--idea"),
        target_platform: values.platform,
        minimum_os_version: values["minimum-os"],
        preferred_ui_framework: values.ui,
        on_device_priority: values["on-device"],
        privacy_level: values.privacy
      });

    switch (command) {
      case "analyze":
        result = analyzeAppIdea(analysisInput());
        break;
      case "resolve": {
        const analysis = analyzeAppIdea(analysisInput());
        const resolutionInput = resolveCapabilitiesInputSchema.parse({
          requirements: analysis.data.requirements,
          include_beta: values["include-beta"],
          maximum_results_per_requirement: limit
        });
        result = {
          analysis,
          resolution: await resolveCapabilities(resolutionInput)
        };
        break;
      }
      case "profile": {
        const input = getProfileInputSchema.parse({
          capability_id_or_name: positionals[1] ?? requireCapabilities()[0]
        });
        result = await getCapabilityProfile(input.capability_id_or_name);
        break;
      }
      case "technology": {
        const input = getAppleTechnologyInputSchema.parse({
          technology_id_or_name: positionals[1] ?? requireValue(values.query, "technology name or --query")
        });
        result = await getAppleTechnology(input.technology_id_or_name);
        break;
      }
      case "availability":
        result = await checkAvailability(
          checkAvailabilityInputSchema.parse({
            capability_ids: requireCapabilities(),
            platform: values.platform,
            os_version: values["minimum-os"],
            device: values.device,
            region: values.region,
            language: values.language,
            allow_beta: values["include-beta"]
          })
        );
        break;
      case "audit-requirements": {
        const input = auditInputSchema.parse({ capability_ids: requireCapabilities() });
        result = await auditPermissionsAndEntitlements(input.capability_ids);
        break;
      }
      case "audit-project":
        result = await auditProjectConfiguration(
          projectConfigurationAuditInputSchema.parse({
            project_root: resolve(requireValue(values.root, "--root")),
            capability_ids: requireCapabilities(),
            platform: values.platform
          })
        );
        break;
      case "audit-privacy": {
        const input = auditInputSchema.parse({ capability_ids: requireCapabilities() });
        result = await auditPrivacyAndReview(input.capability_ids);
        break;
      }
      case "architecture":
        {
          const input = architectureInputSchema.parse({
            idea: requireValue(idea, "--idea"),
            capability_ids: requireCapabilities(),
            project_scale: values.scale
          });
          result = await generateArchitecture(input.idea, input.capability_ids, input.project_scale);
        }
        break;
      case "plan":
        {
          const input = implementationPlanInputSchema.parse({
            capability_ids: requireCapabilities(),
            include_code_spike: !values["no-code-spike"]
          });
          result = await generateImplementationPlan(input.capability_ids, input.include_code_spike);
        }
        break;
      case "search":
        {
          const input = officialDocsSearchInputSchema.parse({
            query: requireValue(values.query ?? positionals.slice(1).join(" "), "--query"),
            capability_ids: capabilityIds,
            maximum_results: limit
          });
          result = await searchOfficialAppleDocs(input.query, input.capability_ids, input.maximum_results);
        }
        break;
      case "catalog": {
        const input = technologyCatalogSearchInputSchema.parse({
          query: requireValue(values.query ?? positionals.slice(1).join(" "), "--query"),
          coverage_status: values.coverage,
          maximum_results: limit
        });
        result = await searchAppleTechnologyCatalog(input.query, input.coverage_status, input.maximum_results);
        break;
      }
      case "coverage":
        result = await reportRegistryCoverage();
        break;
      default:
        throw new Error(`Unknown command: ${command}`);
    }

    streams.stdout(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    streams.stderr(`ios-capability-architect: ${message}\n`);
    return 1;
  }
}

const entryPath = process.argv[1] ? realpathSync(resolve(process.argv[1])) : undefined;
if (entryPath && realpathSync(fileURLToPath(import.meta.url)) === entryPath) {
  process.exitCode = await runCli(process.argv.slice(2));
}
