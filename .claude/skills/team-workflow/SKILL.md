---
name: team-workflow
description: Run a feature request through a simulated cross-functional team — Product Owner scopes acceptance criteria, Staff Frontend Engineer implements in strict React/TypeScript, QA Engineer verifies with typecheck, lint, build, and real-browser checks, looping up to 3 times before Product Owner sign-off. Use when the user asks to build or change something in this portfolio "with the team workflow" or invokes /team-workflow.
argument-hint: <requirements and goals>
---

# Team workflow: Scope → Build → QA → Sign-off

Requirements for this run: $ARGUMENTS

If no requirements were given, ask the user what to build before doing anything else.

Work through the phases below in order. Head each phase in your reply with its role
(e.g. `## 🧭 Product Owner — Scope`) so the user can follow along. Do the work for real in
the repo — edit files, run commands — rather than only printing code in chat.

## 1. SCOPE — Product Owner

1. Read the relevant code first (`src/data/portfolio.ts` holds all site content; sections live
   in `src/components/`, shared motion setup in `src/lib/gsap.ts`).
2. Gather any source material the request points to (resume, links). Treat it as the only
   source of truth for factual claims about Khanh — never invent metrics, titles, or scope.
3. Output a numbered list of **technical acceptance criteria**. Always include:
   - Strict TypeScript, zero `any` / casts / non-null assertions / lint suppressions.
   - Responsive from 320px to 1920px with no horizontal page scroll.
   - `prefers-reduced-motion` respected; content visible without scroll-triggered reveals.
   - Accessibility: semantic landmarks, keyboard reachable, visible focus, alt text.
   - All quality gates in step 3 pass.

## 2. IMPLEMENT — Staff Frontend Engineer

- Match existing conventions: one component + co-located `.css` per section, content in
  `src/data/portfolio.ts`, readonly typed data, BEM-style class names, CSS tokens from
  `src/index.css`.
- Animations: GSAP via `src/lib/gsap.ts` (`useGSAP`, `gsap.matchMedia()` with the exported
  `MOTION_OK` / `DESKTOP` / `FINE_POINTER` queries). Known pitfalls in this codebase:
  - In `SplitText.create({ autoSplit: true, onSplit })`, **return** a standalone tween from
    `onSplit`; never add to a timeline that may already have finished.
  - `fromTo` inside looping timelines needs `immediateRender: false` if it would hide
    something that should be visible at start.
  - A leftover `transform` (or `backdrop-filter`) on an ancestor traps `position: fixed`
    children — use `clearProps` or the individual `translate`/`scale` CSS properties.
  - `DESKTOP` in `src/lib/gsap.ts` is mirrored in `src/components/Work.css`; change both.
  - Never let an intro tween and a scroll-scrubbed tween animate the same property on the
    same element — the scrub records the intro's hidden start state. Give each property
    one owner (e.g. the hero avatar fades in via CSS, the scrub owns its scroll exit).
  - three.js lives only in lazy chunks (`Avatar`, `HeadsetCanvas`); never import `three`
    (not even `MathUtils`) from eagerly loaded components — use `gsap.utils` instead.
  - Stacked, invisible layers (opacity 0) still catch clicks. Gate `pointer-events` on
    whatever is actually showing, and test clicks with `elementFromPoint`.
    A child with `pointer-events: auto` still gets clicks inside a `pointer-events: none`
    parent, so gate the children too. Transparent full-screen containers layered over interactive
    content need `pointer-events: none` themselves.
  - Elements that GSAP scroll-reveals get inline `opacity`; don't also drive their
    visibility from CSS states (e.g. `:focus-within`) — the inline style wins.
  - 3D CSS: `perspective` must sit on the transformed elements' direct parent, and any
    `filter` on an ancestor flattens 3D into 2D — even `blur(0px)`.
  - The headset lens colour is shared: `LENS_COLOR` (createHeadsetScene.ts) ↔ `--lens-bg`
    (Work.css). The zoom hand-off is only seamless if they match.
  - Two themes: every colour must be a token defined for both `:root` and
    `:root[data-theme="dark"]`. Check contrast and screenshots in BOTH themes (the sweep
    includes `dark` and `dark-mobile`). `--accent-soft` is decoration only.
  - `index.html` duplicates the theme storage key and theme-color values from
    `src/lib/theme.ts` (pre-paint script) — change both together.
  - Reveal animations must use `opacity`, not `autoAlpha`, on anything containing links or
    buttons — `visibility: hidden` removes them from the Tab order.
- Do not commit unless the user asks.

## 3. EVALUATE — QA Engineer (be brutal)

Run every gate; any failure is a rejection.

```bash
npm run typecheck          # tsc, strict, no emit
npm run lint               # oxlint --deny-warnings (react, typescript, jsx-a11y)
npm run build              # tsc && vite build
grep -rnE "\bas [A-Z]|: any\b|<any>|@ts-|oxlint-disable|eslint-disable|[a-zA-Z)\]]!\." src | grep -v "^src/types"   # must print nothing
```

Then verify in a real browser with the bundled sweep script:

```bash
npm run build && npx vite preview --port 4173 --strictPort   # run in background
# Install playwright-core once into the scratchpad (not the project):
npm i --prefix "<scratchpad>" playwright-core
cp .claude/skills/team-workflow/qa/browser-sweep.mjs "<scratchpad>/"
node "<scratchpad>/browser-sweep.mjs" http://localhost:4173 "<scratchpad>/shots"
```

The sweep loads the site at mobile, small-phone, tablet, laptop, short-laptop, desktop and
reduced-motion settings; scrolls through every `section[id]`; and reports console errors,
horizontal overflow, loader time, and any `[data-reveal]` / `.section-title` left hidden.
It saves a screenshot per section per viewport.

- **Look at the screenshots** (Read the PNGs) for anything you changed — clipped content,
  overlap, missing text, broken icons. Static checks do not catch layout bugs.
- For new interactions (menus, buttons, forms), write a small targeted Playwright check in
  the scratchpad and assert the behaviour (state, focus, aria attributes).
- Review the diff for: typing shortcuts, missing cleanup of listeners/animations, content
  that is not backed by the source material, a11y regressions, and dead code.
- Stop the preview server when done (`pkill -f "vite preview --port 4173"`).

Output a findings list: each issue, why it matters, and severity.

## 4. REFINE — loop (max 3 rounds)

If QA found anything, the Engineer fixes it, then QA re-runs **all** of step 3. Repeat up to
3 rounds. If issues remain after round 3, stop and report them honestly instead of signing off.

## 5. SIGN-OFF — Product Owner

Check the result against the original goals and acceptance criteria, then give a Go/No-Go
with:
- A table of each criterion and its verified status.
- What QA caught and how it was fixed.
- Where the changes live (files), not full code dumps.
- Any open questions or assumptions the user should confirm.
