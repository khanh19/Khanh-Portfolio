import { useEffect, useRef, useState, type MouseEvent } from "react";
import { navItems, profile } from "../data/portfolio";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "../lib/gsap";
import { scrollToSection, setScrollLocked } from "../lib/smoothScroll";
import "./Navbar.css";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(".nav__inner > *", {
          y: -24,
          // Opacity, not autoAlpha: hidden links would drop out of the Tab order.
          opacity: 0,
          duration: 0.8,
          stagger: 0.08,
          ease: "power3.out",
          delay: 0.2,
          // A leftover transform would trap the fixed mobile menu inside <nav>.
          clearProps: "transform,opacity,visibility",
        });
      });
      // Compare the scroll position directly: a start/end range would switch the
      // glass pill off again at the very bottom of the page.
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => setIsScrolled(self.scroll() > 48),
        onRefresh: (self) => setIsScrolled(self.scroll() > 48),
      });
    },
    { scope: header, },
  );

  useEffect(() => {
    if (!isOpen) return;
    setScrollLocked(true);
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsOpen(false);
        toggle.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 768px)");
    const onResize = (): void => {
      if (desktop.matches) setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onResize);
    return () => {
      setScrollLocked(false);
      window.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onResize);
    };
  }, [isOpen]);

  const handleNavigate = (event: MouseEvent<HTMLAnchorElement>, id: string): void => {
    event.preventDefault();
    setIsOpen(false);
    // Wait a frame so the scroll lock from the mobile menu is released first.
    requestAnimationFrame(() => scrollToSection(id));
  };

  return (
    <header
      ref={header}
      className={`nav${isScrolled ? " nav--scrolled" : ""}${isOpen ? " nav--open" : ""}`}
    >
      <div className="nav__inner container">
        <a className="nav__logo" href="#top" onClick={(e) => handleNavigate(e, "top")} aria-label={`${profile.firstName} ${profile.lastName}, back to top`}>
          <span className="nav__mark" aria-hidden="true">
            KP
          </span>
          <span className="nav__name" aria-hidden="true">
            {profile.firstName} {profile.lastName}
          </span>
        </a>

        <nav aria-label="Primary">
          <button
            ref={toggle}
            type="button"
            className="nav__toggle"
            aria-expanded={isOpen}
            aria-controls="nav-menu"
            onClick={() => setIsOpen((open) => !open)}
          >
            <span className="sr-only">{isOpen ? "Close menu" : "Open menu"}</span>
            <span className="nav__toggle-bar nav__toggle-bar--top" aria-hidden="true" />
            <span className="nav__toggle-bar nav__toggle-bar--bottom" aria-hidden="true" />
          </button>
          <ul id="nav-menu" className="nav__menu">
            {navItems.map((item, index) => (
              <li key={item.id} style={{ "--i": index }}>
                <a className="nav__link" href={`#${item.id}`} onClick={(e) => handleNavigate(e, item.id)}>
                  <span className="nav__link-label" data-text={item.label}>
                    {item.label}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="nav__actions">
          <ThemeToggle />
          <a className="nav__cta glass" href={`mailto:${profile.email}`}>
            <span className="nav__cta-dot" aria-hidden="true" />
            Let&apos;s talk
          </a>
        </div>
      </div>
    </header>
  );
}
