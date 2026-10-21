import * as THREE from 'three';
import {BUILDING, CONTAINER, ENERGY, HUMAN, PORT, ROADSIDE} from '../units';
import {plateSign} from './tools';
import type {Tools} from './tools';

/**
 * Civic and industrial architecture.
 *
 * Every builder is authored around its own origin at ground level, facing +X
 * (the driving direction) with +Z toward the camera. Sizes come from
 * `units.ts`; nothing here invents a scale.
 */

/** Distribution warehouse with real dock doors, canopies and a gabled roof. */
export function warehouse(t: Tools, options: {length?: number; width?: number; color?: number; sign?: string} = {}) {
  const {k, m, tex} = t;
  const length = options.length ?? BUILDING.warehouse.length;
  const width = options.width ?? BUILDING.warehouse.width;
  const eaves = BUILDING.warehouse.eaves, ridge = BUILDING.warehouse.ridge;
  const skin = m.corrugatedPaint(options.color ?? 0xc8cec8);
  const roofSkin = m.corrugatedPaint(0xa9b0ad);

  // Long walls and gable ends.
  k.panel(skin, 0, eaves / 2, width / 2, length, eaves, .22, 2.4);
  k.panel(skin, 0, eaves / 2, -width / 2, length, eaves, .22, 2.4);
  k.panel(skin, length / 2, eaves / 2, 0, .22, eaves, width, 2.4);
  k.panel(skin, -length / 2, eaves / 2, 0, .22, eaves, width, 2.4);

  // Two roof planes meeting at the ridge.
  const rise = ridge - eaves, run = width / 2;
  const slope = Math.atan2(rise, run), slopeLength = Math.hypot(run, rise);
  k.plate(roofSkin, 0, (eaves + ridge) / 2, width / 4, length, .2, slopeLength, {x: slope}, 2.4);
  k.plate(roofSkin, 0, (eaves + ridge) / 2, -width / 4, length, .2, slopeLength, {x: -slope}, 2.4);
  k.block(m.steel, 0, ridge + .1, 0, length + .2, .22, .55);

  // Structural expression: pilasters, plinth, roof vents.
  for (let x = -length / 2 + 3; x < length / 2; x += 6) {
    k.block(m.steel, x, eaves / 2, width / 2 + .12, .26, eaves, .16, 0, false);
    k.block(m.steel, x, eaves / 2, -width / 2 - .12, .26, eaves, .16, 0, false);
  }
  k.block(m.concreteDark, 0, .55, width / 2 + .07, length, 1.1, .32);
  for (let x = -length / 2 + 6; x < length / 2; x += 12) {
    k.rounded(m.aluminum, x, ridge + .62, 0, 2.4, .8, 2.2, .1, false);
    k.block(m.steelDark, x, ridge + 1.06, 0, 1.9, .1, 1.7, 0, false);
  }

  // Loading face toward the camera: three dock doors at 1.2 m.
  for (const x of [-length * .3, 0, length * .3]) {
    k.block(m.steelDark, x, BUILDING.warehouse.dockHeight + 2.25, width / 2 + .14, 4, 4.5, .16);
    for (let i = 0; i < 9; i++) k.block(m.aluminum, x, 1.35 + i * .5, width / 2 + .23, 3.85, .035, .025, 0, false);
    k.panel(m.paintedWhite, x, 5.75, width / 2 + .95, 5.4, .26, 2.4, 2.4, 0, false);
    for (const side of [-1, 1]) {
      k.block(m.steel, x + side * 2.5, 5.32, width / 2 + .9, .18, .9, .18, 0, false);
      k.block(m.rubber, x + side * 1.85, 1.55, width / 2 + .36, .36, .55, .36, 0, false);
    }
    k.plate(m.aluminum, x, BUILDING.warehouse.dockHeight, width / 2 + 1.5, 2.4, .12, 2.4, {x: -.05}, 2.4, false);
    k.block(m.hazardTape, x, .2, width / 2 + .55, 3.6, .16, .3, 0, false);
  }

  // Personnel entrance and a lit fascia sign.
  k.block(m.steelDark, -length * .42, 1.2, width / 2 + .13, 2.2, 2.4, .1, 0, false);
  k.block(m.glass, -length * .42, 1.25, width / 2 + .2, 1.7, 2.2, .04, 0, false);
  plateSign(t, tex.sign(options.sign ?? 'LOGISTICS  /  BAY 03', {width: 1024, height: 128, background: '#1a2730', caption: 'ROADSTER FREIGHT TERMINAL'}), length * .12, eaves - 1.6, width / 2 + .14, 16, 2);
  return {length, width, eaves};
}

/** Low-rise office / operations building with a glazed front. */
export function officeBlock(t: Tools, options: {length?: number; width?: number; floors?: number; sign?: string} = {}) {
  const {k, m, tex} = t;
  const length = options.length ?? 24, width = options.width ?? 12, floors = options.floors ?? 3;
  const height = BUILDING.office.floor * floors;
  k.panel(m.window, 0, height / 2, width / 2, length, height, .3, 15.6);
  k.panel(m.window, 0, height / 2, -width / 2, length, height, .3, 15.6);
  k.panel(m.concrete, length / 2, height / 2, 0, .3, height, width, 3);
  k.panel(m.concrete, -length / 2, height / 2, 0, .3, height, width, 3);
  k.block(m.concrete, 0, height + .35, 0, length + .5, .7, width + .5, 0, false);
  k.block(m.steel, 0, .16, 0, length + 1.2, .32, width + 1.2, 0, false);
  // Entrance canopy and doors.
  k.block(m.steel, 0, 3.4, width / 2 + 1.5, 8, .28, 3.2, 0, false);
  for (const side of [-1, 1]) k.block(m.steel, side * 3.9, 1.7, width / 2 + 3.0, .16, 3.4, .16, 0, false);
  k.block(m.glass, 0, 1.6, width / 2 + .18, 5.4, 2.8, .06, 0, false);
  k.block(m.lampWhite, 0, 3.15, width / 2 + 1.6, 6.4, .08, .5, 0, false);
  plateSign(t, tex.sign(options.sign ?? 'FLIGHT OPERATIONS', {width: 768, height: 128, background: '#18242d'}), 0, height - 1.1, width / 2 + .2, 9, 1.35);
  // Rooftop plant.
  for (const x of [-length * .28, length * .24]) k.rounded(m.aluminum, x, height + 1.1, 0, 3.6, 1.2, 2.8, .1, false);
  return {height, length, width};
}

/** Personnel-scale check: a 1.75 m figure reads against doors and railings. */
export function personScale(t: Tools, x: number, z: number, yaw = 0) {
  const {k, m} = t;
  k.withFrame(x, 0, z, yaw, () => {
    k.column(m.paint(0x3b4a54), 0, HUMAN.height * .55, 0, .16, HUMAN.height * .62, false);
    k.column(m.paint(0xc9b19a), 0, HUMAN.height * .9, 0, .115, .26, false);
    k.column(m.paint(0x2b343a), 0, .42, 0, .13, .84, false);
  });
}

/** Arched maintenance hangar shell. */
export function hangar(t: Tools, options: {span?: number; depth?: number; height?: number} = {}) {
  const {k, m, tex} = t;
  const span = options.span ?? BUILDING.hangar.span;
  const depth = options.depth ?? BUILDING.hangar.depth;
  const height = options.height ?? BUILDING.hangar.height;
  const segments = 22;
  const key = `hangar-arch:${span}:${height}:${depth}`;
  const shell = k.keyed(key, () => {
    const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = i / segments * Math.PI;
      const z = -Math.cos(angle) * span / 2, y = Math.sin(angle) * height;
      positions.push(-depth / 2, y, z, depth / 2, y, z);
      uvs.push(i / segments * span / 2.4, 0, i / segments * span / 2.4, depth / 2.4);
      if (i < segments) {const v = i * 2; indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);}
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices); geometry.computeVertexNormals();
    return geometry;
  });
  k.mesh(shell, m.shell, 0, 0, 0, new THREE.Euler(), true);
  // Side walls below the spring line and a structural end frame.
  for (const side of [-1, 1]) {
    k.panel(m.corrugatedPaint(0xc2c8c4), 0, height * .32, side * span / 2, depth, height * .64, .25, 2.4);
    for (let x = -depth / 2 + 2; x < depth / 2; x += 4) k.block(m.steel, x, height * .32, side * (span / 2 + .16), .22, height * .64, .16, 0, false);
  }
  // End wall with the door opening and a rolling door panel.
  const doorW = BUILDING.hangar.doorWidth, doorH = BUILDING.hangar.doorHeight;
  k.panel(m.corrugatedPaint(0xb9c0bb), -depth / 2 - .04, (height + doorH) / 2 + .2, 0, .3, height - doorH, span, 2.4);
  k.panel(m.corrugatedPaint(0xb9c0bb), -depth / 2 - .04, doorH + .3, span * .38, .3, 2.4, span * .24, 2.4);
  k.block(m.steelDark, -depth / 2 - .16, doorH / 2, (span - doorW) / -2, .22, doorH, .5);
  k.block(m.steelDark, -depth / 2 - .16, doorH / 2, (span - doorW) / 2, .22, doorH, .5);
  k.block(m.hazardTape, -depth / 2 - .1, doorH + .25, 0, .16, .5, doorW);
  plateSign(t, tex.sign('MAINTENANCE HANGAR  /  BAY 1', {width: 1024, height: 128, background: '#1b2830'}), -depth / 2 - .2, height * .78, 0, 14, 1.6, '-x');
  return {span, depth, height};
}

/** Control tower: tapered shaft, glazed cab, roof plant and antenna. */
export function controlTower(t: Tools) {
  const {k, m} = t;
  const {height, shaft, cab} = BUILDING.controlTower;
  k.column(m.concrete, 0, height / 2, 0, shaft / 2, height);
  for (let y = 4; y < height; y += 4) k.torus(m.aluminum, 0, y, 0, shaft / 2 + .06, .045, 'xz', false);
  k.column(m.concreteDark, 0, .5, 0, shaft / 2 + .8, 1);
  k.column(m.glass, 0, height + 1.2, 0, cab / 2, 3.2);
  for (let i = 0; i < 12; i++) {
    const angle = i / 12 * Math.PI * 2;
    k.block(m.aluminum, Math.cos(angle) * cab / 2, height + 1.2, Math.sin(angle) * cab / 2, .16, 4.4, .16, -angle, false);
  }
  k.column(m.concrete, 0, height + 3.1, 0, cab / 2 + .6, .5);
  k.column(m.concreteDark, 0, height + 4.4, 0, cab / 2 - .8, 2.1);
  k.column(m.lampRed, 0, height + 5.8, 0, .1, .3, false);
  k.torus(m.aluminum, 0, height - 1.1, 0, cab / 2 + .4, .09, 'xz', false);
  return {height};
}

/** Cement / grain silo cluster with elevator tower and conveyor gallery. */
export function siloCluster(t: Tools, options: {count?: number; color?: number} = {}) {
  const {k, m} = t;
  const count = options.count ?? 4;
  const {diameter, height, cone} = BUILDING.silo;
  const spacing = diameter + 1.4;
  const skin = m.corrugatedPaint(options.color ?? 0xd2d4cd);
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * spacing;
    k.column(skin, x, height / 2, 0, diameter / 2, height);
    k.cone(m.galvanized, x, height + cone / 2, 0, diameter / 2, .3, cone);
    for (let y = 2; y < height; y += 3) k.torus(m.steel, x, y, 0, diameter / 2 + .03, .04, 'xz', false);
    k.column(m.concreteDark, x, .35, 0, diameter / 2 + .5, .7);
  }
  const towerX = (count / 2) * spacing + 2;
  k.panel(m.concrete, towerX, height * .55, 0, 4.2, height * 1.1, 4.2, 3);
  k.rounded(m.steel, towerX, height * 1.15, 0, 5.2, 2.2, 5.2, .1);
  // Inclined gallery from the elevator head to the silo roofs.
  k.plate(m.corrugatedPaint(0xb8beb8), -spacing * (count - 1) / 4, height * .92, 0, Math.abs(towerX) + spacing * (count - 1) / 2, 2.6, 2.8, {z: .1}, 2.4);
  for (let i = 0; i < count; i += 2) k.column(m.steel, (i - (count - 1) / 2) * spacing, height - 1.4, 0, .18, 3.2, false);
  return {height};
}

/** Bulk fuel farm: tanks, bund wall and transfer pipework. */
export function tankFarm(t: Tools, options: {count?: number; color?: number} = {}) {
  const {k, m} = t;
  const count = options.count ?? 3;
  const {diameter, height, berm} = BUILDING.tank;
  const spacing = diameter + 3;
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * spacing;
    k.column(m.paintedWhite, x, height / 2 + .2, 0, diameter / 2, height);
    k.cone(m.paintedWhite, x, height + .55, 0, diameter / 2 + .1, .4, 1.1);
    k.column(m.concrete, x, .1, 0, diameter / 2 + .9, .3);
    for (let y = 2.4; y < height; y += 2.6) k.torus(m.steel, x, y, 0, diameter / 2 + .04, .05, 'xz', false);
    // A continuous access ladder bolted to the shell replaces disconnected flights.
    const ladderZ = diameter / 2 + .25;
    for (const side of [-.35, .35]) k.beam(m.galvanized, [x + side, .15, ladderZ], [x + side, height + .25, ladderZ], .045, false);
    for (let y = .4; y < height + .25; y += .35) k.beam(m.galvanized, [x - .35, y, ladderZ], [x + .35, y, ladderZ], .025, false);
    for (let y = 1; y < height; y += 2.4) for (const side of [-.35, .35]) k.beam(m.steel, [x + side, y, ladderZ], [x + side, y, diameter / 2 - .05], .04, false);
    k.block(m.hazardTape, x, berm, diameter / 2 + .5, 3.2, .3, .12, 0, false);
    k.column(m.lampAmber, x, height - .4, diameter / 2 + .1, .09, .2, false);
  }
  // Bund wall and a pipe header linking every tank.
  const total = count * spacing + 6;
  for (const side of [-1, 1]) {
    k.block(m.concreteDark, 0, berm / 2, side * (diameter / 2 + 4.5), total, berm, .5);
    k.block(m.concreteDark, side * total / 2, berm / 2, 0, .5, berm, diameter + 9);
  }
  k.beam(m.steel, [-(count - 1) * spacing / 2, .9, -diameter / 2 - 2], [(count - 1) * spacing / 2, .9, -diameter / 2 - 2], .22, false);
  for (let i = 0; i < count; i++) k.beam(m.steel, [(i - (count - 1) / 2) * spacing, .9, -diameter / 2 - 2], [(i - (count - 1) / 2) * spacing, .9, -diameter / 2], .16, false);
  return {count};
}

/** Elevated water tower, used by launch and industrial scenes. */
export function waterTower(t: Tools) {
  const {k, m} = t;
  const {legHeight, tankDiameter, tankHeight} = BUILDING.waterTower;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    k.beam(m.steel, [sx * 4.6, 0, sz * 4.6], [sx * 2.7, legHeight, sz * 2.7], .28);
    k.block(m.concreteDark, sx * 4.6, .3, sz * 4.6, 1.4, .6, 1.4, 0, false);
  }
  for (let y = 6; y < legHeight; y += 6) {
    const spread = 4.6 - (y / legHeight) * 1.9;
    k.beam(m.steel, [-spread, y, spread], [spread, y, spread], .1, false);
    k.beam(m.steel, [-spread, y, -spread], [spread, y, -spread], .1, false);
    k.beam(m.steel, [-spread, y, spread], [-spread, y, -spread], .1, false);
    k.beam(m.steel, [spread, y, spread], [spread, y, -spread], .1, false);
  }
  k.beam(m.steel, [-2.9, legHeight, 2.9], [2.9, legHeight + 3.4, -2.9], .09, false);
  k.column(m.paintedWhite, 0, legHeight + tankHeight / 2 + 1.4, 0, tankDiameter / 2, tankHeight);
  k.cone(m.paintedWhite, 0, legHeight + tankHeight + 2.4, 0, tankDiameter / 2 + .1, .5, 1.6);
  k.cone(m.galvanized, 0, legHeight + .7, 0, 1.6, tankDiameter / 2, 1.4);
  for (let y = legHeight + 2; y < legHeight + tankHeight; y += 2.4) k.torus(m.steel, 0, y, 0, tankDiameter / 2 + .03, .05, 'xz', false);
  k.beam(m.galvanized, [tankDiameter / 2, legHeight + 1, 0], [tankDiameter / 2, .4, 0], .12, false);
  // Continuous ladder stringers carry every rung down to the ground.
  const ladderX = -tankDiameter / 2 - .25;
  for (const z of [-.3, .3]) k.beam(m.aluminum, [ladderX, 0, z], [ladderX, legHeight + 2, z], .045, false);
  for (let y = .35; y < legHeight + 2; y += .35) k.beam(m.aluminum, [ladderX, y, -.3], [ladderX, y, .3], .025, false);
  return {legHeight};
}

/** Coastal lighthouse with a lit lantern. */
export function lighthouse(t: Tools) {
  const {k, m} = t;
  const height = 24;
  k.cone(m.concrete, 0, height / 2, 0, 4.4, 2.5, height);
  for (let i = 0; i < 3; i++) k.cone(m.paint(0xb8452f), 0, 5 + i * 8, 0, 3.9 - i * .55, 3.4 - i * .55, 2.4);
  k.column(m.paintedWhite, 0, height + .5, 0, 2.8, .3);
  k.torus(m.steel, 0, height + .75, 0, 2.5, .07, 'xz', false);
  for (let i = 0; i < 10; i++) {const angle = i / 10 * Math.PI * 2; k.block(m.steel, Math.cos(angle) * 2.45, height + .95, Math.sin(angle) * 2.45, .07, 1, .07, -angle, false);}
  k.column(m.glass, 0, height + 1.7, 0, 1.5, 2.1, false);
  k.column(m.lampWhite, 0, height + 1.7, 0, .85, 1.3, false);
  k.cone(m.steelDark, 0, height + 3.1, 0, 1.9, .2, 1);
  k.column(m.hazardTape, 0, 2.6, 4.15, .5, 2.4, false);
  return {height};
}

/** Quay wall, bollards and fenders for harbour scenes. */
export function quayWall(t: Tools, length: number, height = 4) {
  const {k, m} = t;
  k.block(m.concreteDark, 0, -height / 2, 0, length, height, 3.2);
  k.block(m.concrete, 0, .18, 0, length, .36, 3.6);
  for (let x = -length / 2 + 15; x < length / 2; x += PORT.bollardSpacing) {
    k.column(m.steelDark, x, .66, 2.5, .28, .95);
    k.column(m.steelDark, x, 1.16, 2.5, .36, .12);
    k.block(m.rubber, x + 15, -1.4, -1.7, 1.2, 2.4, .6, 0, false);
  }
}

/** Ship-to-shore gantry crane; the tallest working silhouette in a port. */
export function stsCrane(t: Tools, options: {color?: number; boom?: number} = {}) {
  const {k, m} = t;
  const {lift, outreach, railGauge, legHeight} = PORT.stsCrane;
  const boom = options.boom ?? outreach;
  const hull = m.paint(options.color ?? 0xdfe3df);
  const accent = m.paint(0x3c6472);
  const legZ = railGauge, legX = 7;
  for (const x of [-legX, legX]) for (const z of [0, legZ]) {
    k.beam(hull, [x, 0, z], [x * .82, legHeight, z], .62);
    k.block(m.steelDark, x, .5, z, 2.2, 1, 1.6, 0, false);
    k.block(m.hazardTape, x, 1.9, z, .9, 1.1, .5, 0, false);
  }
  k.block(hull, 0, legHeight, legZ / 2, 2 * legX + 2, 2.2, 2.4, 0, true);
  k.block(accent, 0, legHeight + 1.4, legZ / 2, 2 * legX + 1, .5, 1.8, 0, false);
  // Machinery house and A-frame.
  k.panel(m.corrugatedPaint(0xd7dbd6), 2, legHeight + 5.5, legZ / 2, 14, 5.5, 8, 2.4);
  k.block(m.steelDark, 2, legHeight + 8.4, legZ / 2 + 4.1, 13, .3, .4, 0, false);
  k.rounded(m.glass, 2, legHeight + 6.6, legZ / 2 + 4.15, 5, 1.5, .12, .04, false);
  k.beam(hull, [-legX, legHeight + 2, legZ], [-legX + 1, lift, legZ * .6], .3);
  k.beam(hull, [legX, legHeight + 2, legZ], [legX - 1, lift, legZ * .6], .3);
  k.block(hull, 0, lift, legZ * .6, 2 * legX - 2, 1.4, 2.2, 0, true);
  // Boom: two chords, diagonals and a trolley.
  const tip = legZ - boom;
  for (const side of [-.8, .8]) {
    k.beam(hull, [side, lift - .4, legZ + 2], [side, lift - 2.2, tip], .2);
    k.beam(hull, [side, lift - 1.9, legZ + 2], [side, lift - 3.4, tip], .16);
  }
  for (let z = legZ + 2; z > tip; z -= 4) {
    const t0 = (z - legZ - 2) / (tip - legZ - 2);
    const y = lift - .4 - 1.8 * t0;
    k.beam(hull, [-.8, y, z], [.8, y, z], .1, false);
    k.beam(hull, [-.8, y, z], [.8, y - 1.4, z - 4], .08, false);
    k.beam(hull, [.8, y, z], [-.8, y - 1.4, z - 4], .08, false);
  }
  k.block(m.lampRed, 0, lift + 1.4, legZ * .6, .2, .2, .2, 0, false);
  k.beam(hull, [-.8, lift - .4, legZ + 2], [-1.6, lift + 9, legZ * .6], .16);
  k.beam(hull, [.8, lift - .4, legZ + 2], [1.6, lift + 9, legZ * .6], .16);
  const trolleyZ = tip + boom * .42;
  k.block(accent, 0, lift - 2.6, trolleyZ, 4.4, 1.3, 4, 0, true);
  for (const side of [-1.5, 1.5]) k.beam(m.steel, [side, lift - 3.2, trolleyZ], [side, lift - 20, trolleyZ], .045, false);
  k.block(accent, 0, lift - 21.5, trolleyZ, CONTAINER.ft40.length, .8, CONTAINER.ft40.width, 0, true);
  k.block(m.steelDark, 0, lift - 20.9, trolleyZ, CONTAINER.ft40.length - .4, .5, CONTAINER.ft40.width - .4, 0, false);
  return {boom};
}

/** Rubber-tyred gantry crane over a container block. */
export function rtgCrane(t: Tools, options: {span?: number} = {}) {
  const {k, m} = t;
  const span = options.span ?? PORT.rtgCrane.span;
  const body = m.paint(0xd8a44f);
  for (const x of [-4.5, 4.5]) for (const z of [-span / 2, span / 2]) {
    k.beam(body, [x, 0, z], [x, PORT.rtgCrane.legHeight, z], .38);
    for (const roll of [-1.1, 1.1]) k.tubeZ(m.rubber, x + roll, .62, z, .62, .9);
    k.block(m.steelDark, x, .62, z, 1.6, 1.2, 2.2, 0, false);
  }
  k.block(body, 0, PORT.rtgCrane.height, 0, 3.2, 1.2, span + 2, 0, true);
  k.panel(m.corrugatedPaint(0xd8a44f), 0, PORT.rtgCrane.height - 2, -span * .28, 7, 2.8, 4, 2.4);
  k.block(m.glass, 0, PORT.rtgCrane.height - 1.8, -span * .28 + 2.05, 5.4, 1.4, .1, 0, false);
  for (let z = -span / 2; z <= span / 2; z += 3.8) k.block(m.steel, 0, PORT.rtgCrane.height - .7, z, .3, .35, .3, 0, false);
  // Spreader parked under the legs.
  k.block(m.hazardTape, 0, 9.4, 0, 12, .7, 2.4, 0, true);
  return {span};
}

/** Container ship silhouette with deck stacks and a stern house. */
export function containerShip(t: Tools, options: {scale?: number} = {}) {
  const {k, m} = t;
  const length = PORT.ship.length, beam = PORT.ship.beam, hull = PORT.ship.hull;
  const deck = PORT.ship.deckHeight;
  k.block(m.steelDark, 0, deck - hull / 2 - 1.4, 0, length, hull, beam);
  k.block(m.paint(0x2f4956), 0, deck - .3, 0, length - .4, 1.4, beam + .2, 0, false);
  k.plate(m.paint(0x9b3f30), length * .38, deck - 2.2, 0, 26, .4, beam + .1, {z: .12}, 4, false);
  // Bow wedge.
  k.plate(m.steelDark, length / 2 + 5, deck - hull / 2 - 1.4, 0, 16, hull, beam * .9, {y: .28}, 4);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) {
    const x = -length * .3 + col * 6.4;
    k.panel(m.container((row + col) % 2), x, deck + CONTAINER.ft20.height / 2 + row * 2.7, -beam * .3 + (col % 2) * .1, CONTAINER.ft20.length, CONTAINER.ft20.height, CONTAINER.ft20.width, CONTAINER.ft20.length);
  }
  k.panel(m.corrugatedPaint(0xe4e7e2), -length * .38, deck + 10, 0, 14, 16, beam * .7, 2.4);
  k.block(m.glass, -length * .38, deck + 15, beam * .36, 9, 2.2, .2, 0, false);
  k.column(m.steel, -length * .38, deck + 25, 0, .4, 18);
  k.column(m.lampRed, -length * .38, deck + 34.2, 0, .16, .3, false);
  return {length, deck};
}

/** Breakwater armour mound with a crest wall. */
export function breakwater(t: Tools, length: number, seed = 7) {
  const {k, m} = t;
  const armour = k.keyed('armour-unit', () => new THREE.IcosahedronGeometry(1, 0));
  let state = seed * 2654435761 >>> 0;
  const next = () => {state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296;};
  k.block(m.concreteDark, 0, -1.2, 0, length, 3.4, 14, 0, false);
  for (let i = 0; i < length / 3; i++) {
    const x = -length / 2 + i * 3 + next() * 1.5;
    const z = (next() - .5) * 12;
    k.mesh(armour, m.concreteDark, x, .4 + next() * 1.2, z, new THREE.Euler(next() * 3, next() * 3, next() * 3), false);
  }
  k.block(m.concrete, 0, 2.4, 0, length, .8, 2.2);
}

/** Substation compound: transformer, busbars and fence line. */
export function substation(t: Tools) {
  const {k, m} = t;
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 7;
    k.rounded(m.galvanized, x, ENERGY.transformer.height / 2, 0, ENERGY.transformer.length, ENERGY.transformer.height, ENERGY.transformer.width, .1);
    for (let f = 0; f < 5; f++) k.block(m.steel, x - 3.4 + f * 1.7, ENERGY.transformer.height + .9, 0, .18, 1.8, ENERGY.transformer.width * .8, 0, false);
    k.block(m.concreteDark, x, .2, 0, ENERGY.transformer.length + 1.6, .4, ENERGY.transformer.width + 2);
    k.block(m.rubber, x, ENERGY.transformer.height * .55, ENERGY.transformer.width / 2 + .12, 2.4, 2.2, .3, 0, false);
  }
  for (const z of [-6, 6]) {
    k.beam(m.aluminum, [-10, 8.5, z], [10, 8.5, z], .09, false);
    for (const x of [-10, -3, 4, 10]) k.column(m.aluminum, x, 4.2, z, .14, 8.4, false);
  }
  for (let x = -12; x <= 12; x += 3) k.block(m.steel, x, 1.4, 10, .08, 2.8, .08, 0, false);
  k.block(m.steel, 0, 2.8, 10, 24, .08, .08, 0, false);
}

/** Pipe rack used in refineries and launch pads. */
export function pipeRack(t: Tools, length: number, options: {height?: number} = {}) {
  const {k, m} = t;
  const height = options.height ?? 4.2;
  for (let x = -length / 2; x <= length / 2; x += 6) {
    for (const z of [-1.6, 1.6]) k.block(m.steel, x, height / 2, z, .28, height, .28);
    k.block(m.steel, x, height, 0, .24, .24, 3.6, 0, false);
    k.block(m.steel, x, height * .55, 0, .16, .16, 3.4, 0, false);
  }
  for (const [z, y, r] of [[-.8, height + .4, .3], [.5, height + .4, .22], [1.2, height + .4, .16]] as [number, number, number][]) {
    k.beam(m.galvanized, [-length / 2, y, z], [length / 2, y, z], r, false);
  }
  for (const x of [-length / 2 + 3, length / 2 - 3]) k.tubeZ(m.paint(0xb8563c), x, height + .4, -.8, .42, .5, false);
}

/** Chain-link fence with posts and rails; the mesh itself stays implied. */
export function fence(t: Tools, length: number, height = 2.1) {
  const {k, m} = t;
  for (let x = -length / 2; x <= length / 2; x += 3) k.block(m.galvanized, x, height / 2, 0, .07, height, .07, 0, false);
  for (const y of [height - .04, height * .55]) k.block(m.galvanized, 0, y, 0, length, .05, .05, 0, false);
  k.block(m.steelDark, 0, .04, 0, length, .08, .12, 0, false);
}

/** Roadside billboard facing the camera. */
export function billboard(t: Tools, options: {label?: string; caption?: string; width?: number} = {}) {
  const {k, m, tex} = t;
  const width = options.width ?? 7.2, height = width * .42;
  for (const x of [-width * .28, width * .28]) k.column(m.steel, x, 3.2, 0, .17, 6.4);
  k.block(m.steelDark, 0, 6.6, -.12, width, height, .22);
  plateSign(t, tex.sign(options.label ?? 'PROVING GROUND', {width: 1024, height: 448, background: '#16232c', caption: options.caption ?? 'AUTHORISED TEST RANGE'}), 0, 6.6, .02, width * .94, height * .86);
}

/** Small gatehouse at a site entrance. */
export function gateHouse(t: Tools) {
  const {k, m} = t;
  k.block(m.concrete, 0, .15, 0, 5, .3, 4);
  k.panel(m.corrugatedPaint(0xd3d7d1), 0, 1.6, 0, 3.4, 3, 3.2, 2.4);
  k.block(m.glass, 0, 1.9, 1.62, 2.6, 1.5, .1, 0, false);
  k.block(m.paintedWhite, 0, 3.3, 0, 4.2, .3, 4);
  k.block(m.lampWhite, 0, 3.15, 1.1, 2.2, .08, .3, 0, false);
  k.block(m.hazardTape, 0, .95, 2.4, .18, 1.9, .18, 0, false);
  k.block(m.hazardTape, 2.2, .95, 2.4, .18, 1.9, .18, 0, false);
  k.block(m.hazardTape, 1.1, 1.75, 2.4, 2.2, .16, .16, 0, false);
}

/** Overhead portal sign gantry across the road; posts sit outside the barrier. */
export function signGantry(t: Tools, options: {span?: number; label?: string; caption?: string} = {}) {
  const {k, m, tex} = t;
  const span = options.span ?? 12;
  const {clearance, trussDepth} = ROADSIDE.signGantry;
  for (const side of [-1, 1]) {
    const z = side * span / 2;
    k.column(m.steel, 0, (clearance + trussDepth) / 2, z, .24, clearance + trussDepth);
    k.block(m.concrete, 0, .3, z, 1.4, .6, 1.4);
    k.block(m.hazardTape, 0, 1.2, z, .5, 1.2, .5, 0, false);
    k.block(m.aluminum, 0, clearance + trussDepth - .4, z, .7, .6, .7, 0, false);
  }
  // Lattice truss across Z with top/bottom chords and zig-zag bracing.
  for (const y of [clearance + .1, clearance + trussDepth - .1]) {
    k.beam(m.steel, [-.32, y, -span / 2], [-.32, y, span / 2], .1, false);
    k.beam(m.steel, [.32, y, -span / 2], [.32, y, span / 2], .1, false);
  }
  for (let z = -span / 2; z < span / 2; z += 2) {
    const next = Math.min(span / 2, z + 2);
    k.beam(m.steel, [-.32, clearance + .1, z], [-.32, clearance + trussDepth - .1, next], .05, false);
    k.beam(m.steel, [.32, clearance + .1, z], [.32, clearance + trussDepth - .1, next], .05, false);
    k.beam(m.steel, [-.32, clearance + .1, z], [.32, clearance + .1, z], .05, false);
  }
  k.block(m.aluminum, 0, clearance - .12, 0, 1.6, .12, span - 1, 0, false);
  if (options.label) {
    k.block(m.steelDark, 0, clearance + trussDepth + .8, 0, .3, 1.7, 7.4, 0, false);
    plateSign(t, tex.sign(options.label, {width: 1024, height: 256, background: '#1a2731', caption: options.caption ?? 'FLIGHT CORRIDOR'}), -.2, clearance + trussDepth + .8, 0, 7, 1.55, '-x');
    plateSign(t, tex.sign(options.label, {width: 1024, height: 256, background: '#1a2731'}), .2, clearance + trussDepth + .8, 0, 7, 1.55, 'x');
  }
}
