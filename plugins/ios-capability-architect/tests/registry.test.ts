import { describe, expect, it } from "vitest";
import { findRecord, loadRegistry, resetRegistryCache, searchRecords, searchTechnologyCatalog } from "@/registry.js";

describe("capability registry", () => {
  it("loads unique fully-normalized records", async () => {
    const records = await loadRegistry();
    expect(records.length).toBeGreaterThanOrEqual(15);
    expect(new Set(records.map((record) => record.id)).size).toBe(records.length);
    for (const record of records) {
      expect(record.last_verified_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(record.official_documentation.length).toBeGreaterThan(0);
      expect(record.on_device_level).toMatch(/^(fully_on_device|primarily_on_device|hybrid|cloud_required|unknown)$/);
    }
  });

  it("resolves ids, names, and aliases", async () => {
    expect((await findRecord("healthkit"))?.id).toBe("healthkit");
    expect((await findRecord("Core ML"))?.id).toBe("core-ml");
    expect((await findRecord("Dynamic Island"))?.id).toBe("activitykit");
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
    expect(healthKit?.knowledge_state.fields.user_permissions).toBe("verified_value");
    expect(healthKit?.knowledge_state.fields.managed_entitlements).toBe("unknown");
    expect(coreML?.knowledge_state.fields.cloud_dependency).toBe("verified_none");
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
