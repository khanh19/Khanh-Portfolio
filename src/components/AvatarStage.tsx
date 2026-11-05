import { lazy, Suspense, useRef } from "react";
import { avatarProgress } from "../lib/avatarProgress";
import { DESKTOP, gsap, MOTION_OK, useGSAP } from "../lib/gsap";
import "./AvatarStage.css";

// three.js + the model are ~200 kB gzipped; keep them out of the main bundle.
const Avatar = lazy(() => import("./Avatar"));

/**
 * Hosts the 3D avatar. On roomy desktops (motion allowed) the stage is fixed
 * to the viewport so the avatar can walk from the hero to the desk scene beside
 * "What I do" (the second section), then scroll away once About arrives. Everywhere else it simply
 * sits in the hero and scrolls with the page.
 */
export default function AvatarStage() {
  const stage = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Triggers are sibling sections, so look them up on the document rather
      // than inside this component's scope.
      const services = document.getElementById("services");
      const about = document.getElementById("about");
      if (!services || !about) return;

      const mm = gsap.matchMedia();
      mm.add(`${MOTION_OK} and ${DESKTOP}`, () => {
        gsap.fromTo(
          avatarProgress,
          { value: 0 },
          {
            value: 1,
            ease: "none",
            scrollTrigger: { trigger: services, start: "top bottom", end: "top 10%", scrub: 0.8 },
          },
        );
        gsap.fromTo(
          stage.current,
          { yPercent: 0 },
          {
            yPercent: -100,
            ease: "none",
            scrollTrigger: { trigger: about, start: "top bottom", end: "top top", scrub: true },
          },
        );
      });
    },
    { scope: stage },
  );

  return (
    <div ref={stage} className="avatar-stage">
      <div className="avatar-stage__frame">
        <Suspense fallback={null}>
          <Avatar />
        </Suspense>
      </div>
    </div>
  );
}
