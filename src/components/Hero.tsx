import { useRef, type MouseEvent } from "react";
import { profile } from "../data/portfolio";
import { DESKTOP, gsap, MOTION_OK, SplitText, useGSAP } from "../lib/gsap";
import { scrollToSection } from "../lib/smoothScroll";
import "./Hero.css";

const ROLE_HOLD_SECONDS = 2.2;

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MOTION_OK, () => {
        const intro = gsap.timeline({ defaults: { ease: "power4.out" } });

        // Returning the tween lets SplitText re-sync it when a resize re-splits.
        SplitText.create(".hero__name-line", {
          type: "chars,lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (split) =>
            gsap.from(split.chars, { yPercent: 110, duration: 1.2, stagger: 0.04, ease: "power4.out" }),
        });

        intro
          .from(".hero__hello", { autoAlpha: 0, y: 16, duration: 1 }, 0.1)
          .from(".hero__info > *", { autoAlpha: 0, y: 32, duration: 1, stagger: 0.1 }, 0.5)
          // Opacity (not autoAlpha) keeps the link focusable while it fades in.
          .from(".hero__cta", { opacity: 0, y: 24, duration: 1 }, 0.8);

        // Rolling role words: each word's letters exit upward as the next rise in.
        const words = gsap.utils.toArray<HTMLElement>(".hero__role-word");
        const splits = words.map((word) => SplitText.create(word, { type: "chars" }));
        gsap.set(words, { autoAlpha: 1 });
        splits.forEach((split, i) => gsap.set(split.chars, { yPercent: i === 0 ? 0 : 110 }));

        const roles = gsap.timeline({ repeat: -1, delay: 1.6 });
        splits.forEach((split, i) => {
          const next = splits[(i + 1) % splits.length];
          if (!next || next === split) return;
          roles
            .to(split.chars, { yPercent: -110, duration: 0.6, stagger: 0.03, ease: "power3.in" }, `+=${ROLE_HOLD_SECONDS}`)
            .fromTo(
              next.chars,
              { yPercent: 110 },
              // The last step re-enters word 0; rendering it early would hide the first word.
              { yPercent: 0, duration: 0.7, stagger: 0.03, ease: "power3.out", immediateRender: false },
              "<0.3",
            );
        });
      });

      // Parallax the hero away as the next section scrolls in. Each property here
      // must not also be animated by the intro, or the scrub records the intro's
      // hidden start state as its own. The avatar's own exit lives in AvatarStage.
      mm.add(`${MOTION_OK} and ${DESKTOP}`, () => {
        gsap
          .timeline({
            // Copy clears out early so it never sits over the avatar walking to the desk.
            scrollTrigger: { trigger: root.current, start: "top top", end: "55% top", scrub: true },
          })
          .to(".hero__content", { yPercent: 25, autoAlpha: 0, ease: "none" }, 0);
      });
    },
    { scope: root, },
  );

  const goToContact = (event: MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
    scrollToSection("contact");
  };

  return (
    <section ref={root} id="top" className="hero" tabIndex={-1} aria-labelledby="hero-title">
      <div className="hero__content container">
        <div className="hero__intro">
          <p className="hero__hello glass">
            <span className="hero__hello-dot" aria-hidden="true" />
            Hello, I&apos;m
          </p>
          <h1 id="hero-title" className="hero__name">
            <span className="hero__name-line">{profile.firstName}</span>
            <span className="hero__name-line hero__name-line--accent">{profile.lastName}.</span>
          </h1>
        </div>

        <div className="hero__info">
          <p className="hero__role">
            <span className="hero__role-words" aria-hidden="true">
              {profile.roles.map((role) => (
                <span key={role} className="hero__role-word">
                  {role}
                </span>
              ))}
            </span>
            <span className="sr-only">{profile.roles.join(", ")}</span> <span>Engineer</span>
          </p>
          <p className="hero__location">
            <span className="hero__rule" aria-hidden="true" />
            Based in {profile.location}
          </p>
          <p className="hero__tagline">{profile.tagline}</p>
        </div>
      </div>

      <a className="hero__cta glass" href="#contact" onClick={goToContact}>
        Get in touch
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </a>
    </section>
  );
}
