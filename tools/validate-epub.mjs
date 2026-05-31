#!/usr/bin/env node
// Quick EPUB structural validator: checks the things LingQ-style strict importers
// actually care about (case-sensitive hrefs, manifest/spine/NCX consistency,
// XHTML well-formedness, mimetype). Not a full epubcheck replacement.
import { readFileSync } from "node:fs";
import { resolve, dirname, posix } from "node:path";
import AdmZip from "adm-zip";
import { XMLParser, XMLValidator } from "fast-xml-parser";

const epubPath = process.argv[2];
if (!epubPath) {
  console.error("usage: node validate-epub.mjs <file.epub>");
  process.exit(2);
}

const zip = new AdmZip(epubPath);
const entries = zip.getEntries();
const entryNames = entries.map(e => e.entryName);
const entrySet = new Set(entryNames);

const errors = [];
const warnings = [];

// 1. mimetype must be first entry, stored (not deflated), exactly "application/epub+zip"
if (entries[0].entryName !== "mimetype") errors.push(`First zip entry must be 'mimetype', got '${entries[0].entryName}'`);
const mimeBuf = entries[0].getData();
if (mimeBuf.toString("ascii") !== "application/epub+zip") errors.push(`mimetype content wrong: '${mimeBuf.toString("ascii")}'`);
// adm-zip doesn't easily expose compression method; check via header
const raw = readFileSync(epubPath);
const method = raw.readUInt16LE(8); // local file header compression method @ offset 8
if (method !== 0) errors.push(`mimetype must be stored (compression method 0), got ${method}`);

// 2. container.xml
if (!entrySet.has("META-INF/container.xml")) errors.push("Missing META-INF/container.xml");
const containerXml = zip.getEntry("META-INF/container.xml").getData().toString("utf8");
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" });
const container = parser.parse(containerXml);
const opfPath = container?.container?.rootfiles?.rootfile?.["@full-path"];
if (!opfPath) errors.push("container.xml missing rootfile full-path");
if (!entrySet.has(opfPath)) errors.push(`OPF path from container.xml not in zip: '${opfPath}'`);

// 3. Parse OPF
const opfDir = posix.dirname(opfPath);
const opfXml = zip.getEntry(opfPath).getData().toString("utf8");
const opfValid = XMLValidator.validate(opfXml);
if (opfValid !== true) errors.push(`OPF XML not well-formed: ${JSON.stringify(opfValid.err)}`);
const opf = parser.parse(opfXml);

const manifestItems = [].concat(opf.package.manifest.item);
const manifestById = new Map();
const manifestHrefs = new Set();
for (const it of manifestItems) {
  const id = it["@id"];
  const href = it["@href"];
  if (!id || !href) { errors.push(`Manifest item missing id or href: ${JSON.stringify(it)}`); continue; }
  manifestById.set(id, it);
  const fullPath = posix.normalize(posix.join(opfDir, href));
  manifestHrefs.add(fullPath);
  if (!entrySet.has(fullPath)) errors.push(`Manifest item href not in zip (CASE SENSITIVE): '${fullPath}'`);
}

const spineRefs = [].concat(opf.package.spine.itemref);
for (const r of spineRefs) {
  const idref = r["@idref"];
  if (!manifestById.has(idref)) errors.push(`Spine itemref '${idref}' not in manifest`);
}
const spineToc = opf.package.spine["@toc"];
if (spineToc) {
  if (!manifestById.has(spineToc)) errors.push(`spine toc='${spineToc}' not in manifest`);
  else if (manifestById.get(spineToc)["@media-type"] !== "application/x-dtbncx+xml") {
    errors.push(`spine toc item has wrong media-type: ${manifestById.get(spineToc)["@media-type"]}`);
  }
}

// 4. Guide references (this is where the case bug lives)
const guide = opf.package.guide;
if (guide) {
  const refs = [].concat(guide.reference);
  for (const r of refs) {
    const href = (r["@href"] || "").split("#")[0];
    if (!href) continue;
    const fullPath = posix.normalize(posix.join(opfDir, href));
    if (!entrySet.has(fullPath)) errors.push(`Guide reference href not in zip (CASE SENSITIVE): '${fullPath}' (type=${r["@type"]})`);
  }
}

// 5. NCX
if (spineToc && manifestById.has(spineToc)) {
  const ncxHref = manifestById.get(spineToc)["@href"];
  const ncxPath = posix.normalize(posix.join(opfDir, ncxHref));
  const ncxXml = zip.getEntry(ncxPath).getData().toString("utf8");
  const ncxValid = XMLValidator.validate(ncxXml);
  if (ncxValid !== true) errors.push(`NCX XML not well-formed: ${JSON.stringify(ncxValid.err)}`);
  else {
    const ncx = parser.parse(ncxXml);
    const ncxDir = posix.dirname(ncxPath);
    // Walk navPoints (recursive — they can nest)
    const walk = (node) => {
      const points = [].concat(node?.navPoint || []).filter(Boolean);
      for (const p of points) {
        const src = (p.content?.["@src"] || "").split("#")[0];
        if (src) {
          const fp = posix.normalize(posix.join(ncxDir, src));
          if (!entrySet.has(fp)) errors.push(`NCX navPoint content src not in zip (CASE SENSITIVE): '${fp}'`);
        }
        walk(p);
      }
    };
    walk(ncx.ncx.navMap);
  }
}

// 6. XHTML well-formedness for every spine item with media-type application/xhtml+xml
let xhtmlChecked = 0, xhtmlBad = 0;
for (const r of spineRefs) {
  const it = manifestById.get(r["@idref"]);
  if (!it) continue;
  if (it["@media-type"] !== "application/xhtml+xml") continue;
  const fp = posix.normalize(posix.join(opfDir, it["@href"]));
  const e = zip.getEntry(fp);
  if (!e) continue;
  const xml = e.getData().toString("utf8");
  const v = XMLValidator.validate(xml, { allowBooleanAttributes: true });
  xhtmlChecked++;
  if (v !== true) {
    xhtmlBad++;
    errors.push(`Spine XHTML not well-formed: ${fp} :: line ${v.err.line} col ${v.err.col}: ${v.err.msg}`);
  }
}

console.log(`Checked ${manifestItems.length} manifest items, ${spineRefs.length} spine refs, ${xhtmlChecked} XHTML files.`);
if (warnings.length) { console.log(`\n${warnings.length} WARNINGS:`); for (const w of warnings) console.log("  - " + w); }
if (errors.length) { console.log(`\n${errors.length} ERRORS:`); for (const e of errors) console.log("  - " + e); process.exit(1); }
console.log("\nNo structural errors found.");
