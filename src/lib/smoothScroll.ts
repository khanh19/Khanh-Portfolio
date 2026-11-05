import Lenis from "lenis";
import { gsap, prefersReducedMotion, ScrollTrigger } from "./gsap";

let lenis: Lenis | null = null;

type SectionHistory = "push" | "replace" | "none";

/**
 * Starts Lenis smooth scrolling driven by GSAP's ticker so ScrollTrigger and
 * Lenis share one frame loop. Also keeps the browser Back/Forward buttons in
 * sync with in-page section navigation. Returns a cleanup function.
 */
export function startSmoothScroll(): () => void {
  const onPopState = (): void => {
    const id = decodeURIComponent(window.location.hash.slice(1)) || "top";
    if (document.getElementById(id)) {
      scrollToSection(id, { history: "none" });
    }
  };
  window.addEventListener("popstate", onPopState);

  if (prefersReducedMotion()) {
    return () => window.removeEventListener("popstate", onPopState);
  }

  const instance = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
  const tick = (time: number): void => instance.raf(time * 1000);

  instance.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  lenis = instance;

  return () => {
    window.removeEventListener("popstate", onPopState);
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

/**
 * Scrolls to a section and moves keyboard focus to it once it arrives.
 * `immediate` jumps without animating (used for links opened with a #hash).
 * Nav clicks push a history entry so Back returns to the previous section;
 * initial hash restores replace the current entry instead.
 */
export function scrollToSection(
  id: string,
  options: { immediate?: boolean; history?: SectionHistory } = {},
): void {
  const target = document.getElementById(id);
  if (!target) return;

  const focusTarget = (): void => target.focus({ preventScroll: true });
  const immediate = options.immediate === true;
  const nextHash = `#${id}`;
  const historyMode: SectionHistory =
    options.history ?? (immediate || window.location.hash === nextHash ? "replace" : "push");

  if (lenis) {
    lenis.scrollTo(target, { duration: 1.2, immediate, force: immediate, onComplete: focusTarget });
    if (immediate) focusTarget();
  } else {
    target.scrollIntoView({ behavior: immediate || prefersReducedMotion() ? "auto" : "smooth" });
    focusTarget();
  }

  if (historyMode === "push") history.pushState(null, "", nextHash);
  else if (historyMode === "replace") history.replaceState(null, "", nextHash);
}

/** Smooth-scrolls to an absolute page offset (e.g. a point inside a pinned scene). */
export function scrollToY(y: number): void {
  if (lenis) lenis.scrollTo(y, { duration: 1.4 });
  else window.scrollTo({ top: y, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}
