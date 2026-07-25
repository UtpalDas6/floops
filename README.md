# Floops — loops for your foot

**[floops.](https://utpaldas6.github.io/floops/)** The flip-flop hasn't changed in 3,000 years. We fixed that.

![status](https://img.shields.io/badge/status-first%20drop%20incoming-ff4d1c) ![vibe](https://img.shields.io/badge/vibe-ergonomic%20futurism-8891a3)

---

## The pitch

Humanity strapped a piece of foam to its feet with a single rubber thong somewhere around the Bronze Age, and then just... stopped iterating. For three millennia. No grip assist, no ergonomics, no thought given to the actual mechanics of a human hand putting a human foot into a shoe.

**Floops is what happens when someone finally asks "why does putting on a sandal still suck?"**

The answer: a molded thumb loop and a toe loop, built into the strap itself, so the slide goes on with a pull instead of a fight. It's obvious in hindsight. That's what good design always looks like — right after someone else finally does it.

## The designer

**Utpal Das** — product designer, futurist, and the person who looked at a flip-flop and saw a 3,000-year-old bug report nobody had filed yet.

This isn't a footwear project. It's a thesis: that "traditional" is not the same as "finished," and that the most overlooked objects — the ones so ubiquitous nobody questions their form anymore — are exactly where the next real design unlock is hiding. Flip-flops were just the proof of concept. Floops is the first shape this thinking takes, not the last.

If Dieter Rams had designed for the beach, this is where he'd have ended up.

## What's actually in this repo

A single-page product site for Floops, built to *show*, not just tell:

- **Mix Your Match** — a live 3D configurator (Three.js) that extrudes the same sole/strap path data used in the flat illustrations, so the 3D model and the 2D marketing art are never out of sync. Spin the reels, land on one of 30 sole/strap combinations, drag to orbit.
- **Ergonomic hardware, modeled in 3D** — a circular thumb loop and an elongated rectangular toe loop, both grounded flush against the strap (not floating decoration), positioned where a human hand and human toes actually are.
- **Flat SVG fallback** — if WebGL isn't available, the same colorway renders as a crisp vector illustration instead of a blank canvas.
- **Four colorways** — Ember, Slate, Bone, Moss. One rebound foam core, four moods.

## Stack

Plain HTML/CSS/JS. No build step, no framework, no bundler — open `index.html` and it works.

- **Three.js r128** (+ `OrbitControls`) for the 3D preview
- **GSAP + ScrollTrigger** for scroll-driven motion (progressive enhancement — the page is complete without it)
- Everything else is vanilla DOM

## Running it locally

```bash
open index.html
```

That's it. Three.js is loaded as a classic script specifically so the 3D preview works over `file://` with zero server setup.

## Live

**[utpaldas6.github.io/floops](https://utpaldas6.github.io/floops/)**

---

*The flip-flop was due for a redesign. Someone had to notice. Floops is the loop.*
