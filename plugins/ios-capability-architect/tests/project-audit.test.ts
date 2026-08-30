import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { auditProjectConfiguration } from "@/engine.js";

const temporaryRoots: string[] = [];

async function temporaryProject(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "ios-capability-architect-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("iOS project configuration audit", () => {
  it("detects source-of-truth HealthKit configuration without returning file contents", async () => {
    const root = await temporaryProject();
    await writeFile(
      join(root, "project.yml"),
      "options:\n  deploymentTarget:\n    iOS: '18.0'\ntargets:\n  App:\n    entitlements:\n      path: App.entitlements\n"
    );
    await writeFile(
      join(root, "Info.plist"),
      "<plist><dict><key>NSHealthShareUsageDescription</key><string>Read sleep trends.</string><key>NSHealthUpdateUsageDescription</key><string>Save sleep trends.</string></dict></plist>"
    );
    await writeFile(
      join(root, "App.entitlements"),
      "<plist><dict><key>com.apple.developer.healthkit</key><true/></dict></plist>"
    );

    const audit = await auditProjectConfiguration({
      project_root: root,
      capability_ids: ["healthkit"],
      platform: "iOS"
    });

    expect(audit.data.summary.not_detected).toBe(0);
    expect(audit.data.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ requirement: "com.apple.developer.healthkit", status: "detected" }),
        expect.objectContaining({ requirement: "NSHealthShareUsageDescription", status: "detected" }),
        expect.objectContaining({ requirement: "NSHealthUpdateUsageDescription", status: "detected" })
      ])
    );
    expect(JSON.stringify(audit.data)).not.toContain("Read sleep trends");
  });

  it("reports missing location keys and background mode as actionable findings", async () => {
    const root = await temporaryProject();
    await writeFile(join(root, "project.pbxproj"), "IPHONEOS_DEPLOYMENT_TARGET = 18.0;\n");

    const audit = await auditProjectConfiguration({
      project_root: root,
      capability_ids: ["core-location"],
      platform: "iOS"
    });

    expect(audit.data.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ requirement: "NSLocationWhenInUseUsageDescription", status: "not_detected" }),
        expect.objectContaining({ requirement: "UIBackgroundModes: location", status: "not_detected" })
      ])
    );
    expect(audit.data.summary.not_detected).toBeGreaterThanOrEqual(3);
  });

  it("flags an incompatible deployment target", async () => {
    const root = await temporaryProject();
    await writeFile(join(root, "project.yml"), "deploymentTarget:\n  iOS: '16.4'\n");

    const audit = await auditProjectConfiguration({
      project_root: root,
      capability_ids: ["swiftdata"],
      platform: "iOS"
    });

    expect(audit.data.findings).toContainEqual(
      expect.objectContaining({
        category: "deployment_target",
        requirement: "iOS 17.0 or later",
        status: "incompatible",
        severity: "error"
      })
    );
  });

  it("accepts a compatible deployment target and detects a privacy manifest", async () => {
    const root = await temporaryProject();
    await writeFile(join(root, "project.yml"), "deploymentTarget:\n  iOS: '17.2'\n");
    await writeFile(
      join(root, "PrivacyInfo.xcprivacy"),
      "<plist><dict><key>NSPrivacyAccessedAPITypes</key><array/></dict></plist>"
    );

    const audit = await auditProjectConfiguration({
      project_root: root,
      capability_ids: ["swiftdata", "privacy-manifest"],
      platform: "iOS"
    });

    expect(audit.data.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "deployment_target", status: "detected" }),
        expect.objectContaining({ category: "privacy_manifest", status: "detected" })
      ])
    );
  });

  it("keeps managed entitlement approval as a manual review", async () => {
    const root = await temporaryProject();
    await writeFile(join(root, "project.yml"), "capabilities:\n  Family Controls: true\n");
    await writeFile(
      join(root, "App.entitlements"),
      "<plist><dict><key>com.apple.developer.family-controls</key><true/></dict></plist>"
    );

    const audit = await auditProjectConfiguration({
      project_root: root,
      capability_ids: ["family-controls-managed-entitlement"],
      platform: "iOS"
    });

    expect(audit.data.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "entitlement", status: "detected" }),
        expect.objectContaining({ category: "xcode_capability", status: "detected" }),
        expect.objectContaining({ category: "managed_entitlement", status: "manual_review" })
      ])
    );
  });

  it("keeps incomplete registry evidence visible in project findings", async () => {
    const root = await temporaryProject();
    await writeFile(join(root, "project.pbxproj"), "IPHONEOS_DEPLOYMENT_TARGET = 18.0;\n");

    const audit = await auditProjectConfiguration({
      project_root: root,
      capability_ids: ["core-ml"],
      platform: "iOS"
    });

    const unknownFindings = audit.data.findings.filter(({ status }) => status === "unknown");
    expect(unknownFindings).toHaveLength(1);
    expect(unknownFindings[0]).toEqual(expect.objectContaining({ category: "registry_evidence", status: "unknown" }));
    expect(unknownFindings[0]?.requirement).toContain("privacy_manifest_requirements");
    expect(audit.warnings).toContain(
      "Unknown registry fields require official-source research before concluding that no configuration is needed."
    );
  });

  it("rejects a file as project_root and unknown capability ids", async () => {
    const root = await temporaryProject();
    const file = join(root, "Info.plist");
    await writeFile(file, "<plist/>");

    await expect(
      auditProjectConfiguration({ project_root: file, capability_ids: ["healthkit"], platform: "iOS" })
    ).rejects.toThrow("project_root must be a directory");
    await expect(
      auditProjectConfiguration({ project_root: root, capability_ids: ["not-real"], platform: "iOS" })
    ).rejects.toThrow("Unknown capabilities: not-real");
  });

  it("does not follow symbolic links outside the selected project", async () => {
    const root = await temporaryProject();
    const outside = await temporaryProject();
    await writeFile(join(outside, "Secret.plist"), "<key>NSHealthShareUsageDescription</key><string>secret</string>");
    await symlink(join(outside, "Secret.plist"), join(root, "Linked.plist"));
    await mkdir(join(root, "App"));
    await writeFile(join(root, "App", "project.pbxproj"), "IPHONEOS_DEPLOYMENT_TARGET = 18.0;\n");

    const audit = await auditProjectConfiguration({
      project_root: root,
      capability_ids: ["healthkit"],
      platform: "iOS"
    });

    expect(audit.data.skipped_entries).toContain("Linked.plist (symlink)");
    expect(audit.data.scanned_files).not.toContain("Linked.plist");
    expect(audit.data.findings).toContainEqual(
      expect.objectContaining({ requirement: "NSHealthShareUsageDescription", status: "not_detected" })
    );
  });
});
