# 🎨 STILE.md — venn Visual Language

Extracted from the venn hero (`presentation/style.png`). The brand is **light,
airy, and optimistic**: a soft lavender-grey canvas, near-black editorial
headlines, and a single signature **blue → purple → pink** gradient used for
the logo, accent words, and the primary call to action.

> Two surfaces exist: this **light hero/marketing** identity, and a **dark
> verdict screen** used for the result dossier. The gradient, persona colors,
> and type system are shared; only the canvas inverts. This file documents the
> primary light identity. Dark-surface tokens are noted at the end.

---

## 1. Core Palette

### Light surfaces

| Token            | Hex        | Use |
|------------------|------------|-----|
| `--bg`           | `#F4F5F9`  | Page canvas (soft lavender-grey) |
| `--surface`      | `#FFFFFF`  | Cards / panels |
| `--surface-2`    | `#FBFBFE`  | Subtle nested fills |
| `--border`       | `#E4E6EE`  | Hairline borders / faint grid lines |

### Ink (text)

| Token            | Hex        | Use |
|------------------|------------|-----|
| `--ink`          | `#16181F`  | Headlines, key text |
| `--ink-muted`    | `#5A5E68`  | Body copy |
| `--ink-dim`      | `#8A8E98`  | Captions, mono metadata |

### Brand accents

| Token            | Hex        | Use |
|------------------|------------|-----|
| `--blue`         | `#5E76F6`  | Gradient start, links |
| `--purple`       | `#7C5CF0`  | Eyebrow / accent text, gradient mid |
| `--purple-ink`   | `#815CF1`  | UPPERCASE eyebrow labels |
| `--pink`         | `#CA68D3`  | Gradient end, highlights |

### Persona identity colors

| Persona          | Initial | Hex        |
|------------------|:-------:|------------|
| Mentor           | M       | `#3ABCD2` (cyan) |
| Sarcastic buddy  | S       | `#CD8C1D` (gold) |
| 18-year-old you  | 18      | `#E4693E` (orange-red) |
| Failed future    | F       | `#5E62C9` (indigo) |
| Millionaire you  | $       | `#51B8B8` (teal) |
| Scared parents   | P       | `#CD5881` (rose) |

---

## 2. Signature Gradient

The brand spine. One direction (≈100°), three stops, used sparingly.

```css
/* Accent text, CTA fill, focus glows */
--grad-brand: linear-gradient(100deg, #5E76F6 0%, #7C5CF0 50%, #CA68D3 100%);

/* CTA button (slightly tighter, blue → pink) */
--grad-cta: linear-gradient(95deg, #5E76F6 0%, #C768D4 100%);

/* Gradient TEXT (the accent word, e.g. “your mentor.”) */
.accent-word{
  background:var(--grad-brand);
  -webkit-background-clip:text; background-clip:text; color:transparent;
}
```

### Logo mark

A **conic rainbow ring** (full-spectrum sweep) with a white inner field and a
solid `--purple` (`#7F5CEF`) center dot — "every voice circling one verdict."

```css
.logo{
  width:84px;height:84px;border-radius:50%;
  background:conic-gradient(from 90deg,#E4693E,#CD8C1D,#51B8B8,#3ABCD2,#5E76F6,#7C5CF0,#CA68D3,#E4693E);
  display:grid;place-items:center;
}
.logo::after{content:"";width:54px;height:54px;border-radius:50%;background:#fff;display:grid;place-items:center;
  box-shadow:0 0 0 0 transparent}
.logo .dot{width:14px;height:14px;border-radius:50%;background:#7F5CEF}
```

---

## 3. Typography

- **Display / headlines:** tight grotesk — `"Space Grotesk","Inter",system-ui`.
  Heavy (700), tight tracking (`-0.03em`), large. Mixed treatment: ink for the
  setup, **gradient text** for the punch word (`your mentor.`).
- **Body:** `"Inter",system-ui` — 400/500, line-height ~1.55, `--ink-muted`.
- **Eyebrow:** UPPERCASE, `letter-spacing:.22em`, `--purple-ink`, ~0.8rem,
  with a `·` dot separator (`SIX VOICES · ONE VERDICT`).
- **Captions / meta:** `"Space Mono",ui-monospace`, `--ink-dim`, small
  (`Private by default · Powered by a multi-agent reasoning model`).

| Role         | Size (desktop) | Weight | Tracking |
|--------------|----------------|--------|----------|
| Hero         | 3.4–4.6rem     | 700    | -0.03em  |
| Section H2   | 1.8–2.4rem     | 600    | -0.02em  |
| Body / lead  | 1.1–1.25rem    | 400    | 0        |
| Eyebrow      | 0.8rem         | 600    | +0.22em UPPER |
| Caption mono | 0.8rem         | 400    | +0.04em  |

---

## 4. Shape & Depth

- **Radius:** cards `18–20px`, CTA pill `14px`, avatars `999px`.
- **Borders:** 1px `--border`; faint 48px grid lines on the canvas.
- **Shadows:** soft and lifted (this is a light UI — depth comes from shadow):
  - CTA: `0 14px 30px -10px rgba(124,92,240,.45)`
  - Card: `0 10px 30px -18px rgba(22,24,31,.25)`
- **Spacing:** generous, centered hero composition; 8px base grid.

---

## 5. Components

- **Primary CTA:** pill, `--grad-cta` fill, white text + `→`, soft purple shadow.
- **Eyebrow:** purple uppercase, tracked, `·`-separated.
- **Avatar row:** 44px circles in persona colors, white initial, weight 700,
  centered under the CTA as a "council preview."
- **Accent word:** gradient-clipped text inside an otherwise ink headline.
- **Footer caption:** mono, dim, `·`-separated trust line.

---

## 6. Dark verdict surface (companion)

The result/verdict screen inverts the canvas while keeping the same gradient and
persona colors:

| Token         | Hex       |
|---------------|-----------|
| `--bg-dark`   | `#0E0F10` |
| `--surface-d` | `#151718` |
| `--border-d`  | `#2A2D2F` |
| `--ink-d`     | `#F4F3F1` |
| amber accent  | `#E0A23C` (status tags on the dark verdict only) |

Use light for marketing/landing/interview; use dark for the final verdict
dossier. The blue→purple→pink gradient is the constant across both.

---

## 7. Tone

Calm, premium, human. Lots of whitespace, one confident gradient, editorial
type. It should feel like a **thoughtful product**, not a flashy AI demo —
optimistic light, never neon.
