---
layout: default
title: Home
---

<h1>TeslApp Content Catalog</h1>
<p style="margin-bottom: var(--space-xl);">Browse community-contributed content for your Tesla.</p>

<div class="card-grid">
  <div class="card">
    <h3><a href="{{ site.baseurl }}/lightshows/">Light Shows</a></h3>
    <p>Custom light show sequences (.fseq) with optional audio.</p>
    <p style="font-size: 0.8rem; color: var(--color-muted);">{{ site.lightshows | size }} items</p>
  </div>
  <div class="card">
    <h3><a href="{{ site.baseurl }}/locksounds/">Lock Sounds</a></h3>
    <p>Lock/unlock chime sounds (.wav) for your Tesla.</p>
    <p style="font-size: 0.8rem; color: var(--color-muted);">{{ site.locksounds | size }} items</p>
  </div>
  <div class="card">
    <h3><a href="{{ site.baseurl }}/boombox/">Boombox</a></h3>
    <p>Audio tracks for Tesla's Boombox feature.</p>
    <p style="font-size: 0.8rem; color: var(--color-muted);">{{ site.boombox | size }} items</p>
  </div>
  <div class="card">
    <h3><a href="{{ site.baseurl }}/wraps/">Wraps</a></h3>
    <p>Vehicle wrap designs and templates.</p>
    <p style="font-size: 0.8rem; color: var(--color-muted);">{{ site.wraps | size }} items</p>
  </div>
  <div class="card">
    <h3><a href="{{ site.baseurl }}/hornsounds/">Horn Sounds</a></h3>
    <p>Custom horn sounds for your Tesla.</p>
    <p style="font-size: 0.8rem; color: var(--color-muted);">{{ site.hornsounds | size }} items</p>
  </div>
  <div class="card">
    <h3><a href="{{ site.baseurl }}/tags/">Browse by Tag</a></h3>
    <p>Filter content across all categories by tag.</p>
    <p style="font-size: 0.8rem; color: var(--color-muted);">{{ site.data.tags | size }} tags</p>
  </div>
</div>
