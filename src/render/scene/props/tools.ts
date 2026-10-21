import * as THREE from 'three';
import type { SceneKit } from '../kit';
import type { MaterialSet } from '../materials';
import type { TextureFactory } from '../textures';

/** Everything a prop builder may touch. Props never mutate physics state. */
export type Tools = {k: SceneKit; m: MaterialSet; tex: TextureFactory};

/** Flat signage plate, cached per size. Planes face +Z unless asked otherwise. */
export function plateSign(t: Tools, material: THREE.Material, x: number, y: number, z: number, w: number, h: number, face: 'z' | 'x' | '-x' | '-z' = 'z') {
  const geometry = t.k.keyed(`plane:${w.toFixed(2)}:${h.toFixed(2)}`, () => new THREE.PlaneGeometry(w, h));
  const rotation = face === 'z' ? new THREE.Euler(0, 0, 0)
    : face === 'x' ? new THREE.Euler(0, Math.PI / 2, 0)
    : face === '-x' ? new THREE.Euler(0, -Math.PI / 2, 0)
    : new THREE.Euler(0, Math.PI, 0);
  t.k.mesh(geometry, material, x, y, z, rotation, false);
}

/** Cached extruded profile helper: the profile is authored in (z, y) metres. */
export function profileGeometry(t: Tools, key: string, points: [number, number][], depth: number, rotate = true) {
  return t.k.keyed(key, () => {
    const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)));
    const geometry = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: false, steps: 1});
    if (rotate) { geometry.rotateY(Math.PI / 2); geometry.translate(-depth / 2, 0, 0); }
    geometry.computeVertexNormals();
    return geometry;
  });
}

/** Simple deterministic hash used by prop variants and biome scatter. */
export function hash(seed: number) {
  let state = (seed * 2654435761) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
