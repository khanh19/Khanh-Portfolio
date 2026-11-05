/**
 * Scroll-driven state for the Work section's headset intro. GSAP writes it
 * (Work.tsx), the lazy three.js scene reads it every frame. No three.js
 * imports here so the main bundle can write it.
 *  - turn: 0 → headset seen from the side, 1 → seen from behind (lenses).
 *  - zoom: 0 → full headset in view, 1 → camera inside the left lens.
 */
export const headsetProgress = { turn: 0, zoom: 0 };
