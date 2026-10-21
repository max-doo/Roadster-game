import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Registry } from './registry';

/**
 * SceneKit — the geometry batcher every prop and biome is authored with.
 *
 * Design rules:
 *  - All coordinates and sizes are metres; nothing scales the world for effect.
 *  - Repeated parts are instanced per (geometry, material, chunk), so a container
 *    yard of 300 boxes still costs one draw call per visible chunk.
 *  - Chunks are 400 m slices along the course, so frustum culling can drop the
 *    parts of a 2 km level that are behind the camera.
 *  - `detail` selects shadow casting and geometry resolution, so backdrop props
 *    stay cheap without changing silhouette scale.
 */

export type Detail = 'near' | 'mid' | 'far';
type Frame = {position: THREE.Vector3; rotation: THREE.Quaternion};
type Batch = {geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[]; shadow: boolean; chunk: number};

const CHUNK = 140;

// Box UV orientation per face: the axis U and V follow.
const FACE_AXES: [number, number][] = [[2, 1], [2, 1], [0, 2], [0, 2], [0, 1], [0, 1]];

export class SceneKit {
  readonly group = new THREE.Group();
  detail: Detail = 'mid';
  chunking = true;
  private batches = new Map<string, Batch>();
  private geometries = new Map<string, THREE.BufferGeometry>();
  private frames: Frame[] = [];
  private dummy = new THREE.Object3D();
  private axis = new THREE.Vector3(0, 1, 0);
  private box = new THREE.BoxGeometry(1, 1, 1);
  private cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);

  constructor(private registry: Registry, name = 'dressing') {
    this.group.name = name;
    registry.geometry(this.box); registry.geometry(this.cylinder);
  }

  /** Local prop space: props are authored around their own origin, then placed. */
  withFrame(x: number, y: number, z: number, yaw: number, build: () => void, pitch = 0) {
    const rotation = new THREE.Quaternion().setFromAxisAngle(this.axis, yaw)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), pitch));
    this.frames.push({position: new THREE.Vector3(x, y, z), rotation});
    try { build(); } finally { this.frames.pop(); }
  }

  private world(x: number, y: number, z: number) {
    const point = new THREE.Vector3(x, y, z);
    for (let i = this.frames.length - 1; i >= 0; i--) {
      const frame = this.frames[i];
      point.applyQuaternion(frame.rotation).add(frame.position);
    }
    return point;
  }

  private rotation() {
    const rotation = new THREE.Quaternion();
    for (const frame of this.frames) rotation.multiply(frame.rotation);
    return rotation;
  }

  private batch(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, shadow: boolean) {
    const chunk = this.chunking ? Math.floor(x / CHUNK) : 0;
    const key = `${geometry.uuid}:${material.uuid}:${shadow ? 1 : 0}:${chunk}`;
    let entry = this.batches.get(key);
    if (!entry) { entry = {geometry, material, matrices: [], shadow, chunk}; this.batches.set(key, entry); }
    return entry;
  }

  private push(geometry: THREE.BufferGeometry, material: THREE.Material, position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3, shadow: boolean) {
    this.dummy.position.copy(position);
    this.dummy.quaternion.setFromEuler(rotation).premultiply(this.rotation());
    this.dummy.scale.copy(scale);
    this.dummy.updateMatrix();
    this.batch(geometry, material, position.x, shadow).matrices.push(this.dummy.matrix.clone());
  }

  /** Shared 1 m cube, scaled non-uniformly — the cheapest structural part. */
  block(material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, rotY = 0, shadow?: boolean) {
    this.push(this.box, material, this.world(x, y, z), new THREE.Euler(0, rotY, 0), new THREE.Vector3(w, h, d), shadow ?? this.detail === 'near');
  }

  /** Cube with world-scale UVs, so cladding tiles at a fixed physical size. */
  panel(material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, uvMetres = 2.4, rotY = 0, shadow?: boolean) {
    const geometry = this.worldUvBox(w, h, d, uvMetres);
    this.push(geometry, material, this.world(x, y, z), new THREE.Euler(0, rotY, 0), new THREE.Vector3(1, 1, 1), shadow ?? this.detail === 'near');
  }

  /** World-UV slab with an arbitrary tilt, used for roofs, decks and ramps. */
  plate(material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, tilt: {x?: number; y?: number; z?: number} = {}, uvMetres = 2.4, shadow?: boolean) {
    const geometry = this.worldUvBox(w, h, d, uvMetres);
    const rotation = new THREE.Euler(tilt.x ?? 0, tilt.y ?? 0, tilt.z ?? 0);
    this.push(geometry, material, this.world(x, y, z), rotation, new THREE.Vector3(1, 1, 1), shadow ?? this.detail === 'near');
  }

  /** Bevelled block for cabins, nacelles and other readable near-field masses. */
  rounded(material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, radius = .12, shadow = true) {
    const geometry = this.roundedBox(w, h, d, radius);
    this.push(geometry, material, this.world(x, y, z), new THREE.Euler(), new THREE.Vector3(1, 1, 1), shadow);
  }

  /** Cylinder between two local points; struts, rails, cables and pipes. */
  beam(material: THREE.Material, a: [number, number, number], b: [number, number, number], radius: number, shadow = true) {
    const start = this.world(...a), end = this.world(...b);
    const delta = end.clone().sub(start);
    if (delta.lengthSq() < 1e-8) return;
    const quaternion = new THREE.Quaternion().setFromUnitVectors(this.axis, delta.clone().normalize());
    const position = start.clone().add(end).multiplyScalar(.5);
    this.dummy.position.copy(position); this.dummy.quaternion.copy(quaternion); this.dummy.scale.set(radius, delta.length(), radius);
    this.dummy.updateMatrix();
    this.batch(this.cylinder, material, position.x, shadow).matrices.push(this.dummy.matrix.clone());
  }

  /** Vertical cylinder (posts, silos, tanks, masts). */
  column(material: THREE.Material, x: number, y: number, z: number, radius: number, height: number, shadow?: boolean) {
    this.push(this.cylinder, material, this.world(x, y, z), new THREE.Euler(), new THREE.Vector3(radius, height, radius), shadow ?? this.detail === 'near');
  }

  /** Horizontal cylinder along X (pipes, jet fans, drums on their side). */
  tubeX(material: THREE.Material, x: number, y: number, z: number, radius: number, length: number, shadow = true) {
    this.push(this.cylinder, material, this.world(x, y, z), new THREE.Euler(0, 0, Math.PI / 2), new THREE.Vector3(radius, length, radius), shadow);
  }

  tubeZ(material: THREE.Material, x: number, y: number, z: number, radius: number, length: number, shadow = true) {
    this.push(this.cylinder, material, this.world(x, y, z), new THREE.Euler(Math.PI / 2, 0, 0), new THREE.Vector3(radius, length, radius), shadow);
  }

  /** Tapered column (silo roofs, turbine towers, funnel stacks). */
  cone(material: THREE.Material, x: number, y: number, z: number, bottom: number, top: number, height: number, shadow = true) {
    const geometry = this.keyed(`cone:${bottom.toFixed(2)}:${top.toFixed(2)}`, () => new THREE.CylinderGeometry(top || .001, bottom, 1, 16, 1));
    this.push(geometry, material, this.world(x, y, z), new THREE.Euler(), new THREE.Vector3(1, height, 1), shadow);
  }

  torus(material: THREE.Material, x: number, y: number, z: number, radius: number, tube: number, plane: 'xy' | 'xz' | 'yz' = 'xy', shadow = false) {
    const geometry = this.keyed(`torus:${radius.toFixed(1)}:${tube.toFixed(2)}`, () => new THREE.TorusGeometry(radius, tube, 4, 20));
    const rotation = plane === 'xz' ? new THREE.Euler(Math.PI / 2, 0, 0) : plane === 'yz' ? new THREE.Euler(0, Math.PI / 2, 0) : new THREE.Euler();
    this.push(geometry, material, this.world(x, y, z), rotation, new THREE.Vector3(1, 1, 1), shadow);
  }

  /** Fully custom geometry (already cached by the caller). */
  mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, rotation = new THREE.Euler(), shadow = true, scale: [number, number, number] = [1, 1, 1]) {
    this.push(geometry, material, this.world(x, y, z), rotation, new THREE.Vector3(...scale), shadow);
  }

  /** Named geometry cache; every entry is registered for disposal. */
  keyed<T extends THREE.BufferGeometry>(key: string, build: () => T): T {
    const cached = this.geometries.get(key);
    if (cached) return cached as T;
    const geometry = this.registry.geometry(build());
    this.geometries.set(key, geometry);
    return geometry;
  }

  private worldUvBox(w: number, h: number, d: number, uvMetres: number) {
    const q = 1 / 8;
    const key = `box:${(Math.round(w / q) * q).toFixed(3)}:${(Math.round(h / q) * q).toFixed(3)}:${(Math.round(d / q) * q).toFixed(3)}:${uvMetres}`;
    return this.keyed(key, () => {
      const width = Math.max(w, .04), height = Math.max(h, .04), depth = Math.max(d, .04);
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
      const sizes = [width, height, depth];
      FACE_AXES.forEach((axes, face) => {
        const uRepeat = Math.max(.25, sizes[axes[0]] / uvMetres);
        const vRepeat = Math.max(.25, sizes[axes[1]] / uvMetres);
        for (let v = 0; v < 4; v++) {
          const index = face * 4 + v;
          uv.setXY(index, uv.getX(index) * uRepeat, uv.getY(index) * vRepeat);
        }
      });
      uv.needsUpdate = true;
      return geometry;
    });
  }

  private roundedBox(w: number, h: number, d: number, radius: number) {
    const q = .05;
    const rw = Math.max(.05, Math.round(w / q) * q), rh = Math.max(.05, Math.round(h / q) * q), rd = Math.max(.05, Math.round(d / q) * q);
    const r = Math.min(radius, Math.min(rw, rh, rd) * .24);
    return this.keyed(`round:${rw}:${rh}:${rd}:${r.toFixed(2)}`, () => new RoundedBoxGeometry(rw, rh, rd, 1, r));
  }

  /** Commit every batch as one InstancedMesh. */
  flush() {
    for (const batch of this.batches.values()) {
      if (!batch.matrices.length) continue;
      const object = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
      batch.matrices.forEach((matrix, index) => object.setMatrixAt(index, matrix));
      object.castShadow = batch.shadow;
      object.receiveShadow = true;
      object.name = `kit-${batch.chunk}`;
      object.computeBoundingSphere();
      this.group.add(object);
    }
    this.batches.clear();
  }

  get pendingInstances() {
    let total = 0;
    for (const batch of this.batches.values()) total += batch.matrices.length;
    return total;
  }
}
