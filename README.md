# Neapolitan Chapters

A LitCharts-style static site of per-chapter English summaries, character
guides, and key Italian vocabulary for Elena Ferrante's **Neapolitan
Quartet**. The site exists because LitCharts only covers book 1; this
project is for reading on your phone (in English) while you hold the
Italian book in your other hand.

The site is built with [Eleventy](https://www.11ty.dev/) and is deployed
to GitHub Pages.

---

## Two hard rules

### 1. The EPUB never gets committed

The Italian source text is **copyrighted**. AI-generated English
summaries and short vocab phrases pulled from the text are fair use;
the full text is not. To make a leak structurally hard:

- `.gitignore` excludes `*.epub`, `_epub_extract/`, and `tools/source/`.
- The extractor (`tools/extract-epub.mjs`) writes **only** into
  `tools/source/`, which is gitignored.
- `tools/check-no-source.mjs` is wired into `npm run build`, `npm run
  dev`, and the GitHub Actions workflow. It fails the build if any
  `.epub`, `tools/source/**`, or `_epub_extract/**` file is tracked or
  staged in git.

If you re-clone this repo, you re-drop your EPUB next to it and re-run
the extractor. The EPUB lives on your laptop only.

### 2. Book N pages know nothing about books N+1…4

A reader of book 2 must not be spoiled by the book 2 site for things
that happen in book 3 or 4. So:

- Character pages live under each book's own folder, e.g.
  `src/books/2-storia-del-nuovo-cognome/characters/nino-sarratore.md`.
  Book 3 will eventually get its own Nino page. Book 2's page never
  gets updated with book-3 knowledge.
- Chapter NN's summary only references events from chapters ≤ NN in
  the same book. Never any later book.
- The scaffolder (`tools/new-chapter.mjs`) hard-codes this rule into a
  comment at the top of every fresh chapter file.

When you (or any AI helper) work on chapter N of book B, **only** read
`tools/source/book-B/001.txt … NNN.txt` where NNN ≤ N. Do not read
ahead. Do not look at any other book's source.

---

## Layout

```
src/
├── _data/books.json              # all 4 books: titles, slugs, parts
├── _includes/layouts/            # base / book / chapter / character{,s} templates
├── css/style.css                 # mobile-first, prefers-color-scheme dark
├── index.md                      # home: 4 book cards
└── books/
    ├── 1-l-amica-geniale/        # placeholder — links out to LitCharts
    ├── 2-storia-del-nuovo-cognome/
    │   ├── index.md              # 125-chapter grid
    │   ├── characters/
    │   │   ├── index.md          # character index, grouped by family
    │   │   └── <slug>.md         # one per character
    │   └── chapters/
    │       └── NN.md             # one per chapter
    ├── 3-storia-di-chi-fugge-e-di-chi-resta/  # placeholder
    └── 4-storia-della-bambina-perduta/        # placeholder
tools/
├── extract-epub.mjs              # EPUB -> per-chapter .txt (gitignored)
├── new-chapter.mjs               # scaffold a chapter .md file
├── check-no-source.mjs           # copyright firewall
└── source/                       # GITIGNORED — extracted Italian text
```

## Local workflow

```bash
# one-time
npm install

# drop the EPUB next to the repo (whatever its filename is), then
npm run extract           # writes tools/source/book-2/001.txt … 125.txt

# add a new chapter
node tools/new-chapter.mjs 2 7
# now edit src/books/2-storia-del-nuovo-cognome/chapters/07.md
# while reading tools/source/book-2/001.txt … 007.txt only.

# preview
npm run dev               # http://localhost:8080

# production build
npm run build             # runs the firewall check, then 11ty
```

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`:

1. `npm ci`
2. `npm run check` — fail the build if the firewall trips.
3. Build with `PATH_PREFIX=/<repo>/` so links work on a Pages project
   site at `https://<user>.github.io/<repo>/`.
4. Upload artifact, deploy via `actions/deploy-pages@v4`.

The first push to `main` after enabling Pages on the repo (Settings →
Pages → Source: "GitHub Actions") will populate the site.

## Conventions

- Chapter source file: `chapters/NN.md` (zero-padded for sort order),
  with `chapter: <int>` (unpadded) in frontmatter. The permalink uses
  the unpadded number: `/books/<slug>/chapters/<n>/`.
- Character slugs are kebab-case: `elena-greco`, `nino-sarratore`.
- Frontmatter `characters: [slug, slug, ...]` on each chapter renders
  the "Characters in this chapter" chips.
- A character page's `group` frontmatter (e.g. `Cerullo`, `Greco`) is
  used by the character index for family-grouped lists.
- Summaries: 3–5 short paragraphs. Vocab: 8–20 row Italian/English/Note
  markdown table per chapter.
- No themes, motifs, literary devices, or quote-blocks. That's
  LitCharts' job. Plot summary + characters + vocab only.
