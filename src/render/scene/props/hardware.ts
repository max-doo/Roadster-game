import * as THREE from 'three';
import {ENERGY, ROADSIDE} from '../units';
import {plateSign, profileGeometry} from './tools';
import type {Tools} from './tools';

/** Roadside hardware, energy infrastructure and instrumentation. */

/** EN 1317 style precast containment barrier, one 3 m segment. */
export function jerseyBarrier(t: Tools, options: {length?: number; color?: number} = {}) {
  const {k, m} = t;
  const length = options.length ?? ROADSIDE.jerseyBarrier.length;
  const geometry = profileGeometry(t, 'jersey-barrier', [
    [-.305, 0], [.305, 0], [.305, .08], [.14, .30], [.12, .81], [-.12, .81], [-.14, .30], [-.305, .08],
  ], length);
  k.mesh(geometry, m.paint(options.color ?? 0xa9aca6), 0, 0, 0, new THREE.Euler(), true);
  // Reflective delineator pads on the traffic face.
  for (const x of [-length * .28, length * .28]) k.block(m.lampAmber, x, .58, .13, .1, .1, .02, 0, false);
}

/** W-beam guardrail with posts every 3.8 m. */
export function guardrail(t: Tools, length: number, options: {side?: number; grade?: number} = {}) {
  const {k, m} = t;
  const spacing = ROADSIDE.guardrail.postSpacing;
  const half = length / 2;
  const grade = options.grade ?? 0;
  const bays = Math.max(1, Math.ceil(length / spacing));
  for (let i = 0; i <= bays; i++) {
    const x = -half + length * i / bays, y = x * grade;
    k.block(m.galvanized, x, y + ROADSIDE.guardrail.postHeight / 2, 0, .12, ROADSIDE.guardrail.postHeight, .16);
    k.block(m.galvanized, x, y + .62, .12, .24, .26, .1, 0, false);
  }
  // Two rails: the W profile is read as an upper and lower fold.
  const railLength = length * Math.hypot(1, grade), tilt = {z: Math.atan(grade)};
  k.plate(m.galvanized, 0, ROADSIDE.guardrail.railTop - .07, .17, railLength, .12, .05, tilt, 1, false);
  k.plate(m.galvanized, 0, .60, .17, railLength, .12, .05, tilt, 1, false);
  k.plate(m.steel, 0, .675, .14, railLength, .03, .02, tilt, 1, false);
  // Terminal ramps at both ends.
  for (const side of [-1, 1]) {
    const x = side * (half - .5);
    k.plate(m.galvanized, x, x * grade + .5, .17, 1.1, .12, .06, {z: Math.atan(grade) + side * .28}, 1, false);
  }
}

/** Flexible delineator post with a reflector. */
export function delineator(t: Tools) {
  const {k, m} = t;
  k.column(m.paintedWhite, 0, ROADSIDE.delineator / 2, 0, .045, ROADSIDE.delineator, false);
  k.block(m.lampAmber, 0, .86, .05, .09, .12, .02, 0, false);
  k.block(m.concreteDark, 0, .03, 0, .3, .06, .3, 0, false);
}

/** 750 mm traffic cone. */
export function trafficCone(t: Tools) {
  const {k, m} = t;
  k.block(m.rubber, 0, .03, 0, .36, .06, .36, 0, false);
  k.cone(m.paint(0xcf5c34), 0, .38, 0, .16, .03, .72, false);
  k.cone(m.paintedWhite, 0, .47, 0, .112, .085, .12, false);
}

/** High-mast light: 12 m pole, twin luminaires on a 2.4 m outreach. */
export function lightMast(t: Tools, options: {height?: number; outreach?: number} = {}) {
  const {k, m} = t;
  const height = options.height ?? ROADSIDE.lightMast.height;
  const outreach = options.outreach ?? ROADSIDE.lightMast.outreach;
  k.column(m.concreteDark, 0, .35, 0, .62, .7);
  k.cone(m.galvanized, 0, height / 2, 0, .22, .13, height);
  k.beam(m.galvanized, [0, height - .2, 0], [0, height + .25, outreach], .1);
  k.block(m.steelDark, 0, height + .3, outreach, 1.2, .22, .55, 0, false);
  k.block(m.lampWhite, 0, height + .17, outreach, 1, .05, .42, 0, false);
  k.block(m.lampRed, 0, height + .45, 0, .16, .16, .16, 0, false);
  k.block(m.hazardTape, 0, 1.1, 0, .34, .8, .34, 0, false);
}

/** Utility pole with three crossarms, insulators and a transformer can. */
export function utilityPole(t: Tools, options: {transformer?: boolean} = {}) {
  const {k, m} = t;
  const height = ROADSIDE.utilityPole.height;
  k.cone(m.paint(0x8a7b63), 0, height / 2, 0, .17, .11, height);
  for (const y of [height - .7, height - 1.8, height - 2.9]) {
    k.block(m.paint(0x8a7b63), 0, y, 0, .11, .11, ROADSIDE.utilityPole.crossarm, 0, false);
    for (const z of [-.95, 0, .95]) k.column(m.paintedWhite, 0, y + .16, z, .055, .2, false);
  }
  if (options.transformer) {
    k.column(m.galvanized, .28, height - 4.1, .3, .3, 1.1, false);
    k.block(m.steel, .28, height - 3.5, .3, .1, .3, .1, 0, false);
  }
  k.block(m.hazardTape, 0, 2.4, .14, .3, .9, .02, 0, false);
}

/** Sagging conductor between two poles: a cheap 6-segment catenary read. */
export function powerLine(t: Tools, a: [number, number, number], b: [number, number, number], sag = 1.2, radius = .035) {
  const {k, m} = t;
  const segments = 6;
  let previous = a;
  for (let i = 1; i <= segments; i++) {
    const u = i / segments;
    const point: [number, number, number] = [
      a[0] + (b[0] - a[0]) * u,
      a[1] + (b[1] - a[1]) * u - Math.sin(u * Math.PI) * sag,
      a[2] + (b[2] - a[2]) * u,
    ];
    k.beam(m.graphite, previous, point, radius, false);
    previous = point;
  }
}

/** 38 m lattice transmission pylon with three conductor levels. */
export function transmissionPylon(t: Tools) {
  const {k, m} = t;
  const {height, base, armSpan} = ROADSIDE.pylon;
  const top = 1.2;
  const legAt = (level: number) => base / 2 - (base / 2 - top) * (level / height);
  const levels = [0, 8, 16, 24, 30, height];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    let previous: [number, number, number] = [sx * base / 2, 0, sz * base / 2];
    for (const level of levels.slice(1)) {
      const point: [number, number, number] = [sx * legAt(level), level, sz * legAt(level)];
      k.beam(m.steel, previous, point, .16);
      previous = point;
    }
    k.block(m.concrete, sx * base / 2, .3, sz * base / 2, 1.3, .6, 1.3, 0, false);
  }
  for (const level of levels.slice(1, -1)) {
    const r = legAt(level);
    k.beam(m.aluminum, [-r, level, r], [r, level, r], .06, false);
    k.beam(m.aluminum, [-r, level, -r], [r, level, -r], .06, false);
    k.beam(m.aluminum, [-r, level, r], [-r, level, -r], .06, false);
    k.beam(m.aluminum, [r, level, r], [r, level, -r], .06, false);
  }
  for (let i = 0; i < levels.length - 2; i++) {
    const low = legAt(levels[i]), high = legAt(levels[i + 1]);
    k.beam(m.aluminum, [-low, levels[i], low], [high, levels[i + 1], high], .05, false);
    k.beam(m.aluminum, [low, levels[i], low], [-high, levels[i + 1], high], .05, false);
  }
  // Three crossarm pairs with insulator strings.
  for (const [level, span] of [[height - 4, armSpan / 2], [height - 9, armSpan * .44], [height - 14, armSpan * .38]] as [number, number][]) {
    k.block(m.steel, 0, level, 0, .7, .7, span * 2, 0, false);
    for (const sz of [-1, 1]) {
      k.column(m.paintedWhite, 0, level - .7, sz * span, .06, 1.4, false);
      k.block(m.steel, 0, level - 1.45, sz * span, .12, .12, .12, 0, false);
      k.beam(m.aluminum, [-.4, level, sz * span * .55], [.4, level, sz * span * .55], .05, false);
    }
  }
  k.column(m.lampRed, 0, height + .3, 0, .09, .3, false);
}

/** Instrumentation mast with a camera head and a solar panel. */
export function cameraMast(t: Tools) {
  const {k, m} = t;
  const height = 9;
  k.cone(m.galvanized, 0, height / 2, 0, .14, .09, height);
  k.block(m.steelDark, 0, height + .1, 0, .34, .3, .7, 0, false);
  k.tubeZ(m.glass, 0, height + .1, -.42, .11, .16, false);
  k.plate(m.paint(0x243544), 0, height - .5, .34, 1.1, .05, .6, {x: .4}, 1, false);
  for (const y of [2.6, 5.4]) k.block(m.steel, 0, y, 0, .3, .1, .3, 0, false);
}

/** Mobile lighting tower, 9 m mast. */
export function portableLight(t: Tools) {
  const {k, m} = t;
  k.block(m.steelDark, 0, .3, 0, 2.4, .2, 1.3, 0, false);
  for (const z of [-.6, .6]) k.tubeZ(m.rubber, .7, .28, z, .28, .2, false);
  k.cone(m.galvanized, -.6, 3.4, 0, .12, .07, 6.4);
  k.block(m.steelDark, -.6, 6.7, 0, .3, .3, 2.4, 0, false);
  for (const z of [-.8, 0, .8]) k.block(m.lampWhite, -.6, 6.55, z, .28, .22, .5, 0, false);
  k.block(m.hazardTape, .3, .32, .6, .5, .12, .04, 0, false);
}

/**
 * 90 m hub-height onshore turbine. Static parts go through the kit; the rotor
 * is returned so the caller can spin it from the simulation clock.
 */
export function windTurbine(t: Tools, x: number, y: number, z: number, yaw = 0) {
  const {k, m} = t;
  const {hub, blade, baseDiameter, nacelle} = ENERGY.turbine;
  k.withFrame(x, y, z, yaw, () => {
    k.column(m.concrete, 0, .6, 0, 4.6, 1.2);
    k.cone(m.paintedWhite, 0, hub / 2, 0, baseDiameter / 2, 1.25, hub);
    k.rounded(m.paintedWhite, 0, hub + .6, -1.4, nacelle.width, nacelle.height, nacelle.length, .5);
    k.block(m.steelDark, 0, hub + 2.6, -.4, 1.2, .5, 2.4, 0, false);
    k.block(m.lampRed, 0, hub + 2.95, -.4, .18, .16, .18, 0, false);
    k.column(m.hazardTape, 0, 2.2, 2.0, .5, 1.6, false);
  });
  const rotor = new THREE.Group();
  rotor.name = 'turbine-rotor';
  rotor.position.set(x, y + hub + .6, z - 1.4 - nacelle.length / 2 - .4);
  rotor.rotation.y = yaw;
  const bladeGeometry = k.keyed(`blade:${blade}`, () => {
    const geometry = new THREE.CylinderGeometry(.08, .62, blade, 4, 1);
    geometry.translate(0, blade / 2, 0);
    geometry.scale(2.6, 1, .6);
    return geometry;
  });
  for (let i = 0; i < 3; i++) {
    const mesh = new THREE.Mesh(bladeGeometry, m.paintedWhite);
    mesh.rotation.z = i * Math.PI * 2 / 3;
    mesh.castShadow = k.detail === 'near';
    rotor.add(mesh);
  }
  const hubGeometry = k.keyed('turbine-hub', () => new THREE.SphereGeometry(1.15, 12, 8));
  rotor.add(new THREE.Mesh(hubGeometry, m.paintedWhite));
  return rotor;
}

/** 60 m meteorological mast with boom-mounted anemometers. */
export function metMast(t: Tools) {
  const {k, m} = t;
  const height = ENERGY.metMast;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.beam(m.galvanized, [sx * .9, 0, sz * .9], [sx * .25, height, sz * .25], .07);
  for (let y = 4; y < height; y += 4) {
    const r = .9 - (y / height) * .65;
    k.beam(m.galvanized, [-r, y, r], [r, y, r], .035, false);
    k.beam(m.galvanized, [-r, y, -r], [r, y, -r], .035, false);
    k.beam(m.galvanized, [-r, y, r], [-r, y, -r], .035, false);
    k.beam(m.galvanized, [r, y, r], [r, y, -r], .035, false);
  }
  for (const [y, side] of [[height - 2, 1], [height * .7, -1], [height * .45, 1]] as [number, number][]) {
    k.beam(m.galvanized, [0, y, 0], [side * 1.3, y, 0], .04, false);
    k.block(m.paintedWhite, side * 1.35, y + .12, 0, .1, .1, .3, 0, false);
    k.block(m.lampRed, 0, y + .18, 0, .07, .07, .07, 0, false);
  }
  k.column(m.lampRed, 0, height + .2, 0, .08, .3, false);
}

/** Aviation obstruction light on a short mast. */
export function beacon(t: Tools, options: {height?: number} = {}) {
  const {k, m} = t;
  const height = options.height ?? 1.6;
  k.column(m.galvanized, 0, height / 2, 0, .06, height, false);
  k.column(m.lampRed, 0, height + .1, 0, .13, .2, false);
}

/** Flat sign panel on two legs, used for range warnings. */
export function warningBoard(t: Tools, label: string, caption: string, width = 3.2) {
  const {k, m, tex} = t;
  const height = width * .34;
  for (const x of [-width * .3, width * .3]) k.column(m.steel, x, 1.1, 0, .07, 2.2);
  k.block(m.steelDark, 0, 2.2, -.05, width, height, .12);
  plateSign(t, tex.sign(label, {width: 768, height: 256, background: '#1b2731', caption}), 0, 2.2, .03, width * .94, height * .86);
}

/** Road surface guide arrow / chevron plate set. */
export function chevronBoard(t: Tools, width = 2.4) {
  const {k, m} = t;
  k.block(m.hazardTape, 0, 1.2, 0, width, .7, .1, 0, false);
  for (const x of [-width * .3, width * .3]) k.column(m.steel, x, .45, 0, .06, .9, false);
}
