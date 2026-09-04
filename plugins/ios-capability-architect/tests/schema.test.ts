import { describe, expect, it } from "vitest";
import {
  analyzeIdeaInputSchema,
  capabilityRecordSchema,
  capabilityRegistrySchema,
  checkAvailabilityInputSchema,
  refreshRegistryInputSchema,
  resolveCapabilitiesInputSchema
} from "@/schema.js";
import { loadRegistry } from "@/registry.js";

describe("model-visible input boundaries", () => {
  it("accepts every advertised Apple-platform planning context", () => {
    for (const target_platform of [
      "iOS",
      "iPadOS",
      "macOS",
      "watchOS",
      "tvOS",
      "visionOS",
      "Mac Catalyst",
      "multi-platform"
    ]) {
      expect(
        analyzeIdeaInputSchema.parse({
          idea: "A native Apple-platform product",
          target_platform,
          preferred_ui_framework: target_platform === "macOS" ? "AppKit" : "SwiftUI"
        }).target_platform
      ).toBe(target_platform);
    }
  });

  it("rejects blank or unbounded model-supplied text", () => {
    expect(() => analyzeIdeaInputSchema.parse({ idea: "          " })).toThrow();
    expect(() =>
      checkAvailabilityInputSchema.parse({
        capability_ids: ["healthkit"],
        device: "x".repeat(201)
      })
    ).toThrow();
    expect(() =>
      resolveCapabilitiesInputSchema.parse({
        requirements: [
          {
            id: "req-1",
            kind: "product_goal",
            description: "x".repeat(2_001)
          }
        ]
      })
    ).toThrow();
  });

  it("limits registry refresh plans to official Apple Developer URLs", () => {
    expect(
      refreshRegistryInputSchema.parse({ source_urls: ["https://developer.apple.com/documentation/healthkit"] })
        .source_urls
    ).toEqual(["https://developer.apple.com/documentation/healthkit"]);
    expect(() => refreshRegistryInputSchema.parse({ source_urls: ["https://example.com/healthkit"] })).toThrow();
    expect(() => refreshRegistryInputSchema.parse({ source_urls: ["http://developer.apple.com/healthkit"] })).toThrow();
  });

  it("enforces record provenance, lifecycle, completeness, and registry uniqueness", async () => {
    const [source] = await loadRegistry();
    const base = structuredClone(source!);

    const openAiSource = structuredClone(base);
    openAiSource.official_documentation = [
      {
        title: "OpenAI plugin documentation",
        url: "https://developers.openai.com/plugins",
        source_type: "openai_plugin_documentation",
        verified_at: openAiSource.last_verified_at
      }
    ];
    expect(capabilityRecordSchema.safeParse(openAiSource).success).toBe(true);

    const invalidSource = structuredClone(base);
    invalidSource.official_documentation[0]!.url = "https://example.com/not-primary";
    expect(capabilityRecordSchema.safeParse(invalidSource).success).toBe(false);

    const staleDate = structuredClone(base);
    staleDate.last_verified_at = "2000-01-01";
    expect(capabilityRecordSchema.safeParse(staleDate).success).toBe(false);

    const unexplainedDeprecation = structuredClone(base);
    unexplainedDeprecation.stable_or_beta = "deprecated";
    unexplainedDeprecation.deprecated_status = null;
    expect(capabilityRecordSchema.safeParse(unexplainedDeprecation).success).toBe(false);

    const contradictoryCompleteness = structuredClone(base);
    contradictoryCompleteness.knowledge_state.completeness = "complete";
    contradictoryCompleteness.knowledge_state.fields.aliases = "unknown";
    expect(capabilityRecordSchema.safeParse(contradictoryCompleteness).success).toBe(false);

    const complete = structuredClone(base);
    complete.knowledge_state.completeness = "complete";
    for (const field of Object.keys(complete.knowledge_state.fields) as Array<
      keyof typeof complete.knowledge_state.fields
    >) {
      complete.knowledge_state.fields[field] = "verified_value";
    }
    expect(capabilityRecordSchema.safeParse(complete).success).toBe(true);

    expect(
      capabilityRegistrySchema.safeParse({
        schema_version: "1.0",
        generated_at: "2026-09-04T00:00:00.000Z",
        records: [base, { ...structuredClone(base), name: "Duplicate" }]
      }).success
    ).toBe(false);
  });
});
