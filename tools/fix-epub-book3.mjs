#!/usr/bin/env node
// Patches Calibre's lowercase 'titlepage.xhtml' references in book-3 EPUB and
// repackages so 'mimetype' is the first entry and stored (uncompressed).
// Uses yauzl to read and yazl to write so we control entry order exactly.
// Usage: node tools/fix-epub-book3.mjs <in.epub> [out.epub]
import { createWriteStream, statSync, readFileSync } from "node:fs";
import { promisify } from "node:util";
import yauzl from "yauzl";
import yazl from "yazl";

const inPath = process.argv[2];
const outPath = process.argv[3] || inPath.replace(/\.epub$/, ".fixed.epub");
if (!inPath) { console.error("usage: node fix-epub-book3.mjs <in.epub> [out.epub]"); process.exit(2); }

// --- Read all entries from the source zip into memory, preserving order ---
const openZip = promisify(yauzl.open);
const zip = await openZip(inPath, { lazyEntries: true });
const entries = []; // { name, buf }
await new Promise((resolve, reject) => {
  zip.on("error", reject);
  zip.on("end", resolve);
  zip.on("entry", (entry) => {
    if (/\/$/.test(entry.fileName)) { zip.readEntry(); return; } // skip dirs
    zip.openReadStream(entry, (err, rs) => {
      if (err) return reject(err);
      const chunks = [];
      rs.on("data", c => chunks.push(c));
      rs.on("end", () => { entries.push({ name: entry.fileName, buf: Buffer.concat(chunks) }); zip.readEntry(); });
      rs.on("error", reject);
    });
  });
  zip.readEntry();
});

const opfIdx = entries.findIndex(e => e.name === "OEBPS/content.opf");
if (opfIdx < 0) { console.error("OEBPS/content.opf not found"); process.exit(1); }
let opf = entries[opfIdx].buf.toString("utf8");
const beforeLen = opf.length;

// 1. Drop orphan manifest item pointing at non-existent lowercase file
opf = opf.replace(
  /\s*<item href="Text\/titlepage\.xhtml" id="titlepage" media-type="application\/xhtml\+xml" \/>/,
  ""
);
// 2. Drop matching spine itemref
opf = opf.replace(/\s*<itemref idref="titlepage" \/>/, "");
// 3. Repoint guide cover reference at the real Titlepage.xhtml
opf = opf.replace(
  /<reference href="Text\/titlepage\.xhtml" title="Cover" type="cover" \/>/,
  '<reference href="Text/Titlepage.xhtml" title="Cover" type="cover" />'
);

if (opf.length === beforeLen) { console.error("No patches applied — patterns didn't match. Aborting."); process.exit(1); }
if (/titlepage\.xhtml/.test(opf) && !/Titlepage\.xhtml/.test(opf.match(/titlepage\.xhtml/i)[0])) {
  // sanity check (case-sensitive scan)
}
const remainingLowercase = (opf.match(/titlepage\.xhtml/g) || []).filter(m => m === "titlepage.xhtml");
if (remainingLowercase.length > 0) { console.error(`Still ${remainingLowercase.length} lowercase 'titlepage.xhtml' refs after patch`); process.exit(1); }

// Rebuild the zip with yazl. mimetype MUST be first and stored uncompressed.
const zfile = new yazl.ZipFile();
const writeOut = new Promise((resolve, reject) => {
  zfile.outputStream.pipe(createWriteStream(outPath))
    .on("close", resolve)
    .on("error", reject);
});

// 1. mimetype first, stored
const mimeBuf = entries.find(e => e.name === "mimetype").buf;
zfile.addBuffer(mimeBuf, "mimetype", { compress: false });

// 2. Everything else in original order, with the patched OPF substituted
for (const e of entries) {
  if (e.name === "mimetype") continue;
  const buf = e.name === "OEBPS/content.opf" ? Buffer.from(opf, "utf8") : e.buf;
  zfile.addBuffer(buf, e.name, { compress: true });
}
zfile.end();
await writeOut;

const sz = statSync(outPath).size;
console.log(`Wrote ${outPath} (${sz} bytes)`);

// Verify first entry
const verify = readFileSync(outPath);
const method = verify.readUInt16LE(8);
const fnameLen = verify.readUInt16LE(26);
const fname = verify.slice(30, 30 + fnameLen).toString("ascii");
console.log(`First entry: '${fname}' compression method=${method} (must be 'mimetype' and 0)`);
if (fname !== "mimetype" || method !== 0) { console.error("FAILED: mimetype not first/stored"); process.exit(1); }
console.log("OK — mimetype is first and stored.");
