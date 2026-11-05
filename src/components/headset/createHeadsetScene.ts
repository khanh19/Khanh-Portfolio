import {
  ACESFilmicToneMapping,
  CircleGeometry,
  Color,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Path,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  Shape,
  SRGBColorSpace,
  Timer,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Material,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export interface HeadsetProgress {
  turn: number;
  zoom: number;
}

export interface HeadsetScene {
  dispose: () => void;
}

/** Colour of the lens interior. Must match `--lens-bg` in Work.css so the zoom hand-off is seamless. */
export const LENS_COLOR = "#07090f";

const FOV = 30;
const CAMERA_DISTANCE = 6.2;
/** Side three-quarter view → seen from behind. */
const START_YAW = -1.15;
const END_YAW = Math.PI;
const START_PITCH = 0.32;
/** Camera stops this far in front of the lens — close enough that the lens fills any aspect ratio. */
const LENS_STANDOFF = 0.26;
/** Headset sits a little below centre, under the section heading. */
const BASE_Y = -0.32;

/** A rounded rectangle (stadium when r = h/2), centred on the origin. */
function roundedRect<T extends Path>(target: T, w: number, h: number, r: number): T {
  const x = -w / 2;
  const y = -h / 2;
  target.moveTo(x + r, y);
  target.lineTo(x + w - r, y);
  target.quadraticCurveTo(x + w, y, x + w, y + r);
  target.lineTo(x + w, y + h - r);
  target.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  target.lineTo(x + r, y + h);
  target.quadraticCurveTo(x, y + h, x, y + h - r);
  target.lineTo(x, y + r);
  target.quadraticCurveTo(x, y, x + r, y);
  return target;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * An original, generic mixed-reality headset built from primitives: a pale
 * shell with a glossy black visor, a fabric light seal with two lenses at the
 * back, and a knit strap. Scroll turns it around and flies the camera into
 * the left lens.
 */
export function createHeadsetScene(
  container: HTMLElement,
  progress: HeadsetProgress,
  options: { onReady: () => void },
): HeadsetScene {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  scene.environment = environment;
  scene.environmentIntensity = 0.9;

  scene.add(new HemisphereLight(0xf2f6ff, 0xc9d3e2, 1.1));
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(2.5, 3, 4);
  const rim = new DirectionalLight(0xbcd2ff, 1.6);
  rim.position.set(-3, 1.5, -3);
  scene.add(key, rim);

  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const track = <G extends BufferGeometry>(g: G): G => {
    geometries.push(g);
    return g;
  };
  const mat = <M extends Material>(m: M): M => {
    materials.push(m);
    return m;
  };

  const shellMat = mat(new MeshPhysicalMaterial({ color: 0xeef0f4, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25 }));
  const visorMat = mat(new MeshPhysicalMaterial({ color: 0x0a0c11, roughness: 0.06, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.03 }));
  const sealMat = mat(new MeshStandardMaterial({ color: 0x2b2f37, roughness: 0.95 }));
  const innerMat = mat(new MeshStandardMaterial({ color: 0x15181e, roughness: 0.8 }));
  const ringMat = mat(new MeshStandardMaterial({ color: 0x3a3f49, roughness: 0.35, metalness: 0.8 }));
  // Unlit and untoned so the lens renders exactly LENS_COLOR on screen.
  const lensMat = mat(new MeshBasicMaterial({ color: new Color(LENS_COLOR), toneMapped: false }));
  const strapMat = mat(new MeshStandardMaterial({ color: 0xd9dde4, roughness: 0.92 }));

  const headset = new Group();

  // Shell: a bevelled stadium block (front faces +Z).
  const shellShape = roundedRect(new Shape(), 1.8, 0.86, 0.42);
  const shellGeo = track(
    new ExtrudeGeometry(shellShape, { depth: 0.42, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.08, bevelSegments: 8, curveSegments: 40 }),
  );
  shellGeo.translate(0, 0, -0.21);
  headset.add(new Mesh(shellGeo, shellMat));

  // Visor: glossy black glass across the front.
  const visorGeo = track(
    new ExtrudeGeometry(roundedRect(new Shape(), 1.7, 0.76, 0.37), {
      depth: 0.02,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 6,
      curveSegments: 40,
    }),
  );
  visorGeo.translate(0, 0, 0.29);
  headset.add(new Mesh(visorGeo, visorMat));

  // Light seal: a fabric ring behind the shell.
  const sealShape = roundedRect(new Shape(), 1.66, 0.78, 0.38);
  sealShape.holes.push(roundedRect(new Path(), 1.42, 0.58, 0.28));
  const sealGeo = track(new ExtrudeGeometry(sealShape, { depth: 0.16, bevelEnabled: false, curveSegments: 40 }));
  sealGeo.translate(0, 0, -0.47);
  headset.add(new Mesh(sealGeo, sealMat));

  // Inner back wall, lenses and lens rings (facing −Z, toward the wearer).
  const inner = new Mesh(track(new PlaneGeometry(1.5, 0.66)), innerMat);
  inner.position.z = -0.31;
  inner.rotation.y = Math.PI;
  headset.add(inner);

  const lenses: Mesh[] = [];
  for (const side of [1, -1]) {
    const lens = new Mesh(track(new CircleGeometry(0.25, 64)), lensMat);
    lens.position.set(side * 0.38, 0, -0.33);
    lens.rotation.y = Math.PI;
    const ring = new Mesh(track(new TorusGeometry(0.262, 0.022, 12, 64)), ringMat);
    ring.position.copy(lens.position);
    headset.add(lens, ring);
    lenses.push(lens);
  }

  // Strap: half a torus swept around the back, flattened into a ribbon.
  const strap = new Mesh(track(new TorusGeometry(1, 0.022, 10, 96, Math.PI)), strapMat);
  // Tilted so the back of the loop rides up (as it would around the back of a
  // head) and never crosses the lenses on the way in.
  strap.rotation.x = -Math.PI / 2 + 0.62;
  strap.scale.set(0.96, 1.28, 5.2);
  strap.position.z = -0.12;
  headset.add(strap);

  scene.add(headset);

  const camera = new PerspectiveCamera(FOV, 1, 0.01, 50);
  const cameraStart = new Vector3(0, 0, CAMERA_DISTANCE);
  const lensWorld = new Vector3();
  const lookAt = new Vector3();
  const cameraEnd = new Vector3();
  const timer = new Timer();
  timer.connect(document);
  const state = { frameId: 0, visible: true, disposed: false };

  const resize = (): void => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const render = (timestamp?: number): void => {
    timer.update(timestamp);
    const time = timer.getElapsed();
    const turn = easeInOut(MathUtils.clamp(progress.turn, 0, 1));
    const zoom = MathUtils.clamp(progress.zoom, 0, 1);

    // Idle float fades out as the camera commits to the lens.
    const float = 1 - zoom;
    headset.rotation.set(
      MathUtils.lerp(START_PITCH, 0, turn) + Math.sin(time * 0.8) * 0.03 * float,
      MathUtils.lerp(START_YAW, END_YAW, turn) + Math.sin(time * 0.5) * 0.04 * float,
      Math.sin(time * 0.6) * 0.015 * float,
    );
    headset.position.y = BASE_Y * (1 - zoom) + Math.sin(time * 1.1) * 0.05 * float;
    headset.updateMatrixWorld(true);

    // Fly into the left lens as seen from behind (index 0 is local +X → world −X).
    const target = lenses[0];
    if (target) target.getWorldPosition(lensWorld);
    cameraEnd.set(lensWorld.x, lensWorld.y, lensWorld.z + LENS_STANDOFF);
    const t = zoom * zoom * (3 - 2 * zoom);
    camera.position.lerpVectors(cameraStart, cameraEnd, t);
    lookAt.set(0, 0, 0).lerp(lensWorld, Math.min(1, t * 1.4));
    camera.lookAt(lookAt);

    renderer.render(scene, camera);
  };

  const loop = (timestamp: number): void => {
    render(timestamp);
    state.frameId = requestAnimationFrame(loop);
  };
  const start = (): void => {
    if (state.disposed || state.frameId !== 0 || !state.visible || document.hidden) return;
    state.frameId = requestAnimationFrame(loop);
  };
  const stop = (): void => {
    cancelAnimationFrame(state.frameId);
    state.frameId = 0;
  };
  const onVisibility = (): void => (document.hidden ? stop() : start());

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersection = new IntersectionObserver(([entry]) => {
    state.visible = entry?.isIntersecting ?? true;
    if (state.visible) start();
    else stop();
  });
  intersection.observe(container);
  document.addEventListener("visibilitychange", onVisibility);

  resize();
  render();
  options.onReady();
  start();

  return {
    dispose: () => {
      state.disposed = true;
      stop();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      timer.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
