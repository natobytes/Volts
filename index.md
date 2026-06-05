---
layout: default
title: Home
description: "Community-curated light shows, lock sounds, boombox tracks, wraps and horn sounds for your Tesla — browse, download, and load straight onto a USB stick."
---

{% assign total = site.lightshows.size | plus: site.locksounds.size | plus: site.boombox.size | plus: site.wraps.size | plus: site.hornsounds.size %}

<style>
  /* ---- landing-only styling ---- */
  .hero { position: relative; overflow: hidden; border-bottom: 1px solid var(--line); }
  .hero-bg { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
  .hero-bg::before { /* blueprint grid */
    content: ""; position: absolute; inset: 0;
    background-image:
      linear-gradient(var(--line-soft) 1px, transparent 1px),
      linear-gradient(90deg, var(--line-soft) 1px, transparent 1px);
    background-size: 54px 54px;
    -webkit-mask-image: radial-gradient(115% 90% at 50% 0%, #000 25%, transparent 78%);
            mask-image: radial-gradient(115% 90% at 50% 0%, #000 25%, transparent 78%);
    opacity: .6;
  }
  .hero-bg::after { /* accent wash */
    content: ""; position: absolute; top: -30%; left: 50%; transform: translateX(-50%);
    width: 900px; height: 600px;
    background: radial-gradient(closest-side, var(--accent-soft), transparent 70%);
    filter: blur(8px);
  }
  .hero-inner { position: relative; z-index: 1; max-width: var(--maxw); margin-inline: auto; padding: var(--s-9) var(--s-5) var(--s-7); text-align: center; }
  .hero-title { font-family: var(--font-display); font-weight: 800; text-transform: uppercase; line-height: .96; letter-spacing: -.01em; font-size: clamp(2.6rem, 8vw, 5.2rem); margin: var(--s-4) auto var(--s-4); }
  .hero-title .spark { color: var(--accent-text); text-shadow: 0 0 32px var(--accent-glow); }
  .hero-sub { color: var(--text-dim); font-size: clamp(1rem, 1.6vw, 1.2rem); max-width: 52ch; margin: 0 auto var(--s-6); }
  .hero-actions { display: flex; flex-wrap: wrap; gap: var(--s-3); justify-content: center; margin-bottom: var(--s-8); }
  .hero-rail { position: relative; z-index: 1; max-width: var(--maxw); margin: 0 auto; padding: 0 var(--s-5); }
  .hero-rail .eq { height: 110px; gap: 5px; border: 1px solid var(--line); border-top-left-radius: var(--radius); border-top-right-radius: var(--radius); padding: var(--s-5) var(--s-6) 0; }
  .hero-rail .eq span { max-width: 14px; }

  .ticker { position: relative; z-index: 1; max-width: var(--maxw); margin: 0 auto; padding: 0 var(--s-5) var(--s-8); }
  .ticker-grid { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--line); border-top: none; border-bottom-left-radius: var(--radius); border-bottom-right-radius: var(--radius); overflow: hidden; }
  .ticker-cell { padding: var(--s-5); border-right: 1px solid var(--line); background: var(--surface); }
  .ticker-cell:last-child { border-right: none; }
  .ticker-cell b { display: block; font-family: var(--font-display); font-weight: 800; font-size: 2.1rem; line-height: 1; }
  .ticker-cell.accent b { color: var(--accent-text); }
  .ticker-cell span { font-family: var(--font-mono); font-size: .66rem; letter-spacing: .16em; text-transform: uppercase; color: var(--text-mute); }

  .showcase-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: var(--s-4); }
  .show-cell { position: relative; display: block; padding: var(--s-5); background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); transition: transform .18s, border-color .18s, box-shadow .25s; overflow: hidden; }
  .show-cell::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--eq-grad, var(--accent)); transform: scaleX(0); transform-origin: left; transition: transform .25s; }
  .show-cell:hover { transform: translateY(-4px); border-color: color-mix(in srgb, var(--accent) 55%, var(--line)); box-shadow: var(--shadow); }
  .show-cell:hover::after { transform: scaleX(1); }
  .show-ico { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--line); color: var(--accent); margin-bottom: var(--s-4); }
  .show-ico { color: var(--accent-text); }
  .show-ico svg { width: 22px; height: 22px; }
  .show-cell h3 { color: var(--text); margin-bottom: var(--s-2); }
  .show-cell p { color: var(--text-dim); font-size: .88rem; margin-bottom: var(--s-3); }
  .show-meta { font-family: var(--font-mono); font-size: .68rem; letter-spacing: .1em; text-transform: uppercase; color: var(--text-mute); display: flex; justify-content: space-between; align-items: center; }
  .show-meta .count { color: var(--accent-text); }

  .steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s-4); counter-reset: step; }
  .step { position: relative; padding: var(--s-5); background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius); }
  .step::before { counter-increment: step; content: "0" counter(step); font-family: var(--font-display); font-weight: 800; font-size: 2.2rem; color: var(--accent-text); opacity: .9; line-height: 1; display: block; margin-bottom: var(--s-3); }
  .step h3 { color: var(--text); font-size: 1.05rem; margin-bottom: var(--s-2); }
  .step p { color: var(--text-dim); font-size: .88rem; }

  .appband { display: grid; grid-template-columns: 1.3fr 1fr; gap: var(--s-7); align-items: center; padding: var(--s-7); background: linear-gradient(120deg, var(--surface), var(--surface-2)); border: 1px solid var(--line); border-radius: var(--radius); position: relative; overflow: hidden; }
  .appband::before { content: ""; position: absolute; right: -10%; top: -40%; width: 460px; height: 460px; background: radial-gradient(closest-side, var(--accent-soft), transparent 70%); pointer-events: none; }
  .appband .eq { height: 120px; border: 1px solid var(--line); border-radius: var(--radius); padding: var(--s-5) var(--s-5) 0; }
  .appband h2 { margin-bottom: var(--s-3); }
  .appband p { color: var(--text-dim); margin-bottom: var(--s-5); max-width: 44ch; }
  .status-pill { display: inline-flex; align-items: center; gap: .55rem; font-family: var(--font-mono); font-size: .72rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--text-dim); border: 1px solid var(--line); border-radius: 999px; padding: .42rem .85rem; background: var(--surface); }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); animation: statuspulse 2s ease-out infinite; }
  @keyframes statuspulse { 0% { box-shadow: 0 0 0 0 var(--accent-glow); } 70% { box-shadow: 0 0 0 7px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
  @media (prefers-reduced-motion: reduce) { .status-dot { animation: none; } }

  @media (max-width: 720px) {
    .ticker-grid { grid-template-columns: repeat(2, 1fr); }
    .ticker-cell:nth-child(2) { border-right: none; }
    .ticker-cell:nth-child(1), .ticker-cell:nth-child(2) { border-bottom: 1px solid var(--line); }
    .steps { grid-template-columns: 1fr 1fr; }
    .appband { grid-template-columns: 1fr; }
    .appband .eq { order: -1; }
  }
  @media (max-width: 560px) {
    .hero-inner { padding: var(--s-8) var(--s-4) var(--s-6); }
    .hero-title { font-size: clamp(1.6rem, 7vw, 2.5rem); }
    .hero-rail, .ticker { padding-inline: var(--s-4); }
    .hero-rail .eq { padding-inline: var(--s-4); }
    .ticker-cell b { font-size: 1.7rem; }
    .hero-actions { flex-direction: column; align-items: stretch; }
    .hero-actions .btn { justify-content: center; }
  }
  @media (max-width: 480px) { .steps { grid-template-columns: 1fr; } }
</style>

<section class="hero">
  <div class="hero-bg" aria-hidden="true"></div>
  <div class="hero-inner">
    <span class="eyebrow">Vehicle Orchestration System</span>
    <h1 class="hero-title">Customize your <br><span class="spark">Tesla</span>. Front to back.</h1>
    <p class="hero-sub">A community catalog of light shows, lock sounds, boombox tracks, wraps and horn sounds — free to download and load straight onto your car&rsquo;s USB.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="{{ site.baseurl }}/lightshows/">Browse the catalog</a>
      <a class="btn btn-ghost" href="#how-it-works">How it works</a>
    </div>
  </div>
  <div class="hero-rail" aria-hidden="true">
    <span class="eq eq--lightshows is-live">
      {% for i in (1..56) %}{% assign h = i | times: 41 | modulo: 74 | plus: 18 %}{% assign d = i | times: 47 | modulo: 80 | plus: 50 %}<span style="--h:{{ h }}%;--i:{{ i }};--d:{{ d }}0ms"></span>{% endfor %}
    </span>
  </div>
  <div class="ticker">
    <div class="ticker-grid">
      <div class="ticker-cell"><b>5</b><span>Categories</span></div>
      <div class="ticker-cell accent"><b>{{ total }}</b><span>Catalog Items</span></div>
      <div class="ticker-cell"><b>{{ site.data.tags | size }}</b><span>Browsable Tags</span></div>
      <div class="ticker-cell"><b>USB</b><span>Drive Ready</span></div>
    </div>
  </div>
</section>

<section class="section wrap">
  <div class="section-head">
    <span class="eyebrow">Five Ways To Customize</span>
    <h2>Choose your customization</h2>
    <p class="lead">Every item is a free, community-sourced asset packaged for direct USB transfer to your vehicle.</p>
  </div>
  <div class="showcase-grid">
    <a class="show-cell eq--lightshows" href="{{ site.baseurl }}/lightshows/">
      <span class="show-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/><circle cx="12" cy="12" r="3.5"/></svg></span>
      <h3>Light Shows</h3>
      <p>Synchronized <code>.fseq</code> sequences with matching audio.</p>
      <div class="show-meta"><span>FSEQ + MP3</span><span class="count">{{ site.lightshows | size }} items</span></div>
    </a>
    <a class="show-cell eq--locksounds" href="{{ site.baseurl }}/locksounds/">
      <span class="show-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span>
      <h3>Lock Sounds</h3>
      <p>Lock &amp; unlock chimes to greet you at the door.</p>
      <div class="show-meta"><span>WAV</span><span class="count">{{ site.locksounds | size }} items</span></div>
    </a>
    <a class="show-cell eq--boombox" href="{{ site.baseurl }}/boombox/">
      <span class="show-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg></span>
      <h3>Boombox</h3>
      <p>External speaker tracks for Tesla&rsquo;s Boombox.</p>
      <div class="show-meta"><span>MP3</span><span class="count">{{ site.boombox | size }} items</span></div>
    </a>
    <a class="show-cell eq--wraps" href="{{ site.baseurl }}/wraps/">
      <span class="show-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-5a2 2 0 0 1 3 0l6 6"/><path d="M14 14l2-2a2 2 0 0 1 3 0l2 2"/><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/></svg></span>
      <h3>Wraps</h3>
      <p>Vehicle wrap designs &amp; skins for every model.</p>
      <div class="show-meta"><span>PNG</span><span class="count">{{ site.wraps | size }} items</span></div>
    </a>
    <a class="show-cell eq--hornsounds" href="{{ site.baseurl }}/hornsounds/">
      <span class="show-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10v4h4l5 4V6L7 10H3z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/></svg></span>
      <h3>Horn Sounds</h3>
      <p>Swap the honk for a custom horn melody.</p>
      <div class="show-meta"><span>WAV</span><span class="count">{{ site.hornsounds | size }} items</span></div>
    </a>
    <a class="show-cell" href="{{ site.baseurl }}/tags/">
      <span class="show-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg></span>
      <h3>Browse by Tag</h3>
      <p>Filter across every category by theme &amp; style.</p>
      <div class="show-meta"><span>Filter</span><span class="count">{{ site.data.tags | size }} tags</span></div>
    </a>
  </div>
</section>

<section class="section--tight wrap" id="how-it-works">
  <div class="section-head">
    <span class="eyebrow">From Catalog To Car</span>
    <h2>How it works</h2>
    <p class="lead">No accounts, no paywalls. Four steps from this page to your Tesla.</p>
  </div>
  <div class="steps">
    <div class="step"><h3>Browse</h3><p>Find a light show, sound or wrap you like and preview it right in your browser.</p></div>
    <div class="step"><h3>Download</h3><p>Grab the files — the light sequence, audio track or image — with one click.</p></div>
    <div class="step"><h3>Load USB</h3><p>Copy them onto a FAT32/exFAT USB stick in Tesla&rsquo;s folder layout.</p></div>
    <div class="step"><h3>Drive</h3><p>Plug into your Tesla, pick it from the screen, and enjoy the show.</p></div>
  </div>
</section>

{% assign feat_ls = site.lightshows | first %}
{% assign feat_wrap = site.wraps | first %}
{% assign feat_bb = site.boombox | first %}
<section class="section--tight wrap">
  <div class="section-head">
    <span class="eyebrow">Fresh From The Community</span>
    <h2>Featured drops</h2>
  </div>
  <div class="card-grid">
    {% if feat_ls %}{% include item-card.html item=feat_ls %}{% endif %}
    {% if feat_wrap %}{% include item-card.html item=feat_wrap %}{% endif %}
    {% if feat_bb %}{% include item-card.html item=feat_bb %}{% endif %}
  </div>
</section>

<section class="section--tight wrap">
  <div class="appband">
    <div>
      <span class="eyebrow">Companion App</span>
      <h2>Take Volts on the road</h2>
      <p>The VOLTS app for iOS &amp; Android will browse this same catalog and export straight to a USB drive in Tesla&rsquo;s layout — no desktop required.</p>
      <span class="status-pill"><span class="status-dot" aria-hidden="true"></span>In development</span>
    </div>
    <span class="eq eq--boombox is-live" aria-hidden="true">
      {% for i in (1..28) %}{% assign h = i | times: 43 | modulo: 72 | plus: 20 %}{% assign d = i | times: 51 | modulo: 70 | plus: 55 %}<span style="--h:{{ h }}%;--i:{{ i }};--d:{{ d }}0ms"></span>{% endfor %}
    </span>
  </div>
</section>
