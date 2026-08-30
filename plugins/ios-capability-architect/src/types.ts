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

export const knowledgeStates = ["unknown", "verified_none", "verified_value"] as const;

export const knowledgeTrackedFields = [
  "aliases",
  "supported_use_cases",
  "unsupported_use_cases",
  "related_frameworks",
  "related_capabilities",
  "related_entitlements",
  "related_extensions",
  "platforms",
  "minimum_os_version",
  "sdk_availability",
  "stable_or_beta",
  "supported_devices",
  "hardware_requirements",
  "region_restrictions",
  "language_restrictions",
  "on_device_level",
  "network_requirement",
  "cloud_dependency",
  "user_permissions",
  "info_plist_keys",
  "xcode_capabilities",
  "entitlements",
  "managed_entitlements",
  "background_modes",
  "privacy_manifest_requirements",
  "required_reason_apis",
  "app_review_considerations",
  "security_considerations",
  "implementation_notes",
  "limitations",
  "recommended_alternatives",
  "release_notes"
] as const;

export const relationshipTypes = [
  "related_framework",
  "related_capability",
  "related_entitlement",
  "related_extension"
] as const;

export type EntityType = (typeof entityTypes)[number];
export type KnowledgeState = (typeof knowledgeStates)[number];
export type KnowledgeTrackedField = (typeof knowledgeTrackedFields)[number];
export type OnDeviceLevel = (typeof onDeviceLevels)[number];
export type RelationshipType = (typeof relationshipTypes)[number];
export type StabilityLevel = (typeof stabilityLevels)[number];

export interface CapabilityKnowledgeState {
  completeness: "complete" | "partial";
  fields: Record<KnowledgeTrackedField, KnowledgeState>;
}

export interface CapabilityRelationship {
  type: RelationshipType;
  target: string;
}

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
  relationships: CapabilityRelationship[];
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
  knowledge_state: CapabilityKnowledgeState;
}

export interface TechnologyCatalogEntry {
  id: string;
  name: string;
  category_ids: string[];
  category_names: string[];
  coverage_status: "catalogued" | "profiled";
  profile_ids: string[];
  source_urls: string[];
}

export const catalogOnlyUnverifiedProfileFields = [
  "aliases",
  "category",
  "entity_type",
  "summary",
  "supported_use_cases",
  "unsupported_use_cases",
  "related_frameworks",
  "related_capabilities",
  "related_entitlements",
  "related_extensions",
  "relationships",
  "platforms",
  "minimum_os_version",
  "sdk_availability",
  "stable_or_beta",
  "deprecated_status",
  "supported_devices",
  "hardware_requirements",
  "region_restrictions",
  "language_restrictions",
  "on_device_level",
  "network_requirement",
  "cloud_dependency",
  "user_permissions",
  "info_plist_keys",
  "xcode_capabilities",
  "entitlements",
  "managed_entitlements",
  "background_modes",
  "privacy_manifest_requirements",
  "required_reason_apis",
  "app_review_considerations",
  "security_considerations",
  "implementation_notes",
  "limitations",
  "recommended_alternatives",
  "official_documentation",
  "release_notes",
  "last_verified_at",
  "keywords",
  "knowledge_state"
] as const satisfies ReadonlyArray<keyof CapabilityRecord>;

export type AppleTechnologyResult =
  | {
      kind: "reviewed_profile";
      catalog_entry: TechnologyCatalogEntry;
      profile: CapabilityRecord;
    }
  | {
      kind: "catalog_only";
      catalog_entry: TechnologyCatalogEntry;
      recommendation_eligible: false;
      verified_scope: ["catalog identity", "taxonomy categories", "catalog provenance URLs"];
      unverified_profile_fields: Array<(typeof catalogOnlyUnverifiedProfileFields)[number]>;
      next_step: "Review current official Apple documentation before making an architecture recommendation.";
    };

export interface CatalogResearchLead {
  requirement_id: string;
  matched_term: string;
  catalog_entry: TechnologyCatalogEntry;
  recommendation_eligible: false;
}

export interface RegistryCoverage {
  category_count: number;
  catalogued_technology_count: number;
  profiled_technology_count: number;
  catalog_only_technology_count: number;
  profile_coverage_percent: number;
  verified_profile_count: number;
  complete_profile_count: number;
  partial_profile_count: number;
  official_index_sources: string[];
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

export interface ProjectConfigurationFinding {
  capability_id: string;
  category:
    | "entitlement"
    | "managed_entitlement"
    | "xcode_capability"
    | "info_plist_key"
    | "background_mode"
    | "privacy_manifest"
    | "deployment_target"
    | "registry_evidence";
  requirement: string;
  status: "detected" | "not_detected" | "incompatible" | "manual_review" | "unknown";
  severity: "info" | "warning" | "error";
  evidence: string[];
  recommendation: string;
}

export interface ProjectConfigurationAudit {
  project_root: string;
  scanned_files: string[];
  skipped_entries: string[];
  selected_capabilities: string[];
  platform: string;
  findings: ProjectConfigurationFinding[];
  summary: Record<ProjectConfigurationFinding["status"], number>;
  limitations: string[];
}
