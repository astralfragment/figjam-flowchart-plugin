import { readFileSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const uiHtml = readFileSync(path.join(root, "dist", "ui.html"), "utf8");

await build({
  entryPoints: [path.join(root, "src", "main", "fragmentFlowPlugin.ts")],
  bundle: true,
  platform: "browser",
  format: "iife",
  target: ["es2017"],
  outfile: path.join(root, "dist", "fragment-flow.js"),
  define: {
    __UI_HTML__: JSON.stringify(uiHtml)
  }
});

console.log("Built dist/fragment-flow.js with inlined UI HTML");
