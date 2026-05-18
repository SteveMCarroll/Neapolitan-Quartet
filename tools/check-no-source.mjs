#!/usr/bin/env node
// Copyright firewall: fails loudly if any forbidden path is tracked or staged.
//
// Forbidden patterns:
//   - Any *.epub
//   - Anything inside tools/source/
//   - Anything inside _epub_extract/
//
// These should all be excluded by .gitignore — this script is a defense in
// depth in case .gitignore is edited or someone runs `git add -f`. It's
// wired into the `npm run check` (called by build/dev) and into the GitHub
// Actions workflow as a pre-build step.

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const FORBIDDEN = [
  { label: "EPUB file", test: (p) => p.toLowerCase().endsWith(".epub") },
  { label: "extracted source text", test: (p) => p.replaceAll("\\", "/").startsWith("tools/source/") },
  { label: "expanded EPUB scratch dir", test: (p) => p.replaceAll("\\", "/").startsWith("_epub_extract/") },
];

function gitFiles(args) {
  try {
    return execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    // No git repo, or git unavailable — skip silently. The build itself doesn't need git.
    return null;
  }
}

if (!existsSync(".git")) {
  console.log("[check-no-source] no .git directory; skipping (CI or fresh clone).");
  process.exit(0);
}

const tracked = gitFiles("ls-files");
const staged = gitFiles("diff --cached --name-only");

if (tracked === null) {
  console.log("[check-no-source] git unavailable; skipping.");
  process.exit(0);
}

const candidates = new Set([...(tracked ?? []), ...(staged ?? [])]);
const violations = [];
for (const path of candidates) {
  for (const rule of FORBIDDEN) {
    if (rule.test(path)) {
      violations.push({ path, reason: rule.label });
    }
  }
}

if (violations.length) {
  console.error("\n[check-no-source] COPYRIGHT FIREWALL TRIPPED.");
  console.error("The following copyrighted source files are tracked or staged:");
  for (const v of violations) {
    console.error(`  - ${v.path}   (${v.reason})`);
  }
  console.error(
    "\nUnstage them (git rm --cached <path>) and ensure .gitignore covers them.",
  );
  console.error("Refusing to build/deploy.\n");
  process.exit(1);
}

console.log("[check-no-source] OK — no copyrighted source text in git.");
