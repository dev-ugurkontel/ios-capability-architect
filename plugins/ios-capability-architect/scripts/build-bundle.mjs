import { mkdir } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import { build } from "esbuild";

await mkdir(new URL("../bundle", import.meta.url), { recursive: true });
await build({
  entryPoints: [fileURLToPath(new URL("../src/server.ts", import.meta.url))],
  outfile: fileURLToPath(new URL("../bundle/server.mjs", import.meta.url)),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  packages: "bundle",
  sourcemap: false,
  minify: false,
  legalComments: "external"
});
