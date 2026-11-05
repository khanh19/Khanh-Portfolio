import { lazy, Suspense, useRef, useState } from "react";
import { projects, socials, type Project } from "../data/portfolio";
import { useSectionReveal } from "../hooks/useSectionReveal";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { DESKTOP, gsap, MOTION_OK, ScrollTrigger, useGSAP } from "../lib/gsap";
import { headsetProgress } from "../lib/headsetProgress";
import { clearRail, layoutRail, placeRail, type RailCard } from "../lib/curvedRail";
import { scrollToY } from "../lib/smoothScroll";
import { isWebGLAvailable } from "../lib/webgl";
import "./Work.css";

const github = socials.find((social) => social.label === "GitHub");

// three.js stays out of the main bundle; only roomy, motion-friendly screens load it.
const HeadsetCanvas = lazy(() => import("./headset/HeadsetCanvas"));

/** Scroll units on the scene timeline (1 unit ≈ SCROLL_PER_UNIT of the viewport height). */
const TURN_END = 3;
const ZOOM_END = 4.6;
const INSIDE_AT = 4.9;
/** Scroll units spent travelling from one card to the next on the curved rail. */
const UNITS_PER_CARD = 2.2;
const SCROLL_PER_UNIT = 0.5;
/** Cylinder radius as a share of the viewport width (smaller = stronger curve). */
const RADIUS_VW = 0.78;
const RAIL_GAP = 72;
/** Vertical strips per card; more = smoother curve. */
const SLICES = 18;

/** Phones, tablets and short screens (motion allowed): headset intro only, then the plain card list. */
const PHONE_INTRO = "(prefers-reduced-motion: no-preference) and (max-width: 1024px), (prefers-reduced-motion: no-preference) and (max-height: 699px)";
/** Phone timeline (scroll units): turn, zoom into the lens, brief dark "inside", then fade open. */
const PHONE_LENS_IN = ZOOM_END + 0.3;
const PHONE_OPEN_AT = 5.3;
const PHONE_OPEN_END = 6.1;
/**
 * Trailing scroll after the lens opens, while the card list slides up under the
 * returning heading. Matches the list's negative margin in Work.css (about 70%
 * of the screen at SCROLL_PER_UNIT = 0.5 per unit).
 */
const PHONE_LIST_RISE = 1.45;
const PHONE_TOTAL = PHONE_OPEN_END + PHONE_LIST_RISE;

interface CardContentProps {
  /** False for the visual strips: their links stay clickable but leave the Tab order. */
  focusable: boolean;
}

function ProjectContent({ project, index, focusable }: CardContentProps & { project: Project; index: number }) {
  const tabIndex = focusable ? undefined : -1;
  return (
    <>
      <div className="project__body">
        <p className="project__meta">
          <span aria-hidden="true">0{index + 1}</span>
          <span>
            {project.context} · {project.year}
          </span>
        </p>
        <h3 className="project__name">{project.name}</h3>
        <p className="project__description">{project.description}</p>
        <p className="project__contribution">
          <strong>My part:</strong> {project.contribution}
        </p>
        <ul className="project__stack" aria-label={`${project.name} tech stack`}>
          {project.stack.map((tech) => (
            <li key={tech} className="chip">
              {tech}
            </li>
          ))}
        </ul>
        <ul className="project__links">
          {project.links.map((link) => (
            <li key={link.href}>
              <a className="project__link" href={link.href} target="_blank" rel="noopener noreferrer" tabIndex={tabIndex}>
                {link.label}
                <span aria-hidden="true"> ↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
      <div className={`project__media project__media--${project.imageFit}`}>
        <img src={project.image} alt={focusable ? project.imageAlt : ""} loading="lazy" decoding="async" />
      </div>
    </>
  );
}

function MoreContent({ href, focusable }: CardContentProps & { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="project__more-link" tabIndex={focusable ? undefined : -1}>
      <span className="project__more-label">More projects</span>
      <span className="project__more-sub">github.com/khanh19</span>
      <span className="project__more-arrow" aria-hidden="true">
        →
      </span>
      <span className="sr-only"> on GitHub (opens in a new tab)</span>
    </a>
  );
}

export default function Work() {
  const root = useRef<HTMLElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  // Without WebGL there's no headset to show, so every screen gets the plain list.
  const [hasWebGL] = useState(isWebGLAvailable);
  const immersive = useMediaQuery(`${MOTION_OK} and ${DESKTOP}`) && hasWebGL;
  const introOnly = useMediaQuery(PHONE_INTRO) && hasWebGL;
  const showHeadset = immersive || introOnly;
  const windowCount = projects.length + (github ? 1 : 0);
  const railUnits = (windowCount - 1) * UNITS_PER_CARD;
  const railStart = INSIDE_AT + 0.6;
  const totalUnits = railStart + railUnits + 1.8;
  useSectionReveal(root);

  useGSAP(
    () => {

      // Desktop: pin the stage. The headset turns, the camera flies into a lens,
      // and inside it the projects sit on a curved strip wrapped around the
      // viewer, which scrolls sideways as you scroll down.
      // Built from React's layout state (not a separate media query) so it only
      // runs once the matching markup is mounted — e.g. after a resize/rotate.
      if (!immersive) return;
      const lens = root.current?.querySelector<HTMLElement>(".work__lens") ?? null;
      // Perspective must sit on the strips' own parent, and nothing in that chain may
      // use `filter` — either would flatten the curve into 2D.
      const track = root.current?.querySelector<HTMLElement>(".work__curve") ?? null;
      const cardEls = gsap.utils.toArray<HTMLElement>(".rail-card");
      const cardSlices = (): HTMLElement[][] => cardEls.map((card) => [...card.querySelectorAll<HTMLElement>(".rail-slice")]);
      const accessible = gsap.utils.toArray<HTMLElement>(".work__track > .project");
      const dots = gsap.utils.toArray<HTMLElement>(".work__dot");
      const rail: { offset: number; cards: RailCard[]; radius: number; inside: boolean } = {
        offset: 0,
        cards: layoutRail(cardSlices(), RAIL_GAP),
        radius: window.innerWidth * RADIUS_VW,
        inside: false,
      };
      const railLength = (): number => {
        const last = rail.cards[rail.cards.length - 1];
        const first = rail.cards[0];
        return last && first ? last.center - first.center : 0;
      };
      const relayout = (): void => {
        rail.cards = layoutRail(cardSlices(), RAIL_GAP);
        rail.radius = window.innerWidth * RADIUS_VW;
        if (track) track.style.perspective = `${rail.radius}px`;
      };
      const render = (): void => {
        const nearest = placeRail(rail.cards, rail.offset, rail.radius, rail.inside);
        dots.forEach((dot, i) => dot.classList.toggle("is-active", i === nearest));
      };
      relayout();
      render();

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: ".work__pin",
          start: "top top",
          end: () => `+=${window.innerHeight * SCROLL_PER_UNIT * totalUnits}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onRefresh: () => {
            relayout();
            render();
          },
          onUpdate: (self) => {
            const time = self.progress * totalUnits;
            // Hidden layers must not catch clicks: the lens and its strips only once entered.
            const inside = time > INSIDE_AT;
            lens?.classList.toggle("is-inside", inside);
            if (inside !== rail.inside) {
              rail.inside = inside;
              render();
            }
            // While "inside" the dark lens, the nav switches to night ink so it stays readable.
            document.documentElement.classList.toggle("is-immersive", time > ZOOM_END && time < totalUnits - 1);
          },
        },
      });
      triggerRef.current = tl.scrollTrigger ?? null;

      tl.fromTo(headsetProgress, { turn: 0 }, { turn: 1, duration: TURN_END }, 0)
        .fromTo(headsetProgress, { zoom: 0 }, { zoom: 1, duration: ZOOM_END - TURN_END, ease: "power2.in" }, TURN_END)
        .to(".work__intro", { opacity: 0, y: -40, duration: 1 }, TURN_END - 0.4)
        .fromTo(".work__lens", { opacity: 0 }, { opacity: 1, duration: INSIDE_AT - ZOOM_END }, ZOOM_END)
        .to(".work__stage", { opacity: 0, duration: 0.2 }, INSIDE_AT)
        // The strip resolves out of the dark as your eyes "adjust" to the headset.
        .fromTo(".work__curve", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.7, ease: "power2.out" }, INSIDE_AT)
        // Scroll down → the curved strip slides sideways around you.
        .fromTo(rail, { offset: 0 }, { offset: railLength, duration: railUnits, onUpdate: render }, railStart)
        // Take the headset off: the lens view shrinks into a framed screen before the page moves on.
        .to(".work__lens", { clipPath: "inset(7vh 6vw round 36px)", duration: 1.2, ease: "power2.inOut" }, totalUnits - 1.2);

      // Keyboard users tab through the flat accessible cards: bring that card to
      // the front (CSS shows the focused flat copy over its curved strips).
      const onFocusIn = (event: FocusEvent): void => {
        const trigger = triggerRef.current;
        const el = event.target instanceof Element ? event.target.closest<HTMLElement>(".work__track > .project") : null;
        const card = el ? rail.cards[accessible.indexOf(el)] : undefined;
        const first = rail.cards[0];
        const length = railLength();
        if (!trigger || !card || !first || length === 0) return;
        const time = railStart + ((card.center - first.center) / length) * railUnits;
        scrollToY(trigger.start + (trigger.end - trigger.start) * (time / totalUnits));
      };
      root.current?.addEventListener("focusin", onFocusIn);

      return () => {
        root.current?.removeEventListener("focusin", onFocusIn);
        triggerRef.current = null;
        clearRail(rail.cards);
        track?.style.removeProperty("perspective");
        document.documentElement.classList.remove("is-immersive");
        headsetProgress.turn = 0;
        headsetProgress.zoom = 0;
      };
    },
    { scope: root, dependencies: [totalUnits, railUnits, railStart, immersive], revertOnUpdate: true },
  );

  // Phones & short screens: the same headset turn and zoom into the lens, a
  // brief dark "inside" beat, then it fades open onto the normal card list
  // (which sits after the pinned stage and scrolls as usual).
  useGSAP(
    () => {
      if (!introOnly) return;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: ".work__pin",
          start: "top top",
          end: () => `+=${window.innerHeight * SCROLL_PER_UNIT * PHONE_TOTAL}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const time = self.progress * PHONE_TOTAL;
            document.documentElement.classList.toggle("is-immersive", time > ZOOM_END && time < PHONE_OPEN_AT + 0.4);
          },
        },
      });
      triggerRef.current = tl.scrollTrigger ?? null;

      tl.fromTo(headsetProgress, { turn: 0 }, { turn: 1, duration: TURN_END }, 0)
        .fromTo(headsetProgress, { zoom: 0 }, { zoom: 1, duration: ZOOM_END - TURN_END, ease: "power2.in" }, TURN_END)
        .to(".work__intro", { opacity: 0, y: -30, duration: 1 }, TURN_END - 0.4)
        // The scroll hint and Skip button don't come back with the heading
        // (autoAlpha on Skip also takes it out of the Tab order once used up).
        .to(".work__lede", { opacity: 0, duration: 0.01 }, TURN_END + 0.6)
        .to(".work__skip", { autoAlpha: 0, duration: 0.01 }, TURN_END + 0.6)
        .fromTo(".work__lens", { opacity: 0 }, { opacity: 1, duration: PHONE_LENS_IN - ZOOM_END }, ZOOM_END)
        .to(".work__stage", { opacity: 0, duration: 0.1 }, PHONE_LENS_IN)
        // "Open your eyes": the lens fades away and the heading returns as the
        // title of the list, which then slides up beneath it (no empty screen).
        .to(".work__lens", { opacity: 0, duration: PHONE_OPEN_END - PHONE_OPEN_AT, ease: "power1.inOut" }, PHONE_OPEN_AT)
        .to(".work__intro", { opacity: 1, y: 0, duration: PHONE_OPEN_END - PHONE_OPEN_AT }, PHONE_OPEN_AT)
        // Hold while the list rises (its overlap is set in Work.css).
        .to({}, { duration: PHONE_LIST_RISE }, PHONE_OPEN_END);

      return () => {
        triggerRef.current = null;
        document.documentElement.classList.remove("is-immersive");
        headsetProgress.turn = 0;
        headsetProgress.zoom = 0;
      };
    },
    { scope: root, dependencies: [introOnly], revertOnUpdate: true },
  );

  const skipIntro = (): void => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    // Desktop: jump inside the lens. Phones: to where the list sits under the heading.
    scrollToY(immersive ? trigger.start + (trigger.end - trigger.start) * (railStart / totalUnits) : trigger.end);
  };

  // Accessible cards: the real content for screen readers, keyboards and
  // (outside the desktop immersive layout) everyone. On desktop they live inside
  // the lens; elsewhere they follow the pinned intro as a normal list.
  const cards = (
    <ul className="work__track">
      {projects.map((project, index) => (
        // No scroll reveal in the immersive layout: its inline opacity would
        // override the focus styles that show these flat copies.
        <li key={project.slug} className="project" data-reveal={immersive ? undefined : ""}>
          <ProjectContent project={project} index={index} focusable />
        </li>
      ))}
      {github && (
        <li className="project project--more" data-reveal={immersive ? undefined : ""}>
          <MoreContent href={github.href} focusable />
        </li>
      )}
    </ul>
  );

  return (
    <section ref={root} id="work" className="work" tabIndex={-1} aria-labelledby="work-title">
      <div className="work__pin">
        {/* Always rendered so the timeline has a target before the lazy canvas mounts. */}
        <div className="work__stage">
          {showHeadset && (
            <Suspense fallback={null}>
              <HeadsetCanvas />
            </Suspense>
          )}
        </div>

        <div className="work__intro container">
          <p className="eyebrow">Selected work</p>
          <h2 id="work-title" className="section-title">
            Things I&apos;ve <em>built</em>
          </h2>
          <p className="work__lede">Put the headset on — scroll to step inside.</p>
          {showHeadset && (
            <button type="button" className="work__skip glass" onClick={skipIntro}>
              Skip to projects <span aria-hidden="true">↓</span>
            </button>
          )}
        </div>

        <div className="work__lens">
          <ol className="work__dots" aria-hidden="true">
            {Array.from({ length: windowCount }, (_, i) => (
              <li key={i} className="work__dot" />
            ))}
          </ol>
          {immersive && cards}

          {/* Curved-monitor rendering: each card as vertical strips on a cylinder. Visual only. */}
          {immersive && (
            <div className="work__curve" aria-hidden="true">
              {projects.map((project, index) => (
                <div key={project.slug} className="rail-card">
                  {Array.from({ length: SLICES }, (_, i) => (
                    <div key={i} className="rail-slice project">
                      <ProjectContent project={project} index={index} focusable={false} />
                    </div>
                  ))}
                </div>
              ))}
              {github && (
                <div className="rail-card">
                  {Array.from({ length: SLICES }, (_, i) => (
                    <div key={i} className="rail-slice project project--more">
                      <MoreContent href={github.href} focusable={false} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!immersive && <div className="work__list">{cards}</div>}
    </section>
  );
}
