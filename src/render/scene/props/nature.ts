import * as THREE from 'three';
import {NATURE} from '../units';
import type {Tools} from './tools';

/**
 * Vegetation and geology.
 *
 * Trees and rocks use two LODs: `detail: 'far'` builds 40-80 triangle crowns for
 * the background band, `near`/`mid` add a second crown layer and shadow casting.
 * Heights stay at the real values in `units.ts` so a 14 m conifer still reads
 * against a 9 m warehouse eave.
 */

function crown(t: Tools, key: string, radius: number, height: number) {
  return t.k.keyed(key, () => {
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const position = geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
      const noise = 1 + Math.sin(x * 7.1 + z * 3.3) * .12 + Math.sin(y * 9.4 - x * 2.1) * .07;
      position.setXYZ(i, x * radius * noise, y * height * noise, z * radius * noise);
    }
    geometry.computeVertexNormals();
    return geometry;
  });
}

/** Mature conifer: bare trunk with three stacked crown tiers. */
export function conifer(t: Tools, options: {height?: number; tone?: number} = {}) {
  const {k, m} = t;
  const height = options.height ?? NATURE.conifer.height;
  const trunkHeight = height * .42;
  k.column(m.paint(0x54463a), 0, trunkHeight / 2, 0, .17, trunkHeight);
  const tone = m.paint(options.tone ?? 0x3f5544);
  const tier = (y: number, radius: number, tall: number) => k.mesh(k.keyed('conifer-tier', () => {
    const g = new THREE.ConeGeometry(1, 1, 8, 1); g.translate(0, .5, 0); return g;
  }), tone, 0, y, 0, new THREE.Euler(), k.detail !== 'far', [radius, tall, radius]);
  tier(height * .35, NATURE.conifer.radius * .82, height * .5);
  tier(height * .55, NATURE.conifer.radius * .6, height * .4);
  tier(height * .74, NATURE.conifer.radius * .38, height * .3);
}

/** Broadleaf tree built from two or three irregular crown blobs. */
export function broadleaf(t: Tools, options: {height?: number; tone?: number} = {}) {
  const {k, m} = t;
  const height = options.height ?? NATURE.broadleaf.height;
  const trunk = height * .46;
  const trunkTop = trunk + height * .3;
  k.column(m.paint(0x5a4a3c), 0, trunkTop / 2, 0, .21, trunkTop);
  const tone = m.paint(options.tone ?? 0x4a6248);
  const geometry = crown(t, `broadleaf:${height.toFixed(1)}`, NATURE.broadleaf.radius * .78, NATURE.broadleaf.radius * .62);
  k.mesh(geometry, tone, 0, trunk + height * .2, 0, new THREE.Euler(), k.detail !== 'far');
  if (k.detail !== 'far') {
    k.mesh(geometry, tone, -.9, trunk + height * .34, .5, new THREE.Euler(0, 1, 0), true);
    k.mesh(geometry, tone, 1.1, trunk + height * .3, -.4, new THREE.Euler(0, 2, 0), true);
  }
}

/** Low scrub, 1.4 m. */
export function shrub(t: Tools, options: {tone?: number} = {}) {
  const {k, m} = t;
  const geometry = crown(t, 'shrub', NATURE.shrub.radius, NATURE.shrub.height * .6);
  k.mesh(geometry, m.paint(options.tone ?? 0x56684b), 0, NATURE.shrub.height * .42, 0, new THREE.Euler(), false);
}

/** Three-blade grass tuft for near-field ground texture. */
export function grassTuft(t: Tools) {
  const {k, m} = t;
  const geometry = t.k.keyed('grass-blade', () => {
    const shape = new THREE.Shape();
    shape.moveTo(-.035, 0); shape.lineTo(.035, 0); shape.lineTo(.012, NATURE.grassTuft); shape.closePath();
    return new THREE.ShapeGeometry(shape);
  });
  for (let i = 0; i < 3; i++) {
    const angle = i * Math.PI / 3;
    k.mesh(geometry, m.paint(0x7d8459), Math.cos(angle) * .05, 0, Math.sin(angle) * .05, new THREE.Euler(0, angle, .12), false);
  }
}

/** Eroded boulder with three size classes sharing one geometry. */
export function boulder(t: Tools, options: {size?: number; tone?: number; rock?: boolean} = {}) {
  const {k, m} = t;
  const size = options.size ?? 1.6;
  const geometry = t.k.keyed('boulder-geo', () => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const position = g.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
      const n = 1 + Math.sin(x * 3.7 + z * 5.1) * .16 + Math.sin(y * 6.3 + x * 2.9) * .1;
      position.setXYZ(i, x * n, y * n * .72, z * n);
    }
    g.computeVertexNormals();
    return g;
  });
  geometry.computeBoundingBox();
  const y = -geometry.boundingBox!.min.y * size * .92;
  k.mesh(geometry, m.rock(options.tone ?? 0x6d6a63), 0, y, 0, new THREE.Euler(0, options.size ?? 0, 0), options.rock ?? true, [size, size, size]);
}

/** Deterministic boulder field; the seed keeps a level's layout stable. */
export function rockField(t: Tools, options: {count: number; spread: number; seed?: number; tone?: number}) {
  let state = (options.seed ?? 3) * 2654435761 >>> 0;
  const next = () => {state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296;};
  for (let i = 0; i < options.count; i++) {
    const size = NATURE.boulder.min + next() * (NATURE.boulder.max - NATURE.boulder.min);
    t.k.withFrame((next() - .5) * options.spread, 0, (next() - .5) * options.spread, next() * Math.PI, () => {
      boulder(t, {size, tone: options.tone, rock: size > 1.4});
    });
  }
}

/** Bare rock spire used by canyon and needle backdrops. */
export function rockSpire(t: Tools, options: {height?: number; radius?: number; tone?: number} = {}) {
  const {k, m} = t;
  const height = options.height ?? 26, radius = options.radius ?? 6;
  const geometry = t.k.keyed(`spire:${height}:${radius}`, () => {
    // Lathe-style rings: a tapered shaft with strata, ledges and an eroded lean.
    const rings = 15, segments = 11;
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
    for (let i = 0; i <= rings; i++) {
      const v = i / rings;
      const level = height * v;
      const taper = Math.pow(1 - v, .5) * (1 - Math.pow(Math.max(0, v - .9) * 10, 2) * .5);
      const lean = Math.pow(v, 1.6) * radius * .5;
      for (let j = 0; j < segments; j++) {
        const angle = j / segments * Math.PI * 2;
        const noise = 1
          + Math.sin(angle * 3 + v * 9.7) * .3
          + Math.sin(angle * 7 - v * 17.1) * .17
          + Math.sin(angle * 13 + v * 4.3) * .1
          + Math.sin(v * 23.7 + angle) * .07
          + Math.sin(v * Math.PI * 2.6) * .1;
        const r = Math.max(radius * .12, radius * taper * noise);
        positions.push(Math.cos(angle) * r + lean, level, Math.sin(angle) * r + lean * .4);
        uvs.push(j / segments * 3, v * 5);
        if (i < rings) {
          const a = i * segments + j, b = i * segments + (j + 1) % segments;
          indices.push(a, a + segments, b, b, a + segments, b + segments);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  });
  k.mesh(geometry, m.rock(options.tone ?? 0x6a6259), 0, 0, 0, new THREE.Euler(), k.detail !== 'far');
}
