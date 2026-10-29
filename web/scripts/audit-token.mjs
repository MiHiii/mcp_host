// Token-absence audit (ADR-0009). Fails if a token value (or the env names that
// would indicate a token was baked in) appears in CLIENT build output:
//   - .next/static/  (client JS bundles + source maps)
//   - static SSR HTML (server-rendered .html pages under .next/server/app)
// Server-side chunks intentionally reference GATEWAY_TOKEN (that is the BFF
// proxy's job, U2) and are NOT scanned.
//
// Exit codes: 0 = PASS, 1 = FAIL (blocking CI gate).

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(fileURLToPath(new URL("..", import.meta.url)));
const buildDir = join(rootDir, ".next");

// Client-bundle leak indicators: the env name, or a literal Authorization header.
const FORBIDDEN_PATTERNS = [/GATEWAY_TOKEN/, /Authorization:\s*Bearer/i];

function walk(dir) {
  const results = [];
  if (!statSync(dir, { throwIfNoEntry: false })) return results;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      results.push(...walk(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function isClientArtifact(file) {
  const norm = file.replace(/\//g, sep);
  const inStatic = norm.includes(`${sep}static${sep}`);
  const isServerHtml = /\.[a-z]{0,6}\.html$/i.test(file) && !norm.includes(`${sep}static${sep}`);
  return inStatic || isServerHtml;
}

function main() {
  if (!statSync(buildDir, { throwIfNoEntry: false })) {
    console.log("audit:token: no .next build found — assuming PASS (run `npm run build` first).");
    process.exit(0);
  }

  const files = walk(buildDir);
  const hits = [];

  for (const file of files) {
    if (!isClientArtifact(file)) continue; // skip server chunks (token is legitimately there)
    const data = readFileSync(file, "utf8");
    for (const pattern of FORBIDDEN_PATTERNS) {
      if (pattern.test(data)) {
        hits.push({ file, pattern: String(pattern) });
        break;
      }
    }
  }

  if (hits.length > 0) {
    console.error("audit:token: FAIL — possible token leak in CLIENT build output:");
    for (const hit of hits) {
      console.error(`  ${hit.file} matched ${hit.pattern}`);
    }
    process.exit(1);
  }

  console.log("audit:token: PASS — no token-like value in CLIENT bundle output.");
  process.exit(0);
}

main();