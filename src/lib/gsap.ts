import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/** Media query keys shared by every gsap.matchMedia() call. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
/** Wide and tall enough for pinned / parallax scenes. Mirrored in Work.css. */
export const DESKTOP = "(min-width: 1025px) and (min-height: 700px)";
export const FINE_POINTER = "(hover: hover) and (pointer: fine)";

export function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION).matches;
}

export { gsap, ScrollTrigger, SplitText, useGSAP };
