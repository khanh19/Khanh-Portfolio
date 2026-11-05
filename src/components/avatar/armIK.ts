import { Quaternion, Vector3, type Bone } from "three";

export interface ArmChain {
  upper: Bone;
  fore: Bone;
  hand: Bone;
  upperLength: number;
  foreLength: number;
}

const origin = new Vector3();
const from = new Vector3();
const to = new Vector3();
const delta = new Quaternion();
const world = new Quaternion();
const parentWorld = new Quaternion();
const local = new Quaternion();
const shoulder = new Vector3();
const dir = new Vector3();
const poleDir = new Vector3();
const elbow = new Vector3();
const reach = new Vector3();
const child = new Vector3();

/** Measures segment lengths from the current (world-updated) pose. */
export function createArmChain(upper: Bone, fore: Bone, hand: Bone): ArmChain {
  const a = upper.getWorldPosition(new Vector3());
  const b = fore.getWorldPosition(new Vector3());
  const c = hand.getWorldPosition(new Vector3());
  return { upper, fore, hand, upperLength: a.distanceTo(b), foreLength: b.distanceTo(c) };
}

/**
 * Rotates `bone` so the direction toward `childWorld` swings onto `targetWorld`,
 * slerped from its current local rotation by `weight`, then refreshes the
 * subtree's world matrices.
 */
function aimBone(bone: Bone, childWorld: Vector3, targetWorld: Vector3, weight: number): void {
  bone.getWorldPosition(origin);
  from.subVectors(childWorld, origin).normalize();
  to.subVectors(targetWorld, origin).normalize();
  delta.setFromUnitVectors(from, to);

  bone.getWorldQuaternion(world).premultiply(delta);
  if (bone.parent) bone.parent.getWorldQuaternion(parentWorld);
  else parentWorld.identity();
  local.copy(parentWorld).invert().multiply(world);

  bone.quaternion.slerp(local, weight);
  bone.updateMatrixWorld(true);
}

/**
 * Analytic two-bone IK: bends the arm so the hand reaches `target`, with the
 * elbow pushed toward `pole`. `weight` blends from the animated pose (0) to the
 * solved pose (1). World matrices must be current before calling.
 */
export function solveArm(chain: ArmChain, target: Vector3, pole: Vector3, weight: number): void {
  if (weight <= 0) return;
  const a = chain.upperLength;
  const b = chain.foreLength;

  chain.upper.getWorldPosition(shoulder);
  dir.subVectors(target, shoulder);
  const distance = Math.min(Math.max(dir.length(), Math.abs(a - b) + 1e-4), (a + b) * 0.999);
  dir.normalize();

  // Elbow lies on the circle where both segment spheres meet, nearest the pole.
  const along = (a * a - b * b + distance * distance) / (2 * distance);
  const height = Math.sqrt(Math.max(0, a * a - along * along));
  poleDir.subVectors(pole, shoulder);
  poleDir.addScaledVector(dir, -poleDir.dot(dir));
  if (poleDir.lengthSq() < 1e-8) poleDir.set(0, -1, 0);
  poleDir.normalize();

  elbow.copy(shoulder).addScaledVector(dir, along).addScaledVector(poleDir, height);
  reach.copy(shoulder).addScaledVector(dir, distance);

  aimBone(chain.upper, chain.fore.getWorldPosition(child), elbow, weight);
  aimBone(chain.fore, chain.hand.getWorldPosition(child), reach, weight);
}
