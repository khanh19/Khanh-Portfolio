import { useEffect, useRef, useState } from "react";
import { headsetProgress } from "../../lib/headsetProgress";
import { isWebGLAvailable } from "../../lib/webgl";
import { createHeadsetScene } from "./createHeadsetScene";

/** Lazy-loaded host for the three.js headset (shares the three.js chunk with the avatar). */
export default function HeadsetCanvas() {
  const stage = useRef<HTMLDivElement>(null);
  const [hasWebGL] = useState(isWebGLAvailable);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = stage.current;
    if (!container || !hasWebGL) return;
    const scene = createHeadsetScene(container, headsetProgress, { onReady: () => setReady(true) });
    return () => scene.dispose();
  }, [hasWebGL]);

  return <div ref={stage} className={`work__headset${ready ? " is-ready" : ""}`} aria-hidden="true" />;
}
