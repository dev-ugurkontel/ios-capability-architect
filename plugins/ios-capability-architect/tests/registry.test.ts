import { describe, expect, it } from "vitest";
import { findRecord, loadRegistry } from "../src/registry.js";

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
});
