import { useEffect, useRef } from "react";
import cloudsFar from "../assets/sky/clouds-far.webp";
import cloudsNear from "../assets/sky/clouds-near.webp";
import starsFar from "../assets/sky/stars-far.webp";
import starsNear from "../assets/sky/stars-near.webp";
import { prefersReducedMotion } from "../lib/gsap";
import { useTheme } from "../lib/theme";

interface Star {
  x: number;
  y: number;
  r: number;
  base: number;
  speed: number;
  phase: number;
  /** Drift in px/second; bigger stars are "nearer" and move faster. */
  vx: number;
  vy: number;
}

interface Field {
  stars: Star[];
  width: number;
  height: number;
  frameId: number;
  last: number;
}

const MAX_DPR = 2;

/** One star per ~14k px², capped — a light sprinkle over the baked starfield. */
function starCount(width: number, height: number): number {
  return Math.max(30, Math.min(140, Math.round((width * height) / 14000)));
}

/** A few brighter stars that gently twinkle on top of the night sky image. */
function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = prefersReducedMotion();
    const field: Field = { stars: [], width: 0, height: 0, frameId: 0, last: 0 };

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      field.width = window.innerWidth;
      field.height = window.innerHeight;
      canvas.width = Math.round(field.width * dpr);
      canvas.height = Math.round(field.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      field.stars = Array.from({ length: starCount(field.width, field.height) }, () => ({
        x: Math.random() * field.width,
        y: Math.random() * field.height,
        r: Math.random() * 1.1 + 0.4,
        base: Math.random() * 0.5 + 0.35,
        speed: Math.random() * 1.6 + 0.6,
        phase: Math.random() * Math.PI * 2,
        vx: 0,
        vy: 0,
      }));
      // Same direction as the CSS star layers (down-right), scaled by size.
      for (const star of field.stars) {
        star.vx = 2.2 + star.r * 3.2;
        star.vy = (2.2 + star.r * 3.2) * 0.35;
      }
      draw(0);
    };

    const draw = (time: number): void => {
      ctx.clearRect(0, 0, field.width, field.height);
      for (const star of field.stars) {
        const twinkle = reduce ? 1 : 0.55 + 0.45 * Math.sin(time * 0.001 * star.speed + star.phase);
        ctx.globalAlpha = star.base * twinkle;
        ctx.fillStyle = "#f4f7ff";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (time: number): void => {
      const dt = field.last ? Math.min((time - field.last) / 1000, 0.1) : 0;
      field.last = time;
      for (const star of field.stars) {
        star.x = (star.x + star.vx * dt) % (field.width + 4);
        star.y = (star.y + star.vy * dt) % (field.height + 4);
      }
      draw(time);
      field.frameId = requestAnimationFrame(loop);
    };
    const start = (): void => {
      if (reduce || field.frameId !== 0 || document.hidden) return;
      field.frameId = requestAnimationFrame(loop);
    };
    const stop = (): void => {
      cancelAnimationFrame(field.frameId);
      field.frameId = 0;
      field.last = 0;
    };
    const onVisibility = (): void => (document.hidden ? stop() : start());

    resize();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="sky__stars" />;
}

/**
 * Fixed sky behind every section. Each scene is a CSS gradient plus seamless
 * tiles that drift (transform-only, so it stays on the compositor): clouds by
 * day, faint streaks and two depths of stars by night. Scenes crossfade with
 * the theme, and the hidden one pauses.
 */
export default function Sky() {
  const theme = useTheme();
  return (
    <div className="sky" aria-hidden="true">
      <div className="sky__scene sky__scene--day">
        <div className="sky__drift sky__drift--clouds-far" style={{ backgroundImage: `url(${cloudsFar})` }} />
        <div className="sky__drift sky__drift--clouds-near" style={{ backgroundImage: `url(${cloudsNear})` }} />
      </div>
      <div className="sky__scene sky__scene--night">
        <div className="sky__drift sky__drift--streaks" style={{ backgroundImage: `url(${cloudsNear})` }} />
        <div className="sky__drift sky__drift--stars-far" style={{ backgroundImage: `url(${starsFar})` }} />
        <div className="sky__drift sky__drift--stars-near" style={{ backgroundImage: `url(${starsNear})` }} />
        {theme === "dark" && <Starfield />}
      </div>
    </div>
  );
}
