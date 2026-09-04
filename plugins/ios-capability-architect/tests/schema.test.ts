import { describe, expect, it } from "vitest";
import {
  analyzeIdeaInputSchema,
  checkAvailabilityInputSchema,
  refreshRegistryInputSchema,
  resolveCapabilitiesInputSchema
} from "@/schema.js";

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
});
