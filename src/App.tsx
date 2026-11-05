import { useEffect } from "react";
import About from "./components/About";
import AvatarStage from "./components/AvatarStage";
import Career from "./components/Career";
import Contact from "./components/Contact";
import Cursor from "./components/Cursor";
import Hero from "./components/Hero";
import Navbar from "./components/Navbar";
import Services from "./components/Services";
import Sky from "./components/Sky";
import TechStack from "./components/TechStack";
import Work from "./components/Work";
import { ScrollTrigger } from "./lib/gsap";
import { startSmoothScroll } from "./lib/smoothScroll";

export default function App() {
  useEffect(() => startSmoothScroll(), []);

  // Web fonts change text metrics; re-measure scroll positions once they land.
  useEffect(() => {
    let active = true;
    void document.fonts.ready.then(() => {
      if (active) ScrollTrigger.refresh();
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Sky />
      <div className="grain" aria-hidden="true" />
      <Cursor />
      <Navbar />
      <main id="main" tabIndex={-1}>
        <AvatarStage />
        <Hero />
        <Services />
        <About />
        <Career />
        <Work />
        <TechStack />
        <Contact />
      </main>
    </>
  );
}
