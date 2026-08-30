export const entityTypes = [
  "framework",
  "api",
  "system_capability",
  "entitlement",
  "managed_entitlement",
  "user_permission",
  "info_plist_key",
  "privacy_manifest_requirement",
  "required_reason_api",
  "app_extension",
  "background_mode",
  "apple_service",
  "hardware_capability",
  "device_constraint",
  "region_or_language_constraint",
  "minimum_os_version",
  "development_tool",
  "test_tool",
  "app_review_risk",
  "deprecated_api",
  "recommended_alternative"
] as const;

export const onDeviceLevels = [
  "fully_on_device",
  "primarily_on_device",
  "hybrid",
  "cloud_required",
  "unknown"
] as const;

export const stabilityLevels = ["stable", "beta", "deprecated", "unknown"] as const;

export type EntityType = (typeof entityTypes)[number];
export type OnDeviceLevel = (typeof onDeviceLevels)[number];
export type StabilityLevel = (typeof stabilityLevels)[number];

export interface DocumentationReference {
  title: string;
  url: string;
  source_type:
    | "apple_developer_documentation"
    | "release_notes"
    | "wwdc"
    | "hig"
    | "app_store_review_guidelines"
    | "apple_support"
    | "openai_plugin_documentation";
  verified_at: string;
}

export interface CapabilityRecord {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  entity_type: EntityType;
  summary: string;
  supported_use_cases: string[];
  unsupported_use_cases: string[];
  related_frameworks: string[];
  related_capabilities: string[];
  related_entitlements: string[];
  related_extensions: string[];
  platforms: string[];
  minimum_os_version: Record<string, string | null>;
  sdk_availability: string;
  stable_or_beta: StabilityLevel;
  deprecated_status: string | null;
  supported_devices: string[];
  hardware_requirements: string[];
  region_restrictions: string[];
  language_restrictions: string[];
  on_device_level: OnDeviceLevel;
  network_requirement: string;
  cloud_dependency: string | null;
  user_permissions: string[];
  info_plist_keys: string[];
  xcode_capabilities: string[];
  entitlements: string[];
  managed_entitlements: string[];
  background_modes: string[];
  privacy_manifest_requirements: string[];
  required_reason_apis: string[];
  app_review_considerations: string[];
  security_considerations: string[];
  implementation_notes: string[];
  limitations: string[];
  recommended_alternatives: string[];
  official_documentation: DocumentationReference[];
  release_notes: DocumentationReference[];
  last_verified_at: string;
  keywords: string[];
}

export interface Requirement {
  id: string;
  kind:
    | "product_goal"
    | "data"
    | "hardware"
    | "background"
    | "notification"
    | "on_device"
    | "networking"
    | "ai_ml"
    | "privacy"
    | "monetization"
    | "platform";
  description: string;
  keywords: string[];
  confidence: "explicit" | "inferred";
}

export interface IdeaAnalysis {
  requirements: Requirement[];
  assumptions: string[];
  constraints: string[];
  open_questions: string[];
}

export interface CapabilityMatch {
  requirement_id: string;
  capability_id: string;
  score: number;
  reasons: string[];
  record: CapabilityRecord;
}

export interface ToolEnvelope<T> {
  schema_version: "1.0";
  generated_at: string;
  documentation_cutoff: string;
  data: T;
  warnings: string[];
}
