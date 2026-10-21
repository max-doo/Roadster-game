import {roadRail, roadProp, roadGantry} from './roadside';
import {along, band} from './types';
import type {BiomeContext} from './types';
import {
  cameraMast, crate, drum, fence, lightMast, officeBlock, pipeRack, portableLight,
  trafficCone, warningBoard,
} from '../props';

/**
 * THE GRAVITY LAB — level 2.
 *
 * A closed aerodynamic chamber: ribbed wall bays, an exposed ceiling girder
 * grid, floor lane markings and the structural cage that carries the gravity
 * ring. Human-scale doors, cabinets and 1.75 m rails are the reference that
 * keeps the 4.65 m car honest inside a 60 m hall.
 */
export function lab(ctx: BiomeContext) {
  const {t, level, laneZ, span, start, end, top, floor, random} = ctx;
  const chamberZ = laneZ - 7;
  const wallZ = chamberZ - 22;
  const hallFloor = floor;
  band(ctx, wallZ);

  // Floor slab, raised inspection plinths and lane markings.
  t.k.detail = 'mid';
  t.k.plate(t.m.asphalt, 0, hallFloor + .05, chamberZ - 8, span + 70, .2, 66, {}, 8);
  for (let x = start; x < end; x += 12) {
    t.k.block(t.m.paintedWhite, x, hallFloor + .17, chamberZ - 2, 6, .02, .14, 0, false);
    t.k.block(t.m.hazardTape, x + 4, hallFloor + .17, chamberZ - 14, 1.6, .02, .5, 0, false);
    t.k.block(t.m.aluminum, x + 3, hallFloor + .19, chamberZ - 14, 2.2, .03, .12, 0, false);
    for (const z of [-6, -12, -18]) t.k.block(t.m.steelDark, x + 3, hallFloor + .18, chamberZ + z, .18, .04, .18, 0, false);
  }
  // Centre line of the run and a measured distance scale.
  for (let x = start; x < end; x += 24) {
    t.k.block(t.m.paintedWhite, x, hallFloor + .18, chamberZ, 8, .02, .1, 0, false);
    t.k.block(t.m.lampCyan, x + 12, hallFloor + .2, chamberZ + 6, .06, .02, 1.2, 0, false);
  }

  // Back wall: deep bays with glazing, cable trays and service niches.
  t.k.detail = 'mid';
  t.k.panel(t.m.corrugatedPaint(0x39454d), 0, (top + 30) / 2, wallZ, span + 70, top + 30, 1.2, 3);
  for (let x = start; x < end; x += 18) {
    t.k.panel(t.m.steelDark, x + 8.5, 3.6 + hallFloor, wallZ + 1.1, 12.6, 8.2, .3, 2.4);
    t.k.block(t.m.glass, x + 8.5, 4.4 + hallFloor, wallZ + 1.3, 9.6, 3.4, .06, 0, false);
    for (let y = 2.8 + hallFloor; y < 6.2 + hallFloor; y += .5) t.k.block(t.m.aluminum, x + 8.5, y, wallZ + 1.34, 9.2, .04, .03, 0, false);
    for (let xx = -4.2; xx <= 4.2; xx += 1.4) t.k.block(t.m.steel, x + 8.5 + xx, 4.4 + hallFloor, wallZ + 1.36, .05, 3.4, .03, 0, false);
    t.k.block(t.m.lampCyan, x + 8.5, 6.9 + hallFloor, wallZ + 1.3, 7.2, .07, .05, 0, false);
    // Upper observation band and its catwalk.
    t.k.block(t.m.graphite, x + 8.5, top - 4, wallZ + 1.2, 8.4, 1.6, .06, 0, false);
    t.k.block(t.m.aluminum, x + 8.5, top - 3.1, wallZ + 1.5, 9.4, .16, .8, 0, false);
    for (let xx = -4; xx <= 4; xx += 2) t.k.block(t.m.steel, x + 8.5 + xx, top - 2.1, wallZ + 1.8, .06, 1.2, .06, 0, false);
    t.k.block(t.m.aluminum, x + 8.5, top - 1.5, wallZ + 1.85, 9.2, .06, .06, 0, false);
  }
  // Structural columns between bays, and wall-mounted pipe runs.
  for (let x = start; x < end; x += 18) {
    t.k.block(t.m.steel, x, (top + 12) / 2, wallZ + 1.2, .7, top + 12, 1.4);
    t.k.block(t.m.concreteDark, x, hallFloor + .5, wallZ + 1.3, 1.9, 1, 2.2);
    for (const y of [top * .35, top * .62]) {
      t.k.block(t.m.graphite, x + 9, y, wallZ + 1.35, 17, .22, .3, 0, false);
      for (let xx = .8; xx < 17; xx += 1.6) t.k.block(t.m.steel, x + 9 + xx, y + .16, wallZ + 1.36, .1, .12, .12, 0, false);
    }
  }
  t.k.withFrame(0, hallFloor, wallZ + 6, 0, () => pipeRack(t, span * .8, {height: 4.6}));

  // Ceiling: girder grid, luminaire troughs and the ring support cage.
  t.k.detail = 'mid';
  t.k.block(t.m.graphite, 0, top + 4, chamberZ - 6, span + 70, 1.2, 62);
  for (let x = start; x < end; x += 12) {
    t.k.block(t.m.steel, x, top + 1.4, chamberZ - 6, .8, 4.4, 60);
    t.k.block(t.m.lampWhite, x + 4.5, top + .6, chamberZ - 8, 8.4, .16, .5, 0, false);
    t.k.block(t.m.steel, x + 4.5, top + .85, chamberZ - 8, 8.8, .2, .7, 0, false);
  }
  for (const z of [-16, 4]) {
    t.k.beam(t.m.steel, [start, top + 2.2, chamberZ + z], [end, top + 2.2, chamberZ + z], .18);
    for (let x = start; x < end; x += 9) t.k.block(t.m.aluminum, x, top + 2.2, chamberZ + z, .3, .3, .3, 0, false);
  }

  // Overhead bridge crane: end trucks on runway rails, a girder across the hall,
  // a trolley and a hook block. Spans the 16 m bay, travels along the route.
  for (const x of [start + span * .3, start + span * .62]) {
    t.k.detail = 'near';
    for (const z of [laneZ - 16, laneZ - 1]) {
      t.k.block(t.m.steelDark, x, top - 1.1, z, 1.8, 1.3, 1.4);
      t.k.block(t.m.aluminum, x, top - .4, z, 2.1, .2, 1.7, 0, false);
    }
    t.k.block(t.m.steel, x, top - 1.1, laneZ - 8.5, 1.1, 1.2, 15.4);
    t.k.block(t.m.hazardTape, x, top - 2, laneZ - 8.5, 1, .5, 3.4, 0, false);
    t.k.block(t.m.lampAmber, x, top - 1.7, laneZ - 8.5, .8, .1, .5, 0, false);
    t.k.beam(t.m.steel, [x, top - 2.6, laneZ - 8.5], [x, top - 7.6, laneZ - 8.5], .05, false);
    t.k.block(t.m.steelDark, x, top - 7.9, laneZ - 8.5, .7, .7, .7, 0, false);
  }
  // Floor test rigs on the far side of the lane: frames, actuators and gauges.
  along(span, 58, (x, index) => {
    t.k.detail = 'near';
    t.k.withFrame(x, hallFloor, laneZ - 17, 0, () => {
      for (const side of [-1.6, 1.6]) t.k.block(t.m.steel, side, 2.2, 0, .28, 4.4, .28);
      t.k.block(t.m.steel, 0, 4.3, 0, 3.6, .28, .28);
      t.k.block(t.m.concreteDark, 0, .2, 0, 4.4, .4, 2.6);
      t.k.column(t.m.aluminum, 0, 1.8, 0, .34, 2.4);
      t.k.block(t.m.lampCyan, 0, 1.4, .36, .5, .08, .04, 0, false);
      t.k.block(t.m.galvanized, 1.9, 1.4, .2, .3, .5, .3, 0, false);
      t.k.block(index % 2 ? t.m.lampAmber : t.m.lampWhite, 1.9, 1.75, .2, .12, .1, .12, 0, false);
    });
  });

  // Ring cage: two supports per suction loop, driven by the authored track.
  const rings: {x: number; y: number; radius: number; z: number}[] = [];
  for (const track of level.tracks.filter(track => track.suction)) {
    const points = track.points;
    if (points.length < 12) continue;
    const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x));
    const maxY = Math.max(...points.map(p => p.y)), minY = Math.min(...points.map(p => p.y));
    if (maxY - minY < 12) continue;
    const radius = (maxX - minX) / 2 + 2.6;
    rings.push({x: (minX + maxX) / 2, y: maxY - radius + 2.6, radius, z: (points[0].z ?? 0)});
  }
  for (const ring of rings) {
    t.k.detail = 'near';
    t.k.torus(t.m.steel, ring.x, ring.y, ring.z - 1.2, ring.radius, .34, 'xy', true);
    t.k.torus(t.m.lampCyan, ring.x, ring.y, ring.z - 1.25, ring.radius - .55, .04, 'xy', false);
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const x = ring.x + Math.cos(angle) * ring.radius, y = ring.y + Math.sin(angle) * ring.radius;
      t.k.block(t.m.aluminum, x, y, ring.z - 1.5, 1.3, .3, .4, angle, false);
      if (Math.sin(angle) > .55) t.k.beam(t.m.steel, [x, y, ring.z - 2], [x * .72 + ring.x * .28, y + 3, ring.z - 12], .12, false);
    }
    // Floor anchors and hazard pads under the ring.
    for (const side of [-1, 1]) {
      t.k.block(t.m.concreteDark, ring.x + side * ring.radius * .72, hallFloor + .3, ring.z - 6, 2.6, .6, 3.4, 0, false);
      t.k.block(t.m.hazardTape, ring.x + side * ring.radius * .72, hallFloor + .62, ring.z - 6, 2.4, .04, 1.4, 0, false);
    }
  }

  // Foreground: rolling cabinets, cable drums and portable work lights.
  along(span, 46, (x, index) => {
    band(ctx, laneZ + 10);
    t.k.withFrame(x, hallFloor, laneZ + 10, Math.PI, () => portableLight(t));
    t.k.withFrame(x + 20, hallFloor, laneZ + 12, 0, () => {
      for (let i = 0; i < 3; i++) {
        t.k.block(t.m.steelDark, i * 1.5, 1.1, 0, 1.3, 2.2, .9, 0, false);
        t.k.block(t.m.lampCyan, i * 1.5, 1.5, .47, .6, .06, .02, 0, false);
        t.k.block(t.m.aluminum, i * 1.5, 2.24, 0, 1.24, .1, .84, 0, false);
      }
    });
    if (index % 2 === 0) t.k.withFrame(x + 8, hallFloor, laneZ - 16, 0, () => cameraMast(t));
    t.k.withFrame(x + 30, hallFloor, laneZ - 20, .4, () => drum(t, {color: 0x5a6f74}));
  });
  // Signage on the wall, above the vehicle line.
  t.k.withFrame(24, hallFloor, wallZ + 1.45, 0, () => warningBoard(t, 'INVERSION CHAMBER', 'MAGNETIC ADHESION TEST BAY', 4.2));
  t.k.withFrame(-38, hallFloor, wallZ + 1.45, 0, () => warningBoard(t, 'CLEARANCE', '5.5 M / NO PARKING', 3.6));

  // Deck-level hardware: gantry plates, low barriers and cones at the release bay.
  along(span, 260, x => {
    t.k.detail = 'mid';
    roadGantry(ctx, x, {span: 11, label: 'GRAVITY LAB', caption: 'DECKS 01-04'});
  });
  along(span, 96, (x, index) => {
    roadRail(ctx, x, 20, 1);
    roadRail(ctx, x, 20, -1);
    if (index % 3 === 0) for (let i = 0; i < 3; i++) roadProp(ctx, x + 12 + i * 3, 4.4, () => trafficCone(t));
  });
  t.k.withFrame(end - 62, hallFloor, laneZ + 6, Math.PI, () => officeBlock(t, {length: 16, width: 10, floors: 2, sign: 'LAB CONTROL'}));
  for (let i = 0; i < Math.ceil(span / 26); i++) {
    const x = start + random() * span;
    t.k.withFrame(x, hallFloor, laneZ - 18 + random() * 4, random() * 3, () => crate(t, {size: 1.2 + random()}));
  }
  t.k.detail = 'mid';
  t.k.withFrame(end - 20, hallFloor, laneZ + 14, 0, () => fence(t, 40, 2.2));
  for (let x = start; x < end; x += 120) t.k.withFrame(x, hallFloor, laneZ - 18, 0, () => lightMast(t, {height: 10, outreach: 1.6}));
}
