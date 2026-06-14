---
layout: layouts/characters.njk
title: "Characters · Book 4"
description: "Characters in The Story of the Lost Child, with what's known about them as of book 4."
permalink: /books/4-storia-della-bambina-perduta/characters/
---

{%- set bookHome = '/books/4-storia-della-bambina-perduta/' -%}
{%- set groups = collections.characters | groupCharacters(4) -%}

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
