import { describe, expect, it } from "vitest";
import {
  auditPermissionsAndEntitlements,
  auditPrivacyAndReview,
  checkAvailability,
  compareImplementationOptions,
  generateArchitecture,
  generateImplementationPlan,
  getCapabilityProfile,
  refreshCapabilityRegistry,
  reportRegistryCoverage,
  searchAppleTechnologyCatalog,
  searchOfficialAppleDocs
} from "@/engine.js";

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
    expect(incompatible.data.results[0]?.status).toBe("conditional_or_incompatible");
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
  });
});
