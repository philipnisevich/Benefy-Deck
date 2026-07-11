# Benefy — Presentation Site

A web-based version of the Benefy pitch deck, built for live presenting and
designed to grow into a fully animated deck (per-word text animation, morphing
between slides, etc.).

## Run it

Any static server works — no build step.

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Present

Every slide shows all its content at once, so it's **one click per slide**.

| Key | Action |
|-----|--------|
| `→` `space` `↓` | Next slide |
| `←` `↑` | Previous slide |
| `1`–`9` | Jump to slide |
| `Home` / `End` | First / last slide |
| `F` | Fullscreen |
| click / swipe | Right half = next, left half = prev |

The URL hash (`#3`) tracks the current slide, so you can deep-link or refresh
without losing your place.

## Files

```
index.html      slide markup (one <section class="slide"> per slide)
css/style.css   design system + slide layouts + animation primitives
js/deck.js      navigation engine, step reveals, word-split, morph
assets/         benefy logo
```

## Animation system (the part built for you to extend)

**1. Staggered entrance** — when a slide becomes active, elements marked
`data-step="n"` animate in, with `n` as the stagger order (0 first). No extra
clicks — it's just the entrance choreography.

```html
<p  class="eyebrow" data-step="1">Fades in second</p>
<h1 class="stat"    data-step="0">Fades in first</h1>
```

**2. In-place number morph (the 62K → $3.5B effect)** — two adjacent slides
whose numbers share the same `data-morph="key"` and each carry `data-count`
(+ optional `data-format="comma|dollar|percent"`). On the click between them the
number **stays fixed** and its digits count from one value to the other, while
everything marked `data-swap` slides horizontally (old out, new in). Slides 2 & 3
use this. For the number to hold perfectly still, both slides use the
`.stat-scene` layout (the caption hangs below the number *absolutely*, so its
changing height never nudges the number).

```html
<!-- slide 2 -->
<h1 class="stat" data-morph="stat" data-count="62000"      data-format="comma">62,000</h1>
<div class="stat-below" data-swap> …caption slides out left… </div>

<!-- slide 3 -->
<h1 class="stat" data-morph="stat" data-count="3500000000" data-format="dollar">$3,500,000,000</h1>
<div class="stat-below" data-swap> …caption slides in from right… </div>
```

Numbers only count *during a morph between two slides*. A number that appears
on its own (like slide 4's `49%`) just fades in normally — it does not roll up
from zero.

**3. Per-word text animation** — add `data-split="words"` to any text and each
word is wrapped in `<span class="word" style="--i">` (with `--i` = word index),
ready for typewriter / kinetic staggers.

### Where to go next
- Tune timing/easing in `:root` (`--dur`, `--ease`) and the morph durations in
  `morphTransition()` / `countTween()` in `js/deck.js`.
- The engine exposes `window.Deck` (`.next()`, `.prev()`, `.goto(i)`, `.index`).
- Any two adjacent stat slides can share the morph — e.g. give `49%` a
  `data-morph` key to make it climb in place from the previous number too.

## Source

Content, colors (`#FAF6EC` cream · `#0F766E` teal · `#10B981` emerald ·
`#0F172A` ink) and the logo are extracted from `Benefy_Pitch_Deck (2).pptx`.
