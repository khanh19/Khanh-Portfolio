import { useRef } from "react";
import { certifications, techStack, type TechItem } from "../data/portfolio";
import { useSectionReveal } from "../hooks/useSectionReveal";
import "./TechStack.css";

/** Two marquee rows: engineering & cloud on top, AI and frontend below. */
const rows: { label: string; items: TechItem[] }[] = [
  { label: "Backend, cloud & tools", items: techStack.filter((t) => ["backend", "cloud", "tools"].includes(t.category)) },
  { label: "AI, ML & frontend", items: techStack.filter((t) => ["ai", "frontend"].includes(t.category)) },
];

export default function TechStack() {
  const root = useRef<HTMLElement>(null);
  useSectionReveal(root);

  return (
    <section ref={root} id="stack" className="stack section" aria-labelledby="stack-title">
      <div className="container">
        <p className="eyebrow">Toolbox</p>
        <h2 id="stack-title" className="section-title">
          My <em>tech</em> stack
        </h2>
      </div>

      <div className="stack__rows">
        {rows.map((row, index) => (
          <div key={row.label} className={`marquee${index % 2 === 1 ? " marquee--reverse" : ""}`}>
            <h3 className="sr-only">{row.label}</h3>
            {/* The list is rendered twice so the loop is seamless; the copy is hidden from AT. */}
            {[false, true].map((isCopy) => (
              <ul key={String(isCopy)} className="marquee__list" aria-hidden={isCopy || undefined}>
                {row.items.map((item) => (
                  <li key={item.name} className="marquee__item">
                    <span className="marquee__logo">
                      <img src={item.logo} alt="" width={22} height={22} decoding="async" />
                    </span>
                    {item.name}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        ))}
      </div>

      <div className="container">
        <ul className="stack__certs" data-reveal>
          {certifications.map((cert) => (
            <li key={cert} className="stack__cert">
              <span className="stack__cert-badge" aria-hidden="true">
                ✦
              </span>
              {cert}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
