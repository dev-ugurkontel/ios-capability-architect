import {
  lstat as realLstat,
  mkdir,
  mkdtemp,
  open as realOpen,
  readdir as realReaddir,
  realpath as resolveRealpath,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { auditProjectConfiguration } from "@/project-audit.js";
import { findRecord } from "@/registry.js";
import type { CapabilityRecord } from "@/types.js";

const temporaryRoots: string[] = [];

async function temporaryProject(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "ios-capability-architect-boundary-"));
  temporaryRoots.push(root);
  return root;
}

interface ScanHandle {
  read(buffer: Buffer, offset: number, length: number, position: number): Promise<{ bytesRead: number }>;
  stat(): Promise<{ isFile(): boolean; size: number }>;
  close(): Promise<void>;
}

function fakeHandle(overrides: Partial<ScanHandle>): ScanHandle {
  return {
    close: async () => undefined,
    read: async () => ({ bytesRead: 0 }),
    stat: async () => ({ isFile: () => true, size: 0 }),
    ...overrides
  };
}

async function scan(root: string, dependencies: Parameters<typeof auditProjectConfiguration>[1] = {}) {
  return auditProjectConfiguration({ project_root: root, capability_ids: [], platform: "iOS" }, dependencies);
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("bounded project-audit scanner", () => {
  it("reports root metadata and directory read failures without leaking absolute paths", async () => {
    const root = await temporaryProject();

    await expect(
      scan(root, {
        fileSystem: {
          lstat: async () => {
            throw new Error("simulated lstat race");
          }
        }
      })
    ).rejects.toThrow("project_root must be an existing readable directory");

    const unreadableRoot = await scan(root, {
      fileSystem: {
        readdir: async () => {
          throw new Error("simulated directory read failure");
        }
      }
    });
    expect(unreadableRoot.skipped_entries).toEqual([". (unreadable directory)"]);

    await mkdir(join(root, "Nested"));
    const unreadableNested = await scan(root, {
      fileSystem: {
        readdir: async (path, options) => {
          if (path.endsWith("/Nested")) throw new Error("simulated nested directory race");
          return realReaddir(path, options);
        }
      }
    });
    expect(unreadableNested.skipped_entries).toContain("Nested (unreadable directory)");
  });

  it("handles every file-system race and size defense deterministically", async () => {
    const root = await temporaryProject();
    const outside = await temporaryProject();
    for (const name of ["A.plist", "B.plist", "C.plist", "D.plist", "E.plist", "F.plist"]) {
      await writeFile(join(root, name), "x");
    }
    await writeFile(join(root, "G.plist"), "01234567890");

    let fakeCloseCount = 0;
    const result = await scan(root, {
      limits: { maximumFileBytes: 10 },
      fileSystem: {
        realpath: async (path) => {
          if (path.endsWith("A.plist")) throw new Error("simulated realpath race");
          if (path.endsWith("B.plist")) return join(outside, "escaped.plist");
          return resolveRealpath(path);
        },
        open: async (path, flags) => {
          if (path.endsWith("C.plist")) throw new Error("simulated open race");
          if (path.endsWith("D.plist")) {
            return fakeHandle({
              stat: async () => ({ isFile: () => false, size: 1 }),
              close: async () => {
                fakeCloseCount += 1;
              }
            });
          }
          if (path.endsWith("E.plist")) {
            return fakeHandle({
              stat: async () => ({ isFile: () => true, size: 1 }),
              read: async (buffer) => {
                buffer.fill(120);
                return { bytesRead: buffer.length };
              },
              close: async () => {
                fakeCloseCount += 1;
              }
            });
          }
          if (path.endsWith("F.plist")) {
            return fakeHandle({
              stat: async () => ({ isFile: () => true, size: 1 }),
              read: async () => {
                throw new Error("simulated read race");
              },
              close: async () => {
                fakeCloseCount += 1;
              }
            });
          }
          return realOpen(path, flags);
        }
      }
    });

    expect(result.skipped_entries).toEqual([
      "A.plist (unreadable file)",
      "B.plist (outside root)",
      "C.plist (unreadable file or symlink race)",
      "D.plist (not a regular file)",
      "E.plist (size limit)",
      "F.plist (unreadable file)",
      "G.plist (size limit)"
    ]);
    expect(fakeCloseCount).toBe(3);
  });

  it("enforces and reports each independent scan budget", async () => {
    const fileRoot = await temporaryProject();
    await writeFile(join(fileRoot, "A.plist"), "a");
    await writeFile(join(fileRoot, "B.plist"), "b");
    expect((await scan(fileRoot, { limits: { maximumFiles: 1 } })).skipped_entries).toContain("file limit reached (1)");

    const byteRoot = await temporaryProject();
    await writeFile(join(byteRoot, "A.plist"), "a");
    await writeFile(join(byteRoot, "B.plist"), "b");
    expect((await scan(byteRoot, { limits: { maximumTotalBytes: 1 } })).skipped_entries).toContain(
      "total byte limit reached (1)"
    );

    const directoryRoot = await temporaryProject();
    await writeFile(join(directoryRoot, "A.plist"), "a");
    await mkdir(join(directoryRoot, "Nested"));
    expect((await scan(directoryRoot, { limits: { maximumDirectories: 1 } })).skipped_entries).toContain(
      "directory limit reached (1)"
    );

    const entryRoot = await temporaryProject();
    await writeFile(join(entryRoot, "A.plist"), "a");
    await writeFile(join(entryRoot, "B.plist"), "b");
    expect((await scan(entryRoot, { limits: { maximumEntries: 1 } })).skipped_entries).toContain(
      "entry limit reached (1)"
    );
  });

  it("defends against unsupported platforms and incomplete or malformed registry records", async () => {
    const root = await temporaryProject();
    const sourceRecord = await findRecord("healthkit");
    expect(sourceRecord).toBeDefined();
    const record = sourceRecord as CapabilityRecord;

    const unsupported = await auditProjectConfiguration({
      project_root: root,
      capability_ids: ["healthkit"],
      platform: "unsupported"
    });
    expect(unsupported.findings).toContainEqual(
      expect.objectContaining({ category: "deployment_target", status: "incompatible" })
    );

    const unknownMinimum: CapabilityRecord = {
      ...record,
      knowledge_state: {
        ...record.knowledge_state,
        fields: { ...record.knowledge_state.fields, minimum_os_version: "unknown" }
      }
    };
    const unknown = await auditProjectConfiguration(
      { project_root: root, capability_ids: [record.id], platform: "iOS" },
      { findRecord: async () => unknownMinimum }
    );
    expect(unknown.findings).toContainEqual(
      expect.objectContaining({ category: "registry_evidence", status: "unknown" })
    );

    const malformedMinimum: CapabilityRecord = {
      ...record,
      minimum_os_version: { ...record.minimum_os_version, iOS: "not-a-version" },
      entitlements: ["com.apple.developer.associated-domains"],
      background_modes: ["UIBackgroundModes"],
      knowledge_state: {
        ...record.knowledge_state,
        fields: { ...record.knowledge_state.fields, background_modes: "verified_value" }
      }
    };
    const malformed = await auditProjectConfiguration(
      { project_root: root, capability_ids: [record.id], platform: "iOS" },
      { findRecord: async () => malformedMinimum }
    );
    expect(malformed.findings.some(({ category }) => category === "deployment_target")).toBe(false);
  });

  it("uses the default file-system adapter for ordinary files", async () => {
    const root = await temporaryProject();
    await writeFile(join(root, "Info.plist"), "<plist/>");
    const result = await scan(root, {
      fileSystem: {
        lstat: async (path) => realLstat(path)
      }
    });
    expect(result.scanned_files).toEqual(["Info.plist"]);
  });
});
