---
layout: layouts/characters.njk
title: "Characters · Book 2"
description: "Characters in The Story of a New Name, with what's known about them as of book 2."
permalink: /books/2-storia-del-nuovo-cognome/characters/
---

{%- set bookHome = '/books/2-storia-del-nuovo-cognome/' -%}
{%- set groups = collections.characters | groupCharacters(2) -%}

{% for group in groups %}
<h2 class="character-group-title">{{ group.name }}</h2>
<ul class="character-list" role="list">
  {% for c in group.characters %}
  <li>
    <a href="{{ c.url | url }}">
      <strong>{{ c.data.name }}</strong>
      {% if c.data.role %}<span class="character-summary">{{ c.data.role }}</span>{% endif %}
    </a>
  </li>
  {% endfor %}
</ul>
{% endfor %}
