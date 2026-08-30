import { describe, expect, it } from "vitest";
import {
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
import { loadTechnologyCatalog } from "@/registry.js";

describe("read-only architecture tools", () => {
  it("returns profiles, comparisons, configuration audits, and privacy audits", async () => {
    const profile = await getCapabilityProfile("HealthKit");
    const comparison = await compareImplementationOptions(["healthkit", "core-location"], ["privacy"]);
    const configuration = await auditPermissionsAndEntitlements(["healthkit", "core-location"]);
    const privacy = await auditPrivacyAndReview(["healthkit", "core-location"]);

    expect(profile.data.id).toBe("healthkit");
    expect(comparison.data.options).toHaveLength(2);
    expect(configuration.data.entitlements).toContain("com.apple.developer.healthkit");
    expect(privacy.data.security_considerations ?? []).not.toHaveLength(0);
  });

  it("treats missing availability evidence as conditional", async () => {
    const withoutTarget = await checkAvailability({
      capability_ids: ["healthkit"],
      platform: "iOS",
      allow_beta: false
    });
    const incompatible = await checkAvailability({
      capability_ids: ["foundation-models"],
      platform: "iOS",
      os_version: "18.0",
      allow_beta: false
    });

    expect(withoutTarget.data.results[0]?.status).toBe("conditional_or_incompatible");
    expect(withoutTarget.data.results[0]?.determination).toBe("conditional");
    expect(incompatible.data.results[0]?.status).toBe("conditional_or_incompatible");
    expect(incompatible.data.results[0]?.determination).toBe("incompatible");
  });

  it("treats a reviewed null platform minimum as unavailable rather than unknown", async () => {
    for (const capabilityId of ["app-attest", "apptrackingtransparency"]) {
      const result = await checkAvailability({
        capability_ids: [capabilityId],
        platform: "macOS",
        os_version: "26.0",
        allow_beta: false
      });

      expect(result.data.results[0]).toMatchObject({
        capability_id: capabilityId,
        determination: "incompatible",
        minimum_os_version: "unavailable"
      });
      expect(result.data.results[0]?.reasons).toContainEqual(expect.stringContaining("no usable macOS capability"));
    }
  });

  it("keeps deprecated capabilities out of default recommendations", async () => {
    const resolved = await resolveCapabilities({
      requirements: [
        {
          id: "req-web",
          kind: "platform",
          description: "Embed UIWebView web content",
          keywords: ["uiwebview", "web"],
          confidence: "explicit"
        }
      ],
      include_beta: false,
      maximum_results_per_requirement: 10
    });

    expect(resolved.data.matches.some((match) => match.capability_id === "uiwebview")).toBe(false);
  });

  it("promotes reviewed catalog identities while keeping adjacent catalog research leads separate", async () => {
    const resolved = await resolveCapabilities({
      requirements: [
        {
          id: "req-maps",
          kind: "product_goal",
          description: "Render a route with MapKit",
          keywords: ["MapKit"],
          confidence: "explicit"
        }
      ],
      include_beta: false,
      maximum_results_per_requirement: 4
    });

    expect(resolved.data.matches.some((match) => match.capability_id === "mapkit")).toBe(true);
    expect(resolved.data.catalog_research_leads).toEqual([]);

    const adjacent = await resolveCapabilities({
      requirements: [
        {
          id: "req-scanner",
          kind: "product_goal",
          description: "Provide document scanning with VisionKit",
          keywords: ["VisionKit"],
          confidence: "explicit"
        }
      ],
      include_beta: false,
      maximum_results_per_requirement: 4
    });
    expect(adjacent.data.catalog_research_leads).toHaveLength(1);
    expect(adjacent.data.catalog_research_leads[0]?.catalog_entry.id).toBe("technology.visionkit");
    expect(adjacent.data.catalog_research_leads[0]?.recommendation_eligible).toBe(false);
    expect(adjacent.data.matches.some((match) => match.capability_id === "vision")).toBe(false);
  });

  it("does not create matches or research leads from stopwords and substrings", async () => {
    const resolved = await resolveCapabilities({
      requirements: [
        {
          id: "req-garden",
          kind: "product_goal",
          description: "An app that should remain practical where the user prefers system support",
          keywords: ["app", "that", "should", "remain", "practical", "where", "user", "prefers", "system", "support"],
          confidence: "explicit"
        }
      ],
      include_beta: false,
      maximum_results_per_requirement: 4
    });

    expect(resolved.data.matches).toEqual([]);
    expect(resolved.data.catalog_research_leads).toEqual([]);
  });

  it("discriminates reviewed profiles from catalog-only technologies", async () => {
    const reviewed = await getAppleTechnology("HealthKit");

    expect(reviewed.data).toMatchObject({
      kind: "reviewed_profile",
      catalog_entry: { coverage_status: "profiled" },
      profile: { id: "healthkit" }
    });
    for (const [technology, profileId] of [
      ["URLSession", "urlsession"],
      ["Core Data", "core-data"],
      ["CloudKit", "cloudkit"],
      ["Keychain Services", "keychain-services"],
      ["AuthenticationServices", "authenticationservices"],
      ["CryptoKit", "cryptokit"],
      ["APNs", "apns"],
      ["AVFoundation", "avfoundation"],
      ["PhotoKit", "photokit"],
      ["Vision", "vision"],
      ["MapKit", "mapkit"],
      ["Core Bluetooth", "core-bluetooth"],
      ["Accessibility", "accessibility"],
      ["AppTrackingTransparency", "apptrackingtransparency"],
      ["App Attest", "app-attest"],
      ["Core Motion", "core-motion"],
      ["WeatherKit", "weatherkit"],
      ["LocalAuthentication", "local-authentication"],
      ["Core Spotlight", "core-spotlight"],
      ["Network", "network"],
      ["WebKit", "webkit"],
      ["EventKit", "eventkit"],
      ["Contacts", "contacts"]
    ] as const) {
      expect((await getAppleTechnology(technology)).data).toMatchObject({
        kind: "reviewed_profile",
        catalog_entry: { coverage_status: "profiled" },
        profile: { id: profileId }
      });
    }

    const catalogOnlyTechnologies = (await loadTechnologyCatalog())
      .filter((entry) => entry.coverage_status === "catalogued")
      .slice(0, 3)
      .map((entry) => entry.name);
    expect(catalogOnlyTechnologies).toHaveLength(3);

    for (const technology of catalogOnlyTechnologies) {
      const catalogOnly = await getAppleTechnology(technology);
      expect(catalogOnly.data).toMatchObject({
        kind: "catalog_only",
        recommendation_eligible: false
      });
      expect(catalogOnly.data).not.toHaveProperty("profile");
      expect(catalogOnly.data).not.toHaveProperty("minimum_os_version");
      expect(catalogOnly.data).not.toHaveProperty("sdk_availability");
      expect(catalogOnly.data).not.toHaveProperty("entitlements");
      if (catalogOnly.data.kind === "catalog_only") {
        expect(catalogOnly.data.unverified_profile_fields).toContain("minimum_os_version");
      }
    }
  });

  it("reports unknown configuration fields instead of treating empty arrays as verified absence", async () => {
    const audit = await auditPermissionsAndEntitlements(["core-ml"]);

    expect(audit.data.user_permissions).toEqual([]);
    expect(audit.data.knowledge_gaps).toContain("core-ml.user_permissions");
    expect(audit.warnings.join(" ")).toContain("not proof of no requirement");
  });

  it("builds proportional architecture and implementation phases", async () => {
    const architecture = await generateArchitecture("A private offline model app", ["core-ml"], "prototype");
    const plan = await generateImplementationPlan(["core-ml"], true);

    expect(architecture.data.pattern).toContain("Feature-local");
    expect(architecture.data.components).toEqual(expect.arrayContaining([expect.objectContaining({ layer: "AI/ML" })]));
    expect(plan.data.phases).toHaveLength(7);
  });

  it("searches verified sources and the broader discovery catalog separately", async () => {
    const docs = await searchOfficialAppleDocs("HealthKit", ["healthkit"], 5);
    const catalog = await searchAppleTechnologyCatalog("AlarmKit", "catalogued", 5);
    const coverage = await reportRegistryCoverage();

    expect(docs.data.results[0]?.url).toMatch(/^https:\/\/developer\.apple\.com\//);
    expect(catalog.data.results[0]?.coverage_status).toBe("catalogued");
    expect(coverage.data.catalog_only_technology_count).toBeGreaterThan(100);
  });

  it("keeps registry refreshes read-only", async () => {
    const dryRun = await refreshCapabilityRegistry(true, []);
    const refusedMutation = await refreshCapabilityRegistry(false, [
      "https://developer.apple.com/documentation/healthkit"
    ]);

    expect(dryRun.data.updated).toBe(false);
    expect(dryRun.data.dry_run).toBe(true);
    expect(refusedMutation.data.updated).toBe(false);
    expect(refusedMutation.warnings[0]).toContain("mutation is intentionally disabled");
  });

  it("rejects unknown profiles", async () => {
    await expect(getCapabilityProfile("not-a-real-capability")).rejects.toThrow("Unknown capability");
    await expect(getAppleTechnology("not-a-real-technology")).rejects.toThrow("Unknown Apple technology");
  });
});
