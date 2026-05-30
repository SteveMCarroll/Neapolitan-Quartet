#!/usr/bin/env node
// Extract per-chapter Italian text from an EPUB into tools/source/<book>/NN.txt.
//
// Defaults to book 2 (Storia del nuovo cognome). Writes a manifest.json
// alongside the chapter files describing the part each chapter belongs to,
// so the chapter-generation step always knows which "Part" (Giovinezza,
// Maturità, …) a given numbered chapter sits in.
//
// IMPORTANT: this script writes ONLY under tools/source/, which is gitignored.
// Do not change the output path to live under src/ without also updating the
// .gitignore and the check-no-source.mjs allow list. We never want the raw
// Italian text to be committed.

import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import unzipper from "unzipper";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const BOOKS = {
  2: {
    slug: "book-2",
    epub: "storia_del_nuovo_cognome_ferrante_elena.epub",
    title: "Storia del nuovo cognome",
  },
  3: {
    slug: "book-3",
    epub: "Ferrante Elena - Storia di chi fugge e di chi resta.epub",
    title: "Storia di chi fugge e di chi resta",
  },
};

const bookId = Number(process.argv[2] ?? 2);
const cfg = BOOKS[bookId];
if (!cfg) {
  console.error(`No EPUB configured for book ${bookId}.`);
  process.exit(1);
}

const epubPath = path.join(ROOT, cfg.epub);
const outDir = path.join(ROOT, "tools", "source", cfg.slug);

async function readEpubFiles(epub) {
  const directory = await unzipper.Open.file(epub);
  const files = {};
  for (const entry of directory.files) {
    if (entry.type !== "File") continue;
    const buf = await entry.buffer();
    files[entry.path.replace(/\\/g, "/")] = buf.toString("utf8");
  }
  return files;
}

function stripTags(html) {
  return html
    .replace(/<\?xml[^>]*\?>/g, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/(p|div|h\d|li|br)>/gi, "\n")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function attrOfNavPoint(node) {
  const labelMatch = node.match(/<navLabel>\s*<text>([\s\S]*?)<\/text>/);
  const contentMatch = node.match(/<content\s+src="([^"]+)"/);
  return {
    label: labelMatch ? labelMatch[1].trim() : null,
    href: contentMatch ? contentMatch[1].trim() : null,
  };
}

function topLevelNavPoints(xml) {
  // Return top-level <navPoint>…</navPoint> blocks (depth-balanced).
  const out = [];
  let depth = 0;
  let start = -1;
  let i = 0;
  while (i < xml.length) {
    if (xml.startsWith("<navPoint", i)) {
      if (depth === 0) start = i;
      depth++;
      const end = xml.indexOf(">", i);
      i = end + 1;
      continue;
    }
    if (xml.startsWith("</navPoint>", i)) {
      depth--;
      if (depth === 0) {
        out.push(xml.slice(start, i + "</navPoint>".length));
        start = -1;
      }
      i += "</navPoint>".length;
      continue;
    }
    i++;
  }
  return out;
}

function childrenOf(node) {
  // Strip the outer <navPoint ...> wrapper plus the navLabel and content
  // header of this navPoint, then parse remaining top-level navPoints.
  const inner = node
    .replace(/^<navPoint\b[^>]*>/, "")
    .replace(/<\/navPoint>$/, "")
    .replace(/<navLabel>[\s\S]*?<\/navLabel>/, "")
    .replace(/<content\s[^>]*\/>/, "")
    .replace(/<content\s[^>]*>[\s\S]*?<\/content>/, "");
  return topLevelNavPoints(inner);
}

function parseToc(ncxXml) {
  // Returns a flat list of parts; each part has a label and the chapters
  // (numeric-labeled navPoints) belonging to it.
  //
  // Handles two TOC shapes:
  //   Nested (book 2): parts at top level, chapters as their children.
  //   Flat   (book 3): parts and chapters are all siblings at top level;
  //                    each numeric navPoint is assigned to the most recent
  //                    non-numeric navPoint above it.
  const parts = [];
  const navMapMatch = ncxXml.match(/<navMap>([\s\S]*?)<\/navMap>/);
  const navBody = navMapMatch ? navMapMatch[1] : ncxXml;

  let currentPart = null;
  for (const node of topLevelNavPoints(navBody)) {
    const { label, href } = attrOfNavPoint(node);
    const kids = childrenOf(node);
    const numericMatch = label && label.match(/^(\d+)\.?$/);

    if (kids.length > 0) {
      // Nested style: this is a part with chapter children.
      const chapters = [];
      for (const kid of kids) {
        const k = attrOfNavPoint(kid);
        const m = k.label && k.label.match(/^(\d+)\.?$/);
        if (m && k.href) chapters.push({ chapter: Number(m[1]), label: k.label, href: k.href });
      }
      parts.push({ part: label, href, chapters });
      currentPart = null;
    } else if (numericMatch && href) {
      // Flat style: chapter as top-level sibling. Attach to currentPart.
      if (!currentPart) {
        currentPart = { part: "(Parte unica)", href: null, chapters: [] };
        parts.push(currentPart);
      }
      currentPart.chapters.push({ chapter: Number(numericMatch[1]), label, href });
    } else {
      // Flat style: a non-numeric sibling — treat as a new part header.
      currentPart = { part: label, href, chapters: [] };
      parts.push(currentPart);
    }
  }
  return parts;
}

(async () => {
  console.log(`Extracting ${cfg.epub} → ${path.relative(ROOT, outDir)}`);
  await fs.mkdir(outDir, { recursive: true });

  const files = await readEpubFiles(epubPath);
  const ncxPath = Object.keys(files).find((k) => k.endsWith("toc.ncx"));
  if (!ncxPath) throw new Error("No toc.ncx in EPUB");
  const parts = parseToc(files[ncxPath]);

  const ncxDir = ncxPath.split("/").slice(0, -1).join("/");
  function resolveHref(href) {
    const cleaned = href.split("#")[0];
    const joined = ncxDir ? `${ncxDir}/${cleaned}` : cleaned;
    const segs = [];
    for (const seg of joined.split("/")) {
      if (seg === "" || seg === ".") continue;
      if (seg === "..") { segs.pop(); continue; }
      segs.push(seg);
    }
    return segs.join("/");
  }

  const manifest = { book: cfg.slug, title: cfg.title, parts: [] };
  let totalChapters = 0;
  for (const part of parts) {
    if (!part.chapters.length) continue;
    const partInfo = { name: part.part, chapters: [] };
    for (const ch of part.chapters) {
      const resolved = resolveHref(ch.href);
      const html = files[resolved];
      if (!html) {
        console.warn(`  ! missing file for chapter ${ch.chapter}: ${resolved}`);
        continue;
      }
      const text = stripTags(html);
      const padded = String(ch.chapter).padStart(3, "0");
      const filename = `${padded}.txt`;
      const header = `# ${cfg.title}\n# Part: ${part.part}\n# Chapter: ${ch.chapter}\n# Source: ${resolved}\n\n`;
      await fs.writeFile(path.join(outDir, filename), header + text + "\n", "utf8");
      partInfo.chapters.push({ chapter: ch.chapter, file: filename, words: text.split(/\s+/).length });
      totalChapters++;
    }
    manifest.parts.push(partInfo);
  }

  // Save the "Indice dei personaggi e cenni sulle vicende del primo volume"
  // recap section — safe book-1 spoilers, used to seed the character index.
  const indicePart = parts.find((p) => /indice|personaggi/i.test(p.part ?? ""));
  if (indicePart?.href) {
    const resolved = resolveHref(indicePart.href);
    const html = files[resolved];
    if (html) {
      const text = stripTags(html);
      await fs.writeFile(path.join(outDir, "_recap-book-1.txt"),
        `# ${cfg.title}\n# Section: ${indicePart.part}\n# Source: ${resolved}\n\n` + text + "\n", "utf8");
      manifest.recap = "_recap-book-1.txt";
    }
  }

  await fs.writeFile(
    path.join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );

  console.log(`  → wrote ${totalChapters} chapter file(s) across ${manifest.parts.length} part(s).`);
  if (manifest.recap) console.log(`  → wrote recap: ${manifest.recap}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
