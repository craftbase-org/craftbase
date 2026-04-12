# Craftbase Font Guide

## Font Stack

| Font         | Role                                     | Import                    |
| ------------ | ---------------------------------------- | ------------------------- |
| **Geist**    | UI chrome, all app interface text        | Google Fonts / Vercel CDN |
| **Fraunces** | Branding, headings, display text         | Google Fonts              |
| **Caveat**   | Canvas sketch elements (user-selectable) | Google Fonts              |

---

## CSS Variables (Design Tokens)

Define these in your `:root` or Tailwind config:

```css
:root {
    /* Base fonts */
    --font-ui: 'Geist', system-ui, sans-serif;
    --font-display: 'Fraunces', Georgia, serif;
    --font-sketch: 'Caveat', cursive;
}
```

### Tailwind Config (`tailwind.config.js`)

```js
theme: {
  extend: {
    fontFamily: {
      ui:      ['Geist', 'system-ui', 'sans-serif'],
      display: ['Fraunces', 'Georgia', 'serif'],
      sketch:  ['Caveat', 'cursive'],
    },
  },
},
```

---

## Usage by Area

### 1. App Chrome (Toolbar, Sidebar, Menus, Labels)

**Font:** Geist  
**When:** Everything inside the app shell — toolbar buttons, panel labels, dropdowns, tooltips, input fields, settings.

```css
/* CSS */
.toolbar,
.sidebar,
.menu,
label,
input,
button {
    font-family: var(--font-ui);
    font-weight: 400; /* or 500 for emphasis */
}
```

```jsx
{
    /* Tailwind */
}
;<div className="font-ui text-sm font-medium">Stroke Width</div>
```

> **Rule:** Never use Fraunces or Caveat anywhere inside the toolbar or sidebar. Geist only.

---

### 2. Branding & Marketing (Logo wordmark, Landing page hero, Taglines)

**Font:** Fraunces  
**When:** The Craftbase wordmark, hero headlines on the landing page, onboarding screens, marketing copy.

```css
/* CSS */
.logo,
.hero-headline,
.tagline {
    font-family: var(--font-display);
    font-weight: 600;
    font-style: normal;
}
```

```jsx
{
    /* Tailwind */
}
;<h1 className="font-display text-5xl font-semibold tracking-tight">
    Craftbase
</h1>
```

> **Tip:** Use Fraunces italic (`font-style: italic`) for pull quotes, empty state messages, or any moment you want warmth and personality — e.g. _"Nothing here yet. Start sketching."_

---

### 3. App Headings & Section Titles (Inside the app, not toolbar)

**Font:** Fraunces  
**When:** Page titles, modal headings, section headers inside panels or dialogs.

```css
/* CSS */
.modal-title,
.panel-heading,
.page-title {
    font-family: var(--font-display);
    font-weight: 400; /* Fraunces at 400 already feels substantial */
    font-size: 1.25rem;
}
```

```jsx
{
    /* Tailwind */
}
;<h2 className="font-display text-xl font-normal">Share Board</h2>
```

> **Avoid** using Fraunces at small sizes (below 14px). It loses its character and competes with Geist.

---

### 4. Canvas — Default Text Elements

**Font:** Geist  
**When:** Text boxes, sticky notes, and labels that users place on the canvas by default.

```css
/* CSS — applied to canvas text nodes */
.canvas-text-element {
    font-family: var(--font-ui);
    font-size: 14px;
    font-weight: 400;
}
```

> Keep canvas defaults neutral so the user's content stays in focus. Geist is clean and readable at any zoom level.

---

### 5. Canvas — Sketch / Handwritten Style (User-selectable)

**Font:** Caveat  
**When:** User explicitly switches a text element to "sketch" style. Great for annotations, arrows labels, sticky notes in brainstorm mode.

```css
/* CSS — applied when user selects sketch font */
.canvas-text-element.sketch {
    font-family: var(--font-sketch);
    font-size: 16px; /* Caveat needs slightly larger size to read well */
    font-weight: 400;
}
```

```jsx
{
    /* Tailwind */
}
;<span className="font-sketch text-base">This is a sketch annotation</span>
```

> **Note:** Caveat should never appear in the app UI. It's a canvas-only, user-triggered font. Treat it like a tool, not a default.

---

### 6. Empty States & Microcopy

**Font:** Fraunces italic  
**When:** Empty canvas messages, onboarding hints, "no results" states — moments where Craftbase has a voice.

```jsx
{
    /* Tailwind */
}
;<p className="font-display italic text-base text-gray-400">
    Drop your first shape to get started.
</p>
```

> This is where Craftbase's playful personality shows up most clearly. A single italic Fraunces line in an empty state does more brand work than a paragraph of Geist ever could.

---

## Quick Reference Cheatsheet

| Area                      | Font     | Weight    | Style  |
| ------------------------- | -------- | --------- | ------ |
| Toolbar, sidebar, menus   | Geist    | 400 / 500 | Normal |
| Input fields, labels      | Geist    | 400       | Normal |
| Logo / wordmark           | Fraunces | 600       | Normal |
| Landing page hero         | Fraunces | 600       | Normal |
| App modal / panel titles  | Fraunces | 400       | Normal |
| Empty states, microcopy   | Fraunces | 400       | Italic |
| Canvas text (default)     | Geist    | 400       | Normal |
| Canvas text (sketch mode) | Caveat   | 400       | Normal |

---

## What to Avoid

- **Don't mix Fraunces and Caveat** in the same area — they're both expressive and will clash.
- **Don't use Caveat in UI chrome** — it signals "rough draft" which is wrong for navigation and controls.
- **Don't use Geist for branding** — it's invisible by design, which is a liability for identity.
- **Don't use Fraunces below 14px** — its optical sizing works best at display and heading sizes.
