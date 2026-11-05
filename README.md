# Khanh Pham — Portfolio

Personal portfolio for Khanh Pham, software engineer. Built with React 19, TypeScript (strict), Vite, GSAP, and Lenis.

## Scripts

| Command             | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Start the dev server                           |
| `npm run typecheck` | Strict TypeScript check (`tsc`, no emit)       |
| `npm run lint`      | oxlint (react, typescript, a11y) — warnings fail |
| `npm run build`     | Typecheck, then production build to `dist/`    |
| `npm run preview`   | Serve the production build locally             |

## Editing content

All copy — profile, stats, career, projects, skills, links — lives in
[`src/data/portfolio.ts`](src/data/portfolio.ts). Project images are in `src/assets/projects/`.

## Look & feel

A sky behind the whole page with a **day / night** switch (moon/sun button in the nav). Day: pale blue sky, navy ink. Night: starry navy sky with twinkling stars and starlight-gold accents. The first visit follows the OS setting; a click is remembered (`localStorage` key `kp-theme`), and an inline script in `index.html` applies it before first paint so there's no flash.

- Colours are tokens in `src/index.css` (`:root` for day, `:root[data-theme="dark"]` for night). `.glass` is the liquid-glass surface used by the nav pill, buttons and cards.
- Both skies (`src/assets/sky-day.webp`, `sky-night.webp`) are generated procedurally — original, no stock photos.
- The 3D avatar's lights and desk glow ease between day and night presets (`createAvatarScene.ts`).

## Motion & responsiveness

- **Loader → hero intro:** counter loader, masked character reveal of the name, rolling role words, a slow sky zoom.
- **3D avatar:** rigged GLB (`public/models/avatar.glb`) rendered with three.js in a lazy-loaded chunk; plays its idle clip and turns the head toward the mouse. Falls back to `src/assets/avatar-fallback.png` without WebGL or if the model fails to load; static under reduced motion. To swap the model, replace the GLB (textures compressed with `gltf-transform webp`) and re-check framing constants in `src/components/avatar/createAvatarScene.ts`.
- **Scroll:** Lenis smooth scrolling synced to GSAP ScrollTrigger; section titles and cards reveal on scroll; the About paragraph lights up word by word; the career rail draws itself.
- **Desk scene:** on screens ≥ 1025 × 700, scrolling into "What I do" raises a standing desk (`src/components/avatar/desk.ts`), turns the avatar to it and blends the arms onto the keyboard with two-bone IK (`armIK.ts`). Driven by `avatarProgress` (`src/lib/avatarProgress.ts`), which `AvatarStage` scrubs with ScrollTrigger; the stage scrolls away as About arrives.
- **Work:** on screens ≥ 1025 × 700 (motion allowed) an original three.js headset (`src/components/headset/`) turns around as you scroll, the camera flies into a lens, and inside each project is one card bent like a curved monitor — drawn as vertical strips on a cylinder (`src/lib/curvedRail.ts`), visual-only, with a flat accessible copy for keyboards and screen readers — and the cards slide sideways as you scroll; a "Skip to projects" button jumps straight in. Everywhere else it's a plain card grid. "More projects" links to GitHub.
- **Cursor:** trailing ring on mouse/trackpad only.
- **Reduced motion:** `prefers-reduced-motion` disables smooth scroll, pinning, the cursor and canvas animation; all content is visible without JavaScript-driven reveals.

The desktop breakpoint is defined once as `DESKTOP` in `src/lib/gsap.ts` and mirrored in `src/components/Work.css` — change both together.
