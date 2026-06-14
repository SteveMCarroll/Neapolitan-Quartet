---
layout: layouts/book.njk
title: "Storia della bambina perduta"
description: "Book 4 of the Neapolitan Quartet — per-chapter summaries, character guide, and key Italian vocabulary."
permalink: /books/4-storia-della-bambina-perduta/
---

{%- set book = books.books | findBook(4) -%}
<ul class="key-links">
  <li><a href="{{ '/books/4-storia-della-bambina-perduta/characters/' | url }}">👥 Characters</a></li>
</ul>

<h2>Chapters</h2>
<p class="muted">165 chapters across three parts. Numbers follow the book's own per-part numbering. Linked numbers are written; dashed ones are still to come.</p>

{%- set urlMap = collections.chapters | chapterUrlMap(4) -%}
{%- for part in book.parts -%}
  <h3 class="part-heading">{{ part.name }}</h3>
  <ul class="chapter-list" role="list">
  {%- for pc in range(1, part.to - part.from + 2) -%}
    {%- set g = part.from - 1 + pc -%}
    {%- set chUrl = urlMap[g] -%}
    {%- if chUrl -%}
      <li><a href="{{ chUrl | url }}">{{ pc }}</a></li>
    {%- else -%}
      <li><a class="unwritten" href="#" aria-disabled="true" onclick="event.preventDefault()">{{ pc }}</a></li>
    {%- endif -%}
  {%- endfor -%}
  </ul>
{%- endfor -%}
