# AI Transformation and End

## Mission
Create implementation-ready, token-driven UI guidance for AI Transformation and End that is optimized for consistency, accessibility, and fast delivery across content site.

## Brand
- Product/brand: AI Transformation and End
- URL: https://hyscaler.com/
- Audience: readers and knowledge seekers
- Product surface: content site

## Style Foundations
- Visual style: structured, tokenized, content-first
- Main font style: `font.family.primary=Inter`, `font.family.stack=Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif, Apple Color Emoji, Open Sans, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji`, `font.size.base=16px`, `font.weight.base=400`, `font.lineHeight.base=24px`
- Typography scale: `font.size.xs=9px`, `font.size.sm=10px`, `font.size.md=11px`, `font.size.lg=12px`, `font.size.xl=13px`, `font.size.2xl=14px`, `font.size.3xl=15px`, `font.size.4xl=16px`
- Color palette: `color.text.primary=#90a7c0`, `color.text.secondary=#9fb3c8`, `color.text.tertiary=#e8f1f8`, `color.text.inverse=#46586b`, `color.surface.base=#000000`, `color.surface.muted=#123853`, `color.surface.raised=#0e2d49`, `color.surface.strong=#ffffff`, `color.border.default=#e5e7eb`, `color.border.muted=#2a4a6e`
- Spacing scale: `space.1=3px`, `space.2=4px`, `space.3=6px`, `space.4=8px`, `space.5=10px`, `space.6=12px`, `space.7=14px`, `space.8=14.4px`
- Radius/shadow/motion tokens: `shadow.1=rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.08) 1px 2px 40px 0px`, `shadow.2=rgba(0, 194, 255, 0.15) 0px 0px 0px 1px, rgba(0, 194, 255, 0.8) 0px 18px 44px -28px`, `shadow.3=rgba(0, 194, 255, 0.08) 0px 0px 0px 1px, rgba(0, 125, 176, 0.75) 0px 30px 70px -40px` | `motion.duration.instant=150ms`, `motion.duration.fast=200ms`, `motion.duration.normal=250ms`, `motion.duration.slow=260ms`, `motion.duration.slower=300ms`, `motion.duration.step6=400ms`, `motion.duration.step7=1000ms`

## Accessibility
- Target: WCAG 2.2 AA
- Keyboard-first interactions required.
- Focus-visible rules required.
- Contrast constraints required.

## Writing Tone
Concise, confident, implementation-focused.

## Rules: Do
- Use semantic tokens, not raw hex values, in component guidance.
- Every component must define states for default, hover, focus-visible, active, disabled, loading, and error.
- Component behavior should specify responsive and edge-case handling.
- Interactive components must document keyboard, pointer, and touch behavior.
- Accessibility acceptance criteria must be testable in implementation.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.
- Do not ship component guidance without explicit state rules.

## Guideline Authoring Workflow
1. Restate design intent in one sentence.
2. Define foundations and semantic tokens.
3. Define component anatomy, variants, interactions, and state behavior.
4. Add accessibility acceptance criteria with pass/fail checks.
5. Add anti-patterns, migration notes, and edge-case handling.
6. End with a QA checklist.

## Required Output Structure
- Context and goals.
- Design tokens and foundations.
- Component-level rules (anatomy, variants, states, responsive behavior).
- Accessibility requirements and testable acceptance criteria.
- Content and tone standards with examples.
- Anti-patterns and prohibited implementations.
- QA checklist.

## Component Rule Expectations
- Include keyboard, pointer, and touch behavior.
- Include spacing and typography token requirements.
- Include long-content, overflow, and empty-state handling.
- Include known page component density: links (145), lists (35), buttons (14), cards (12), navigation (4), inputs (1).

- Extraction diagnostics: Audience and product surface inference confidence is low; verify generated brand context.

## Quality Gates
- Every non-negotiable rule must use "must".
- Every recommendation should use "should".
- Every accessibility rule must be testable in implementation.
- Teams should prefer system consistency over local visual exceptions.
