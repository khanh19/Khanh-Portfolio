import type { RefObject } from "react";
import { gsap, MOTION_OK, SplitText, useGSAP } from "../lib/gsap";

const TOGGLE = "play none none reverse";

/**
 * Shared scroll-in motion for a section: `.section-title` letters rise out of
 * a mask, and every `[data-reveal]` element fades up. Content is fully
 * visible by default, so reduced-motion users (and no-JS) see everything.
 */
export function useSectionReveal(scope: RefObject<HTMLElement | null>): void {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        root.querySelectorAll<HTMLElement>(".section-title").forEach((title) => {
          SplitText.create(title, {
            type: "chars,lines",
            mask: "lines",
            autoSplit: true,
            onSplit: (split) =>
              gsap.from(split.chars, {
                yPercent: 120,
                rotate: 8,
                duration: 0.9,
                stagger: 0.025,
                ease: "power3.out",
                scrollTrigger: { trigger: title, start: "top 85%", toggleActions: TOGGLE },
              }),
          });
        });

        // Opacity only (not autoAlpha): `visibility: hidden` would make links and
        // buttons unfocusable until scrolled to, so keyboard users would skip them.
        const reveals = new Map<Element, gsap.core.Tween>();
        root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
          reveals.set(
            el,
            gsap.from(el, {
              y: 48,
              opacity: 0,
              duration: 1,
              ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 88%", toggleActions: TOGGLE },
            }),
          );
        });

        // A focused element must never be invisible: finish its reveal at once.
        const onFocusIn = (event: FocusEvent): void => {
          const target = event.target instanceof Element ? event.target.closest("[data-reveal]") : null;
          const tween = target ? reveals.get(target) : undefined;
          if (tween && tween.progress() < 1) tween.progress(1);
        };
        root.addEventListener("focusin", onFocusIn);
        return () => root.removeEventListener("focusin", onFocusIn);
      });
    },
    { scope },
  );
}
