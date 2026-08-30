import { describe, expect, it } from "vitest";
import {
  findRecord,
  findTechnologyCatalogEntry,
  loadRegistry,
  loadTechnologyCatalog,
  resetRegistryCache,
  searchRecords,
  searchTechnologyCatalog
} from "@/registry.js";

describe("capability registry", () => {
  it("loads unique fully-normalized records", async () => {
    const records = await loadRegistry();
    expect(records.length).toBeGreaterThanOrEqual(15);
    expect(new Set(records.map((record) => record.id)).size).toBe(records.length);
    for (const record of records) {
      expect(record.last_verified_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(record.official_documentation.length).toBeGreaterThan(0);
      expect(record.on_device_level).toMatch(/^(fully_on_device|primarily_on_device|hybrid|cloud_required|unknown)$/);
      expect(record.knowledge_state.fields.minimum_os_version).not.toBe("unknown");
      expect(record.knowledge_state.fields.sdk_availability).not.toBe("unknown");
      expect(record.knowledge_state.fields.stable_or_beta).toBe("verified_value");
      expect(record.stable_or_beta).not.toBe("unknown");
    }
  });

  it("resolves ids, names, and aliases", async () => {
    expect((await findRecord("healthkit"))?.id).toBe("healthkit");
    expect((await findRecord("Core ML"))?.id).toBe("core-ml");
    expect((await findRecord("Dynamic Island"))?.id).toBe("activitykit");
  });

  it("loads the reviewed foundational language and UI profiles", async () => {
    const expected = ["swift", "swift-concurrency", "swiftui", "uikit", "foundation"];
    for (const id of expected) {
      const record = await findRecord(id);
      expect(record).toMatchObject({ id, stable_or_beta: "stable", last_verified_at: "2026-08-30" });
      expect(record?.official_documentation.length).toBeGreaterThan(0);
      expect(record?.sdk_availability).toContain("Xcode 27 was not locally installed");
    }

    expect((await findRecord("swift-concurrency"))?.minimum_os_version.iOS).toBe("13.0");
    expect((await findRecord("swiftui"))?.minimum_os_version.watchOS).toBe("6.0");
    expect((await findRecord("uikit"))?.platforms).not.toContain("macOS");
    expect((await findRecord("foundation"))?.on_device_level).toBe("hybrid");
  });

  it("loads reviewed networking, persistence, and security profiles without flattening conditional setup", async () => {
    const expected = [
      "urlsession",
      "core-data",
      "cloudkit",
      "keychain-services",
      "authenticationservices",
      "cryptokit"
    ];
    for (const id of expected) {
      const record = await findRecord(id);
      expect(record).toMatchObject({ id, stable_or_beta: "stable", last_verified_at: "2026-08-30" });
      expect(record?.official_documentation.length).toBeGreaterThan(0);
      expect(record?.sdk_availability).toContain("Xcode 26.6 and SDK 26.5");
      expect(record?.sdk_availability).toContain("Xcode 27 was not locally installed");
      expect(record?.knowledge_state.completeness).toBe("partial");
      expect(record?.knowledge_state.fields.region_restrictions).toBe("unknown");
    }

    const urlSession = await findRecord("urlsession");
    expect(urlSession?.minimum_os_version["Mac Catalyst"]).toBe("13.1");
    expect(urlSession?.background_modes).toEqual([]);
    expect(urlSession?.managed_entitlements).toContainEqual(expect.stringContaining("multicast"));

    const coreData = await findRecord("core-data");
    expect(coreData?.minimum_os_version["Mac Catalyst"]).toBe("13.0");
    expect(coreData?.cloud_dependency).toContain("Optional CloudKit");
    expect(coreData?.xcode_capabilities).toContainEqual(expect.stringContaining("only for CloudKit-backed stores"));
    expect(coreData?.background_modes).toContainEqual(expect.stringContaining("remote-notification only"));

    const cloudKit = await findRecord("cloudkit");
    expect(cloudKit?.on_device_level).toBe("cloud_required");
    expect(cloudKit?.entitlements).toContain("com.apple.developer.icloud-services");
    expect(cloudKit?.entitlements).toContain("com.apple.developer.icloud-container-identifiers");
    expect(cloudKit?.entitlements).toContainEqual(expect.stringContaining("aps-environment"));
    expect(cloudKit?.entitlements.join(" ")).not.toContain("ubiquity-kvstore-identifier");
    expect(cloudKit?.background_modes).toContainEqual(expect.stringContaining("fetch only"));

    const keychain = await findRecord("keychain-services");
    expect(keychain?.minimum_os_version["Mac Catalyst"]).toBe("13.1");
    expect(keychain?.knowledge_state.fields.user_permissions).toBe("verified_none");
    expect(keychain?.xcode_capabilities).toContainEqual(expect.stringContaining("only when items are shared"));
    expect(keychain?.info_plist_keys).toContainEqual(expect.stringContaining("only when Face ID"));

    const authenticationServices = await findRecord("authenticationservices");
    expect(authenticationServices?.minimum_os_version.iOS).toBe("12.0");
    expect(authenticationServices?.entitlements).toContainEqual(expect.stringContaining("only for Sign in with Apple"));
    expect(authenticationServices?.entitlements).toContainEqual(expect.stringContaining("webcredentials"));
    expect(authenticationServices?.entitlements).toContainEqual(
      expect.stringContaining("autofill-credential-provider")
    );

    const cryptoKit = await findRecord("cryptokit");
    expect(cryptoKit?.on_device_level).toBe("fully_on_device");
    expect(cryptoKit?.xcode_capabilities).toEqual([]);
    expect(cryptoKit?.info_plist_keys).toContainEqual(expect.stringContaining("ITSAppUsesNonExemptEncryption"));
    expect(cryptoKit?.limitations).toContainEqual(expect.stringContaining("does not provide durable key storage"));

    expect((await findTechnologyCatalogEntry("Secure Enclave"))?.coverage_status).toBe("catalogued");
    expect((await findTechnologyCatalogEntry("Sign in with Apple"))?.coverage_status).toBe("catalogued");
  });

  it("looks up catalog technologies by exact id or normalized name only", async () => {
    expect((await findTechnologyCatalogEntry("MapKit"))?.id).toBe("technology.mapkit");
    expect((await findTechnologyCatalogEntry("technology.mapkit"))?.name).toBe("MapKit");
    expect(await findTechnologyCatalogEntry("Map")).toBeUndefined();
  });

  it("resolves every committed catalog technology by its exact id", async () => {
    const catalog = await loadTechnologyCatalog();
    expect(catalog).toHaveLength(193);
    for (const entry of catalog) {
      expect(await findTechnologyCatalogEntry(entry.id)).toEqual(entry);
    }
  });

  it("returns defensive copies and handles empty searches", async () => {
    const first = await loadRegistry();
    first[0]!.name = "mutated";
    expect((await loadRegistry())[0]?.name).not.toBe("mutated");
    resetRegistryCache();
    expect(await findRecord("   ")).toBeUndefined();
    expect(await searchRecords("no-such-token")).toEqual([]);
    expect(await searchTechnologyCatalog(" ")).toEqual([]);
  });

  it("distinguishes unknown fields, verified values, and verified absence", async () => {
    const healthKit = await findRecord("healthkit");
    const coreML = await findRecord("core-ml");

    expect(healthKit?.knowledge_state.completeness).toBe("partial");
    expect(healthKit?.knowledge_state.fields.minimum_os_version).toBe("verified_value");
    expect(healthKit?.knowledge_state.fields.stable_or_beta).toBe("verified_value");
    expect(healthKit?.knowledge_state.fields.user_permissions).toBe("verified_value");
    expect(healthKit?.knowledge_state.fields.managed_entitlements).toBe("unknown");
    expect(coreML?.knowledge_state.fields.cloud_dependency).toBe("verified_none");
  });

  it("preserves reviewed platform availability instead of inferred defaults", async () => {
    const activityKit = await findRecord("activitykit");
    const healthKit = await findRecord("healthkit");
    const storeKit2 = await findRecord("storekit-2");

    expect(activityKit?.platforms).toEqual(["iOS", "iPadOS"]);
    expect(activityKit?.minimum_os_version).toEqual({ iOS: "16.1", iPadOS: "16.1" });
    expect(healthKit?.minimum_os_version.iPadOS).toBe("17.0");
    expect(healthKit?.minimum_os_version.macOS).toBeNull();
    expect(storeKit2?.minimum_os_version.iOS).toBe("15.0");
  });

  it("derives typed, deduplicated relationships from legacy relationship arrays", async () => {
    const widgetKit = await findRecord("widgetkit");

    expect(widgetKit?.relationships).toContainEqual({ type: "related_framework", target: "SwiftUI" });
    expect(widgetKit?.relationships).toContainEqual({ type: "related_extension", target: "Widget Extension" });
    expect(new Set(widgetKit?.relationships.map(({ type, target }) => `${type}:${target}`)).size).toBe(
      widgetKit?.relationships.length
    );
  });
});
