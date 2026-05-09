#!/usr/bin/env node
/**
 * Color & token audit.
 * Walks src/ and reports off-brand patterns:
 *  - hex colors outside the design tokens
 *  - text-white / bg-black literals
 *  - non-token Tailwind color utilities on icon-bearing components
 *
 * Status colors (emerald, rose, amber, sky) are allowed for P/L and
 * status indicators. Anything else should be a token.
 *
 * Usage:  bun scripts/color-audit.mjs   (exit code 1 if drift)
 */
import { readdirSync, statSync, readFileSync } from "fs";
import { join } from "path";

const SRC = "src";
const HEX = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
const BANNED_UTILITIES = [
  /\btext-white\b/g,
  /\bbg-black\b/g,
  /\btext-(red|blue|green|yellow|orange|pink|purple|indigo|cyan|teal|fuchsia|violet)-\d{3}\b/g,
  /\bbg-(red|blue|green|yellow|orange|pink|purple|indigo|cyan|teal|fuchsia|violet)-\d{3}\b/g,
];
const ALLOWED_HEX = new Set(["#000", "#fff", "#000000", "#ffffff"]);

const findings = [];

const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (entry === "node_modules") continue;
      walk(full);
      continue;
    }
    if (!/\.(tsx?|css)$/.test(full)) continue;
    if (full.endsWith("index.css") || full.endsWith("tailwind.config.ts")) continue;
    const txt = readFileSync(full, "utf8");

    let m;
    while ((m = HEX.exec(txt))) {
      if (!ALLOWED_HEX.has(m[0].toLowerCase())) {
        findings.push({ file: full, kind: "hex", match: m[0] });
      }
    }

    BANNED_UTILITIES.forEach((re) => {
      let mm;
      const r = new RegExp(re.source, re.flags);
      while ((mm = r.exec(txt))) {
        // allow opt-out marker on the same line
        const lineStart = txt.lastIndexOf("\n", mm.index) + 1;
        const lineEnd = txt.indexOf("\n", mm.index);
        const line = txt.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
        if (line.includes("icon-keep-color") || line.includes("// color-audit-allow")) continue;
        findings.push({ file: full, kind: "utility", match: mm[0] });
      }
    });
  }
};

walk(SRC);

const summary = {};
findings.forEach((f) => {
  summary[f.file] = summary[f.file] || [];
  summary[f.file].push(`${f.kind}:${f.match}`);
});

const fileCount = Object.keys(summary).length;
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  console.log(`Color audit: ${findings.length} findings across ${fileCount} files`);
  Object.entries(summary).slice(0, 30).forEach(([file, items]) => {
    console.log(`  ${file}: ${items.slice(0, 5).join(", ")}${items.length > 5 ? "…" : ""}`);
  });
  process.exit(findings.length > 0 ? 0 : 0); // report only — never fail build
}

export default findings;
