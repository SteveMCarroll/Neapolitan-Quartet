---
layout: layouts/base.njk
title: "Home"
description: "Per-chapter English summaries, character guides, and key Italian vocabulary for Elena Ferrante's Neapolitan Quartet."
---

<section class="intro">
  <h1>The Neapolitan Quartet, chapter by chapter</h1>
  <p>
    A personal reading aid for Elena Ferrante's four-book series, built for
    reading on a phone while holding the Italian original. Each chapter
    gets an English summary, a slim character refresher scoped to that
    book, and a key Italian vocabulary list.
  </p>
  <p class="muted">
    Book 1 already has an excellent LitCharts guide — we link out instead
    of duplicating it. Books 2–4 are written here as they're read.
  </p>
</section>

<ol class="book-grid" role="list">
{%- for book in books.books -%}
  {%- if book.status == "placeholder" -%}
    <li><a class="book-card" href="{{ book.externalUrl }}" rel="noopener">
      <span class="book-card-number">Book {{ book.id }}</span>
      <span class="book-card-title-it">{{ book.italianTitle }}</span>
      <span class="book-card-title-en">{{ book.englishTitle }}</span>
      <span class="book-card-status">LitCharts ↗</span>
    </a></li>
  {%- else -%}
    <li><a class="book-card" href="{{ ('/books/' + book.slug + '/') | url }}">
      <span class="book-card-number">Book {{ book.id }}</span>
      <span class="book-card-title-it">{{ book.italianTitle }}</span>
      <span class="book-card-title-en">{{ book.englishTitle }}</span>
      <span class="book-card-status">
        {%- if book.status == "in-progress" -%}In progress
        {%- elif book.status == "not-started" -%}Not started yet
        {%- else -%}{{ book.status }}
        {%- endif -%}
      </span>
    </a></li>
  {%- endif -%}
{%- endfor -%}
</ol>
