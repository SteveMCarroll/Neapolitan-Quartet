import path from "node:path";

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/static": "static" });

  eleventyConfig.addGlobalData("site", {
    title: "Neapolitan Chapters",
    description:
      "Per-chapter English summaries, character guides, and key Italian vocabulary for Elena Ferrante's Neapolitan Quartet.",
  });

  // Look up a book by id. Accepts either the full books data object
  // ({ books: [...] }) or the inner array directly, so templates can call
  // `books | findBook(id)` or `books.books | findBook(id)` interchangeably.
  eleventyConfig.addFilter("findBook", (input, id) => {
    const arr = Array.isArray(input) ? input : input?.books;
    return arr?.find((b) => b.id === id) ?? null;
  });

  // Pretty "Part · Cap. N" label used in chapter footers.
  eleventyConfig.addShortcode("chapterLabel", function (book, part, chapter) {
    return `Book ${book} · ${part} · Cap. ${chapter}`;
  });

  // Collect every chapter page so book index pages can show "written so far".
  eleventyConfig.addCollection("chapters", (api) =>
    api
      .getFilteredByGlob("src/books/*/chapters/*.md")
      .sort((a, b) => {
        if (a.data.book !== b.data.book) return a.data.book - b.data.book;
        return a.data.chapter - b.data.chapter;
      }),
  );

  // Build { chapter -> url } map for one book so book index pages can render
  // "written vs not written" cleanly without nested-loop scoping headaches.
  eleventyConfig.addFilter("chapterUrlMap", (chapters, bookId) => {
    const map = {};
    for (const ch of chapters ?? []) {
      if (ch.data.book === bookId) map[ch.data.chapter] = ch.url;
    }
    return map;
  });

  // Group characters by their `group` frontmatter (family / role grouping).
  eleventyConfig.addFilter("groupCharacters", (characters, bookId) => {
    const groups = new Map();
    for (const c of characters ?? []) {
      if (c.data.book !== bookId) continue;
      const key = c.data.group || "Other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    }
    // Preserve a stable display order: families first, then misc groups.
    const familyOrder = [
      "Cerullo", "Greco", "Carracci", "Peluso", "Cappuccio",
      "Sarratore", "Scanno", "Solara", "Spagnuolo", "Airota",
      "Insegnanti", "Altri personaggi", "Other",
    ];
    return familyOrder
      .filter((k) => groups.has(k))
      .concat([...groups.keys()].filter((k) => !familyOrder.includes(k)))
      .map((k) => ({ name: k, characters: groups.get(k) }));
  });

  // Collect every character page so book character indexes can list them.
  eleventyConfig.addCollection("characters", (api) =>
    api
      .getFilteredByGlob("src/books/*/characters/*.md")
      .filter((p) => !p.inputPath.endsWith("index.md"))
      .sort((a, b) => (a.data.name || "").localeCompare(b.data.name || "")),
  );

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"],
    pathPrefix: process.env.PATH_PREFIX || "/",
  };
}

