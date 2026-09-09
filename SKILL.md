---
name: booknest-design-system
description: BookNest design system skill. Provides component rules, token usage, and accessibility standards for the BookNest reading platform UI. Use when creating or modifying any BookNest frontend component.
---

# BookNest Design System Skill

## When to Activate

Use this skill when:
- Creating or modifying any BookNest frontend component
- Defining CSS styles for new features
- Building V2 reader, file upload, or admin UI components
- Reviewing component states and accessibility
- Verifying design token usage (no hardcoded values)

## Source of Truth

All design tokens, color palettes, spacing scales, and component specs are defined in:
- [`DESIGN.md`](file:///home/soumya/Projects/booknest/DESIGN.md) — the design system reference
- [`AGENTS.md`](file:///home/soumya/Projects/booknest/AGENTS.md%20%E2%80%94%20BookNest%20Engineering%20Constitution.md) §24 — frontend architecture rules
- [`AGENTS.md`](file:///home/soumya/Projects/booknest/AGENTS.md%20%E2%80%94%20BookNest%20Engineering%20Constitution.md) §25 — UX requirements

Read `DESIGN.md` before writing any CSS or component code.

## Core Rules

### Token Usage

- **Must** use CSS custom properties from `DESIGN.md` for all colors, spacing, radius, and shadows.
- **Must not** hardcode hex values, pixel spacing, or font sizes outside the defined scale.
- **Must** use the semantic token name, not the raw value. Example: `var(--accent-primary)` not `#b45309`.

### Component States

Every interactive component **must** define styles for all 7 states:

1. `default` — resting appearance
2. `hover` — mouse-over feedback
3. `focus-visible` — keyboard focus ring using `--shadow-focus`
4. `active` — pressed/clicked state
5. `disabled` — non-interactive, reduced opacity, `cursor: not-allowed`
6. `loading` — spinner or skeleton, disabled interaction
7. `error` — red border/text using `--accent-danger`

### Accessibility

- **Must** meet WCAG 2.2 AA contrast ratios (4.5:1 body, 3:1 large/UI).
- **Must** provide visible `:focus-visible` styles on all interactive elements.
- **Must** use semantic HTML (`<button>`, `<nav>`, `<main>`, `<article>`).
- **Must** add `aria-label` to icon-only buttons.
- **Must** respect `prefers-reduced-motion` — disable animations when enabled.
- **Should** use `aria-live` regions for toasts and notifications.

### CSS Modules

- BookNest uses Vanilla CSS Modules (`.module.css` files), co-located with components.
- No Tailwind. No CSS-in-JS. No global styles except the root design tokens.
- Each component has its own `.module.css` file in the same directory.

### Responsive Rules

- **Desktop-first** design (primary target: 1024px+).
- **Tablet** breakpoint: 768px.
- Reader is full-viewport on all screen sizes.
- Admin dashboard uses responsive grid (4 cols → 2 cols → 1 col).

---

## V2 Component Guidance

### File Upload Components

| Component | File | Notes |
|---|---|---|
| `FileDropzone` | `features/books/FileDropzone.module.css` | Drag-drop upload area with dashed border |
| `FileCard` | `features/books/FileCard.module.css` | Shows uploaded file info with remove button |
| `UploadProgress` | `features/books/UploadProgress.module.css` | Progress bar during upload |

**Dropzone states**: default (dashed border) → drag-over (solid accent border, pulse) →
uploading (progress bar) → success (file card replaces dropzone) → error (red border + message)

### Reader Components

| Component | File | Notes |
|---|---|---|
| `ReaderView` | `features/reader/ReaderView.module.css` | Full-viewport reader container |
| `ReaderToolbar` | `features/reader/ReaderToolbar.module.css` | Auto-hiding toolbar |
| `ReaderSidebar` | `features/reader/ReaderSidebar.module.css` | TOC/Highlights/Notes/Bookmarks |
| `HighlightPopover` | `features/reader/HighlightPopover.module.css` | Color picker + annotation |
| `ThemeSelector` | `features/reader/ThemeSelector.module.css` | Light/Dark/Sepia toggle |
| `EyeSafetyPanel` | `features/reader/EyeSafetyPanel.module.css` | Blue-light filter + brightness |
| `NotesPanel` | `features/reader/NotesPanel.module.css` | Rich notes with attachments |
| `AudioRecorder` | `features/reader/AudioRecorder.module.css` | In-browser audio recording |

**Theme tokens**: The reader uses `data-theme="light|dark|sepia"` on the reader container.
CSS custom properties switch based on this attribute. See `DESIGN.md` color palettes.

**Focus mode**: Apply `.focus-mode` class to the reader container. All chrome (toolbar,
sidebar, page numbers) fades out with `--focus-transition`. Only reading content + a subtle
"Exit focus" anchor remain.

### Admin Components

| Component | File | Notes |
|---|---|---|
| `AdminLayout` | `features/admin/AdminLayout.module.css` | Slightly cooler surface than main app |
| `AnalyticsCards` | `features/admin/AnalyticsCards.module.css` | Metric cards with accent border |
| `UserTable` | `features/admin/UserTable.module.css` | Paginated, searchable user list |
| `SettingsPanel` | `features/admin/SettingsPanel.module.css` | Key-value settings editor |
| `AuditLogViewer` | `features/admin/AuditLogViewer.module.css` | Reverse-chronological action log |

**Admin distinction**: Admin pages use `--admin-surface` and `--admin-accent` tokens to
visually distinguish them from the user-facing app. This is a UX signal, not a security measure.

---

## Guideline Authoring Workflow

When creating a new component:

1. Restate what the component does in one sentence.
2. Reference the relevant tokens from `DESIGN.md`.
3. Define anatomy (HTML structure), variants, and all 7 states.
4. Write accessibility acceptance criteria (testable with DevTools).
5. Document keyboard behavior.
6. Note any anti-patterns specific to this component.
7. End with a QA checklist for verification.

---

## Anti-Patterns

- Using `alert()`, `confirm()`, or `prompt()` for any user interaction.
- Hardcoding colors not from the design token palette.
- Creating spacing values outside the defined scale.
- Removing `:focus-visible` styles without replacement.
- Using color alone to communicate information (must add icon/text).
- Using `!important` (fix specificity instead).
- Creating global CSS rules outside the root token file.
- Mixing token systems (don't use Tailwind classes alongside CSS modules).

---

## Quality Gates

- [ ] All colors reference CSS custom properties from `DESIGN.md`
- [ ] All spacing uses the defined scale (`--space-*`)
- [ ] All 7 component states are styled
- [ ] `:focus-visible` ring is visible on all interactive elements
- [ ] Contrast ratios pass WCAG 2.2 AA
- [ ] `prefers-reduced-motion` is respected
- [ ] No `!important` declarations
- [ ] No hardcoded hex values in component CSS
