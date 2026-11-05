import { Bone, Matrix4, Quaternion, Vector3, type Object3D } from "three";

export interface HandRig {
  fore: Bone;
  hand: Bone;
  /** Index, middle, ring, pinky — each proximal → distal. */
  fingers: Bone[][];
  /** Finger direction and palm normal in the hand bone's local space (orthonormal). */
  fingerLocal: Vector3;
  palmLocal: Vector3;
}

const FINGERS = ["Index", "Middle", "Ring", "Pinky"] as const;
/** Resting curl per joint (proximal → distal), radians: relaxed, gently arched fingers. */
const BASE_CURL = [0.28, 0.35, 0.2];
/** Extra curl at the peak of a key press, per joint. */
const TAP_CURL = [0.15, 0.12, 0.06];
const TAP_SPEED = 9;
/** Share of the palm-down twist taken by the forearm (the rest by the wrist). */
const FOREARM_TWIST = 0.75;

const a = new Vector3();
const b = new Vector3();
const c = new Vector3();
const axis = new Vector3();
const p1 = new Vector3();
const p2 = new Vector3();
const f = new Vector3();
const n = new Vector3();
const k = new Vector3();
const q = new Quaternion();
const qWorld = new Quaternion();
const qParent = new Quaternion();
const mWorld = new Matrix4();
const mLocal = new Matrix4();

function boneByName(root: Object3D, name: string): Bone | null {
  const found = root.getObjectByName(name);
  return found instanceof Bone ? found : null;
}

/** Sets `bone`'s world rotation to `world`, keeping its parent unchanged. */
function setWorldRotation(bone: Bone, world: Quaternion, weight: number): void {
  if (bone.parent) bone.parent.getWorldQuaternion(qParent);
  else qParent.identity();
  q.copy(qParent).invert().multiply(world);
  bone.quaternion.slerp(q, weight);
  bone.updateMatrixWorld(true);
}

/**
 * Measures the hand's own axes from the skeleton — finger direction from the
 * wrist to the middle knuckle, palm normal from the knuckle line — so posing
 * works without knowing the rig's bone-axis conventions.
 * `side` is +1 for the avatar's left hand, −1 for the right.
 */
export function createHandRig(root: Object3D, prefix: string, fore: Bone, hand: Bone, side: number): HandRig | null {
  const fingers: Bone[][] = [];
  for (const finger of FINGERS) {
    const joints = [1, 2, 3].map((i) => boneByName(root, `${prefix}Hand${finger}${i}`));
    if (joints.every((joint): joint is Bone => joint !== null)) fingers.push(joints);
  }
  const index = fingers[0]?.[0];
  const middle = fingers[1]?.[0];
  const pinky = fingers[3]?.[0];
  if (!index || !middle || !pinky) return null;

  hand.getWorldPosition(a);
  const fingerWorld = middle.getWorldPosition(b).sub(a).normalize();
  const across = index.getWorldPosition(c).sub(pinky.getWorldPosition(a)).normalize();
  // Anatomical: finger × (index − pinky) points out of the palm for the left
  // hand and out of the back for the right, hence the side flip.
  const palmWorld = new Vector3().crossVectors(fingerWorld, across).multiplyScalar(side);
  palmWorld.addScaledVector(fingerWorld, -palmWorld.dot(fingerWorld)).normalize();

  const toLocal = hand.getWorldQuaternion(new Quaternion()).invert();
  return {
    fore,
    hand,
    fingers,
    fingerLocal: fingerWorld.clone().applyQuaternion(toLocal),
    palmLocal: palmWorld.applyQuaternion(toLocal),
  };
}

const tipBase = new Vector3();
const tip = new Vector3();

/**
 * World-space height of the lowest fingertip. Tips aren't bones, so each is
 * extrapolated past the last joint by roughly that joint's own length.
 */
export function lowestFingertipY(rig: HandRig): number {
  let lowest = Number.POSITIVE_INFINITY;
  for (const joints of rig.fingers) {
    const middle = joints[1];
    const distal = joints[2];
    if (!middle || !distal) continue;
    middle.getWorldPosition(tipBase);
    distal.getWorldPosition(tip);
    const length = tip.distanceTo(tipBase) * 0.9;
    tip.addScaledVector(c.subVectors(tip, tipBase).normalize(), length);
    lowest = Math.min(lowest, tip.y);
  }
  return lowest;
}

/** A sharp 0→1→0 pulse per finger, staggered so the fingers alternate. */
function tap(time: number, phase: number): number {
  return Math.max(0, Math.sin(time * TAP_SPEED + phase)) ** 3;
}

/**
 * Turns the palm toward `palmWorld` with fingers along `fingerWorld`, then
 * curls the fingers into a typing claw with alternating key presses. Blended
 * by `weight`; world matrices must be current.
 */
export function poseHand(
  rig: HandRig,
  fingerWorld: Vector3,
  palmWorld: Vector3,
  weight: number,
  time: number,
  phaseOffset: number,
): void {
  if (weight <= 0) return;
  const { fore, hand } = rig;

  // 1) Pronate: twist the forearm about its own axis toward palm-down.
  hand.getWorldPosition(a);
  axis.subVectors(a, fore.getWorldPosition(b)).normalize();
  p1.copy(rig.palmLocal).applyQuaternion(hand.getWorldQuaternion(qWorld));
  p1.addScaledVector(axis, -p1.dot(axis));
  p2.copy(palmWorld).addScaledVector(axis, -palmWorld.dot(axis));
  if (p1.lengthSq() > 1e-6 && p2.lengthSq() > 1e-6) {
    const angle = Math.atan2(axis.dot(c.crossVectors(p1, p2)), p1.dot(p2));
    q.setFromAxisAngle(axis, angle * FOREARM_TWIST);
    fore.getWorldQuaternion(qWorld).premultiply(q);
    setWorldRotation(fore, qWorld, weight);
  }

  // 2) Orient the hand: map its measured (finger, palm) axes onto the targets.
  f.copy(fingerWorld).normalize();
  n.copy(palmWorld).addScaledVector(f, -palmWorld.dot(f)).normalize();
  mWorld.makeBasis(f, n, k.crossVectors(f, n));
  mLocal.makeBasis(rig.fingerLocal, rig.palmLocal, c.crossVectors(rig.fingerLocal, rig.palmLocal));
  qWorld.setFromRotationMatrix(mWorld.multiply(mLocal.transpose()));
  setWorldRotation(hand, qWorld, weight);

  // 3) Curl each finger about the knuckle hinge (finger × palm), which swings
  //    the fingertips toward the palm side — down onto the keys.
  hand.getWorldQuaternion(qWorld);
  k.crossVectors(rig.fingerLocal, rig.palmLocal).applyQuaternion(qWorld).normalize();
  rig.fingers.forEach((joints, fingerIndex) => {
    const press = tap(time, phaseOffset + fingerIndex * 1.9);
    joints.forEach((joint, j) => {
      const angle = weight * ((BASE_CURL[j] ?? 0) + (TAP_CURL[j] ?? 0) * press);
      c.copy(k).applyQuaternion(joint.getWorldQuaternion(qWorld).invert());
      joint.quaternion.multiply(q.setFromAxisAngle(c, angle));
      joint.updateMatrixWorld(true);
    });
  });
}
