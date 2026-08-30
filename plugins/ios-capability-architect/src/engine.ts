import {
  deduplicateDocumentation,
  findRecord,
  getRegistryCoverage,
  loadRegistry,
  searchRecords,
  searchTechnologyCatalog
} from "@/registry.js";
import { auditProjectConfiguration as auditProjectConfigurationFiles } from "@/project-audit.js";
import type {
  CapabilityMatch,
  CapabilityRecord,
  IdeaAnalysis,
  KnowledgeTrackedField,
  RegistryCoverage,
  Requirement,
  TechnologyCatalogEntry,
  ToolEnvelope
} from "@/types.js";

const DOCUMENTATION_CUTOFF = "2026-08-30";

const requirementRules: Array<{
  kind: Requirement["kind"];
  description: string;
  terms: string[];
}> = [
  {
    kind: "data",
    description: "Access or store health and fitness data",
    terms: ["health", "sleep", "workout", "heart", "sağlık", "uyku", "egzersiz"]
  },
  {
    kind: "hardware",
    description: "Use device location or movement sensors",
    terms: ["location", "gps", "geofence", "konum", "takip", "sensor", "motion"]
  },
  {
    kind: "background",
    description: "Continue or resume work while the app is not foregrounded",
    terms: ["background", "arka plan", "continuous", "sürekli"]
  },
  {
    kind: "notification",
    description: "Notify the user about time-sensitive or scheduled events",
    terms: ["notification", "notify", "reminder", "bildirim", "hatırlat"]
  },
  {
    kind: "on_device",
    description: "Keep processing on device and support offline operation",
    terms: ["on-device", "on device", "offline", "cihazda", "internetsiz", "local"]
  },
  {
    kind: "ai_ml",
    description: "Use machine learning or generative AI",
    terms: ["ai", "artificial intelligence", "machine learning", "model", "yapay zekâ", "yapay zeka", "ml"]
  },
  {
    kind: "monetization",
    description: "Monetize through App Store purchases or subscriptions",
    terms: ["subscription", "purchase", "monetization", "abonelik", "satın alma", "ücret"]
  },
  {
    kind: "platform",
    description: "Expose glanceable or system-integrated experiences",
    terms: ["widget", "live activity", "dynamic island", "siri", "shortcut", "kestirme"]
  },
  {
    kind: "privacy",
    description: "Handle sensitive personal data with elevated privacy controls",
    terms: [
      "health",
      "location",
      "child",
      "finance",
      "identity",
      "biometric",
      "sağlık",
      "konum",
      "çocuk",
      "finans",
      "kimlik",
      "biyometr"
    ]
  }
];

function envelope<T>(data: T, warnings: string[] = []): ToolEnvelope<T> {
  return {
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    documentation_cutoff: DOCUMENTATION_CUTOFF,
    data,
    warnings
  };
}

export function analyzeAppIdea(input: {
  idea: string;
  target_platform: string;
  minimum_os_version?: string | undefined;
  preferred_ui_framework: string;
  on_device_priority: string;
  privacy_level: string;
}): ToolEnvelope<IdeaAnalysis> {
  const normalized = input.idea.toLocaleLowerCase("tr-TR");
  const requirements: Requirement[] = [
    {
      id: "req-product-goal",
      kind: "product_goal",
      description: input.idea.trim(),
      keywords: normalized
        .split(/[^\p{L}\p{N}-]+/u)
        .filter((token) => token.length > 3)
        .slice(0, 20),
      confidence: "explicit"
    }
  ];

  for (const rule of requirementRules) {
    const matched = rule.terms.filter((term) => normalized.includes(term));
    if (matched.length === 0) continue;
    requirements.push({
      id: `req-${rule.kind}`,
      kind: rule.kind,
      description: rule.description,
      keywords: matched,
      confidence: "inferred"
    });
  }

  if (input.on_device_priority !== "neutral" && !requirements.some((requirement) => requirement.kind === "on_device")) {
    requirements.push({
      id: "req-on_device",
      kind: "on_device",
      description:
        input.on_device_priority === "required"
          ? "Processing must remain on device"
          : "Prefer on-device processing where practical",
      keywords: ["on-device", "offline", "privacy"],
      confidence: "inferred"
    });
  }

  const assumptions = [
    `${input.target_platform} is the primary target.`,
    `${input.preferred_ui_framework === "unspecified" ? "SwiftUI" : input.preferred_ui_framework} is the default UI approach.`,
    input.minimum_os_version
      ? `The deployment target is ${input.minimum_os_version}.`
      : "The deployment target is flexible and should prefer the current stable SDK."
  ];
  const constraints = [
    "Only public, documented Apple APIs are in scope.",
    "Background execution and notification timing remain system controlled.",
    `${input.privacy_level} privacy handling is required.`
  ];
  const openQuestions: string[] = [];
  if (requirements.some((requirement) => requirement.kind === "data") && !/read|write|kaydet|oku/.test(normalized)) {
    openQuestions.push("Which exact data types must the app read, write, or derive?");
  }
  if (
    requirements.some((requirement) => requirement.kind === "background") &&
    !/continuous|sürekli|periodic|periyodik|event|olay/.test(normalized)
  ) {
    openQuestions.push("Is background work event-driven, periodic, or expected to be continuous?");
  }
  if (
    requirements.some((requirement) => requirement.kind === "ai_ml") &&
    !/text|image|audio|video|metin|görüntü|ses/.test(normalized)
  ) {
    openQuestions.push("What input and output modality must the AI feature support?");
  }

  return envelope({ requirements, assumptions, constraints, open_questions: openQuestions.slice(0, 3) });
}

function scoreRecord(requirement: Requirement, record: CapabilityRecord): { score: number; reasons: string[] } {
  const haystack = [
    record.id,
    record.name,
    record.summary,
    ...record.aliases,
    ...record.keywords,
    ...record.supported_use_cases
  ]
    .join(" ")
    .toLocaleLowerCase("en-US");
  const tokens = [
    ...requirement.keywords,
    ...requirement.description.toLocaleLowerCase("en-US").split(/[^\p{L}\p{N}-]+/u)
  ].filter((token) => token.length > 2);
  const matches = [...new Set(tokens.filter((token) => haystack.includes(token.toLocaleLowerCase("en-US"))))];
  let score = matches.length;
  const reasons = matches.length > 0 ? [`Matched: ${matches.slice(0, 5).join(", ")}`] : [];

  const kindBoosts: Partial<Record<Requirement["kind"], string[]>> = {
    notification: ["user-notifications"],
    background: ["background-tasks", "healthkit-background-delivery", "core-location"],
    on_device: ["core-ml", "foundation-models"],
    monetization: ["storekit-2"],
    privacy: ["privacy-manifest", "required-reason-apis"],
    platform: ["widgetkit", "activitykit", "app-intents", "app-groups"]
  };
  if (kindBoosts[requirement.kind]?.includes(record.id)) {
    score += 4;
    reasons.push(`Primary match for ${requirement.kind}`);
  }
  return { score, reasons };
}

export async function resolveCapabilities(input: {
  requirements: Requirement[];
  include_beta: boolean;
  maximum_results_per_requirement: number;
}): Promise<ToolEnvelope<{ matches: CapabilityMatch[] }>> {
  const records = (await loadRegistry()).filter(
    (record) => record.stable_or_beta !== "deprecated" && (input.include_beta || record.stable_or_beta !== "beta")
  );
  const matches = input.requirements.flatMap((requirement) =>
    records
      .map((record) => ({ record, ...scoreRecord(requirement, record) }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, input.maximum_results_per_requirement)
      .map(({ record, score, reasons }) => ({
        requirement_id: requirement.id,
        capability_id: record.id,
        score,
        reasons,
        record
      }))
  );
  return envelope(
    { matches },
    matches.length === 0
      ? ["No verified registry match was found; refine the requirements instead of inventing a technology."]
      : matches.some((match) => match.record.stable_or_beta === "unknown")
        ? ["Some matches have an unknown lifecycle. Verify their current SDK status before implementation."]
        : []
  );
}

export async function getCapabilityProfile(idOrName: string): Promise<ToolEnvelope<CapabilityRecord>> {
  const record = await findRecord(idOrName);
  if (!record) throw new Error(`Unknown capability: ${idOrName}`);
  return envelope(record);
}

export async function compareImplementationOptions(
  capabilityIds: string[],
  criteria: string[]
): Promise<ToolEnvelope<{ criteria: string[]; options: Array<Record<string, unknown>> }>> {
  const records = await resolveIds(capabilityIds);
  const options = records.map((record) => ({
    id: record.id,
    name: record.name,
    stability: record.stable_or_beta,
    minimum_os: record.minimum_os_version,
    on_device: record.on_device_level,
    network: record.network_requirement,
    hardware: record.hardware_requirements,
    permissions: record.user_permissions,
    entitlements: record.entitlements,
    managed_entitlements: record.managed_entitlements,
    review_risks: record.app_review_considerations,
    limitations: record.limitations,
    alternatives: record.recommended_alternatives,
    relationships: record.relationships,
    knowledge_state: record.knowledge_state
  }));
  return envelope({ criteria, options });
}

function parseMajor(version: string | undefined): number | undefined {
  if (!version) return undefined;
  const match = /\d+/.exec(version);
  return match ? Number(match[0]) : undefined;
}

export async function checkAvailability(input: {
  capability_ids: string[];
  platform: string;
  os_version?: string | undefined;
  device?: string | undefined;
  region?: string | undefined;
  language?: string | undefined;
  allow_beta: boolean;
}): Promise<ToolEnvelope<{ results: Array<Record<string, unknown>> }>> {
  const records = await resolveIds(input.capability_ids);
  const requestedMajor = parseMajor(input.os_version);
  const results = records.map((record) => {
    const minimum = record.minimum_os_version[input.platform];
    const minimumMajor = parseMajor(minimum ?? undefined);
    const incompatibleReasons: string[] = [];
    const conditionalReasons: string[] = [];
    if (!record.platforms.includes(input.platform))
      incompatibleReasons.push(`${input.platform} is not listed as supported.`);
    if (!input.os_version) conditionalReasons.push("No target OS version was provided.");
    if (minimum === undefined || minimum === null)
      conditionalReasons.push(`The minimum ${input.platform} version is not verified in this record.`);
    if (record.stable_or_beta === "beta" && !input.allow_beta)
      incompatibleReasons.push("This record is beta and beta use was not allowed.");
    if (record.stable_or_beta === "beta" && input.allow_beta)
      conditionalReasons.push("This record is beta and requires prerelease validation.");
    if (record.stable_or_beta === "deprecated")
      incompatibleReasons.push("This record is deprecated and is excluded from new implementation recommendations.");
    if (record.stable_or_beta === "unknown")
      conditionalReasons.push("The current lifecycle status is not verified in this record.");
    if (requestedMajor !== undefined && minimumMajor !== undefined && requestedMajor < minimumMajor)
      incompatibleReasons.push(`Requires ${input.platform} ${minimum} or later.`);
    if (record.hardware_requirements.length > 0 && !input.device)
      conditionalReasons.push("Runtime hardware eligibility must be checked.");
    if (record.region_restrictions.length > 0 && !input.region)
      conditionalReasons.push("Runtime region availability must be checked.");
    if (record.language_restrictions.length > 0 && !input.language)
      conditionalReasons.push("Runtime language availability must be checked.");
    const determination =
      incompatibleReasons.length > 0
        ? "incompatible"
        : conditionalReasons.length > 0
          ? "conditional"
          : "verified_compatible";
    const reasons = [...incompatibleReasons, ...conditionalReasons];
    return {
      capability_id: record.id,
      status:
        determination === "verified_compatible" ? "compatible_on_declared_constraints" : "conditional_or_incompatible",
      determination,
      minimum_os_version: minimum ?? "not specified",
      stable_or_beta: record.stable_or_beta,
      hardware_requirements: record.hardware_requirements,
      region_restrictions: record.region_restrictions,
      language_restrictions: record.language_restrictions,
      reasons
    };
  });
  return envelope({ results }, [
    "Availability checks are advisory; use Swift #available and runtime capability checks in the app."
  ]);
}

export async function auditPermissionsAndEntitlements(
  capabilityIds: string[]
): Promise<ToolEnvelope<Record<string, string[]>>> {
  const records = await resolveIds(capabilityIds);
  const knowledgeGaps = listKnowledgeGaps(records, [
    "user_permissions",
    "info_plist_keys",
    "xcode_capabilities",
    "entitlements",
    "managed_entitlements",
    "background_modes",
    "related_extensions"
  ]);
  return envelope(
    {
      user_permissions: unique(records.flatMap((record) => record.user_permissions)),
      info_plist_keys: unique(records.flatMap((record) => record.info_plist_keys)),
      xcode_capabilities: unique(records.flatMap((record) => record.xcode_capabilities)),
      entitlements: unique(records.flatMap((record) => record.entitlements)),
      managed_entitlements: unique(records.flatMap((record) => record.managed_entitlements)),
      background_modes: unique(records.flatMap((record) => record.background_modes)),
      app_extensions: unique(records.flatMap((record) => record.related_extensions)),
      knowledge_gaps: knowledgeGaps
    },
    knowledgeGaps.length > 0
      ? ["Empty configuration results are not proof of no requirement when the corresponding field is unknown."]
      : []
  );
}

export async function auditProjectConfiguration(input: {
  project_root: string;
  capability_ids: string[];
  platform: string;
}): Promise<ToolEnvelope<Awaited<ReturnType<typeof auditProjectConfigurationFiles>>>> {
  const audit = await auditProjectConfigurationFiles(input);
  const warnings = [
    "Source detection is advisory; verify the generated Xcode project, built products, signing, and provisioning before release."
  ];
  if (audit.skipped_entries.length > 0) warnings.push("Some entries were skipped by symlink, size, or scan limits.");
  if (audit.summary.unknown > 0)
    warnings.push(
      "Unknown registry fields require official-source research before concluding that no configuration is needed."
    );
  return envelope(audit, warnings);
}

export async function auditPrivacyAndReview(capabilityIds: string[]): Promise<ToolEnvelope<Record<string, string[]>>> {
  const records = await resolveIds(capabilityIds);
  const knowledgeGaps = listKnowledgeGaps(records, [
    "privacy_manifest_requirements",
    "required_reason_apis",
    "app_review_considerations",
    "security_considerations"
  ]);
  return envelope(
    {
      privacy_manifest_requirements: unique(records.flatMap((record) => record.privacy_manifest_requirements)),
      required_reason_apis: unique(records.flatMap((record) => record.required_reason_apis)),
      app_review_considerations: unique(records.flatMap((record) => record.app_review_considerations)),
      security_considerations: unique(records.flatMap((record) => record.security_considerations)),
      knowledge_gaps: knowledgeGaps,
      data_minimization_actions: [
        "Request only data types required by a user-visible feature.",
        "Keep data on device unless a documented product requirement needs transfer.",
        "Define retention, deletion, export, and account-removal behavior before launch.",
        "Keep App Store privacy disclosures, privacy manifests, purpose strings, and runtime behavior aligned."
      ]
    },
    knowledgeGaps.length > 0
      ? ["Empty privacy or review results are not proof of no requirement when the corresponding field is unknown."]
      : []
  );
}

export async function generateArchitecture(
  idea: string,
  capabilityIds: string[],
  projectScale: string
): Promise<ToolEnvelope<Record<string, unknown>>> {
  const records = await resolveIds(capabilityIds);
  const has = (id: string) => records.some((record) => record.id === id);
  const components = [
    {
      layer: "Presentation",
      recommendation:
        "SwiftUI feature views and explicit permission-state UI; use UIKit adapters only for APIs without suitable SwiftUI surfaces."
    },
    { layer: "Domain", recommendation: "Small use-case types and value models that do not import Apple frameworks." },
    {
      layer: "Data",
      recommendation: has("swiftdata")
        ? "Repository protocols backed by SwiftData, with migrations tested from release fixtures."
        : "Repository protocols with the smallest persistence mechanism that meets the data model."
    },
    {
      layer: "Device services",
      recommendation:
        "Actor-isolated service protocols for permissions, sensors, notifications, and background scheduling."
    },
    { layer: "Apple framework adapters", recommendation: records.map((record) => record.name).join(", ") },
    {
      layer: "Persistence",
      recommendation: has("app-groups")
        ? "Use an App Group container only for state shared with extensions; coordinate concurrent access."
        : "Keep private app state in the app container."
    },
    {
      layer: "Networking",
      recommendation: records.some(
        (record) => record.on_device_level === "cloud_required" || record.on_device_level === "hybrid"
      )
        ? "Use a narrow URLSession client only for requirements that cannot remain local; make offline state explicit."
        : "No server by default."
    },
    {
      layer: "AI/ML",
      recommendation:
        has("foundation-models") || has("core-ml")
          ? "Runtime availability gate, model/service protocol, deterministic fallback, evaluation fixtures, and device performance budgets."
          : "Not required."
    },
    {
      layer: "Background execution",
      recommendation: records.some(
        (record) => record.background_modes.length > 0 || record.category === "background_execution"
      )
        ? "Event-driven, resumable jobs with expiration handling; never promise exact timing."
        : "Foreground-only unless a verified capability is added."
    },
    {
      layer: "Security and privacy",
      recommendation:
        "Data minimization, least-privilege authorization, protected storage, privacy-manifest audit, and App Store disclosure review."
    }
  ];
  return envelope({
    idea,
    project_scale: projectScale,
    pattern:
      projectScale === "prototype"
        ? "Feature-local MV pattern with protocols at Apple framework boundaries"
        : "Feature modules with presentation, domain, and adapter boundaries",
    components,
    data_flow:
      "SwiftUI -> use case -> service protocol -> Apple framework adapter -> local store; events return through AsyncSequence or typed callbacks.",
    mermaid:
      "flowchart LR\n  UI[SwiftUI] --> UC[Use Cases]\n  UC --> SP[Service Protocols]\n  SP --> AF[Apple Framework Adapters]\n  AF --> OS[(iOS services)]\n  SP --> DB[(Local persistence)]\n  SP -. only if required .-> API[Backend]"
  });
}

export async function generateImplementationPlan(
  capabilityIds: string[],
  includeCodeSpike: boolean
): Promise<ToolEnvelope<{ phases: Array<Record<string, unknown>> }>> {
  const records = await resolveIds(capabilityIds);
  const phases = [
    {
      id: "poc",
      depends_on: [],
      goal: "Prove the riskiest hardware, permission, background, or model assumption on real devices.",
      deliverables: includeCodeSpike
        ? ["Small Swift spike", "Measured availability and failure notes"]
        : ["Documented feasibility result"]
    },
    {
      id: "mvp-foundation",
      depends_on: ["poc"],
      goal: "Create the SwiftUI shell, domain models, service protocols, and local persistence.",
      deliverables: ["Buildable app", "Dependency-injected adapters", "Unit tests"]
    },
    {
      id: "framework-integration",
      depends_on: ["mvp-foundation"],
      goal: "Integrate selected Apple frameworks one at a time.",
      deliverables: records.map((record) => `${record.name} adapter and integration tests`)
    },
    {
      id: "permissions",
      depends_on: ["framework-integration"],
      goal: "Implement contextual permission requests, denial states, and Settings recovery.",
      deliverables: ["Purpose strings", "Permission-state UI", "Denied/restricted tests"]
    },
    {
      id: "background-and-extensions",
      depends_on: ["permissions"],
      goal: "Add only verified background modes and extension targets.",
      deliverables: unique(records.flatMap((record) => [...record.background_modes, ...record.related_extensions]))
    },
    {
      id: "privacy-review",
      depends_on: ["framework-integration"],
      goal: "Audit data flow, privacy manifests, required-reason APIs, retention, and App Store disclosures.",
      deliverables: ["Privacy inventory", "Review-risk checklist"]
    },
    {
      id: "release",
      depends_on: ["background-and-extensions", "privacy-review"],
      goal: "Run device matrix, energy, offline, accessibility, TestFlight, and App Store readiness checks.",
      deliverables: ["Acceptance evidence", "Known limitations", "Submission notes"]
    }
  ];
  return envelope({ phases });
}

export async function searchOfficialAppleDocs(
  query: string,
  capabilityIds: string[],
  maximumResults: number
): Promise<ToolEnvelope<{ results: Array<Record<string, string>> }>> {
  const records =
    capabilityIds.length > 0 ? await resolveIds(capabilityIds) : await searchRecords(query, maximumResults);
  const queryTokens = query.toLocaleLowerCase("en-US").split(/\W+/).filter(Boolean);
  const references = deduplicateDocumentation(records)
    .map((reference) => ({
      reference,
      score: queryTokens.filter((token) =>
        `${reference.title} ${reference.url}`.toLocaleLowerCase("en-US").includes(token)
      ).length
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, maximumResults)
    .map(({ reference }) => ({
      title: reference.title,
      url: reference.url,
      source_type: reference.source_type,
      verified_at: reference.verified_at
    }));
  return envelope({ results: references }, [
    "This tool searches the verified local source index; it does not perform live web search. Re-run the repository link verifier for live status."
  ]);
}

export async function searchAppleTechnologyCatalog(
  query: string,
  coverageStatus: "all" | "catalogued" | "profiled",
  maximumResults: number
): Promise<ToolEnvelope<{ results: TechnologyCatalogEntry[] }>> {
  const entries = (await searchTechnologyCatalog(query, maximumResults * 2))
    .filter((entry) => coverageStatus === "all" || entry.coverage_status === coverageStatus)
    .slice(0, maximumResults);
  return envelope({ results: entries }, [
    "Catalogued entries prove discovery coverage only. Use a profiled entry for architecture recommendations."
  ]);
}

export async function reportRegistryCoverage(): Promise<ToolEnvelope<RegistryCoverage>> {
  return envelope(await getRegistryCoverage(), [
    "Coverage is measured against the committed official-index catalog and changes as Apple publishes technologies."
  ]);
}

export async function refreshCapabilityRegistry(
  dryRun: boolean,
  sourceUrls: string[]
): Promise<ToolEnvelope<Record<string, unknown>>> {
  const records = await loadRegistry();
  const indexedUrls = deduplicateDocumentation(records).map((reference) => reference.url);
  const requestedUrls = sourceUrls.length > 0 ? sourceUrls : indexedUrls;
  if (!dryRun) {
    return envelope({ updated: false, checked_sources: requestedUrls }, [
      "Registry mutation is intentionally disabled in the MCP runtime. Run npm run verify:docs, review official-source diffs, edit records, and validate in version control."
    ]);
  }
  return envelope({
    updated: false,
    dry_run: true,
    record_count: records.length,
    source_count: requestedUrls.length,
    proposed_workflow: [
      "Fetch only allowlisted developer.apple.com sources.",
      "Record redirects, status, ETag, Last-Modified, and content hash.",
      "Flag changes for human review; never auto-promote beta APIs to stable.",
      "Validate the full registry and acceptance tests before merge."
    ]
  });
}

async function resolveIds(ids: string[]): Promise<CapabilityRecord[]> {
  const records = await Promise.all(ids.map((id) => findRecord(id)));
  const unknown = ids.filter((_, index) => !records[index]);
  if (unknown.length > 0) throw new Error(`Unknown capabilities: ${unknown.join(", ")}`);
  return records.filter((record): record is CapabilityRecord => Boolean(record));
}

function unique(values: string[]): string[] {
  return [...new Set(values)].filter(Boolean).sort();
}

function listKnowledgeGaps(records: CapabilityRecord[], fields: KnowledgeTrackedField[]): string[] {
  return records.flatMap((record) =>
    fields.filter((field) => record.knowledge_state.fields[field] === "unknown").map((field) => `${record.id}.${field}`)
  );
}
