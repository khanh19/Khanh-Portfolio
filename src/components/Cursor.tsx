import { useRef } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { FINE_POINTER, gsap, MOTION_OK, useGSAP } from "../lib/gsap";
import "./Cursor.css";

const INTERACTIVE = "a, button, [data-cursor='hover']";

/**
 * A soft ring that trails the pointer and swells over interactive elements.
 * Only mounted for mouse/trackpad users who haven't asked for reduced motion;
 * the native cursor stays visible so nothing about pointing changes.
 */
function CursorRing() {
  const ring = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = ring.current;
    if (!el) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.45, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.45, ease: "power3.out" });

    const onMove = (event: PointerEvent): void => {
      if (event.pointerType !== "mouse") return;
      el.classList.add("is-visible");
      xTo(event.clientX);
      yTo(event.clientY);
      const target = event.target instanceof Element ? event.target : null;
      el.classList.toggle("is-hovering", Boolean(target?.closest(INTERACTIVE)));
    };
    const onLeave = (): void => el.classList.remove("is-visible");

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  });

  return <div ref={ring} className="cursor" aria-hidden="true" />;
}

export default function Cursor() {
  const isFinePointer = useMediaQuery(FINE_POINTER);
  const motionOk = useMediaQuery(MOTION_OK);
  return isFinePointer && motionOk ? <CursorRing /> : null;
}
