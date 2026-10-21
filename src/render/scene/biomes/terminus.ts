import {roadRail, roadProp, roadGantry} from './roadside';
import {along, band} from './types';
import type {BiomeContext} from './types';
import {
  billboard, cameraMast, containerBlock, controlTower, fence, hangar, launchTower,
  lightMast, officeBlock, pipeRack, radarDish, substation, tankFarm, trafficCone,
  transmissionPylon, warningBoard, warehouse, waterTower,
} from '../props';

/**
 * TERMINUS — level 10.
 *
 * The launch complex at dusk. Bands are strict: low hardware inside 30 m, the
 * integration buildings at 45-60 m, and the pad itself at 96 m with the 74 m
 * service tower, water tower and fuel farm so the skyline stays behind the car.
 */
export function terminus(ctx: BiomeContext) {
  const {t, floor, laneZ, span, start, end, random} = ctx;

  // Graded hardstand and the crawlerway running the length of the complex.
  ctx.terrain.ground(0x9c947b, 'sand', floor, laneZ - 80, span + 1000, 800);
  t.k.detail = 'mid';
  t.k.plate(t.m.concreteDark, 0, floor + .05, laneZ - 78, span + 220, .2, 140, {}, 8);
  t.k.plate(t.m.asphalt, 0, floor + .18, laneZ - 52, span + 220, .12, 20, {}, 6);
  for (let x = start; x < end; x += 6) {
    t.k.block(t.m.paintedWhite, x, floor + .27, laneZ - 61.6, 3, .02, .3, 0, false);
    t.k.block(t.m.paintedWhite, x, floor + .27, laneZ - 42.4, 3, .02, .3, 0, false);
  }
  for (let x = start; x < end; x += 18) t.k.block(t.m.hazardTape, x, floor + .27, laneZ - 52, 9, .02, .4, 0, false);

  // The pad: hold-down deck, flame trench, service tower and lightning masts.
  along(span, 210, (x, index) => {
    band(ctx, laneZ - 96);
    t.k.withFrame(x, floor, laneZ - 96, 0, () => {
      t.k.block(t.m.concrete, 0, 1.4, 14, 38, 2.8, 30);
      t.k.block(t.m.hazardTape, 0, 2.85, 14, 34, .1, .5, 0, false);
      launchTower(t);
      t.k.block(t.m.concreteDark, -13, .8, 14, 8, 1.6, 32);
      for (const z of [4, 24]) t.k.block(t.m.aluminum, 0, 2.9, z, 24, .12, .5, 0, false);
    });
    t.k.detail = 'mid';
    t.k.withFrame(x + 44, floor, laneZ - 112, 0, () => waterTower(t));
    t.k.withFrame(x + 74, floor, laneZ - 118, 0, () => tankFarm(t, {count: 3}));
    t.k.withFrame(x + 104, floor, laneZ - 92, 0, () => pipeRack(t, 60, {height: 4.4}));
    t.k.withFrame(x + 138, floor, laneZ - 84, 0, () => substation(t));
    t.k.withFrame(x + 162, floor, laneZ - 104, 0, () => controlTower(t));
    for (const [dx, dz] of [[-30, -14], [30, -14], [-30, 36], [30, 36]] as [number, number][]) {
      t.k.withFrame(x + dx, floor, laneZ - 96 + dz, 0, () => {
        t.k.cone(t.m.galvanized, 0, 42, 0, .55, .18, 84, false);
        t.k.column(t.m.lampRed, 0, 84.4, 0, .16, .4, false);
      });
    }
  });

  // Integration buildings in the mid band, clear of the pad footprint.
  along(span, 300, (x, index) => {
    t.k.detail = 'mid';
    t.k.withFrame(x, floor, laneZ - 52, 0, () => warehouse(t, {length: 44, width: 18, color: 0xc0c5bd, sign: `INTEGRATION BAY ${index + 1}`}));
    t.k.withFrame(x + 36, floor, laneZ - 48, Math.PI, () => officeBlock(t, {floors: 3, length: 22, sign: 'MISSION CONTROL'}));
    t.k.withFrame(x + 66, floor, laneZ - 74, 0, () => hangar(t, {span: 40, depth: 30, height: 16}));
    t.k.withFrame(x + 106, floor, laneZ - 62, 0, () => containerBlock(t, {rows: 2, lanes: 3, tiers: 1, seed: 17 + index}));
    t.k.withFrame(x + 132, floor, laneZ - 76, 0, () => radarDish(t, {radius: 6}));
  });

  // Perimeter lighting, fences and the deck approach.
  t.k.detail = 'mid';
  along(span, 96, (x, index) => {
    t.k.withFrame(x, floor, laneZ - 30, 0, () => lightMast(t, {height: 18}));
    if (index % 2 === 0) t.k.withFrame(x + 24, floor, laneZ - 24, 0, () => cameraMast(t));
    t.k.withFrame(x + 44, floor, laneZ - 18, 0, () => fence(t, 40, 2.4));
  });
  for (let x = start; x < end; x += 150) {
    t.k.withFrame(x, floor, laneZ - 160, 0, () => transmissionPylon(t));
  }
  along(span, 160, (x, index) => {
    t.k.detail = 'near';
    roadRail(ctx, x, 24, 1);
    roadRail(ctx, x, 24, -1);
    if (index % 2 === 0) for (let i = 0; i < 3; i++) roadProp(ctx, x + 20 + i * 3.2, 4.4, () => trafficCone(t));
  });
  along(span, 340, (x, index) => {
    t.k.detail = 'mid';
    roadGantry(ctx, x, {span: 12, label: index % 2 ? 'TERMINUS' : 'LAUNCH LINK', caption: index % 2 ? 'PAD 02 / 3.2 KM' : 'CLEARANCE 5.5 M'});
    roadProp(ctx, x + 170, -5, () => warningBoard(t, 'FLAME TRENCH', 'NO ENTRY DURING TEST', 3.6), 4.5);
  });
  t.k.withFrame(start + span * .42, floor, laneZ - 22, 0, () => billboard(t, {label: 'TERMINUS', caption: 'FINAL LAUNCH PROTOCOL'}));
  for (let i = 0; i < Math.ceil(span / 70); i++) {
    const x = start + random() * span;
    t.k.withFrame(x, floor, laneZ - 26 + random() * 6, 0, () => t.k.block(t.m.hazardTape, 0, .5, 0, 1.4, 1, .6, 0, false));
  }
  void band;
}
