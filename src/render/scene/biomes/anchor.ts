import {roadRail, roadProp, roadGantry} from './roadside';
import {along, band} from './types';
import type {BiomeContext} from './types';
import {
  beacon, billboard, cameraMast, controlTower, fence, lightMast, lighthouse,
  mooringMast, officeBlock, radarDish, rockField, rockSpire, tankFarm, trafficCone,
  warningBoard, warehouse,
} from '../props';

/**
 * THE NEEDLE — level 9.
 *
 * A pinnacle above a sea of cloud: rock spires in the 50-140 m band, a 116 m
 * guyed anchor mast, service platforms bolted to the spires, radar and
 * obstruction lights. Cloud banks sit below the route so height reads without
 * covering a landing surface.
 */
export function anchor(ctx: BiomeContext) {
  const {t, floor, laneZ, span, start, end, random} = ctx;

  // Rock mass: the route climbs out of a chasm toward the mast.
  t.k.detail = 'far';
  ctx.terrain.ground(0x5c5852, 'rock', floor, laneZ - 110, span + 900, 760);
  ctx.terrain.ridge(start - 220, end + 220, laneZ - 300, floor + 30, 110, 0x71808c, 4, 80, 'far');
  ctx.terrain.ridge(start - 340, end + 340, laneZ - 430, floor + 40, 150, 0x7e8b96, 1, 120, 'far');

  // Spires around the route, authored at real heights.
  t.k.detail = 'far';
  for (let i = 0; i < Math.ceil(span / 110); i++) {
    const x = start + i * 110 + random() * 30;
    const z = laneZ - 62 - (i % 3) * 26 - random() * 24;
    const height = 52 + random() * 66;
    t.k.withFrame(x, floor, z, random() * 2, () => rockSpire(t, {height, radius: 6.5 + random() * 4, tone: 0x655f57}));
  }
  t.k.detail = 'mid';
  for (const x of [start + span * .2, start + span * .55, start + span * .85]) {
    t.k.withFrame(x, floor, laneZ - 60, 0, () => rockField(t, {count: 14, spread: 70, seed: Math.round(x), tone: 0x66605a}));
  }

  // The anchor mast, its stays, and the outer spur lighthouse.
  t.k.detail = 'mid';
  t.k.withFrame(start + span * .58, floor, laneZ - 78, 0, () => mooringMast(t, {height: 116, stays: 4}));
  t.k.withFrame(start + span * .18, floor + 22, laneZ - 82, 0, () => {
    t.k.column(t.m.concreteDark, 0, -11, 0, 11, 22);
    lighthouse(t);
  });
  t.k.withFrame(end - 70, floor + 40, laneZ - 96, 0, () => {
    t.k.column(t.m.concreteDark, 0, -20, 0, 6, 40);
    radarDish(t, {radius: 7});
  });
  t.k.withFrame(start + span * .34, floor + 30, laneZ - 58, 0, () => {
    t.k.block(t.m.concreteDark, 0, -15, 0, 16, 30, 16);
    controlTower(t);
  });

  // Service platforms hung on the spires with bracing down to the rock.
  for (let i = 0; i < Math.ceil(span / 150); i++) {
    const x = start + 60 + i * 150;
    const y = floor + 22 + (i % 3) * 12;
    t.k.withFrame(x, y, laneZ - 48, .1, () => {
      t.k.block(t.m.steel, 0, 0, 0, 14, .4, 8);
      t.k.block(t.m.aluminum, 0, .3, 3.9, 14, .1, .12, 0, false);
      for (let xx = -6; xx <= 6; xx += 2) t.k.block(t.m.steel, xx, .62, 3.9, .08, 1.2, .08, 0, false);
      t.k.block(t.m.aluminum, 0, 1.2, 3.9, 13.6, .08, .08, 0, false);
      t.k.block(t.m.hazardTape, -6.9, .1, 0, .3, .2, 7.8, 0, false);
      t.k.column(t.m.lampAmber, 6.4, 1.6, 3.7, .12, .3, false);
      const height = y - floor - .2;
      for (const xx of [-5, 5]) for (const zz of [-3, 3]) {
        t.k.block(t.m.steel, xx, -.2 - height / 2, zz, .4, height, .4);
        t.k.block(t.m.concreteDark, xx, floor - y + .25, zz, 1.2, .5, 1.2);
      }
      t.k.beam(t.m.steel, [-5, -.2, -3], [5, floor - y + .5, -3], .12);
      t.k.beam(t.m.steel, [5, -.2, -3], [-5, floor - y + .5, -3], .12);
    });
  }

  // Route hardware and surface approach.
  along(span, 160, (x, index) => {
    t.k.detail = 'mid';
    roadGantry(ctx, x, {span: 11, label: index % 2 ? 'NEEDLE 09' : 'ANCHOR LINE', caption: index % 2 ? 'PLATFORM 3' : 'STAY CLEAR OF MAST'});
    roadProp(ctx, x + 70, 5, () => warningBoard(t, 'LOW PRESSURE', 'HIGH ALTITUDE', 3.2), 4.5);
    t.k.detail = 'near';
    roadRail(ctx, x + 40, 20, 1);
    roadRail(ctx, x + 40, 20, -1);
    if (index % 3 === 0) for (let i = 0; i < 3; i++) roadProp(ctx, x + 90 + i * 3, 4.4, () => trafficCone(t));
  });
  along(span, 200, x => {
    t.k.withFrame(x, floor, laneZ - 18, 0, () => lightMast(t, {height: 10}));
    t.k.withFrame(x + 40, floor, laneZ - 24, 0, () => cameraMast(t));
  });
  along(span, 260, (x, index) => t.k.withFrame(x, floor, laneZ - 40, 0, () => warehouse(t, {length: 30, width: 16, color: 0xaeb3a9, sign: index % 2 ? 'STAY ANCHOR' : 'RESCUE BAY'})));
  along(span, 120, x => t.k.withFrame(x, floor, laneZ - 26, 0, () => fence(t, 26, 2)));
  t.k.withFrame(start + span * .4, floor, laneZ - 30, 0, () => officeBlock(t, {floors: 2, length: 18, sign: 'NEEDLE OPERATIONS'}));
  t.k.withFrame(start + span * .72, floor, laneZ - 52, 0, () => tankFarm(t, {count: 2}));
  t.k.withFrame(start + span * .5, floor, laneZ - 26, 0, () => billboard(t, {label: 'THE NEEDLE', caption: 'ANCHOR 09 / ALT 780 M'}));
  for (let i = 0; i < Math.ceil(span / 60); i++) t.k.withFrame(start + random() * span, floor, laneZ - 12, 0, () => beacon(t, {height: 1.6}));

  // Cloud sea below and behind the route.
  for (let i = 0; i < 3; i++) ctx.terrain.cloudBank(0, floor + 10 + i * 26, laneZ - 190 - i * 80, span + 700, 46 - i * 6, i);
  void band;
}
