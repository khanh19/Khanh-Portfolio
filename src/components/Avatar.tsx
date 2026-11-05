import { useEffect, useRef, useState } from "react";
import fallbackImg from "../assets/avatar-fallback.png";
import { profile } from "../data/portfolio";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { avatarProgress } from "../lib/avatarProgress";
import { getTheme, useTheme } from "../lib/theme";
import { FINE_POINTER, REDUCED_MOTION } from "../lib/gsap";
import { createAvatarScene, isWebGLAvailable, type AvatarScene } from "./avatar/createAvatarScene";
import "./Avatar.css";

type AvatarStatus = "loading" | "ready" | "fallback";

const MODEL_URL = `${import.meta.env.BASE_URL}models/avatar.glb`;

/**
 * Three.js avatar of Khanh. Lazy-loaded by AvatarStage so three.js stays out of
 * the main bundle. The scene is rebuilt only if motion or pointer preferences flip.
 */
export default function Avatar() {
  const stage = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<AvatarScene | null>(null);
  const theme = useTheme();
  const [hasWebGL] = useState(isWebGLAvailable);
  const [status, setStatus] = useState<AvatarStatus>(hasWebGL ? "loading" : "fallback");
  const reducedMotion = useMediaQuery(REDUCED_MOTION);
  const finePointer = useMediaQuery(FINE_POINTER);

  useEffect(() => {
    const container = stage.current;
    if (!container || !hasWebGL) return;

    const scene = createAvatarScene(container, {
      modelUrl: MODEL_URL,
      reducedMotion,
      trackPointer: finePointer,
      getProgress: () => avatarProgress.value,
      getTheme,
      onLoad: () => setStatus("ready"),
      onError: () => setStatus("fallback"),
    });
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [hasWebGL, reducedMotion, finePointer]);

  // Theme changes don't rebuild the scene; it re-lights itself (or re-renders once if paused).
  useEffect(() => {
    sceneRef.current?.refresh();
  }, [theme]);

  return (
    <figure className={`avatar avatar--${status}`}>
      <div ref={stage} className="avatar__stage" aria-hidden="true" />
      {status === "fallback" && (
        // Described by the figcaption, so the image itself is decorative.
        <img className="avatar__fallback" src={fallbackImg} alt="" decoding="async" />
      )}
      <figcaption className="sr-only">{profile.avatarAlt}</figcaption>
    </figure>
  );
}
