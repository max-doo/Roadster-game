import type * as THREE from 'three';
import type {Level} from '../../../game/types';
import type {Tools} from '../props';

export type Terrain = {
  /** `quality: 'far'` builds a coarser grid for the backdrop band. */
  ridge(start: number, end: number, z: number, baseline: number, height: number, color: number, phase: number, depth?: number, quality?: 'near' | 'mid' | 'far'): void;
  dunes(start: number, end: number, baseline: number, color: number, quality?: 'near' | 'mid' | 'far'): void;
  ground(color: number, kind: 'rock' | 'sand', y: number, z: number, width: number, depth: number): void;
  cloudBank(x: number, y: number, z: number, width: number, height: number, index: number): void;
};

export type BiomeContext = {
  t: Tools;
  level: Level;
  /** Horizontal extent of authored content. */
  span: number;
  start: number;
  end: number;
  /** Ground surface height (metres). */
  floor: number;
  /** Highest point of the route, used to size vertical scenery. */
  top: number;
  /** Lane centre in Z for this level; all dressing is placed relative to it. */
  laneZ: number;
  random: () => number;
  terrain: Terrain;
  animate(object: THREE.Object3D, update: (time: number) => void): void;
};

export type BiomeId = 'desert' | 'lab' | 'canyon' | 'coast' | 'tower' | 'harbor' | 'tunnel' | 'windfarm' | 'anchor' | 'terminus';

/** Fill detail level for a prop band at a given camera distance. */
export function band(ctx: BiomeContext, z: number) {
  const distance = Math.abs(z - ctx.laneZ);
  ctx.t.k.detail = distance < 34 ? 'near' : distance < 110 ? 'mid' : 'far';
}

/** Utility: repeat a builder along the course at a fixed Z, safely bounded. */
export function along(span: number, step: number, build: (x: number, index: number) => void) {
  let index = 0;
  for (let x = -span / 2; x <= span / 2; x += step) build(x, index++);
}
