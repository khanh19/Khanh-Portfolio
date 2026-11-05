import { useEffect, useRef, useState } from "react";
import { profile, socials } from "../data/portfolio";
import { useSectionReveal } from "../hooks/useSectionReveal";
import SocialIcon from "./SocialIcon";
import "./Contact.css";

type CopyState = "idle" | "copied" | "failed";

const CURRENT_YEAR = new Date().getFullYear();

const COPY_MESSAGES: Record<CopyState, string> = {
  idle: "Copy email",
  copied: "Copied!",
  failed: "Copy failed",
};

export default function Contact() {
  const root = useRef<HTMLElement>(null);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  useSectionReveal(root);

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = window.setTimeout(() => setCopyState("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const copyEmail = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <section ref={root} id="contact" className="contact section" tabIndex={-1} aria-labelledby="contact-title">
      <div className="container">
        <p className="eyebrow">Contact</p>
        <h2 id="contact-title" className="section-title contact__title">
          Let&apos;s build <em>something</em> together
        </h2>

        <div className="contact__grid">
          <div className="contact__block" data-reveal>
            <h3 className="contact__label">Email</h3>
            <a className="contact__email" href={`mailto:${profile.email}`}>
              {profile.email}
            </a>
            <button type="button" className="contact__copy" onClick={() => void copyEmail()}>
              {COPY_MESSAGES[copyState]}
            </button>
            <output className="sr-only">{copyState === "idle" ? "" : COPY_MESSAGES[copyState]}</output>
          </div>

          <div className="contact__block" data-reveal>
            <h3 className="contact__label">Elsewhere</h3>
            <ul className="contact__socials">
              {socials.map((social) => (
                <li key={social.href}>
                  <a className="contact__social" href={social.href} target="_blank" rel="noopener noreferrer">
                    <SocialIcon name={social.icon} />
                    <span>{social.label}</span>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="contact__block" data-reveal>
            <h3 className="contact__label">Location</h3>
            <p className="contact__text">{profile.location}</p>
            <p className="contact__text contact__text--muted">Open to new opportunities &amp; collaborations.</p>
          </div>
        </div>

        <footer className="contact__footer">
          <p>
            Designed &amp; built by {profile.firstName} {profile.lastName} · © {CURRENT_YEAR}
          </p>
        </footer>
      </div>
    </section>
  );
}
