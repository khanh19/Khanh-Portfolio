import {
  ACESFilmicToneMapping,
  AnimationMixer,
  Bone,
  Box3,
  Color,
  DirectionalLight,
  Euler,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Texture,
  Timer,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createArmChain, solveArm, type ArmChain } from "./armIK";
import { createDesk, type Desk } from "./desk";
import { createHandRig, lowestFingertipY, poseHand, type HandRig } from "./handPose";

export interface AvatarSceneOptions {
  modelUrl: string;
  /** Freeze on a single pose and ignore the pointer. */
  reducedMotion: boolean;
  /** Turn the head toward the pointer (mouse/trackpad users only). */
  trackPointer: boolean;
  /** Scroll blend from the hero pose (0) to typing at the desk (1). */
  getProgress: () => number;
  /** Current page theme; lighting eases between day and night presets. */
  getTheme: () => "light" | "dark";
  onLoad: () => void;
  onError: (error: unknown) => void;
}

export interface AvatarScene {
  /** Re-render now (e.g. after a theme change while the loop is paused). */
  refresh: () => void;
  dispose: () => void;
}

/** Portion of the body kept in frame: from mid-chest up to just above the hair. */
const FRAME_BOTTOM = 0.62;
const FRAME_TOP = 1.06;
/** Minimum width (in model-heights) kept in view so the shoulders stay readable. */
const FRAME_MIN_WIDTH = 0.34;
const FOV = 24;

const MAX_YAW = MathUtils.degToRad(26);
const MAX_PITCH = MathUtils.degToRad(14);
const TRACK_SMOOTHING = 6;

/** How far the avatar turns toward the monitor in the desk scene. */
const DESK_YAW = MathUtils.degToRad(55);
/** Where the desk scene's centre sits across the viewport (0 = left edge). */
const DESK_SCREEN_X = 0.27;
/** Head tilt toward the screen while typing. */
const DESK_PITCH = MathUtils.degToRad(9);
/** Sunglasses in the hero, clear lenses at the desk. Linear RGB + alpha. */
const LENS_SUN = { color: new Color(0.015, 0.016, 0.02), opacity: 0.94, metalness: 0.2 };
const LENS_CLEAR = { color: new Color(1, 1, 1), opacity: 0.1, metalness: 0 };
const LENS_MATERIAL = "avaturn_glasses_1_material";

interface LightPreset {
  hemiSky: Color;
  hemiGround: Color;
  hemi: number;
  keyColor: Color;
  key: number;
  rimCool: Color;
  rimCoolIntensity: number;
  rimWarm: Color;
  rimWarmIntensity: number;
  exposure: number;
  environment: number;
  glow: Color;
}

/** Daylight under a pale sky vs. moonlight with starlit gold rims. */
const DAY: LightPreset = {
  hemiSky: new Color("#dce8f5"),
  hemiGround: new Color("#d8e0ea"),
  hemi: 1.2,
  keyColor: new Color("#fff4e8"),
  key: 2.1,
  rimCool: new Color("#8fb3e0"),
  rimCoolIntensity: 3.2,
  rimWarm: new Color("#f3d9a0"),
  rimWarmIntensity: 2.2,
  exposure: 1,
  environment: 0.7,
  glow: new Color("#4f7fc0"),
};
const NIGHT: LightPreset = {
  hemiSky: new Color("#3b4c80"),
  hemiGround: new Color("#141a34"),
  hemi: 0.6,
  keyColor: new Color("#c9d6ff"),
  key: 1.1,
  rimCool: new Color("#7aa3d6"),
  rimCoolIntensity: 4.2,
  rimWarm: new Color("#f1cf7c"),
  rimWarmIntensity: 3.4,
  exposure: 0.95,
  environment: 0.35,
  glow: new Color("#f1cf7c"),
};
/** How quickly lighting follows a theme switch (per second). */
const THEME_EASE = 3;

export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function disposeMaterial(material: Material): void {
  for (const value of Object.values(material)) {
    if (value instanceof Texture) value.dispose();
  }
  material.dispose();
}

function disposeObject(root: Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.geometry.dispose();
    const materials: Material[] = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach(disposeMaterial);
  });
}

function findBone(root: Object3D, name: string): Bone | null {
  const found = root.getObjectByName(name);
  return found instanceof Bone ? found : null;
}

interface CameraShot {
  position: Vector3;
  target: Vector3;
}

interface Arm {
  chain: ArmChain;
  hand: HandRig | null;
  /** +1 for the avatar's left side (+X in rig space), −1 for the right. */
  side: number;
  /** Learned wrist height adjustment that keeps the fingertips on the keys. */
  lift: number;
}

/** Fingertips settle this far above the key surface (presses dip to it). */
const KEY_CLEARANCE = 0.006;
/** How quickly the wrist height follows the measured fingertip contact. */
const LIFT_RATE = 6;

/** A bone the pose layer may touch, with room to stash its animated rotation. */
interface PosedBone {
  bone: Bone;
  saved: Quaternion;
}

function smooth(value: number, edge0: number, edge1: number): number {
  return MathUtils.smoothstep(value, edge0, edge1);
}

interface SceneState {
  disposed: boolean;
  frameId: number;
  isVisible: boolean;
  model: Object3D | null;
  mixer: AnimationMixer | null;
  head: Bone | null;
  neck: Bone | null;
  arms: Arm[];
  posed: PosedBone[];
  lens: MeshStandardMaterial | null;
  desk: Desk | null;
  /** Model-space height and floor, used to frame the camera. */
  height: number;
  baseY: number;
}

/**
 * Renders the rigged avatar into `container`, playing its idle clip and
 * (optionally) turning the head toward the pointer. Rendering pauses while the
 * container is off-screen or the tab is hidden.
 */
export function createAvatarScene(container: HTMLElement, options: AvatarSceneOptions): AvatarScene {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  scene.environment = environment;
  scene.environmentIntensity = 0.7;

  const camera = new PerspectiveCamera(FOV, 1, 0.05, 50);
  const rig = new Group();
  scene.add(rig);
  const heroShot: CameraShot = { position: new Vector3(), target: new Vector3() };
  const deskShot: CameraShot = { position: new Vector3(), target: new Vector3() };
  const lookTarget = new Vector3();
  const handTarget = new Vector3();
  const poleTarget = new Vector3();

  // Soft fill, a neutral key from the front, and coloured rims from behind.
  // Daylight: sky-blue from above, warm bounce from below.
  const hemi = new HemisphereLight(DAY.hemiSky, DAY.hemiGround, DAY.hemi);
  scene.add(hemi);
  const key = new DirectionalLight(DAY.keyColor, DAY.key);
  key.position.set(-1.2, 2.4, 3);
  const rimLeft = new DirectionalLight(DAY.rimCool, DAY.rimCoolIntensity);
  rimLeft.position.set(-2.5, 2.2, -2.5);
  const rimRight = new DirectionalLight(DAY.rimWarm, DAY.rimWarmIntensity);
  rimRight.position.set(2.5, 2, -2);
  scene.add(key, rimLeft, rimRight);

  const timer = new Timer();
  timer.connect(document);
  const pointer = { x: 0, y: 0 };
  const look = { yaw: 0, pitch: 0 };
  const turn = new Quaternion();
  const fingerDir = new Vector3();
  const keyTop = new Vector3();
  const glowColor = new Color();
  const lighting = { night: options.getTheme() === "dark" ? 1 : 0 };

  /** Eases toward the theme's preset; `snap` jumps straight there. */
  const applyLighting = (delta: number, snap: boolean): void => {
    const target = options.getTheme() === "dark" ? 1 : 0;
    lighting.night = snap ? target : lighting.night + (target - lighting.night) * (1 - Math.exp(-THEME_EASE * delta));
    const n = lighting.night;
    hemi.color.lerpColors(DAY.hemiSky, NIGHT.hemiSky, n);
    hemi.groundColor.lerpColors(DAY.hemiGround, NIGHT.hemiGround, n);
    hemi.intensity = MathUtils.lerp(DAY.hemi, NIGHT.hemi, n);
    key.color.lerpColors(DAY.keyColor, NIGHT.keyColor, n);
    key.intensity = MathUtils.lerp(DAY.key, NIGHT.key, n);
    rimLeft.color.lerpColors(DAY.rimCool, NIGHT.rimCool, n);
    rimLeft.intensity = MathUtils.lerp(DAY.rimCoolIntensity, NIGHT.rimCoolIntensity, n);
    rimRight.color.lerpColors(DAY.rimWarm, NIGHT.rimWarm, n);
    rimRight.intensity = MathUtils.lerp(DAY.rimWarmIntensity, NIGHT.rimWarmIntensity, n);
    renderer.toneMappingExposure = MathUtils.lerp(DAY.exposure, NIGHT.exposure, n);
    scene.environmentIntensity = MathUtils.lerp(DAY.environment, NIGHT.environment, n);
    state.desk?.setGlowColor(glowColor.lerpColors(DAY.glow, NIGHT.glow, n));
  };
  const palmDir = new Vector3();
  const euler = new Euler();
  const state: SceneState = {
    disposed: false,
    frameId: 0,
    isVisible: true,
    model: null,
    mixer: null,
    head: null,
    neck: null,
    arms: [],
    posed: [],
    lens: null,
    desk: null,
    height: 1,
    baseY: 0,
  };

  /** Pixels reserved at the top of the canvas (e.g. under the fixed header). */
  const topInset = (): number => {
    const value = Number.parseFloat(getComputedStyle(container).getPropertyValue("--avatar-top-inset"));
    return Number.isFinite(value) ? value : 0;
  };

  const frameCamera = (): void => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const tanHalf = Math.tan(MathUtils.degToRad(FOV / 2));
    const insetFraction = Math.min(0.3, topInset() / height);

    // Hero: chest-up bust, centred. Narrow screens widen the shot and reveal more
    // torso below rather than empty space above the head.
    const spanY = (FRAME_TOP - FRAME_BOTTOM) * state.height;
    const bottomY = state.baseY + FRAME_BOTTOM * state.height;
    const distForHeight = spanY / (1 - insetFraction) / (2 * tanHalf);
    const distForWidth = (FRAME_MIN_WIDTH * state.height) / (2 * tanHalf * camera.aspect);
    const heroDistance = Math.max(distForHeight, distForWidth);
    const visibleH = 2 * tanHalf * heroDistance;
    const extra = visibleH * (1 - insetFraction) - spanY;
    const heroCenterY = bottomY - extra + visibleH / 2;
    heroShot.position.set(0, heroCenterY, heroDistance);
    heroShot.target.set(0, heroCenterY, 0);

    // Desk: waist-up with the whole desk, turned and parked on the left.
    const desk = state.desk;
    if (desk) {
      const { minX, maxX, minZ, maxZ, topY } = desk.bounds;
      const cos = Math.cos(DESK_YAW);
      const sin = Math.sin(DESK_YAW);
      const xs = [0.3, -0.3, minX, maxX].flatMap((x) => [minZ, maxZ, 0].map((z) => x * cos + z * sin));
      const subjectMinX = Math.min(...xs);
      const subjectMaxX = Math.max(...xs);
      const top = state.baseY + state.height + 0.06;
      const bottom = topY - 0.6;
      const subjectH = top - bottom;
      const subjectW = subjectMaxX - subjectMinX;
      // Perspective enlarges the near desk edge, so leave generous side margin.
      const deskVisibleH = Math.max((subjectH / (1 - insetFraction)) * 1.08, subjectW / (0.4 * camera.aspect));
      const deskDistance = deskVisibleH / (2 * tanHalf);
      const deskVisibleW = deskVisibleH * camera.aspect;
      const centerX = (subjectMinX + subjectMaxX) / 2 + (0.5 - DESK_SCREEN_X) * deskVisibleW;
      const centerY = bottom - (deskVisibleH * (1 - insetFraction) - subjectH) / 2 + deskVisibleH / 2;
      deskShot.target.set(centerX, centerY, 0);
      deskShot.position.set(centerX, centerY + deskDistance * 0.12, deskDistance);
    } else {
      deskShot.position.copy(heroShot.position);
      deskShot.target.copy(heroShot.target);
    }
    applyCamera(state.model ? options.getProgress() : 0);
    camera.updateProjectionMatrix();
  };

  const applyCamera = (progress: number): void => {
    const t = smooth(progress, 0, 0.85);
    camera.position.lerpVectors(heroShot.position, deskShot.position, t);
    lookTarget.lerpVectors(heroShot.target, deskShot.target, t);
    camera.lookAt(lookTarget);
  };

  const isTracking = options.trackPointer && !options.reducedMotion;

  const updateLook = (delta: number): void => {
    const blend = 1 - Math.exp(-TRACK_SMOOTHING * delta);
    look.yaw += (pointer.x * MAX_YAW - look.yaw) * blend;
    look.pitch += (pointer.y * MAX_PITCH - look.pitch) * blend;
  };

  /** Post-multiplies a look offset in the bone's local space, over the idle clip. */
  const turnBone = (bone: Bone | null, pitch: number, yaw: number): void => {
    if (!bone) return;
    turn.setFromEuler(euler.set(pitch, yaw, 0));
    bone.quaternion.multiply(turn);
  };

  /** Hands on the keyboard with light, alternating key taps. */
  const typingTarget = (arm: Arm, time: number): Vector3 => {
    const desk = state.desk;
    if (!desk) return handTarget.set(0, 0, 0);
    const phase = arm.side > 0 ? 0 : Math.PI;
    const bob = Math.max(0, Math.sin(time * 4.5 + phase)) * 0.005;
    const drift = Math.sin(time * 1.7 + phase) * 0.018;
    // Wrists hover just in front of the keys; curled fingers reach down onto them.
    handTarget.set(arm.side * 0.1 + drift, desk.keyboardCenter.y + 0.05 + bob + arm.lift, desk.keyboardCenter.z - 0.085);
    return desk.group.localToWorld(handTarget);
  };

  const render = (timestamp?: number): void => {
    timer.update(timestamp);
    const delta = Math.min(timer.getDelta(), 0.1);
    state.mixer?.update(delta);
    applyLighting(delta, false);

    const progress = state.model ? options.getProgress() : 0;
    const typing = smooth(progress, 0.45, 0.95);
    rig.rotation.y = DESK_YAW * smooth(progress, 0.05, 0.7);
    state.desk?.setReveal(progress);
    if (state.lens) {
      // Swap the sunglasses for clear lenses on the way to the desk.
      const clear = smooth(progress, 0.2, 0.6);
      state.lens.color.lerpColors(LENS_SUN.color, LENS_CLEAR.color, clear);
      state.lens.opacity = MathUtils.lerp(LENS_SUN.opacity, LENS_CLEAR.opacity, clear);
      state.lens.metalness = MathUtils.lerp(LENS_SUN.metalness, LENS_CLEAR.metalness, clear);
    }
    applyCamera(progress);

    if (!isTracking && typing <= 0) {
      renderer.render(scene, camera);
      return;
    }

    // The mixer only rewrites a bone when its animated value changes, so any
    // offset left on a bone would stack on itself during still stretches of the
    // clip and snap back later. Layer the pose just for this render, then
    // restore the clean animated pose.
    for (const posed of state.posed) posed.saved.copy(posed.bone.quaternion);

    if (typing > 0) {
      rig.updateMatrixWorld(true);
      const time = timer.getElapsed();
      for (const arm of state.arms) {
        // Elbows down and a little back/out, like resting forearms on a desk.
        poleTarget.set(arm.side * 0.3, state.baseY + state.height * 0.4, -0.45);
        rig.localToWorld(poleTarget);
        solveArm(arm.chain, typingTarget(arm, time), poleTarget, typing);
        if (arm.hand) {
          // Fingers forward, angled down and slightly inward; palm facing the keys.
          fingerDir.set(-arm.side * 0.12, -0.2, 1).normalize().applyQuaternion(rig.quaternion);
          palmDir.set(-arm.side * 0.15, -1, 0).normalize().applyQuaternion(rig.quaternion);
          poseHand(arm.hand, fingerDir, palmDir, typing, time, arm.side > 0 ? 0 : 0.95);

          // Contact: nudge the wrist so the lowest fingertip rests on the keys
          // rather than sinking into them. Smoothed so single presses don't bob it.
          if (state.desk && typing > 0.5) {
            keyTop.set(0, state.desk.keyTopY, state.desk.keyboardCenter.z);
            const keyTopWorldY = state.desk.group.localToWorld(keyTop).y;
            const error = keyTopWorldY + KEY_CLEARANCE - lowestFingertipY(arm.hand);
            const goal = MathUtils.clamp(arm.lift + error, -0.04, 0.12);
            arm.lift += (goal - arm.lift) * Math.min(1, delta * LIFT_RATE);
          }
        }
      }
    }

    if (isTracking) updateLook(delta);
    const pitch = MathUtils.lerp(isTracking ? look.pitch : 0, DESK_PITCH, typing);
    const yaw = (isTracking ? look.yaw : 0) * (1 - typing);
    turnBone(state.neck, pitch * 0.35, yaw * 0.4);
    turnBone(state.head, pitch * 0.65, yaw * 0.6);
    renderer.render(scene, camera);

    for (const posed of state.posed) posed.bone.quaternion.copy(posed.saved);
  };

  const loop = (timestamp: number): void => {
    render(timestamp);
    state.frameId = requestAnimationFrame(loop);
  };

  const start = (): void => {
    if (options.reducedMotion || state.disposed || !state.model) return;
    if (state.frameId !== 0 || !state.isVisible || document.hidden) return;
    timer.reset();
    state.frameId = requestAnimationFrame(loop);
  };

  const stop = (): void => {
    cancelAnimationFrame(state.frameId);
    state.frameId = 0;
  };

  const onResize = (): void => {
    frameCamera();
    if (options.reducedMotion && state.model) renderer.render(scene, camera);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType !== "mouse") return;
    const rect = container.getBoundingClientRect();
    // Aim from roughly the avatar's eye line toward the pointer.
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height * 0.3;
    pointer.x = MathUtils.clamp((event.clientX - originX) / (window.innerWidth / 2), -1, 1);
    pointer.y = MathUtils.clamp((event.clientY - originY) / (window.innerHeight / 2), -1, 1);
  };

  const onVisibilityChange = (): void => {
    if (document.hidden) stop();
    else start();
  };

  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(container);

  const intersectionObserver = new IntersectionObserver(([entry]) => {
    state.isVisible = entry?.isIntersecting ?? true;
    if (state.isVisible) start();
    else stop();
  });
  intersectionObserver.observe(container);

  if (options.trackPointer && !options.reducedMotion) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
  }
  document.addEventListener("visibilitychange", onVisibilityChange);

  new GLTFLoader().load(
    options.modelUrl,
    (gltf) => {
      if (state.disposed) {
        disposeObject(gltf.scene);
        return;
      }
      const model = gltf.scene;
      model.traverse((child) => {
        // Skinned meshes animate outside their bind-pose bounds.
        if (child instanceof Mesh) child.frustumCulled = false;
      });
      const bounds = new Box3().setFromObject(model);
      const size = bounds.getSize(new Vector3());
      const center = bounds.getCenter(new Vector3());
      model.position.x -= center.x;
      model.position.z -= center.z;
      state.height = size.y;
      state.baseY = bounds.min.y;

      state.head = findBone(model, "Head");
      state.neck = findBone(model, "Neck");

      const [idle] = gltf.animations;
      if (idle) {
        state.mixer = new AnimationMixer(model);
        state.mixer.clipAction(idle).play();
        // Settle into a natural mid-clip pose rather than the bind pose.
        state.mixer.update(options.reducedMotion ? idle.duration * 0.25 : 0);
      }

      rig.add(model);
      state.model = model;

      // Measure the arms in the settled pose to size the desk and the IK chains.
      rig.updateMatrixWorld(true);
      for (const prefix of ["Left", "Right"]) {
        const upper = findBone(model, `${prefix}Arm`);
        const fore = findBone(model, `${prefix}ForeArm`);
        const hand = findBone(model, `${prefix}Hand`);
        if (!upper || !fore || !hand) continue;
        const side = Math.sign(upper.getWorldPosition(new Vector3()).x) || (prefix === "Left" ? 1 : -1);
        const handRig = createHandRig(model, prefix, fore, hand, side);
        state.arms.push({ chain: createArmChain(upper, fore, hand), hand: handRig, side, lift: 0 });
      }

      // Every bone the pose layer touches gets saved before and restored after a frame.
      const posedBones = [state.neck, state.head];
      for (const arm of state.arms) {
        posedBones.push(arm.chain.upper, arm.chain.fore, arm.chain.hand, ...(arm.hand?.fingers.flat() ?? []));
      }
      state.posed = posedBones
        .filter((bone): bone is Bone => bone !== null)
        .map((bone) => ({ bone, saved: new Quaternion() }));

      model.traverse((child) => {
        if (!(child instanceof Mesh)) return;
        const material: unknown = child.material;
        if (material instanceof MeshStandardMaterial && material.name === LENS_MATERIAL) state.lens = material;
      });
      const [firstArm] = state.arms;
      if (firstArm) {
        const desk = createDesk({
          shoulderY: firstArm.chain.upper.getWorldPosition(new Vector3()).y,
          upperArm: firstArm.chain.upperLength,
          foreArm: firstArm.chain.foreLength,
          eyeY: state.baseY + state.height - 0.13,
        });
        desk.setReveal(0);
        rig.add(desk.group);
        state.desk = desk;
      }
      frameCamera();
      renderer.render(scene, camera);
      options.onLoad();
      start();
    },
    undefined,
    (error) => {
      if (!state.disposed) options.onError(error);
    },
  );

  frameCamera();

  return {
    refresh: () => {
      if (!state.model) return;
      // The animated loop eases lighting itself; a paused (reduced-motion) scene snaps.
      if (options.reducedMotion) {
        applyLighting(0, true);
        renderer.render(scene, camera);
      }
    },
    dispose: () => {
      state.disposed = true;
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      state.mixer?.stopAllAction();
      if (state.model) disposeObject(state.model);
      state.desk?.dispose();
      timer.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
