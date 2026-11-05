import { useRef } from "react";
import { career, education } from "../data/portfolio";
import { useSectionReveal } from "../hooks/useSectionReveal";
import { gsap, MOTION_OK, useGSAP } from "../lib/gsap";
import "./Career.css";
import OrgLogo from "./OrgLogo";

export default function Career() {
  const root = useRef<HTMLElement>(null);
  useSectionReveal(root);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        // The accent line draws itself down the timeline as you scroll.
        gsap.fromTo(
          ".career__progress",
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: { trigger: ".career__timeline", start: "top 65%", end: "bottom 65%", scrub: true },
          },
        );

        gsap.utils.toArray<HTMLElement>(".career__item").forEach((item) => {
          gsap
            .timeline({
              scrollTrigger: {
                trigger: item,
                start: "top 80%",
                toggleActions: "play none none reverse",
                toggleClass: { targets: item, className: "is-active" },
              },
            })
            .from(item.querySelectorAll(".career__head > *, .career__body"), {
              autoAlpha: 0,
              y: 32,
              duration: 0.8,
              stagger: 0.08,
              ease: "power3.out",
            });
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="career" className="career section" tabIndex={-1} aria-labelledby="career-title">
      <div className="container">
        <p className="eyebrow">Experience &amp; education</p>
        <h2 id="career-title" className="section-title">
          My <em>journey</em> so far
        </h2>

        <div className="career__timeline">
          <div className="career__track" aria-hidden="true">
            <span className="career__progress" />
          </div>
          <ol className="career__list">
            {career.map((entry) => (
              <li key={`${entry.org.name}-${entry.role}`} className="career__item">
                <span className="career__dot" aria-hidden="true" />
                <div className="career__head">
                  <span className="career__year" aria-hidden="true">
                    {entry.year}
                  </span>
                  <div className="career__title">
                    <OrgLogo org={entry.org} />
                    <div>
                      <h3 className="career__role">{entry.role}</h3>
                      <p className="career__org">
                        {entry.org.name}
                        {entry.unit && ` · ${entry.unit}`}
                      </p>
                    </div>
                  </div>
                  <p className="career__period">
                    {entry.period}
                    {entry.location && ` · ${entry.location}`}
                  </p>
                </div>
                <ul className="career__body">
                  {entry.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>

        <div className="education">
          <h3 className="education__title">Education</h3>
          <ul className="education__list">
            {education.map((entry) => (
              <li key={entry.degree} className="education__card" data-reveal>
                <div className="education__head">
                  <OrgLogo org={entry.org} size="lg" />
                  <div>
                    <h4 className="education__degree">{entry.degree}</h4>
                    <p className="education__school">
                      {entry.org.name} · {entry.location}
                    </p>
                  </div>
                </div>
                <p className="education__period">{entry.period}</p>
                <ul className="education__details">
                  {entry.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
