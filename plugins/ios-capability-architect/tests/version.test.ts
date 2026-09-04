import { describe, expect, it } from "vitest";
import { comparePlatformVersions, parsePlatformVersion } from "@/version.js";

describe("platform version helpers", () => {
  it("parses numeric versions and rejects absent or nonnumeric values", () => {
    expect(parsePlatformVersion(undefined)).toBeUndefined();
    expect(parsePlatformVersion("latest stable")).toBeUndefined();
    expect(parsePlatformVersion(" 18.2 beta 1 ")).toEqual([18, 2]);
  });

  it("compares missing, equal, older, and newer components numerically", () => {
    expect(comparePlatformVersions([18], [18, 0, 0])).toBe(0);
    expect(comparePlatformVersions([18, 1], [18])).toBeGreaterThan(0);
    expect(comparePlatformVersions([18], [18, 1])).toBeLessThan(0);
  });
});
