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
    expect(audit.data.project_root).toBe(".");
    expect(JSON.stringify(audit.data)).not.toContain(root);
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

  it("flags a deployment target below a capability's minor-version minimum", async () => {
    const root = await temporaryProject();
    await writeFile(join(root, "project.yml"), "deploymentTarget:\n  iOS: '16.0'\n");

    const audit = await auditProjectConfiguration({
      project_root: root,
      capability_ids: ["activitykit"],
      platform: "iOS"
    });

    expect(audit.data.findings).toContainEqual(
      expect.objectContaining({
        category: "deployment_target",
        requirement: "iOS 16.1 or later",
        status: "incompatible"
      })
    );
  });

  it("flags a reviewed null minimum as unavailable instead of silently skipping it", async () => {
    const root = await temporaryProject();
    await writeFile(join(root, "project.pbxproj"), "MACOSX_DEPLOYMENT_TARGET = 15.0;\n");

    const audit = await auditProjectConfiguration({
      project_root: root,
      capability_ids: ["apptrackingtransparency", "app-attest"],
      platform: "macOS"
    });

    expect(audit.data.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability_id: "apptrackingtransparency",
          category: "deployment_target",
          requirement: "AppTrackingTransparency has no usable capability on macOS",
          status: "incompatible",
          severity: "error"
        }),
        expect.objectContaining({
          capability_id: "app-attest",
          category: "deployment_target",
          requirement: "App Attest has no usable capability on macOS",
          status: "incompatible",
          severity: "error"
        })
      ])
    );
    const errorFindings = audit.data.findings.filter(({ severity }) => severity === "error");
    expect(errorFindings).toHaveLength(2);
    expect(errorFindings.map(({ category }) => category)).toEqual(["deployment_target", "deployment_target"]);
    expect(
      audit.data.findings.some(
        ({ capability_id: capabilityId, category }) =>
          capabilityId === "app-attest" &&
          ["entitlement", "xcode_capability", "info_plist_key", "background_mode"].includes(category)
      )
    ).toBe(false);
  });

  it("rejects a platform omitted from a reviewed capability even when no minimum key exists", async () => {
    const root = await temporaryProject();
    await writeFile(join(root, "project.pbxproj"), "MACOSX_DEPLOYMENT_TARGET = 15.0;\n");

    const audit = await auditProjectConfiguration({
      project_root: root,
      capability_ids: ["background-tasks"],
      platform: "macOS"
    });

    expect(audit.data.findings).toContainEqual(
      expect.objectContaining({
        capability_id: "background-tasks",
        category: "deployment_target",
        requirement: "BackgroundTasks is not listed as supported on macOS",
        status: "incompatible",
        severity: "error"
      })
    );
    expect(
      audit.data.findings.some(({ category }) =>
        ["entitlement", "xcode_capability", "info_plist_key", "background_mode"].includes(category)
      )
    ).toBe(false);
  });

  it("uses each platform's native Xcode deployment-target build setting", async () => {
    for (const fixture of [
      { platform: "macOS", setting: "MACOSX_DEPLOYMENT_TARGET", version: "13.5", minimum: "macOS 14.0" },
      { platform: "watchOS", setting: "WATCHOS_DEPLOYMENT_TARGET", version: "9.2", minimum: "watchOS 10.0" },
      { platform: "tvOS", setting: "TVOS_DEPLOYMENT_TARGET", version: "16.4", minimum: "tvOS 17.0" },
      { platform: "visionOS", setting: "XROS_DEPLOYMENT_TARGET", version: "0.9", minimum: "visionOS 1.0" }
    ]) {
      const root = await temporaryProject();
      await writeFile(join(root, "project.pbxproj"), `${fixture.setting} = ${fixture.version};\n`);

      const audit = await auditProjectConfiguration({
        project_root: root,
        capability_ids: ["swiftdata"],
        platform: fixture.platform
      });

      expect(audit.data.findings, fixture.platform).toContainEqual(
        expect.objectContaining({
          category: "deployment_target",
          requirement: `${fixture.minimum} or later`,
          status: "incompatible"
        })
      );
    }
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

  it("detects conditional data, security, and authentication configuration by its exact source tokens", async () => {
    const root = await temporaryProject();
    await writeFile(
      join(root, "project.yml"),
      [
        "options:",
        "  deploymentTarget:",
        "    iOS: '18.0'",
        "capabilities:",
        "  iCloud with CloudKit: true",
        "  Push Notifications: true",
        "  Keychain Sharing: true",
        "  Sign in with Apple: true",
        "  Associated Domains: true",
        "  AutoFill Credential Provider: true"
      ].join("\n")
    );
    await writeFile(
      join(root, "App.entitlements"),
      [
        "<plist><dict>",
        "<key>com.apple.developer.icloud-services</key><array><string>CloudKit</string></array>",
        "<key>com.apple.developer.icloud-container-identifiers</key><array><string>iCloud.example.app</string></array>",
        "<key>com.apple.developer.icloud-container-environment</key><string>Production</string>",
        "<key>aps-environment</key><string>production</string>",
        "<key>keychain-access-groups</key><array><string>TEAM.example.app</string></array>",
        "<key>com.apple.developer.applesignin</key><array><string>Default</string></array>",
        "<key>com.apple.developer.associated-domains</key><array><string>webcredentials:example.com</string></array>",
        "<key>com.apple.developer.authentication-services.autofill-credential-provider</key><true/>",
        "</dict></plist>"
      ].join("\n")
    );
    await writeFile(
      join(root, "Info.plist"),
      [
        "<plist><dict>",
        "<key>UIBackgroundModes</key><array><string>fetch</string><string>remote-notification</string></array>",
        "<key>NSFaceIDUsageDescription</key><string>Unlock saved credentials.</string>",
        "<key>ITSAppUsesNonExemptEncryption</key><false/>",
        "</dict></plist>"
      ].join("\n")
    );

    const audit = await auditProjectConfiguration({
      project_root: root,
      capability_ids: ["core-data", "cloudkit", "keychain-services", "authenticationservices", "cryptokit"],
      platform: "iOS"
    });
    const statusFor = (capabilityId: string, requirement: string) =>
      audit.data.findings.find(
        (finding) => finding.capability_id === capabilityId && finding.requirement === requirement
      )?.status;

    expect(statusFor("core-data", "com.apple.developer.icloud-services only for CloudKit integration")).toBe(
      "detected"
    );
    expect(statusFor("cloudkit", "aps-environment as provisioning-managed Push Notifications metadata")).toBe(
      "detected"
    );
    expect(
      statusFor(
        "cloudkit",
        "UIBackgroundModes: fetch only for silent CloudKit subscription delivery that requires background fetch"
      )
    ).toBe("detected");
    expect(
      statusFor("cloudkit", "UIBackgroundModes: remote-notification only for background CloudKit change delivery")
    ).toBe("detected");
    expect(
      statusFor("keychain-services", "NSFaceIDUsageDescription only when Face ID protects access to a keychain item")
    ).toBe("detected");
    expect(
      statusFor(
        "cryptokit",
        "ITSAppUsesNonExemptEncryption according to the app's actual export-compliance classification"
      )
    ).toBe("detected");

    for (const requirement of [
      "Sign in with Apple only for Sign in with Apple",
      "Associated Domains only for passkeys and other associated-domain features",
      "AutoFill Credential Provider only for a credential-provider app and extension",
      "com.apple.developer.applesignin only for Sign in with Apple",
      "com.apple.developer.associated-domains with webcredentials entries for passkeys",
      "com.apple.developer.authentication-services.autofill-credential-provider only for an AutoFill credential-provider app and extension"
    ]) {
      expect(statusFor("authenticationservices", requirement), requirement).toBe("detected");
    }
  });

  it("detects routing and default-navigation MapKit configuration by exact plist tokens", async () => {
    const root = await temporaryProject();
    await writeFile(join(root, "project.pbxproj"), "IPHONEOS_DEPLOYMENT_TARGET = 18.0;\n");
    await writeFile(
      join(root, "Info.plist"),
      [
        "<plist><dict>",
        "<key>MKDirectionsApplicationSupportedModes</key><array><string>MKDirectionsModeCar</string></array>",
        "<key>CFBundleDocumentTypes</key><array><dict><key>LSItemContentTypes</key><array><string>com.apple.maps.directionsrequest</string></array></dict></array>",
        "<key>CFBundleURLTypes</key><array><dict><key>CFBundleURLSchemes</key><array><string>geo-navigation</string></array></dict></array>",
        "</dict></plist>"
      ].join("\n")
    );

    const audit = await auditProjectConfiguration({
      project_root: root,
      capability_ids: ["mapkit"],
      platform: "iOS"
    });
    const statusFor = (requirement: string) =>
      audit.data.findings.find((finding) => finding.capability_id === "mapkit" && finding.requirement === requirement)
        ?.status;

    for (const requirement of [
      "MKDirectionsApplicationSupportedModes only for an iOS routing app that provides directions to other apps",
      "CFBundleDocumentTypes only for an iOS routing app that receives directions requests",
      "com.apple.maps.directionsrequest only as the LSItemContentTypes value for an iOS routing app",
      "CFBundleURLTypes only for an eligible default-navigation app",
      "geo-navigation only as the CFBundleURLSchemes value for an eligible default-navigation app"
    ]) {
      expect(statusFor(requirement), requirement).toBe("detected");
    }
  });

  it("distinguishes APNs entitlement tokens and keeps the ATT request key conditional", async () => {
    const root = await temporaryProject();
    await writeFile(join(root, "project.pbxproj"), "IPHONEOS_DEPLOYMENT_TARGET = 18.0;\n");
    await writeFile(
      join(root, "App.entitlements"),
      "<plist><dict><key>com.apple.developer.aps-environment</key><string>production</string></dict></plist>"
    );

    const audit = await auditProjectConfiguration({
      project_root: root,
      capability_ids: ["apns", "apptrackingtransparency"],
      platform: "iOS"
    });
    const findingFor = (capabilityId: string, requirement: string) =>
      audit.data.findings.find(
        (finding) => finding.capability_id === capabilityId && finding.requirement === requirement
      );

    expect(
      findingFor(
        "apns",
        "com.apple.developer.aps-environment as provisioning-managed development or production metadata on macOS"
      )
    ).toMatchObject({ status: "detected", evidence: ["App.entitlements"] });
    expect(
      findingFor(
        "apns",
        "aps-environment as provisioning-managed development or production metadata on iOS-family platforms"
      )
    ).toMatchObject({ status: "manual_review", severity: "warning", evidence: [] });
    expect(
      findingFor(
        "apptrackingtransparency",
        "NSUserTrackingUsageDescription only when requesting tracking authorization"
      )
    ).toMatchObject({ status: "manual_review", severity: "warning", evidence: [] });
  });

  it("keeps absent conditional configuration manual without weakening unconditional requirements", async () => {
    const root = await temporaryProject();
    await writeFile(join(root, "Info.plist"), "<key>UIBackgroundModes</key><array><string>audio</string></array>");
    await writeFile(
      join(root, "App.entitlements"),
      "<key>com.apple.developer.associated-domains</key><array><string>applinks:example.com</string></array>"
    );

    const audit = await auditProjectConfiguration({
      project_root: root,
      capability_ids: [
        "core-data",
        "cloudkit",
        "keychain-services",
        "authenticationservices",
        "cryptokit",
        "user-notifications"
      ],
      platform: "iOS"
    });

    expect(audit.data.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability_id: "cloudkit",
          requirement:
            "UIBackgroundModes: fetch only for silent CloudKit subscription delivery that requires background fetch",
          status: "manual_review",
          severity: "warning"
        }),
        expect.objectContaining({
          capability_id: "cloudkit",
          requirement: "UIBackgroundModes: remote-notification only for background CloudKit change delivery",
          status: "manual_review",
          severity: "warning"
        }),
        expect.objectContaining({
          capability_id: "authenticationservices",
          requirement: "com.apple.developer.associated-domains with webcredentials entries for passkeys",
          status: "manual_review",
          severity: "warning"
        }),
        expect.objectContaining({
          capability_id: "cloudkit",
          requirement: "com.apple.developer.icloud-services",
          status: "not_detected",
          severity: "error"
        }),
        expect.objectContaining({
          capability_id: "user-notifications",
          requirement: "aps-environment for APNs",
          status: "not_detected",
          severity: "error"
        })
      ])
    );

    for (const capabilityId of ["core-data", "keychain-services", "authenticationservices"]) {
      const configurationFindings = audit.data.findings.filter(
        (finding) =>
          finding.capability_id === capabilityId &&
          ["entitlement", "xcode_capability", "info_plist_key", "background_mode"].includes(finding.category)
      );
      expect(configurationFindings.length, capabilityId).toBeGreaterThan(0);
      expect(
        configurationFindings.every(({ status }) => status === "manual_review"),
        capabilityId
      ).toBe(true);
      expect(
        configurationFindings.every(({ severity }) => severity === "warning"),
        capabilityId
      ).toBe(true);
    }
  });

  it("detects core-system profile configuration by exact plist and entitlement tokens", async () => {
    const root = await temporaryProject();
    await writeFile(
      join(root, "project.yml"),
      [
        "options:",
        "  deploymentTarget:",
        "    iOS: '18.0'",
        "capabilities:",
        "  WeatherKit: true",
        "  Fall Detection Notifications: true",
        "  Multicast Networking: true",
        "  App Sandbox: true"
      ].join("\n")
    );
    await writeFile(
      join(root, "App.entitlements"),
      [
        "<plist><dict>",
        "<key>com.apple.developer.weatherkit</key><true/>",
        "<key>com.apple.developer.health.fall-detection</key><true/>",
        "<key>com.apple.developer.networking.multicast</key><true/>",
        "<key>com.apple.security.network.client</key><true/>",
        "<key>com.apple.security.network.server</key><true/>",
        "<key>com.apple.security.personal-information.calendars</key><true/>",
        "<key>com.apple.security.personal-information.addressbook</key><true/>",
        "<key>com.apple.developer.contacts.notes</key><true/>",
        "</dict></plist>"
      ].join("\n")
    );
    await writeFile(
      join(root, "Info.plist"),
      [
        "<plist><dict>",
        "<key>NSMotionUsageDescription</key><string>Use motion.</string>",
        "<key>NSFallDetectionUsageDescription</key><string>Use fall events.</string>",
        "<key>NSFaceIDUsageDescription</key><string>Confirm access.</string>",
        "<key>NSLocalNetworkUsageDescription</key><string>Connect to a device.</string>",
        "<key>NSBonjourServices</key><array><string>_example._tcp</string></array>",
        "<key>WKAppBoundDomains</key><array><string>example.com</string></array>",
        "<key>NSCameraUsageDescription</key><string>Capture from the page.</string>",
        "<key>NSMicrophoneUsageDescription</key><string>Capture from the page.</string>",
        "<key>NSLocationWhenInUseUsageDescription</key><string>Local weather.</string>",
        "<key>NSLocationUsageDescription</key><string>Local weather on Mac.</string>",
        "<key>NSAppTransportSecurity</key><dict/>",
        "<key>NSCalendarsWriteOnlyAccessUsageDescription</key><string>Add events.</string>",
        "<key>NSCalendarsFullAccessUsageDescription</key><string>Manage events.</string>",
        "<key>NSRemindersFullAccessUsageDescription</key><string>Manage reminders.</string>",
        "<key>NSCalendarsUsageDescription</key><string>Legacy calendar support.</string>",
        "<key>NSRemindersUsageDescription</key><string>Legacy reminders support.</string>",
        "<key>NSContactsUsageDescription</key><string>Select contacts.</string>",
        "</dict></plist>"
      ].join("\n")
    );
    await writeFile(
      join(root, "PrivacyInfo.xcprivacy"),
      "<plist><dict><key>NSPrivacyCollectedDataTypes</key><array/></dict></plist>"
    );

    const audit = await auditProjectConfiguration({
      project_root: root,
      capability_ids: [
        "core-motion",
        "weatherkit",
        "local-authentication",
        "core-spotlight",
        "network",
        "webkit",
        "eventkit",
        "contacts"
      ],
      platform: "iOS"
    });
    const statusFor = (capabilityId: string, requirement: string) =>
      audit.data.findings.find(
        (finding) => finding.capability_id === capabilityId && finding.requirement === requirement
      )?.status;

    expect(statusFor("weatherkit", "com.apple.developer.weatherkit")).toBe("detected");
    expect(
      statusFor("core-motion", "NSMotionUsageDescription only when accessing permission-gated motion or fitness data")
    ).toBe("detected");
    expect(
      statusFor(
        "core-motion",
        "com.apple.developer.health.fall-detection only when receiving CMFallDetectionManager events"
      )
    ).toBe("detected");
    expect(
      statusFor(
        "network",
        "com.apple.developer.networking.multicast only for multicast, broadcast, or arbitrary Bonjour operations on entitlement-gated platforms"
      )
    ).toBe("detected");
    expect(
      statusFor("webkit", "WKAppBoundDomains only when limiting privileged app-to-web interaction to declared domains")
    ).toBe("detected");
    expect(
      statusFor(
        "eventkit",
        "NSCalendarsWriteOnlyAccessUsageDescription only for write-only event access on iOS or iPadOS 17 or later, Mac Catalyst 17 or later, macOS 14 or later, visionOS 1 or later, or watchOS 10 or later"
      )
    ).toBe("detected");
    expect(
      statusFor(
        "contacts",
        "com.apple.developer.contacts.notes only when reading or writing the contact note field on iOS or iPadOS 13 or later, macOS 13 or later, or visionOS 1 or later; it is unavailable on watchOS"
      )
    ).toBe("detected");
    expect(audit.data.summary.not_detected).toBe(0);
    expect(audit.data.findings.filter(({ severity }) => severity === "error")).toEqual([]);
  });

  it("keeps optional core-system setup manual while WeatherKit's required entitlement remains an error", async () => {
    const root = await temporaryProject();
    await writeFile(join(root, "project.pbxproj"), "IPHONEOS_DEPLOYMENT_TARGET = 18.0;\n");

    const audit = await auditProjectConfiguration({
      project_root: root,
      capability_ids: [
        "core-motion",
        "weatherkit",
        "local-authentication",
        "core-spotlight",
        "network",
        "webkit",
        "eventkit",
        "contacts"
      ],
      platform: "iOS"
    });

    expect(audit.data.findings).toContainEqual(
      expect.objectContaining({
        capability_id: "weatherkit",
        requirement: "com.apple.developer.weatherkit",
        status: "not_detected",
        severity: "error"
      })
    );

    const configurationCategories = new Set([
      "entitlement",
      "xcode_capability",
      "managed_entitlement",
      "info_plist_key",
      "background_mode"
    ]);
    const nonWeatherErrors = audit.data.findings.filter(
      (finding) =>
        finding.capability_id !== "weatherkit" &&
        configurationCategories.has(finding.category) &&
        finding.severity === "error"
    );
    expect(nonWeatherErrors).toEqual([]);
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
    await expect(
      auditProjectConfiguration({
        project_root: join(root, "missing-private-name"),
        capability_ids: ["healthkit"],
        platform: "iOS"
      })
    ).rejects.toThrow("project_root must be an existing readable directory");
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
