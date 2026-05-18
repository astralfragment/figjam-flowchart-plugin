# Elyxsia — Theme

A deep amethyst shadcn theme with violet-tinted neutrals, violet-cast shadows, generous radii, and warm typography. Tuned for a premium, slightly mystical feel.

---

## Installation

1. Copy the CSS below into your `app/globals.css` (or paste into shadcn studio's Import Custom CSS).
2. Load the three fonts (via `next/font` or Google Fonts):
   - **Outfit** (sans)
   - **Merriweather** (serif)
   - **Geist Mono** (mono)

---

## Tokens at a Glance

| Token | Light | Dark |
|-------|-------|------|
| `--primary` | Deep amethyst `oklch(0.37 0.07 309)` | Luminous lilac `oklch(0.72 0.12 300)` |
| `--background` | Warm white `oklch(0.99 0.01 298)` | Aubergine `oklch(0.16 0.03 295)` |
| `--accent` | Soft magenta `oklch(0.92 0.04 319)` | Plum `oklch(0.35 0.08 310)` |
| `--radius` | `0.75rem` | `0.75rem` |
| Shadow tint | Violet `oklch(0.22 0.04 294)` | Deeper violet `oklch(0.08 0.04 294)` |

---

## Full CSS

```css
:root {
  --background: oklch(0.99 0.01 298.02);
  --foreground: oklch(0.22 0.04 294.52);
  --card: oklch(0.99 0.01 301.57);
  --card-foreground: oklch(0.22 0.04 294.52);
  --popover: oklch(1.00 0 0);
  --popover-foreground: oklch(0.22 0.04 294.52);
  --primary: oklch(0.37 0.07 309.02);
  --primary-foreground: oklch(0.98 0.00 301.83);
  --secondary: oklch(0.94 0.01 294.56);
  --secondary-foreground: oklch(0.28 0.05 294.97);
  --muted: oklch(0.96 0.01 303.26);
  --muted-foreground: oklch(0.50 0.03 294.96);
  --accent: oklch(0.92 0.04 319.51);
  --accent-foreground: oklch(0.25 0.06 299.35);
  --destructive: oklch(0.58 0.22 24.96);
  --destructive-foreground: oklch(0.98 0.00 301.83);
  --border: oklch(0.90 0.01 294.54);
  --input: oklch(0.92 0.01 296.46);
  --ring: oklch(0.42 0.08 294.89);
  --chart-1: oklch(0.42 0.08 294.89);
  --chart-2: oklch(0.55 0.12 319.89);
  --chart-3: oklch(0.65 0.10 269.79);
  --chart-4: oklch(0.70 0.13 339.77);
  --chart-5: oklch(0.50 0.09 250.56);
  --sidebar: oklch(0.97 0.01 299.41);
  --sidebar-foreground: oklch(0.25 0.04 294.32);
  --sidebar-primary: oklch(0.37 0.07 309.02);
  --sidebar-primary-foreground: oklch(0.98 0.00 301.83);
  --sidebar-accent: oklch(0.93 0.02 311.17);
  --sidebar-accent-foreground: oklch(0.28 0.05 294.97);
  --sidebar-border: oklch(0.90 0.01 294.54);
  --sidebar-ring: oklch(0.42 0.08 294.89);

  --font-sans: Outfit, sans-serif;
  --font-serif: Merriweather, serif;
  --font-mono: Geist Mono, monospace;

  --radius: 0.75rem;

  --tracking-normal: -0.01em;
  --spacing: 0.25rem;

  /* Violet-cast shadows — softer and more cohesive than pure black */
  --shadow-2xs: 0 1px 2px 0px oklch(0.22 0.04 294 / 0.04);
  --shadow-xs: 0 1px 2px 0px oklch(0.22 0.04 294 / 0.06);
  --shadow-sm: 0 1px 2px 0px oklch(0.22 0.04 294 / 0.06), 0 2px 4px -2px oklch(0.22 0.04 294 / 0.06);
  --shadow: 0 2px 4px -1px oklch(0.22 0.04 294 / 0.08), 0 4px 8px -2px oklch(0.22 0.04 294 / 0.06);
  --shadow-md: 0 4px 6px -1px oklch(0.22 0.04 294 / 0.09), 0 8px 16px -4px oklch(0.22 0.04 294 / 0.07);
  --shadow-lg: 0 8px 12px -2px oklch(0.22 0.04 294 / 0.10), 0 16px 28px -8px oklch(0.22 0.04 294 / 0.08);
  --shadow-xl: 0 12px 20px -4px oklch(0.22 0.04 294 / 0.12), 0 24px 40px -12px oklch(0.22 0.04 294 / 0.10);
  --shadow-2xl: 0 24px 48px -12px oklch(0.22 0.04 294 / 0.22);
}

.dark {
  --background: oklch(0.16 0.03 294.88);
  --foreground: oklch(0.95 0.01 296.47);
  --card: oklch(0.20 0.03 295.83);
  --card-foreground: oklch(0.95 0.01 296.47);
  --popover: oklch(0.20 0.03 295.83);
  --popover-foreground: oklch(0.95 0.01 296.47);
  --primary: oklch(0.72 0.12 299.68);
  --primary-foreground: oklch(0.18 0.04 295.86);
  --secondary: oklch(0.28 0.04 294.09);
  --secondary-foreground: oklch(0.95 0.01 296.47);
  --muted: oklch(0.25 0.03 295.63);
  --muted-foreground: oklch(0.70 0.03 299.22);
  --accent: oklch(0.35 0.08 310.10);
  --accent-foreground: oklch(0.96 0.01 298.67);
  --destructive: oklch(0.65 0.20 24.98);
  --destructive-foreground: oklch(0.98 0.00 301.83);
  --border: oklch(0.30 0.04 295.62);
  --input: oklch(0.28 0.03 295.92);
  --ring: oklch(0.72 0.12 299.68);
  --chart-1: oklch(0.72 0.12 299.68);
  --chart-2: oklch(0.68 0.14 330.13);
  --chart-3: oklch(0.75 0.10 269.92);
  --chart-4: oklch(0.78 0.13 350.05);
  --chart-5: oklch(0.62 0.11 250.39);
  --sidebar: oklch(0.18 0.03 296.57);
  --sidebar-foreground: oklch(0.95 0.01 296.47);
  --sidebar-primary: oklch(0.72 0.12 299.68);
  --sidebar-primary-foreground: oklch(0.18 0.04 295.86);
  --sidebar-accent: oklch(0.30 0.05 309.06);
  --sidebar-accent-foreground: oklch(0.96 0.01 298.67);
  --sidebar-border: oklch(0.30 0.04 295.62);
  --sidebar-ring: oklch(0.72 0.12 299.68);

  /* Darker, deeper shadows for dark mode — still violet-tinted */
  --shadow-2xs: 0 1px 2px 0px oklch(0.08 0.04 294 / 0.30);
  --shadow-xs: 0 1px 2px 0px oklch(0.08 0.04 294 / 0.35);
  --shadow-sm: 0 1px 2px 0px oklch(0.08 0.04 294 / 0.35), 0 2px 4px -2px oklch(0.08 0.04 294 / 0.30);
  --shadow: 0 2px 4px -1px oklch(0.08 0.04 294 / 0.40), 0 4px 8px -2px oklch(0.08 0.04 294 / 0.32);
  --shadow-md: 0 4px 6px -1px oklch(0.08 0.04 294 / 0.42), 0 8px 16px -4px oklch(0.08 0.04 294 / 0.34);
  --shadow-lg: 0 8px 12px -2px oklch(0.08 0.04 294 / 0.45), 0 16px 28px -8px oklch(0.08 0.04 294 / 0.36);
  --shadow-xl: 0 12px 20px -4px oklch(0.08 0.04 294 / 0.50), 0 24px 40px -12px oklch(0.08 0.04 294 / 0.40);
  --shadow-2xl: 0 24px 48px -12px oklch(0.08 0.04 294 / 0.65);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --shadow-2xs: var(--shadow-2xs);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow: var(--shadow);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);
  --shadow-2xl: var(--shadow-2xl);

  --tracking-tighter: calc(var(--tracking-normal) - 0.05em);
  --tracking-tight: calc(var(--tracking-normal) - 0.025em);
  --tracking-wide: calc(var(--tracking-normal) + 0.025em);
  --tracking-wider: calc(var(--tracking-normal) + 0.05em);
  --tracking-widest: calc(var(--tracking-normal) + 0.1em);
}

body {
  letter-spacing: var(--tracking-normal);
}
```

---

## Usage Notes

**Primary buttons** carry real weight in light mode — use them sparingly so the deep amethyst stays an anchor, not a wallpaper.

**Accent** (`bg-accent`) works beautifully for hover states, selected nav items, and soft highlight chips.

**Sidebar tokens** are slightly cooler than main canvas tokens; lean on them rather than hardcoding alternate shades.

**Charts** are tuned to similar chroma — safe to use any combination of `chart-1` through `chart-5` without one series visually dominating.

**Shadows** are violet-tinted to match the palette. If you need more depth, lean on tonal separation (e.g. `bg-card` on `bg-background`) before reaching for `shadow-lg`.

**Dark mode primary** is much lighter than light mode primary — this is by design. Don't try to match them; trust the lift.