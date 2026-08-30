import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("technology taxonomy", () => {
  it("covers the requested Apple ecosystem without treating examples as verified records", async () => {
    const url = new URL("../data/taxonomy.json", import.meta.url);
    const taxonomy = JSON.parse(await readFile(url, "utf8")) as {
      description: string;
      categories: Array<{ id: string; examples: string[] }>;
    };
    expect(taxonomy.categories.length).toBeGreaterThanOrEqual(30);
    expect(new Set(taxonomy.categories.map((category) => category.id)).size).toBe(taxonomy.categories.length);
    expect(taxonomy.description).toContain("cannot produce recommendations");
    expect(taxonomy.categories.every((category) => category.examples.length > 0)).toBe(true);
  });
});
