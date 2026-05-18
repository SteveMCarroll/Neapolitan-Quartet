---
layout: layouts/book.njk
title: "Storia del nuovo cognome"
description: "Book 2 of the Neapolitan Quartet — per-chapter summaries, character guide, and key Italian vocabulary."
permalink: /books/2-storia-del-nuovo-cognome/
---

<ul class="key-links">
  <li><a href="{{ '/books/2-storia-del-nuovo-cognome/characters/' | url }}">👥 Characters</a></li>
</ul>

<h2>Chapters</h2>
<p class="muted">125 chapters total. Linked numbers are written; dashed ones are still to come.</p>

{%- set urlMap = collections.chapters | chapterUrlMap(2) -%}
<ul class="chapter-list" role="list">
{%- for n in range(1, 126) -%}
  {%- set chUrl = urlMap[n] -%}
  {%- if chUrl -%}
    <li><a href="{{ chUrl | url }}">{{ n }}</a></li>
  {%- else -%}
    <li><a class="unwritten" href="#" aria-disabled="true" onclick="event.preventDefault()">{{ n }}</a></li>
  {%- endif -%}
{%- endfor -%}
</ul>

