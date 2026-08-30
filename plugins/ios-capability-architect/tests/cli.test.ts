import { describe, expect, it } from "vitest";
import { runCli } from "@/cli.js";

function capture() {
  let stdout = "";
  let stderr = "";
  return {
    streams: {
      stdout: (value: string) => {
        stdout += value;
      },
      stderr: (value: string) => {
        stderr += value;
      }
    },
    stdout: () => stdout,
    stderr: () => stderr
  };
}

describe("skills-only CLI", () => {
  it("prints help without invoking a command", async () => {
    const output = capture();
    await expect(runCli(["--help"], output.streams)).resolves.toBe(0);
    expect(output.stdout()).toContain("audit-project");
    expect(output.stderr()).toBe("");
  });

  it("analyzes an idea as structured JSON", async () => {
    const output = capture();
    await expect(runCli(["analyze", "--idea", "An offline health app with reminders"], output.streams)).resolves.toBe(
      0
    );
    const result = JSON.parse(output.stdout()) as { schema_version: string; data: { requirements: unknown[] } };
    expect(result.schema_version).toBe("1.0");
    expect(result.data.requirements.length).toBeGreaterThan(1);
  });

  it("returns a verified capability profile", async () => {
    const output = capture();
    await expect(runCli(["profile", "healthkit"], output.streams)).resolves.toBe(0);
    const result = JSON.parse(output.stdout()) as { data: { id: string } };
    expect(result.data.id).toBe("healthkit");
  });

  it("runs the bounded project audit", async () => {
    const output = capture();
    await expect(
      runCli(["audit-project", "--root", process.cwd(), "--capability", "privacy-manifest"], output.streams)
    ).resolves.toBe(0);
    const result = JSON.parse(output.stdout()) as { data: { scanned_files: string[]; findings: unknown[] } };
    expect(result.data.scanned_files).toEqual(expect.any(Array));
    expect(result.data.findings.length).toBeGreaterThan(0);
  });

  it("keeps recoverable input errors on stderr", async () => {
    const output = capture();
    await expect(runCli(["audit-project", "--root", process.cwd()], output.streams)).resolves.toBe(1);
    expect(output.stdout()).toBe("");
    expect(output.stderr()).toContain("Provide at least one --capability");
  });

  it("resolves an idea with beta excluded by default", async () => {
    const output = capture();
    await expect(
      runCli(["resolve", "--idea", "A health app with background reminders", "--limit", "3"], output.streams)
    ).resolves.toBe(0);
    const result = JSON.parse(output.stdout()) as {
      analysis: { data: { requirements: unknown[] } };
      resolution: { data: { matches: Array<{ record: { stable_or_beta: string } }> } };
    };
    expect(result.analysis.data.requirements.length).toBeGreaterThan(1);
    expect(result.resolution.data.matches.every((match) => match.record.stable_or_beta !== "beta")).toBe(true);
  });

  it("exposes availability, configuration, and privacy audits", async () => {
    for (const args of [
      ["availability", "--capability", "healthkit", "--minimum-os", "18"],
      ["audit-requirements", "--capability", "healthkit,user-notifications"],
      ["audit-privacy", "--capability", "healthkit"]
    ]) {
      const output = capture();
      await expect(runCli(args, output.streams)).resolves.toBe(0);
      expect(JSON.parse(output.stdout())).toMatchObject({ schema_version: "1.0" });
    }
  });

  it("generates architecture and implementation planning output", async () => {
    const architecture = capture();
    await expect(
      runCli(
        ["architecture", "--idea", "A health journal", "--capability", "healthkit", "--scale", "prototype"],
        architecture.streams
      )
    ).resolves.toBe(0);
    const architectureResult = JSON.parse(architecture.stdout()) as { data: { pattern: string } };
    expect(architectureResult.data.pattern).toContain("Feature-local");

    const plan = capture();
    await expect(runCli(["plan", "--capability", "healthkit", "--code-spike"], plan.streams)).resolves.toBe(0);
    const planResult = JSON.parse(plan.stdout()) as { data: { phases: unknown[] } };
    expect(planResult.data.phases).toHaveLength(7);
  });

  it("searches verified sources and the discovery catalog", async () => {
    const sources = capture();
    await expect(
      runCli(["search", "HealthKit", "authorization", "--capability", "healthkit"], sources.streams)
    ).resolves.toBe(0);
    const sourceResult = JSON.parse(sources.stdout()) as { data: { results: unknown[] } };
    expect(sourceResult.data.results.length).toBeGreaterThan(0);

    const catalog = capture();
    await expect(
      runCli(["catalog", "--query", "HealthKit", "--coverage", "profiled", "--limit", "5"], catalog.streams)
    ).resolves.toBe(0);
    const catalogResult = JSON.parse(catalog.stdout()) as {
      data: { results: Array<{ coverage_status: string }> };
    };
    expect(catalogResult.data.results[0]?.coverage_status).toBe("profiled");

    const coverage = capture();
    await expect(runCli(["coverage"], coverage.streams)).resolves.toBe(0);
    const coverageResult = JSON.parse(coverage.stdout()) as { data: { profiled_technology_count: number } };
    expect(coverageResult.data.profiled_technology_count).toBeGreaterThan(0);
  });

  it("rejects invalid commands and bounded numeric options", async () => {
    const invalidCommand = capture();
    await expect(runCli(["erase-project"], invalidCommand.streams)).resolves.toBe(1);
    expect(invalidCommand.stderr()).toContain("Unknown command");

    const invalidLimit = capture();
    await expect(runCli(["coverage", "--limit", "0"], invalidLimit.streams)).resolves.toBe(1);
    expect(invalidLimit.stderr()).toContain("--limit must be an integer");

    const invalidCoverage = capture();
    await expect(
      runCli(["catalog", "--query", "HealthKit", "--coverage", "verified"], invalidCoverage.streams)
    ).resolves.toBe(1);
    expect(invalidCoverage.stderr()).toContain("all, catalogued, or profiled");
  });
});
