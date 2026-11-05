import Lenis from "lenis";
import { gsap, prefersReducedMotion, ScrollTrigger } from "./gsap";

let lenis: Lenis | null = null;

/**
 * Starts Lenis smooth scrolling driven by GSAP's ticker so ScrollTrigger and
 * Lenis share one frame loop. Returns a cleanup function.
 */
export function startSmoothScroll(): () => void {
  if (prefersReducedMotion()) return () => undefined;

  const instance = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
  const tick = (time: number): void => instance.raf(time * 1000);

  instance.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  lenis = instance;

  return () => {
    gsap.ticker.remove(tick);
    gsap.ticker.lagSmoothing(500, 33);
    instance.destroy();
    if (lenis === instance) lenis = null;
  };
}

export function setScrollLocked(locked: boolean): void {
  document.documentElement.classList.toggle("is-scroll-locked", locked);
  if (locked) lenis?.stop();
  else lenis?.start();
}

/** Scrolls to a section and moves keyboard focus to it once it arrives. */
export function scrollToSection(id: string): void {
  const target = document.getElementById(id);
  if (!target) return;

  const focusTarget = (): void => target.focus({ preventScroll: true });

  if (lenis) {
    lenis.scrollTo(target, { duration: 1.2, onComplete: focusTarget });
  } else {
    target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
    focusTarget();
  }
  history.replaceState(null, "", `#${id}`);
}

/** Smooth-scrolls to an absolute page offset (e.g. a point inside a pinned scene). */
export function scrollToY(y: number): void {
  if (lenis) lenis.scrollTo(y, { duration: 1.4 });
  else window.scrollTo({ top: y, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}
