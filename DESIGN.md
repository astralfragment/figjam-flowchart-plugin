# Elyxsia — Design System

A mystical, refined design language built around a deep amethyst core. Elyxsia balances quiet sophistication with a touch of the ethereal — soft lavender neutrals, jewel-toned accents, violet-tinted shadows, and warm typographic rhythm.

---

## Design Philosophy

Elyxsia is **calm but never sterile**. The palette leans into the violet family across every surface — including the shadows — which creates a sense of cohesion that fully neutral grays can't deliver. Whites are warmed with a hint of lilac, shadows feel like dusk rather than ink, and the primary purple acts as an anchor rather than a shout.

Three principles guide the system:

1. **Tonal harmony over contrast theatrics.** Every neutral carries a faint violet undertone (hue 294–301), and shadows share that same hue family. The result is an interface that feels sculpted from a single material.
2. **Earned emphasis.** The primary is deep enough that a single button, badge, or link carries real weight without needing size or motion to compete for attention.
3. **Readable elegance.** Outfit for UI, Merriweather for long-form, Geist Mono for code — a trio that moves comfortably between dashboard, article, and terminal contexts, unified by a subtly tightened tracking baseline.

---

## Color System

### Primary

The primary is a deep amethyst — `oklch(0.37 0.07 309)` in light mode, lifted to a luminous lilac `oklch(0.72 0.12 300)` in dark mode. The dark-mode shift is intentional: the original deep purple would disappear against a near-black background, so the system pivots to a brighter expression of the same hue family. This keeps brand recognition intact while preserving contrast.

### Neutrals

Backgrounds, cards, popovers, muted surfaces, and borders all share the violet undertone. The light palette ranges from `oklch(0.99 0.01 298)` at the brightest to `oklch(0.90 0.01 295)` at the border level — a tight, premium-feeling range. Dark mode mirrors this with aubergine-tinted shadows from `oklch(0.16 0.03 295)` up through the muted and secondary tiers.

### Accent & Destructive

The accent leans slightly toward magenta (`hue 319`), giving secondary highlights a warmer, more playful character that complements the cooler primary. Destructive is a balanced red-orange at `hue 25` — assertive without feeling alarming.

### Charts

Five chart colors fan across the spectrum from periwinkle through amethyst, rose, magenta, and indigo. They're tuned to similar chroma values so no single series dominates a visualization by accident. In dark mode, all five lift to higher lightness values to stay legible against the dark canvas.

### Sidebar

The sidebar runs slightly cooler and darker than the main background in light mode, and slightly darker than the canvas in dark mode. This subtle separation gives navigation visual weight without requiring a hard border.

---

## Typography

| Role | Font | Use |
|------|------|-----|
| Sans | **Outfit** | UI, headings, buttons, body in app contexts |
| Serif | **Merriweather** | Long-form reading, editorial content, quotes |
| Mono | **Geist Mono** | Code, data tables, technical labels |

Outfit's geometric warmth pairs naturally with the violet palette — it feels modern without slipping into cold neutrality. Merriweather brings literary gravitas when content needs to slow the reader down. Geist Mono keeps technical surfaces feeling intentional rather than utilitarian.

A baseline letter-spacing of `-0.01em` pulls letters together just enough to make Outfit feel premium at body sizes and refined at headings. A full tracking scale (`tighter` → `widest`) is exposed for typographic flexibility — useful for eyebrow labels, all-caps tags, or display headings.

---

## Shape & Elevation

**Radius** is set at `0.75rem` as the base, with the scale stepping from `calc(radius - 4px)` for tight elements like badges up to `calc(radius + 4px)` for prominent containers like modals. The curvature reads as deliberately rounded — soft, editorial, and confident — rather than defaulting to the safe middle ground.

**Shadows** are violet-cast rather than pure black. They share the `oklch(0.22 0.04 294)` hue family with the rest of the palette in light mode, and deepen to `oklch(0.08 0.04 294)` in dark mode. Each shadow tier uses a layered stack — a tight inner shadow plus a wider, softer outer shadow — so cards feel like they're sitting on the page and modals feel like they're floating above it. Pure black would create a subtle mismatch against the violet-tinted surfaces; tinting the shadows fixes it.

The system still relies on tonal separation more than dropped shadows to suggest depth. Shadows are quiet at every tier — the larger ones earn their reach through spread, not opacity.

---

## Light vs Dark

Light mode reads as **soft daylight through a stained glass window** — warm whites, gentle lilac shadows, a deep amethyst that grounds the eye.

Dark mode reads as **dusk in an old library** — aubergine canvases, parchment-soft foreground text, a glowing lilac primary that feels lit from within.

Both modes share the same hue logic, so switching between them feels like a change in lighting rather than a change in identity.

---

## When to Use Elyxsia

This theme fits products where **trust, craft, and a hint of mystique** matter: creative tools, knowledge platforms, premium SaaS, editorial publications, wellness apps, anything in the magic-adjacent or arts space. It's less suited to high-energy commerce, sports, or contexts where loud signaling is the point.