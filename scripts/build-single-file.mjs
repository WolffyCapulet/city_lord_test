import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const root = process.cwd();

const indexPath = path.join(root, "index.html");
const cssPath = path.join(root, "styles.css");
const jsEntry = path.join(root, "js", "app", "main.js");
const outDir = path.join(root, "dist");
const outFile = path.join(outDir, "index.single.html");

function escapeScriptEnd(code) {
  return code.replace(/<\/script>/gi, "<\\/script>");
}

async function main() {
  const [html, css] = await Promise.all([
    readFile(indexPath, "utf8"),
    readFile(cssPath, "utf8")
  ]);

  const jsResult = await build({
    entryPoints: [jsEntry],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    minify: false,
    charset: "utf8"
  });

  const bundledJs = jsResult.outputFiles[0].text;

  let output = html;

  output = output.replace(
    /<link\s+rel=["']stylesheet["']\s+href=["'][^"']*styles\.css["']\s*\/?>/i,
    `<style>\n${css}\n</style>`
  );

  output = output.replace(
    /<script\s+type=["']module["']\s+src=["'][^"']*js\/app\/main\.js["']\s*>\s*<\/script>/i,
    `<script>\n${escapeScriptEnd(bundledJs)}\n</script>`
  );

  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, output, "utf8");

  console.log(`Built: ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
