import * as THREE from 'three';
import type {Tools} from './tools';

/** Very large structures: tower cranes, launch towers, masts, marine hardware. */

/** Tower crane: 60 m mast, 55 m jib, counter-jib and hook block. */
export function towerCrane(t: Tools, options: {height?: number; jib?: number; color?: number; yaw?: number} = {}) {
  const {k, m} = t;
  const height = options.height ?? 60, jib = options.jib ?? 55;
  const body = m.paint(options.color ?? 0xd7b23c);

  // Lattice mast, 1.8 m square.
  for (const sx of [-.9, .9]) for (const sz of [-.9, .9]) k.beam(body, [sx, 0, sz], [sx, height, sz], .09);
  for (let y = 2; y < height; y += 3) {
    k.beam(body, [-.9, y, -.9], [.9, y + 3, -.9], .04, false);
    k.beam(body, [.9, y, .9], [-.9, y + 3, .9], .04, false);
    k.beam(body, [-.9, y, -.9], [-.9, y, .9], .04, false);
    k.beam(body, [.9, y, -.9], [.9, y, .9], .04, false);
  }
  k.block(m.concreteDark, 0, .5, 0, 6, 1, 6);

  // Slewing platform, cab, jib and counter-jib.
  k.block(m.steelDark, 0, height + .5, 0, 2.4, 1, 2.4);
  k.rounded(m.paintedWhite, 1.7, height + 1.6, .7, 2.2, 2, 2, .1);
  k.block(body, jib * .32, height + 1.2, 0, jib, .5, .9, 0, false);
  k.block(body, -10, height + 1.2, 0, 20, .5, 1.4, 0, false);
  for (let x = -10; x <= jib * .64; x += 4) k.beam(body, [x, height + 1.2, 0], [Math.min(x + 4, jib * .64), height + 1.2, 0], .035, false);
  // A-frame, tie bars and hanging counterweights.
  k.block(body, 0, height + 4.4, 0, .6, 6.4, .6, 0, false);
  k.beam(m.steel, [0, height + 7, 0], [jib * .62, height + 1.5, 0], .05, false);
  k.beam(m.steel, [0, height + 7, 0], [-10, height + 1.5, 0], .05, false);
  k.block(m.concreteDark, -10.5, height + .2, 0, 2.4, 2, 1.6);
  // Trolley and hook block.
  k.block(m.paint(0x2b3b46), jib * .42, height + .75, 0, 1.2, .6, 1, 0, false);
  k.beam(m.steel, [jib * .42, height + .5, 0], [jib * .42, height - 16, 0], .03, false);
  k.block(body, jib * .42, height - 16.4, 0, .7, .8, .5, 0, false);
}

/** Launch tower: 74 m service structure with swing arms and umbilical lines. */
export function launchTower(t: Tools) {
  const {k, m} = t;
  const height = 74, half = 5.5;
  const frame = m.paint(0x9aa0a0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.beam(frame, [sx * half, 0, sz * half], [sx * half, height, sz * half], .34);
  for (let y = 5; y < height; y += 5) {
    k.beam(frame, [-half, y, half], [half, y, half], .13, false);
    k.beam(frame, [-half, y, -half], [half, y, -half], .13, false);
    k.beam(frame, [-half, y, -half], [-half, y, half], .13, false);
    k.beam(frame, [half, y, -half], [half, y, half], .13, false);
    k.beam(frame, [-half, y, half], [half, y + 5, -half], .08, false);
    k.beam(frame, [half, y, half], [-half, y + 5, -half], .08, false);
    k.block(m.steel, 0, y, half, half * 2, .22, 1.6, 0, false);
  }
  // Elevator core, decking and equipment rooms.
  k.panel(m.corrugatedPaint(0xb9bdb8), 0, height * .42, 0, 4.4, height * .84, 4.4, 2.4);
  for (const y of [18, 34, 50, 66]) k.rounded(m.paintedWhite, 0, y, 0, half * 2 + 1, .6, half * 2 + 1, .08, false);
  k.block(m.steelDark, 0, height + 2, 0, half * 2 + 2, 4, half * 2 + 2);
  k.column(m.lampRed, 0, height + 4.4, 0, .16, .4, false);
  // Retracted swing arms reaching toward the vehicle axis.
  for (const [y, reach] of [[26, 9], [42, 8], [58, 7]] as [number, number][]) {
    k.beam(m.paint(0xb9bdb8), [-half, y, 0], [-half - reach, y, 0], .35);
    k.block(m.steelDark, -half - reach, y - .6, 0, 2.2, 1.2, 2.2, 0, false);
    k.block(m.hazardTape, -half - reach, y + .2, 0, 1.4, .3, 1.2, 0, false);
  }
  // Umbilical hoses hanging free.
  for (const z of [-2, 0, 2]) k.beam(m.graphite, [-half, 20, z], [-half - 6, 8, z], .06, false);
  k.block(m.concreteDark, 0, .6, 0, half * 2 + 4, 1.2, half * 2 + 4);
}

/** Parabolic tracking dish on a pedestal. */
export function radarDish(t: Tools, options: {radius?: number} = {}) {
  const {k, m} = t;
  const radius = options.radius ?? 6;
  k.column(m.concrete, 0, 2.5, 0, radius * .35, 5);
  const dish = k.keyed(`dish:${radius}`, () => {
    const geometry = new THREE.SphereGeometry(radius, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2.6);
    geometry.rotateX(Math.PI * 0.78);
    return geometry;
  });
  k.mesh(dish, m.paintedWhite, 0, 6.4, 0, new THREE.Euler(), true);
  k.beam(m.steel, [0, 5, 0], [0, 9.4, 0], .14);
  k.block(m.steelDark, 0, 10.4, 0, .7, .7, .7, 0, false);
}

/** Guyed mooring / anchor mast with stay cables. */
export function mooringMast(t: Tools, options: {height?: number; stays?: number} = {}) {
  const {k, m} = t;
  const height = options.height ?? 110, stays = options.stays ?? 4;
  k.cone(m.paint(0xc7cbc6), 0, height / 2, 0, 3.4, .9, height);
  for (let y = 12; y < height; y += 12) k.torus(m.steel, 0, y, 0, 3.4 - y / height * 2.4, .16, 'xz', false);
  for (let i = 0; i < stays; i++) {
    const angle = i / stays * Math.PI * 2;
    const radius = 70;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    k.beam(m.steel, [0, height - 8, 0], [x, 0, z], .16);
    k.block(m.concrete, x, .8, z, 2.2, 1.6, 2.2, 0, false);
  }
  k.block(m.steelDark, 0, height + .8, 0, 4.4, 1.6, 4.4);
  k.column(m.lampRed, 0, height + 2, 0, .2, .5, false);
  // Antenna array at the top.
  for (let i = 0; i < 6; i++) {
    const angle = i / 6 * Math.PI * 2;
    k.block(m.paintedWhite, Math.cos(angle) * 2.2, height + 2.4, Math.sin(angle) * 2.2, .25, 2.6, .25, -angle, false);
  }
}

/** Bridge pier with cap beam and bearings; the road deck bears on it. */
export function viaductPier(t: Tools, options: {height: number; width?: number; capLength?: number} = {height: 10}) {
  const {k, m} = t;
  const height = options.height;
  const width = options.width ?? 1.8, capLength = options.capLength ?? 9;
  for (const z of [-.32, .32]) k.column(m.concrete, 0, height / 2, z * capLength, width * .7, height);
  k.block(m.concrete, 0, height - .5, 0, width * 1.15, 1, capLength);
  k.block(m.concreteDark, 0, height + .1, 0, width * 1.05, .3, capLength - .6);
  for (const z of [-.34, .34]) k.block(m.steelDark, 0, height + .36, z * capLength, .7, .2, .7, 0, false);
  k.block(m.concreteDark, 0, .6, 0, width * 1.9, 1.2, capLength * 1.1);
}

/** Navigation buoy with a lit top mark. */
export function buoy(t: Tools, options: {color?: number} = {}) {
  const {k, m} = t;
  k.column(m.paint(options.color ?? 0xb8452f), 0, .9, 0, .8, 1.6);
  k.cone(m.paint(options.color ?? 0xb8452f), 0, 1.9, 0, .8, .15, .6, false);
  k.cone(m.galvanized, 0, 2.5, 0, .2, .06, 1.2, false);
  k.column(m.lampWhite, 0, 3.2, 0, .11, .2, false);
}

/** Water breakwater crest light. */
export function navigationLight(t: Tools) {
  const {k, m} = t;
  k.cone(m.paintedWhite, 0, 4, 0, 1.5, .9, 8);
  k.column(m.paint(0xb8452f), 0, 5.2, 0, 1.05, .8, false);
  k.column(m.glass, 0, 8.4, 0, .7, 1, false);
  k.column(m.lampAmber, 0, 8.4, 0, .42, .7, false);
  k.cone(m.steelDark, 0, 9.2, 0, .95, .1, .5);
}

/** Cable-stayed pylons that carry a gantry over a canyon void. */
export function cablePylon(t: Tools, options: {height?: number; span?: number} = {}) {
  const {k, m} = t;
  const height = options.height ?? 42, span = options.span ?? 60;
  for (const z of [-4.4, 4.4]) {
    k.cone(m.concrete, 0, height / 2, z, 2.2, 1.1, height);
    k.block(m.concreteDark, 0, .9, z, 4.6, 1.8, 4.6);
    for (let y = 8; y < height; y += 6) k.beam(m.steel, [-1.5, y, z], [1.5, y, z], .1, false);
  }
  k.block(m.concrete, 0, height - 2, 0, 3.2, 2.2, 11);
  for (const side of [-1, 1]) for (const z of [-4.2, 4.2]) {
    for (let i = 1; i <= 4; i++) k.beam(m.steel, [0, height - 3 - i * 3, z * .9], [side * span * i * .12, height - 3 - i * 9, z], .03, false);
  }
}

/** Marine pile cluster and a small workboat used near quays. */
export function workboat(t: Tools, options: {length?: number} = {}) {
  const {k, m} = t;
  const length = options.length ?? 18;
  k.block(m.paint(0x3c5b66), 0, .9, 0, length, 1.8, 5.4);
  k.block(m.paintedWhite, 0, 2.1, 0, length * .9, 1.1, 4.6, 0, false);
  k.panel(m.paintedWhite, -length * .12, 3.4, 0, 4.4, 2.6, 4, 2.4);
  k.block(m.glass, -length * .12, 3.7, 2.02, 3.4, .9, .08, 0, false);
  k.column(m.steel, -length * .12, 5.6, 0, .12, 2.2, false);
  k.column(m.lampWhite, -length * .12, 6.8, 0, .12, .16, false);
  k.block(m.hazardTape, length * .4, .7, 0, 1.4, .5, 4.4, 0, false);
}

/** Floating pontoon for harbour moorings. */
export function pontoon(t: Tools, options: {length?: number; width?: number} = {}) {
  const {k, m} = t;
  const length = options.length ?? 24, width = options.width ?? 8;
  k.block(m.paint(0x55666d), 0, .5, 0, length, 1, width);
  k.block(m.galvanized, 0, 1.02, 0, length - .4, .08, width - .4, 0, false);
  for (let x = -length / 2 + 2; x < length / 2; x += 4) k.block(m.steelDark, x, 1.2, width / 2 - .3, .3, .3, .3, 0, false);
}
