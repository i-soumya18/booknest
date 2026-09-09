# DESIGN.md — BookNest Design System

> Token-driven design guidance for BookNest. Every component, color, and spacing
> decision is defined here. Agents and developers must reference this file when
> building UI — no ad-hoc colors, no magic numbers, no one-off exceptions.

---

## Mission

Create a warm, reading-focused interface that makes book lovers feel at home.
The design must be functional, accessible, and visually refined — not flashy.
Every pixel serves the reading experience.

## Brand

- **Product**: BookNest — Personal Library & Reading Platform
- **Audience**: Book lovers, avid readers, personal library managers
- **Tone**: Warm, inviting, literary. Not corporate, not gamified.
- **Surface**: Full-stack web application (desktop + tablet responsive)

---

## Style Foundations

### Typography

```css
/* Font families */
--font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-reading: 'Literata', 'Georgia', 'Times New Roman', serif;  /* V2: reader content */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Type scale */
--text-xs: 0.75rem;     /* 12px — captions, metadata */
--text-sm: 0.875rem;    /* 14px — secondary text, labels */
--text-base: 1rem;      /* 16px — body text */
--text-lg: 1.125rem;    /* 18px — emphasized body */
--text-xl: 1.25rem;     /* 20px — section headings */
--text-2xl: 1.5rem;     /* 24px — page headings */
--text-3xl: 1.875rem;   /* 30px — hero headings */

/* Font weights */
--weight-normal: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;

/* Line heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
--leading-reading: 1.8;  /* V2: reader content for eye comfort */
```

### Color Palette — Light Theme (Default)

```css
/* Surfaces */
--surface-base: #faf8f5;        /* warm off-white, main background */
--surface-card: #ffffff;         /* cards, panels */
--surface-raised: #f5f0eb;      /* slightly elevated sections */
--surface-muted: #efe9e1;       /* disabled/inactive backgrounds */
--surface-overlay: rgba(0, 0, 0, 0.5);  /* modal backdrop */

/* Text */
--text-primary: #2c1810;        /* deep brown, primary text */
--text-secondary: #6b5a4e;      /* warm gray, secondary text */
--text-tertiary: #9c8b7e;       /* lighter warm gray, captions */
--text-inverse: #faf8f5;        /* light text on dark backgrounds */
--text-link: #b45309;           /* amber-700, links and interactive text */

/* Brand / accent */
--accent-primary: #b45309;      /* amber-700, primary actions */
--accent-primary-hover: #92400e; /* amber-800, hover state */
--accent-secondary: #065f46;    /* emerald-800, success / secondary */
--accent-danger: #b91c1c;       /* red-700, destructive actions */
--accent-danger-hover: #991b1b; /* red-800 */

/* Borders */
--border-default: #e5ddd4;      /* warm gray border */
--border-muted: #efe9e1;        /* subtle dividers */
--border-focus: #b45309;        /* focus ring — same as accent */

/* Status */
--status-reading: #059669;      /* emerald-600 */
--status-want: #2563eb;         /* blue-600 */
--status-finished: #7c3aed;     /* violet-600 */
--status-lent: #d97706;         /* amber-600 */
```

### Color Palette — Dark Theme

```css
--surface-base: #1a1a2e;
--surface-card: #16213e;
--surface-raised: #0f3460;
--surface-muted: #1a1a2e;
--surface-overlay: rgba(0, 0, 0, 0.7);

--text-primary: #e8e1d9;
--text-secondary: #a89b8c;
--text-tertiary: #7a6e62;
--text-inverse: #1a1a2e;
--text-link: #fbbf24;

--accent-primary: #fbbf24;
--accent-primary-hover: #f59e0b;
--accent-secondary: #34d399;
--accent-danger: #f87171;
--accent-danger-hover: #ef4444;

--border-default: #2a3a5e;
--border-muted: #1e2d4d;
--border-focus: #fbbf24;
```

### Color Palette — Sepia Theme (V2 Reader)

```css
--surface-base: #f4ecd8;
--surface-card: #faf5e8;
--surface-raised: #efe5cc;
--text-primary: #5b4636;
--text-secondary: #7a6555;
--text-link: #8b5e3c;
--accent-primary: #8b5e3c;
--border-default: #d4c4a8;
```

### V2 Reader-Specific Tokens

```css
/* Highlight colors (annotation palette) */
--highlight-yellow: rgba(255, 235, 59, 0.35);
--highlight-green: rgba(76, 175, 80, 0.35);
--highlight-blue: rgba(66, 165, 245, 0.35);
--highlight-pink: rgba(236, 64, 122, 0.35);
--highlight-purple: rgba(171, 71, 188, 0.35);

/* Eye safety */
--eye-safety-filter: sepia(0%);           /* 0% = off, 100% = max warm */
--eye-safety-brightness: brightness(100%); /* 50%–100% range */

/* Focus mode */
--focus-max-width: 680px;      /* centered reading column */
--focus-bg: var(--surface-base);
--focus-transition: 300ms ease-in-out;

/* Reader toolbar */
--reader-toolbar-height: 48px;
--reader-toolbar-bg: var(--surface-card);
--reader-sidebar-width: 320px;

/* Reader progress bar */
--reader-progress-height: 3px;
--reader-progress-color: var(--accent-primary);
--reader-progress-bg: var(--border-muted);
```

### V2 Admin Dashboard Tokens

```css
/* Admin-specific surfaces */
--admin-surface: #f8fafc;       /* slightly cooler than main app */
--admin-card: #ffffff;
--admin-header: #1e293b;        /* dark header for admin distinction */
--admin-accent: #3b82f6;        /* blue-500, admin-specific accent */

/* Status badges (user management) */
--badge-active: #059669;
--badge-deactivated: #dc2626;
--badge-pending: #d97706;
```

### Spacing

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### Radius

```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;
```

### Shadows

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
--shadow-focus: 0 0 0 3px rgba(180, 83, 9, 0.3); /* accent ring */
```

### Motion

```css
--duration-fast: 150ms;
--duration-normal: 250ms;
--duration-slow: 350ms;
--duration-page-turn: 400ms;  /* V2: reader page turn animation */
--easing-default: cubic-bezier(0.4, 0, 0.2, 1);
--easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

---

## Accessibility

- **Target**: WCAG 2.2 AA compliance.
- **Contrast**: All text must meet 4.5:1 ratio (body) / 3:1 ratio (large text, UI).
- **Focus**: Every interactive element must have a visible `:focus-visible` ring
  using `--shadow-focus`. No outline removal without replacement.
- **Keyboard**: All features must be operable via keyboard alone. Tab order must
  be logical. Escape closes modals/panels. Arrow keys navigate reader pages.
- **Screen readers**: Use semantic HTML (`<nav>`, `<main>`, `<article>`, `<button>`).
  ARIA labels on icon-only buttons. Live regions for toasts/notifications.
- **Reduced motion**: Respect `prefers-reduced-motion`. Disable page-turn animations,
  reading timer visual effects, and micro-animations when enabled.

---

## Component Standards

### Every component must define:

1. **States**: default, hover, focus-visible, active, disabled, loading, error
2. **Responsive behavior**: how it adapts from desktop → tablet (no mobile requirement yet)
3. **Edge cases**: empty state, long content/overflow, error state
4. **Keyboard behavior**: tab order, Enter/Space activation, Escape dismissal
5. **Tokens only**: no hardcoded colors, spacing, or font sizes — use tokens above

### State Color Mapping

| State | Background | Border | Text |
|---|---|---|---|
| Default | `--surface-card` | `--border-default` | `--text-primary` |
| Hover | `--surface-raised` | `--border-default` | `--text-primary` |
| Focus | `--surface-card` | `--border-focus` + `--shadow-focus` | `--text-primary` |
| Active | `--accent-primary` | `--accent-primary` | `--text-inverse` |
| Disabled | `--surface-muted` | `--border-muted` | `--text-tertiary` |
| Error | `--surface-card` | `--accent-danger` | `--accent-danger` |
| Loading | `--surface-card` | `--border-muted` | `--text-tertiary` |

---

## V2 Component Specs

### File Upload Dropzone

```
┌──────────────────────────────────────────┐
│                                          │
│        📄  Drop your book here           │
│                                          │
│     or  [Browse files]                   │
│                                          │
│     PDF, EPUB — up to 100MB              │
│                                          │
└──────────────────────────────────────────┘
```

- **Default**: dashed border (`--border-default`), warm background (`--surface-raised`)
- **Drag-over**: solid border (`--accent-primary`), subtle pulse animation
- **Uploading**: progress bar replaces instruction text, percentage shown
- **Success**: green check + file card replaces dropzone
- **Error**: red border + error message below dropzone
- **Keyboard**: focusable, Enter/Space opens file picker

### File Card (uploaded book)

```
┌────────┬────────────────────────────────┐
│ [icon] │  filename.pdf                  │
│  PDF   │  12.4 MB · 342 pages           │
│        │  Uploaded just now      [  ✕  ] │
└────────┴────────────────────────────────┘
```

- **Icon**: format-specific (PDF red, EPUB blue)
- **Remove button**: hover reveals, confirmation dialog before delete
- **Tokens**: `--surface-card` bg, `--radius-lg`, `--shadow-sm`

### Reader Toolbar

```
[←] [→]   Page 42 of 342   [━━━━━━━━━░░░]   [🔍] [📑] [✏️] [📝] [🎨] [⛶] [⚙]
```

- Height: `--reader-toolbar-height`
- Background: `--reader-toolbar-bg`
- Auto-hides after 3 seconds of inactivity (show on mouse move or keyboard)
- Focus mode: toolbar completely hidden, ESC to restore

### Reader Sidebar (Highlights/Notes/Bookmarks/TOC)

- Width: `--reader-sidebar-width`
- Slides in from right with `--duration-normal` transition
- Tabs: TOC | Highlights | Notes | Bookmarks
- Each tab shows scrollable list with page-linked items
- Click item → reader navigates to that page

### Highlight Popover

```
  ┌────────────────────────────────────┐
  │  🟡 🟢 🔵 🩷 🟣                    │
  │  [Add note]            [Delete]    │
  └────────────────────────────────────┘
```

- Appears above selected text
- Five color circles, click to apply/change
- Positioned with CSS anchor positioning (fallback: absolute)

### Admin Dashboard Cards

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  👥 1,247    │  │  📚 3,892    │  │  💾 24.6 GB  │  │  📖 342      │
│  Total Users │  │  Total Books │  │  Storage Used│  │  Active Now  │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

- Background: `--admin-card`
- Accent border-left with `--admin-accent`
- Number: `--text-2xl`, `--weight-bold`
- Label: `--text-sm`, `--text-secondary`

### Admin User Table

```
┌────────────────────────────────────────────────────────────────┐
│ Name          │ Email              │ Status  │ Books │ Actions │
├───────────────┼────────────────────┼─────────┼───────┼─────────┤
│ Alice Owner   │ alice@example.com  │ ● Active│ 12    │ [⚙]    │
│ Bob Borrower  │ bob@example.com    │ ● Active│ 5     │ [⚙]    │
└────────────────────────────────────────────────────────────────┘
```

- Status badge: green dot (`--badge-active`) or red dot (`--badge-deactivated`)
- Actions dropdown: Deactivate, Reset Password, View Activity
- Searchable header with real-time filtering
- Paginated (server-side)

---

## Anti-Patterns

Do NOT:

- Use raw hex colors instead of CSS custom properties
- Create one-off spacing values not in the spacing scale
- Use `opacity: 0` to "hide" elements instead of proper conditional rendering
- Use `!important` to override styles (fix the specificity instead)
- Ship a component without all 7 states defined
- Use `alert()` or `confirm()` for user interaction
- Use placeholder text as the only label for form inputs
- Remove focus outlines without adding a visible replacement
- Use color alone to communicate status (add icons/text)
- Auto-play animations without respecting `prefers-reduced-motion`

---

## Quality Gates

- Every non-negotiable rule uses "must".
- Every recommendation uses "should".
- Every accessibility rule is testable with browser DevTools.
- Token consistency is verified: grep for hardcoded hex values not in this file.
- Component states are verified: each component has default/hover/focus/active/disabled/loading/error.
