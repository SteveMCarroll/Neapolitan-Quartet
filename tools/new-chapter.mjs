#!/usr/bin/env node
// tools/new-chapter.mjs
//
// Scaffold a chapter markdown file for one book.
//
// Usage:
//   node tools/new-chapter.mjs <book> <chapter> [--title "Short title"]
//
// Example:
//   node tools/new-chapter.mjs 2 7
//
// IMPORTANT — spoiler rule for whoever is filling this in (human or AI):
//   When you write the summary for chapter N of book B, you must ONLY read
//     tools/source/book-B/001.txt ... NNN.txt
//   where NNN <= N. Do NOT read any chapter NNN > N, and do NOT read any
//   text from book B+1, B+2, ... — those will spoil events the reader has
//   not yet reached. The character page you cross-link from this chapter
//   must also reflect only what is known up through chapter N of book B.

import { readFile, writeFile, access, mkdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length < 2) {
    console.error(
      "usage: node tools/new-chapter.mjs <book> <chapter> [--title \"...\"]",
    );
    process.exit(2);
  }
  const book = Number.parseInt(args[0], 10);
  const chapter = Number.parseInt(args[1], 10);
  if (!Number.isInteger(book) || !Number.isInteger(chapter)) {
    console.error("book and chapter must both be integers");
    process.exit(2);
  }
  let title = null;
  for (let i = 2; i < args.length; i++) {
    if (args[i] === "--title" && i + 1 < args.length) {
      title = args[i + 1];
      i++;
    }
  }
  return { book, chapter, title };
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

async function loadBooks() {
  const raw = await readFile(
    path.join(repoRoot, "src", "_data", "books.json"),
    "utf8",
  );
  return JSON.parse(raw);
}

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const { book, chapter, title } = parseArgs(process.argv);
  const data = await loadBooks();
  const bookEntry = data.books.find((b) => b.id === book);
  if (!bookEntry) {
    console.error(`book ${book} not found in src/_data/books.json`);
    process.exit(1);
  }
  if (bookEntry.chapterCount && chapter > bookEntry.chapterCount) {
    console.error(
      `chapter ${chapter} is past book ${book}'s chapterCount (${bookEntry.chapterCount})`,
    );
    process.exit(1);
  }
  const part = bookEntry.parts?.find(
    (p) => chapter >= p.from && chapter <= p.to,
  );

  const chaptersDir = path.join(
    repoRoot,
    "src",
    "books",
    bookEntry.slug,
    "chapters",
  );
  await mkdir(chaptersDir, { recursive: true });

  const fileName = `${pad2(chapter)}.md`;
  const filePath = path.join(chaptersDir, fileName);

  if (await exists(filePath)) {
    console.error(`refusing to overwrite existing file: ${filePath}`);
    process.exit(1);
  }

  const sourceFile = path.join(
    repoRoot,
    "tools",
    "source",
    `book-${book}`,
    `${String(chapter).padStart(3, "0")}.txt`,
  );
  const sourceExists = await exists(sourceFile);

  const titleLine = title
    ? `title: "${title.replace(/"/g, '\\"')}"`
    : `title: "Chapter ${chapter}"`;
  const partLine = part ? `part: "${part.name}"\n` : "";

  const body = `---
chapter: ${chapter}
${titleLine}
${partLine}characters: []
---

<!--
  Spoiler rule: this summary must only draw on chapters 1..${chapter} of
  book ${book}. Do NOT read tools/source/book-${book}/${String(chapter + 1).padStart(3, "0")}.txt or later, and do
  NOT read any other book's source. The character chips below must link
  to character pages that themselves only know events up through this
  chapter.

  Italian source (gitignored, laptop-only):
    ${sourceExists ? path.relative(repoRoot, sourceFile) : "NOT FOUND — run npm run extract first"}
-->

## Summary

3–5 short paragraphs of detailed plot summary in English. Call out the
key beats so a phone reader can scan.

## Key vocabulary

| Italian | English | Note |
| --- | --- | --- |
| ... | ... | ... |
`;

  await writeFile(filePath, body, "utf8");
  console.log(`wrote ${path.relative(repoRoot, filePath)}`);
  if (!sourceExists) {
    console.warn(
      `warning: ${path.relative(repoRoot, sourceFile)} does not exist — run npm run extract first`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
