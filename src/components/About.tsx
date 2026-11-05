import { useRef } from "react";
import { profile, stats, type Stat } from "../data/portfolio";
import { useSectionReveal } from "../hooks/useSectionReveal";
import { gsap, MOTION_OK, useGSAP } from "../lib/gsap";
import "./About.css";

function formatStat(stat: Stat, value: number): string {
  return `${value.toFixed(stat.decimals)}${stat.suffix}`;
}

export default function About() {
  const root = useRef<HTMLElement>(null);
  useSectionReveal(root);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.utils.toArray<HTMLElement>(".stat__value").forEach((el, i) => {
          const stat = stats[i];
          if (!stat) return;
          const counter = { value: 0 };
          gsap.to(counter, {
            value: stat.value,
            duration: 1.8,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
            onUpdate: () => {
              el.textContent = formatStat(stat, counter.value);
            },
          });
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="about" className="about section" tabIndex={-1} aria-labelledby="about-title">
      <div className="container">
        <div className="about__intro">
          <div className="about__heading">
            <p className="eyebrow">About me</p>
            <h2 id="about-title" className="section-title">
              Engineer of <em>reliable</em> things
            </h2>
          </div>
          <p className="about__text" data-reveal>
            {profile.about}
          </p>
        </div>

        <ul className="about__stats" aria-label="Impact highlights">
          {stats.map((stat) => (
            <li key={stat.label} className="stat" data-reveal>
              <span className="sr-only">{`${formatStat(stat, stat.value)} ${stat.label}`}</span>
              <span className="stat__value" aria-hidden="true">
                {formatStat(stat, stat.value)}
              </span>
              <span className="stat__label" aria-hidden="true">
                {stat.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
