import {
  BoxGeometry,
  CanvasTexture,
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SRGBColorSpace,
  Vector3,
  type BufferGeometry,
  type Material,
} from "three";

/** Body measurements (rig space, avatar facing +Z) the desk is sized from. */
export interface DeskFit {
  shoulderY: number;
  upperArm: number;
  foreArm: number;
  eyeY: number;
}

export interface Desk {
  group: Group;
  /** Rig-space point between the hands on the keyboard. */
  keyboardCenter: Vector3;
  /** Rig-space height of the key surface the fingertips rest on. */
  keyTopY: number;
  /** Rig-space desk extents, used to frame the camera. */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number; topY: number; screenTopY: number };
  /** 0 → hidden below the floor, 1 → in place with the screen lit. */
  setReveal: (amount: number) => void;
  /** Tints the monitor's edge glow, screen spill and floor pool (per theme). */
  setGlowColor: (color: Color) => void;
  dispose: () => void;
}

/** Default glow tint; the scene retints it to match the day/night theme. */
const DEFAULT_GLOW = new Color("#4f7fc0");

/** Deterministic pseudo-random so the "code" on screen is stable between loads. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Draws abstract syntax-highlighted lines — shapes only, no real text. */
function createCodeTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 300;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const random = seeded(7);
    // Warm-dark editor with clay / blue / olive / ivory "tokens".
    const palette = ["#d97757", "#6a9bcc", "#9aab7f", "#f0eee6", "#b0aea5", "#e3b48f"];
    ctx.fillStyle = "#1f1e1b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#292825";
    ctx.fillRect(0, 0, 34, canvas.height);
    let indent = 0;
    for (let line = 0; line < 17; line++) {
      const y = 14 + line * 16.5;
      ctx.fillStyle = "#5e5d59";
      ctx.fillRect(10, y, 14, 6);
      if (random() < 0.12) continue;
      if (random() < 0.3) indent = Math.max(0, Math.min(3, indent + (random() < 0.5 ? -1 : 1)));
      let x = 46 + indent * 22;
      const tokens = 1 + Math.floor(random() * 4);
      for (let t = 0; t < tokens && x < canvas.width - 30; t++) {
        const width = 18 + random() * 70;
        ctx.fillStyle = palette[Math.floor(random() * palette.length)] ?? "#f0eee6";
        ctx.globalAlpha = 0.85;
        ctx.fillRect(x, y, width, 7);
        x += width + 8;
      }
      ctx.globalAlpha = 1;
    }
    // Blinking-caret stand-in.
    ctx.fillStyle = "#d97757";
    ctx.fillRect(46, 14 + 17 * 16.5, 8, 12);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function createGlowTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    // White falloff; the material colour supplies the tint.
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.34)");
    gradient.addColorStop(0.45, "rgba(255, 255, 255, 0.1)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new CanvasTexture(canvas);
}

/** A standing desk with monitor and keyboard, proportioned to the avatar. */
export function createDesk(fit: DeskFit): Desk {
  // Forearms roughly level with the elbows bent ~90°.
  const elbowY = fit.shoulderY - fit.upperArm * 0.92;
  const keyboardTop = elbowY - 0.01;
  const topY = keyboardTop - 0.025;
  const handZ = 0.04 + fit.foreArm * 0.82;
  const frontZ = handZ - 0.17;
  const depth = 0.66;
  const width = 1.1;
  const centerZ = frontZ + depth / 2;

  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const box = (w: number, h: number, d: number): BoxGeometry => {
    const g = new BoxGeometry(w, h, d);
    geometries.push(g);
    return g;
  };
  const track = <M extends Material>(m: M): M => {
    materials.push(m);
    return m;
  };

  const topMaterial = track(new MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.6, metalness: 0.02 }));
  const metal = track(new MeshStandardMaterial({ color: 0x2b2a27, roughness: 0.4, metalness: 0.6 }));
  const plastic = track(new MeshStandardMaterial({ color: 0x2f2e2b, roughness: 0.5, metalness: 0.15 }));
  const shellMaterial = track(new MeshStandardMaterial({ color: 0x3d3d3a, roughness: 0.4, metalness: 0.35 }));
  const glow = DEFAULT_GLOW.clone();
  const rimMaterial = track(new MeshBasicMaterial({ color: glow, toneMapped: false }));
  const keys = track(new MeshStandardMaterial({ color: 0xdedbd2, roughness: 0.65, metalness: 0 }));
  const screenTexture = createCodeTexture();
  const screenMaterial = track(new MeshBasicMaterial({ map: screenTexture, toneMapped: false }));
  const glowTexture = createGlowTexture();
  const glowMaterial = track(
    // Normal blending: additive light vanishes over the transparent canvas on a light page.
    new MeshBasicMaterial({ map: glowTexture, color: DEFAULT_GLOW, transparent: true, depthWrite: false }),
  );

  const group = new Group();
  const deskBody = new Group();
  group.add(deskBody);

  // Tabletop and the two telescoping legs with floor feet.
  const top = new Mesh(box(width, 0.035, depth), topMaterial);
  top.position.set(0, topY - 0.0175, centerZ);
  deskBody.add(top);
  for (const side of [-1, 1]) {
    const leg = new Mesh(box(0.07, topY - 0.06, 0.07), metal);
    leg.position.set(side * (width / 2 - 0.12), (topY - 0.06) / 2 + 0.03, centerZ);
    const foot = new Mesh(box(0.08, 0.035, depth - 0.06), metal);
    foot.position.set(side * (width / 2 - 0.12), 0.0175, centerZ);
    deskBody.add(leg, foot);
  }
  const crossbar = new Mesh(box(width - 0.24, 0.05, 0.05), metal);
  crossbar.position.set(0, topY - 0.09, centerZ);
  deskBody.add(crossbar);

  // Keyboard: a dark base with a lighter key bed.
  const keyboardCenter = new Vector3(0, keyboardTop, handZ + 0.02);
  const keyboard = new Mesh(box(0.44, 0.018, 0.14), plastic);
  keyboard.position.set(0, topY + 0.009, keyboardCenter.z);
  const keyBed = new Mesh(box(0.41, 0.008, 0.11), keys);
  keyBed.position.set(0, topY + 0.022, keyboardCenter.z);
  deskBody.add(keyboard, keyBed);

  // Monitor faces the avatar (−Z); its screen sits a little below eye level.
  const monitor = new Group();
  const screenW = 0.64;
  const screenH = 0.38;
  const screenCenterY = fit.eyeY - 0.08;
  const monitorZ = centerZ + 0.16;
  const shell = new Mesh(box(screenW + 0.03, screenH + 0.03, 0.035), shellMaterial);
  shell.position.set(0, screenCenterY, monitorZ + 0.018);
  // Screen light leaking around the bezel, so the back of the monitor reads as "on".
  const rim = new Mesh(box(screenW + 0.05, screenH + 0.05, 0.004), rimMaterial);
  rim.position.set(0, screenCenterY, monitorZ - 0.002);
  const screenGeometry = new PlaneGeometry(screenW, screenH);
  geometries.push(screenGeometry);
  const screen = new Mesh(screenGeometry, screenMaterial);
  screen.position.set(0, screenCenterY, monitorZ - 0.001);
  screen.rotation.y = Math.PI;
  const neck = new Mesh(box(0.05, screenCenterY - topY - 0.1, 0.04), metal);
  neck.position.set(0, topY + (screenCenterY - topY - 0.1) / 2, monitorZ + 0.06);
  const base = new Mesh(box(0.24, 0.015, 0.18), metal);
  base.position.set(0, topY + 0.0075, monitorZ + 0.04);
  monitor.add(rim, shell, screen, neck, base);
  deskBody.add(monitor);

  // Screen spill onto the face/hands, and a soft pool of light on the floor.
  const screenLight = new PointLight(glow, 0, 1.6, 1.6);
  screenLight.position.set(0, screenCenterY, monitorZ - 0.25);
  group.add(screenLight);
  const floorGeometry = new PlaneGeometry(2.6, 2.6);
  geometries.push(floorGeometry);
  const floorGlow = new Mesh(floorGeometry, glowMaterial);
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.set(0, 0.002, centerZ * 0.5);
  group.add(floorGlow);

  const restMonitorY = monitor.position.y;

  const setReveal = (amount: number): void => {
    const visible = amount > 0.001;
    group.visible = visible;
    if (!visible) return;
    // The desk rises like a standing desk; the monitor follows a beat later.
    const rise = MathUtils.smoothstep(amount, 0, 0.75);
    const lift = MathUtils.smoothstep(amount, 0.35, 1);
    deskBody.position.y = -(topY + 0.4) * (1 - rise) ** 2;
    monitor.position.y = restMonitorY - 0.5 * (1 - lift) ** 2;
    screenMaterial.color.setScalar(0.15 + 0.85 * lift);
    rimMaterial.color.copy(glow).multiplyScalar(lift);
    screenLight.intensity = 1.8 * lift;
    glowMaterial.opacity = rise;
  };

  return {
    group,
    keyboardCenter,
    keyTopY: topY + 0.026,
    bounds: {
      minX: -width / 2,
      maxX: width / 2,
      minZ: frontZ,
      maxZ: frontZ + depth,
      topY,
      screenTopY: screenCenterY + screenH / 2,
    },
    setReveal,
    setGlowColor: (color: Color): void => {
      glow.copy(color);
      screenLight.color.copy(color);
      glowMaterial.color.copy(color);
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      screenTexture.dispose();
      glowTexture.dispose();
    },
  };
}
