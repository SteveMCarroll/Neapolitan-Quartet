---
layout: layouts/book.njk
title: "Storia di chi fugge e di chi resta"
description: "Book 3 of the Neapolitan Quartet — per-chapter summaries, character guide, and key Italian vocabulary."
permalink: /books/3-storia-di-chi-fugge-e-di-chi-resta/
---

<ul class="key-links">
  <li><a href="{{ '/books/3-storia-di-chi-fugge-e-di-chi-resta/characters/' | url }}">👥 Characters</a></li>
</ul>

<h2>Chapters</h2>
<p class="muted">123 chapters total, all under <em>Tempo di mezzo</em>. Linked numbers are written; dashed ones are still to come.</p>

{%- set urlMap = collections.chapters | chapterUrlMap(3) -%}
<ul class="chapter-list" role="list">
{%- for n in range(1, 124) -%}
  {%- set chUrl = urlMap[n] -%}
  {%- if chUrl -%}
    <li><a href="{{ chUrl | url }}">{{ n }}</a></li>
  {%- else -%}
    <li><a class="unwritten" href="#" aria-disabled="true" onclick="event.preventDefault()">{{ n }}</a></li>
  {%- endif -%}
{%- endfor -%}
</ul>
