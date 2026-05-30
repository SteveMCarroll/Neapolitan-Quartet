---
layout: layouts/characters.njk
title: "Characters · Book 3"
description: "Characters in Those Who Leave and Those Who Stay, with what's known about them as of book 3."
permalink: /books/3-storia-di-chi-fugge-e-di-chi-resta/characters/
---

{%- set bookHome = '/books/3-storia-di-chi-fugge-e-di-chi-resta/' -%}
{%- set groups = collections.characters | groupCharacters(3) -%}

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
