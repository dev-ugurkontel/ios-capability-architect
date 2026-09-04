import { lstat, open, readdir, realpath, type FileHandle } from "node:fs/promises";
import { constants, type Dirent } from "node:fs";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { findRecord } from "@/registry.js";
import type { CapabilityRecord, ProjectConfigurationAudit, ProjectConfigurationFinding } from "@/types.js";
import { comparePlatformVersions, parsePlatformVersion } from "@/version.js";

const MAX_FILES = 500;
const MAX_DIRECTORIES = 1_000;
const MAX_ENTRIES = 10_000;
const MAX_FILE_BYTES = 1_000_000;
const MAX_TOTAL_BYTES = 5_000_000;
const ignoredDirectories = new Set([
  ".build",
  ".derived-data",
  ".git",
  ".swiftpm",
  "Carthage",
  "DerivedData",
  "Pods",
  "node_modules"
]);

const exactConfigurationNames = new Set([
  "Package.swift",
  "PrivacyInfo.xcprivacy",
  "project.pbxproj",
  "project.yaml",
  "project.yml"
]);

interface ScannedConfigurationFile {
  path: string;
  content: string;
}

function isConfigurationFile(name: string): boolean {
  return exactConfigurationNames.has(name) || [".entitlements", ".plist", ".xcconfig"].includes(extname(name));
}

function normalizePath(path: string): string {
  return path.split(sep).join("/");
}

async function readBoundedText(
  handle: FileHandle,
  maximumBytes: number
): Promise<{ content: string; bytesRead: number } | undefined> {
  const buffer = Buffer.allocUnsafe(maximumBytes + 1);
  let offset = 0;
  while (offset < buffer.length) {
    const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  return offset > maximumBytes
    ? undefined
    : { content: buffer.subarray(0, offset).toString("utf8"), bytesRead: offset };
}

async function collectConfigurationFiles(projectRoot: string): Promise<{
  root: string;
  files: ScannedConfigurationFile[];
  skipped: string[];
}> {
  const absoluteRoot = resolve(projectRoot);
  let root: string;
  try {
    root = await realpath(absoluteRoot);
  } catch {
    throw new Error("project_root must be an existing readable directory");
  }
  let rootStat;
  try {
    rootStat = await lstat(root);
  } catch {
    throw new Error("project_root must be an existing readable directory");
  }
  if (!rootStat.isDirectory()) throw new Error("project_root must be a directory");

  const files: ScannedConfigurationFile[] = [];
  const skipped: string[] = [];
  let totalBytes = 0;
  let directoryCount = 0;
  let entryCount = 0;

  async function walk(directory: string): Promise<void> {
    if (
      files.length >= MAX_FILES ||
      totalBytes >= MAX_TOTAL_BYTES ||
      directoryCount >= MAX_DIRECTORIES ||
      entryCount >= MAX_ENTRIES
    )
      return;
    directoryCount += 1;
    let entries: Dirent[];
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      skipped.push(`${normalizePath(relative(root, directory)) || "."} (unreadable directory)`);
      return;
    }
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      entryCount += 1;
      if (
        files.length >= MAX_FILES ||
        totalBytes >= MAX_TOTAL_BYTES ||
        directoryCount >= MAX_DIRECTORIES ||
        entryCount >= MAX_ENTRIES
      )
        break;
      if (entry.isSymbolicLink()) {
        skipped.push(`${normalizePath(relative(root, join(directory, entry.name)))} (symlink)`);
        continue;
      }
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) await walk(join(directory, entry.name));
        continue;
      }
      if (!entry.isFile() || !isConfigurationFile(entry.name)) continue;

      const absolutePath = join(directory, entry.name);
      let canonicalPath: string;
      try {
        canonicalPath = await realpath(absolutePath);
      } catch {
        skipped.push(`${normalizePath(relative(root, absolutePath))} (unreadable file)`);
        continue;
      }
      if (canonicalPath !== root && !canonicalPath.startsWith(`${root}${sep}`)) {
        skipped.push(`${normalizePath(relative(root, absolutePath))} (outside root)`);
        continue;
      }
      const relativePath = normalizePath(relative(root, canonicalPath));
      let handle: FileHandle;
      try {
        handle = await open(absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW);
      } catch {
        skipped.push(`${relativePath} (unreadable file or symlink race)`);
        continue;
      }
      try {
        const stat = await handle.stat();
        if (!stat.isFile()) {
          skipped.push(`${relativePath} (not a regular file)`);
          continue;
        }
        const maximumBytes = Math.min(MAX_FILE_BYTES, MAX_TOTAL_BYTES - totalBytes);
        if (stat.size > maximumBytes) {
          skipped.push(`${relativePath} (size limit)`);
          continue;
        }
        const boundedText = await readBoundedText(handle, maximumBytes);
        if (boundedText === undefined) {
          skipped.push(`${relativePath} (size limit)`);
          continue;
        }
        files.push({ path: relativePath, content: boundedText.content });
        totalBytes += boundedText.bytesRead;
      } catch {
        skipped.push(`${relativePath} (unreadable file)`);
      } finally {
        await handle.close();
      }
    }
  }

  await walk(root);
  if (files.length >= MAX_FILES) skipped.push(`file limit reached (${MAX_FILES})`);
  if (directoryCount >= MAX_DIRECTORIES) skipped.push(`directory limit reached (${MAX_DIRECTORIES})`);
  if (entryCount >= MAX_ENTRIES) skipped.push(`entry limit reached (${MAX_ENTRIES})`);
  if (totalBytes >= MAX_TOTAL_BYTES) skipped.push(`total byte limit reached (${MAX_TOTAL_BYTES})`);
  return { root, files, skipped };
}

function evidenceFor(files: ScannedConfigurationFile[], needles: string[]): string[] {
  const normalizedNeedles = needles.map((value) => value.toLocaleLowerCase("en-US"));
  return files
    .filter(({ content }) => {
      const normalizedContent = content.toLocaleLowerCase("en-US");
      return normalizedNeedles.every((needle) => {
        const escapedNeedle = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(?:^|[^A-Za-z0-9_.-])${escapedNeedle}(?=$|[^A-Za-z0-9_.-])`).test(normalizedContent);
      });
    })
    .map(({ path }) => path);
}

const machineConfigurationKeyPattern =
  /^(?:com\.apple\.(?:developer|maps|security)\.[A-Za-z0-9.-]+|aps-environment|geo-navigation|keychain-access-groups|BGTaskSchedulerPermittedIdentifiers|CFBundle[A-Za-z0-9]+|UIBackgroundModes|MK[A-Za-z0-9]+|NS[A-Za-z0-9]+|ITS[A-Za-z0-9]+)(?=$|[\s:])/;
const conditionalConfigurationPattern =
  /\s+(?:only\s+(?:as|for|when)|when\s+(?:browsing|justified)|for\s+(?:local-network\s+access|remote\s+(?:change\s+delivery|notifications))|as\s+provisioning-managed|according\s+to|with\s+[A-Za-z0-9-]+\s+entries\s+for)\b/i;

function parseConfigurationRequirement(value: string): { needles: string[]; conditional: boolean } {
  const conditional = conditionalConfigurationPattern.test(value);
  const machineKey = machineConfigurationKeyPattern.exec(value)?.[0];
  if (machineKey) {
    const needles = [machineKey];
    if (machineKey === "UIBackgroundModes") {
      const backgroundMode = /^UIBackgroundModes:\s*([A-Za-z0-9.-]+)/.exec(value)?.[1];
      if (backgroundMode) needles.push(backgroundMode);
    }
    if (machineKey === "com.apple.developer.associated-domains") {
      const domainService = /\s+with\s+([A-Za-z0-9-]+)\s+entries\b/i.exec(value)?.[1];
      if (domainService) needles.push(domainService);
    }
    return { needles, conditional };
  }

  return {
    needles: [
      value
        .replace(/\s+only\s+(?:for|when)\s+.*$/i, "")
        .replace(/\s+for\s+remote\s+(?:change\s+delivery|notifications)\s*$/i, "")
        .trim()
    ],
    conditional
  };
}

const deploymentTargetConfiguration: Record<string, { buildSetting: string; xcodegenPlatform: string }> = {
  iOS: { buildSetting: "IPHONEOS_DEPLOYMENT_TARGET", xcodegenPlatform: "iOS" },
  iPadOS: { buildSetting: "IPHONEOS_DEPLOYMENT_TARGET", xcodegenPlatform: "iOS" },
  "Mac Catalyst": { buildSetting: "IPHONEOS_DEPLOYMENT_TARGET", xcodegenPlatform: "iOS" },
  watchOS: { buildSetting: "WATCHOS_DEPLOYMENT_TARGET", xcodegenPlatform: "watchOS" },
  tvOS: { buildSetting: "TVOS_DEPLOYMENT_TARGET", xcodegenPlatform: "tvOS" },
  visionOS: { buildSetting: "XROS_DEPLOYMENT_TARGET", xcodegenPlatform: "visionOS" },
  macOS: { buildSetting: "MACOSX_DEPLOYMENT_TARGET", xcodegenPlatform: "macOS" }
};

function deploymentTargets(
  files: ScannedConfigurationFile[],
  platform: string
): Array<{ version: string; path: string }> {
  const results: Array<{ version: string; path: string }> = [];
  const configuration = deploymentTargetConfiguration[platform];
  if (!configuration) return results;
  const patterns = [
    new RegExp(`${configuration.buildSetting}\\s*=\\s*["']?(\\d+(?:\\.\\d+){0,2})`, "g"),
    new RegExp(
      `deploymentTarget\\s*:\\s*\\{[^}]*${configuration.xcodegenPlatform}\\s*:\\s*["']?(\\d+(?:\\.\\d+){0,2})`,
      "gs"
    ),
    new RegExp(`^\\s*${configuration.xcodegenPlatform}\\s*:\\s*["']?(\\d+(?:\\.\\d+){0,2})["']?\\s*$`, "gm")
  ];
  for (const file of files) {
    if (!/[.]pbxproj$|project[.]ya?ml$|[.]xcconfig$/.test(file.path)) continue;
    for (const pattern of patterns) {
      for (const match of file.content.matchAll(pattern)) {
        if (match[1]) results.push({ version: match[1], path: file.path });
      }
    }
  }
  return results.filter(
    (target, index, all) =>
      all.findIndex((candidate) => candidate.version === target.version && candidate.path === target.path) === index
  );
}

function finding(
  input: Omit<ProjectConfigurationFinding, "evidence"> & { evidence?: string[] }
): ProjectConfigurationFinding {
  return { ...input, evidence: input.evidence ?? [] };
}

function addConfigurationFindings(
  findings: ProjectConfigurationFinding[],
  files: ScannedConfigurationFile[],
  record: CapabilityRecord,
  category: ProjectConfigurationFinding["category"],
  values: string[],
  knowledgeField: keyof CapabilityRecord["knowledge_state"]["fields"]
): void {
  if (record.knowledge_state.fields[knowledgeField] === "unknown") return;

  for (const value of values) {
    const requirement = parseConfigurationRequirement(value);
    const evidence = evidenceFor(files, requirement.needles);
    const requiresManualReview = category === "managed_entitlement";
    const manualWhenMissing = category === "xcode_capability" || requirement.conditional;
    findings.push(
      finding({
        capability_id: record.id,
        category,
        requirement: value,
        status: requiresManualReview
          ? "manual_review"
          : evidence.length > 0
            ? "detected"
            : manualWhenMissing
              ? "manual_review"
              : "not_detected",
        severity: requiresManualReview
          ? "warning"
          : evidence.length > 0
            ? "info"
            : manualWhenMissing
              ? "warning"
              : "error",
        evidence,
        recommendation: requiresManualReview
          ? "Confirm Apple approval and provisioning for the app and every applicable extension; source files cannot prove managed-entitlement access."
          : evidence.length > 0
            ? "Confirm the value is attached to every intended target and configuration."
            : manualWhenMissing
              ? requirement.conditional
                ? `Confirm whether this conditional ${category.replaceAll("_", " ")} applies; when it does, add or generate it and verify the built target.`
                : "Confirm this Signing & Capabilities setting in the generated target; native project files may represent it through entitlements instead of the display name."
              : `Add or generate the required ${category.replaceAll("_", " ")} value, then verify the built target.`
      })
    );
  }
}

export async function auditProjectConfiguration(input: {
  project_root: string;
  capability_ids: string[];
  platform: string;
}): Promise<ProjectConfigurationAudit> {
  const scanned = await collectConfigurationFiles(input.project_root);
  const records = await Promise.all(input.capability_ids.map((id) => findRecord(id)));
  const unknown = input.capability_ids.filter((_, index) => !records[index]);
  if (unknown.length > 0) throw new Error(`Unknown capabilities: ${unknown.join(", ")}`);

  const findings: ProjectConfigurationFinding[] = [];
  for (const record of records.filter((value): value is CapabilityRecord => Boolean(value))) {
    const auditedFields = [
      "entitlements",
      "xcode_capabilities",
      "managed_entitlements",
      "info_plist_keys",
      "background_modes",
      "privacy_manifest_requirements",
      "minimum_os_version"
    ] as const;
    const unknownFields = auditedFields.filter((field) => record.knowledge_state.fields[field] === "unknown");
    if (unknownFields.length > 0) {
      findings.push(
        finding({
          capability_id: record.id,
          category: "registry_evidence",
          requirement: `Unverified fields: ${unknownFields.join(", ")}`,
          status: "unknown",
          severity: "warning",
          recommendation: "Research these registry fields before interpreting absent source configuration as safe."
        })
      );
    }
    const unsupportedPlatform =
      record.knowledge_state.fields.platforms !== "unknown" && !record.platforms.includes(input.platform);
    const unavailableOnPlatform =
      record.knowledge_state.fields.minimum_os_version !== "unknown" &&
      record.minimum_os_version[input.platform] === null;
    if (unsupportedPlatform || unavailableOnPlatform) continue;
    addConfigurationFindings(findings, scanned.files, record, "entitlement", record.entitlements, "entitlements");
    addConfigurationFindings(
      findings,
      scanned.files,
      record,
      "xcode_capability",
      record.xcode_capabilities,
      "xcode_capabilities"
    );
    addConfigurationFindings(
      findings,
      scanned.files,
      record,
      "managed_entitlement",
      record.managed_entitlements,
      "managed_entitlements"
    );
    addConfigurationFindings(
      findings,
      scanned.files,
      record,
      "info_plist_key",
      record.info_plist_keys,
      "info_plist_keys"
    );
    addConfigurationFindings(
      findings,
      scanned.files,
      record,
      "background_mode",
      record.background_modes,
      "background_modes"
    );

    if (
      record.knowledge_state.fields.privacy_manifest_requirements !== "unknown" &&
      record.privacy_manifest_requirements.length > 0
    ) {
      const privacyFiles = scanned.files
        .filter(({ path }) => basename(path) === "PrivacyInfo.xcprivacy")
        .map(({ path }) => path);
      const explicitlyRequiresManifest = record.privacy_manifest_requirements.some((requirement) =>
        requirement.includes("PrivacyInfo.xcprivacy")
      );
      findings.push(
        finding({
          capability_id: record.id,
          category: "privacy_manifest",
          requirement: record.privacy_manifest_requirements.join("; "),
          status: privacyFiles.length > 0 ? "detected" : explicitlyRequiresManifest ? "not_detected" : "manual_review",
          severity: privacyFiles.length > 0 ? "info" : "warning",
          evidence: privacyFiles,
          recommendation:
            privacyFiles.length > 0
              ? "Audit the manifest declarations against the app and every bundled SDK; file presence alone is not correctness."
              : explicitlyRequiresManifest
                ? "Add a reviewed PrivacyInfo.xcprivacy declaration when the app or included SDK uses covered APIs."
                : "Review App Store privacy disclosures and bundled SDK manifests; this source scan cannot prove disclosure correctness."
        })
      );
    }
  }

  const targets = deploymentTargets(scanned.files, input.platform);
  for (const record of records.filter((value): value is CapabilityRecord => Boolean(value))) {
    if (record.knowledge_state.fields.platforms !== "unknown" && !record.platforms.includes(input.platform)) {
      findings.push(
        finding({
          capability_id: record.id,
          category: "deployment_target",
          requirement: `${record.name} is not listed as supported on ${input.platform}`,
          status: "incompatible",
          severity: "error",
          recommendation: `Remove ${record.name} from the ${input.platform} target or choose a reviewed alternative that supports this platform.`
        })
      );
      continue;
    }
    if (record.knowledge_state.fields.minimum_os_version === "unknown") continue;
    const minimum = record.minimum_os_version[input.platform];
    if (minimum === undefined) continue;
    if (minimum === null) {
      findings.push(
        finding({
          capability_id: record.id,
          category: "deployment_target",
          requirement: `${record.name} has no usable capability on ${input.platform}`,
          status: "incompatible",
          severity: "error",
          recommendation: `Remove ${record.name} from the ${input.platform} target or choose a supported alternative; changing the deployment target cannot make this profile available.`
        })
      );
      continue;
    }
    const minimumVersion = parsePlatformVersion(minimum);
    if (!minimumVersion) continue;
    if (targets.length === 0) {
      findings.push(
        finding({
          capability_id: record.id,
          category: "deployment_target",
          requirement: `${input.platform} ${minimum} or later`,
          status: "unknown",
          severity: "warning",
          recommendation: "Declare and verify the deployment target in the source-of-truth project configuration."
        })
      );
      continue;
    }
    const incompatible = targets.filter(({ version }) => {
      const parsed = parsePlatformVersion(version);
      return parsed ? comparePlatformVersions(parsed, minimumVersion) < 0 : false;
    });
    findings.push(
      finding({
        capability_id: record.id,
        category: "deployment_target",
        requirement: `${input.platform} ${minimum} or later`,
        status: incompatible.length > 0 ? "incompatible" : "detected",
        severity: incompatible.length > 0 ? "error" : "info",
        evidence: (incompatible.length > 0 ? incompatible : targets).map(({ path, version }) => `${path}: ${version}`),
        recommendation:
          incompatible.length > 0
            ? `Raise the affected deployment target to ${minimum} or add an availability-gated fallback.`
            : "Retain runtime availability checks for eligible OS and hardware combinations."
      })
    );
  }

  const counts = findings.reduce(
    (summary, item) => {
      summary[item.status] += 1;
      return summary;
    },
    { detected: 0, not_detected: 0, incompatible: 0, manual_review: 0, unknown: 0 }
  );

  return {
    project_root: ".",
    scanned_files: scanned.files.map(({ path }) => path),
    skipped_entries: scanned.skipped,
    selected_capabilities: input.capability_ids,
    platform: input.platform,
    findings,
    summary: counts,
    limitations: [
      "This is a source audit, not proof of the generated Xcode target, App ID, provisioning profile, or Apple approval.",
      "Build-setting indirection, generated files, custom scripts, and per-configuration overrides require generated-project inspection.",
      "The tool never returns file contents and does not follow symbolic links."
    ]
  };
}
