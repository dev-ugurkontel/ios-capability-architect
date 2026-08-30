import { mkdir } from "node:fs/promises";
import { build } from "esbuild";

await mkdir(new URL("../bundle", import.meta.url), { recursive: true });
await build({
  entryPoints: [new URL("../src/server.ts", import.meta.url).pathname],
  outfile: new URL("../bundle/server.mjs", import.meta.url).pathname,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  packages: "bundle",
  sourcemap: false,
  minify: false,
  legalComments: "none"
});
