export type PlatformVersion = readonly number[];

export function parsePlatformVersion(value: string | undefined): PlatformVersion | undefined {
  if (!value) return undefined;
  const match = /\d+(?:\.\d+){0,2}/.exec(value.trim());
  if (!match) return undefined;
  return match[0].split(".").map(Number);
}

export function comparePlatformVersions(left: PlatformVersion, right: PlatformVersion): number {
  const componentCount = Math.max(left.length, right.length);
  for (let index = 0; index < componentCount; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
