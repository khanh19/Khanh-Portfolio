import { useId, useRef, useState } from "react";
import { services } from "../data/portfolio";
import { useSectionReveal } from "../hooks/useSectionReveal";
import "./Services.css";

export default function Services() {
  const root = useRef<HTMLElement>(null);
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  useSectionReveal(root);

  return (
    <section ref={root} id="services" className="services section" tabIndex={-1} aria-labelledby="services-title">
      <div className="services__inner container">
        <div className="services__content">
          <p className="eyebrow">What I do</p>
          <h2 id="services-title" className="section-title">
            Build, ship, <em>operate</em>
          </h2>

          <ul className="services__list">
            {services.map((service, index) => {
              const isOpen = openIndex === index;
              const buttonId = `${baseId}-button-${index}`;
              const panelId = `${baseId}-panel-${index}`;
              return (
                <li key={service.title} className={`service${isOpen ? " is-open" : ""}`} data-reveal>
                  <span className="service__corners" aria-hidden="true" />
                  <h3 className="service__heading">
                    <button
                      id={buttonId}
                      type="button"
                      className="service__toggle"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                    >
                      <span className="service__title">{service.title}</span>
                      <span className="service__subtitle">{service.subtitle}</span>
                      <span className="service__chevron" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </span>
                    </button>
                  </h3>
                  <section id={panelId} aria-labelledby={buttonId} className="service__panel" inert={!isOpen}>
                    <div className="service__panel-inner">
                      <p className="service__summary">{service.summary}</p>
                      <p className="service__tags-label">Skillset &amp; tools</p>
                      <ul className="service__tags" aria-label={`${service.title} tools`}>
                        {service.tags.map((tag) => (
                          <li key={tag} className="chip">
                            {tag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
