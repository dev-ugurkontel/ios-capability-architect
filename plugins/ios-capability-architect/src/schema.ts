import { z } from "zod";
import {
  entityTypes,
  knowledgeStates,
  knowledgeTrackedFields,
  onDeviceLevels,
  relationshipTypes,
  stabilityLevels
} from "@/types.js";

const documentationReferenceSchema = z.object({
  title: z.string().min(1),
  url: z.url().refine(
    (url) => {
      const parsed = new URL(url);
      return (
        parsed.protocol === "https:" &&
        (parsed.hostname === "developer.apple.com" || parsed.hostname === "developers.openai.com")
      );
    },
    {
      message: "Only official Apple Developer or OpenAI Developer documentation URLs are allowed"
    }
  ),
  source_type: z.enum([
    "apple_developer_documentation",
    "release_notes",
    "wwdc",
    "hig",
    "app_store_review_guidelines",
    "apple_support",
    "openai_plugin_documentation"
  ]),
  verified_at: z.iso.date()
});

const capabilityRelationshipSchema = z.object({
  type: z.enum(relationshipTypes),
  target: z.string().min(1)
});

const knowledgeStateSchema = z.object({
  completeness: z.enum(["complete", "partial"]),
  fields: z.record(z.enum(knowledgeTrackedFields), z.enum(knowledgeStates))
});

export const capabilityRecordSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/),
    name: z.string().min(1),
    aliases: z.array(z.string()),
    category: z.string().min(1),
    entity_type: z.enum(entityTypes),
    summary: z.string().min(1),
    supported_use_cases: z.array(z.string()),
    unsupported_use_cases: z.array(z.string()),
    related_frameworks: z.array(z.string()),
    related_capabilities: z.array(z.string()),
    related_entitlements: z.array(z.string()),
    related_extensions: z.array(z.string()),
    relationships: z.array(capabilityRelationshipSchema),
    platforms: z.array(z.string()).min(1),
    minimum_os_version: z.record(z.string(), z.string().nullable()),
    sdk_availability: z.string().min(1),
    stable_or_beta: z.enum(stabilityLevels),
    deprecated_status: z.string().nullable(),
    supported_devices: z.array(z.string()),
    hardware_requirements: z.array(z.string()),
    region_restrictions: z.array(z.string()),
    language_restrictions: z.array(z.string()),
    on_device_level: z.enum(onDeviceLevels),
    network_requirement: z.string(),
    cloud_dependency: z.string().nullable(),
    user_permissions: z.array(z.string()),
    info_plist_keys: z.array(z.string()),
    xcode_capabilities: z.array(z.string()),
    entitlements: z.array(z.string()),
    managed_entitlements: z.array(z.string()),
    background_modes: z.array(z.string()),
    privacy_manifest_requirements: z.array(z.string()),
    required_reason_apis: z.array(z.string()),
    app_review_considerations: z.array(z.string()),
    security_considerations: z.array(z.string()),
    implementation_notes: z.array(z.string()),
    limitations: z.array(z.string()),
    recommended_alternatives: z.array(z.string()),
    official_documentation: z.array(documentationReferenceSchema).min(1),
    release_notes: z.array(documentationReferenceSchema),
    last_verified_at: z.iso.date(),
    keywords: z.array(z.string()).min(1),
    knowledge_state: knowledgeStateSchema
  })
  .superRefine((record, context) => {
    const dates = [...record.official_documentation, ...record.release_notes].map((reference) => reference.verified_at);
    if (!dates.includes(record.last_verified_at)) {
      context.addIssue({
        code: "custom",
        path: ["last_verified_at"],
        message: "last_verified_at must match at least one source verification date"
      });
    }
    if (record.stable_or_beta === "deprecated" && !record.deprecated_status) {
      context.addIssue({
        code: "custom",
        path: ["deprecated_status"],
        message: "Deprecated records must explain their status"
      });
    }
    if (
      record.knowledge_state.completeness === "complete" &&
      Object.values(record.knowledge_state.fields).some((state) => state === "unknown")
    ) {
      context.addIssue({
        code: "custom",
        path: ["knowledge_state", "completeness"],
        message: "Complete records cannot contain unknown tracked fields"
      });
    }
  });

export const capabilityRegistrySchema = z
  .object({
    schema_version: z.literal("1.0"),
    generated_at: z.iso.datetime({ offset: true }),
    records: z.array(capabilityRecordSchema).min(1)
  })
  .superRefine((registry, context) => {
    const ids = new Set<string>();
    registry.records.forEach((record, index) => {
      if (ids.has(record.id)) {
        context.addIssue({ code: "custom", path: ["records", index, "id"], message: `Duplicate id: ${record.id}` });
      }
      ids.add(record.id);
    });
  });

export const analyzeIdeaInputSchema = z.object({
  idea: z.string().min(10).max(10_000),
  target_platform: z.enum(["iOS", "iPadOS", "watchOS", "visionOS", "multi-platform"]).default("iOS"),
  minimum_os_version: z.string().optional(),
  preferred_ui_framework: z.enum(["SwiftUI", "UIKit", "unspecified"]).default("SwiftUI"),
  on_device_priority: z.enum(["required", "preferred", "neutral"]).default("preferred"),
  privacy_level: z.enum(["standard", "sensitive", "regulated"]).default("standard")
});

export const resolveCapabilitiesInputSchema = z.object({
  requirements: z
    .array(
      z.object({
        id: z.string(),
        kind: z.enum([
          "product_goal",
          "data",
          "hardware",
          "background",
          "notification",
          "on_device",
          "networking",
          "ai_ml",
          "privacy",
          "monetization",
          "platform"
        ]),
        description: z.string(),
        keywords: z.array(z.string()).default([]),
        confidence: z.enum(["explicit", "inferred"]).default("explicit")
      })
    )
    .min(1),
  include_beta: z.boolean().default(false),
  maximum_results_per_requirement: z.number().int().min(1).max(10).default(4)
});

export const getProfileInputSchema = z.object({
  capability_id_or_name: z.string().min(1)
});

export const compareOptionsInputSchema = z.object({
  capability_ids: z.array(z.string()).min(2).max(6),
  criteria: z
    .array(
      z.enum([
        "complexity",
        "minimum_os",
        "on_device",
        "privacy",
        "performance",
        "energy",
        "hardware",
        "entitlement",
        "app_review",
        "maintenance",
        "testability"
      ])
    )
    .default(["complexity", "minimum_os", "on_device", "privacy", "app_review", "testability"])
});

export const checkAvailabilityInputSchema = z.object({
  capability_ids: z.array(z.string()).min(1).max(30),
  platform: z.string().default("iOS"),
  os_version: z.string().optional(),
  device: z.string().optional(),
  region: z.string().optional(),
  language: z.string().optional(),
  allow_beta: z.boolean().default(false)
});

export const auditInputSchema = z.object({
  capability_ids: z.array(z.string()).min(1).max(30)
});

export const projectConfigurationAuditInputSchema = z.object({
  project_root: z.string().trim().min(1).max(4096),
  capability_ids: z.array(z.string()).min(1).max(30),
  platform: z.enum(["iOS", "iPadOS", "watchOS", "tvOS", "visionOS", "macOS"]).default("iOS")
});

export const architectureInputSchema = z.object({
  idea: z.string().min(10),
  capability_ids: z.array(z.string()).min(1).max(30),
  project_scale: z.enum(["prototype", "small", "medium", "large"]).default("small")
});

export const implementationPlanInputSchema = z.object({
  capability_ids: z.array(z.string()).min(1).max(30),
  include_code_spike: z.boolean().default(true)
});

export const officialDocsSearchInputSchema = z.object({
  query: z.string().min(2).max(200),
  capability_ids: z.array(z.string()).max(20).default([]),
  maximum_results: z.number().int().min(1).max(20).default(10)
});

export const technologyCatalogSearchInputSchema = z.object({
  query: z.string().trim().min(2).max(200),
  coverage_status: z.enum(["all", "catalogued", "profiled"]).default("all"),
  maximum_results: z.number().int().min(1).max(50).default(20)
});

export const registryCoverageInputSchema = z.object({});

export const refreshRegistryInputSchema = z.object({
  dry_run: z.boolean().default(true),
  source_urls: z.array(z.url()).max(50).default([])
});
