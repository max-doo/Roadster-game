import {roadRail, roadProp, roadGantry, roadContact} from './roadside';
import {along, band} from './types';
import type {BiomeContext} from './types';
import {
  billboard, breakwater, buoy, containerBlock, controlTower, fence, lightMast,
  lighthouse, officeBlock, quayWall, rockField, serviceTruck, shrub, stsCrane,
  tankFarm, trafficCone, viaductPier, warningBoard, warehouse, workboat,
} from '../props';

/**
 * AFTERSHOCK COAST — level 4.
 *
 * The route runs on a collapsed coastal viaduct 18 m above the water: piers and
 * cap beams under the deck, quay and freight sheds beyond it, the breakwater and
 * a headland lighthouse in the middle distance, and open sea to the horizon.
 * Near-field land is limited to low scrub so nothing blocks the driving line.
 */
export function coast(ctx: BiomeContext) {
  const {t, floor, laneZ, span, start, end, random} = ctx;

  // Water, land shelf and layering ridges for the headlands.
  t.k.detail = 'far';
  t.k.plate(t.m.paint(0x2b4d5b), 0, floor - 2.2, laneZ - 430, span + 2000, .6, 720, {}, 14, false);
  ctx.terrain.ground(0x9b9a88, 'sand', floor + .4, laneZ + 24, span + 500, 90);
  ctx.terrain.ridge(start - 200, end + 200, laneZ - 214, floor + 6, 44, 0x6d7c88, 3, 60, 'far');
  ctx.terrain.ridge(start - 300, end + 300, laneZ - 360, floor + 10, 62, 0x7a8893, 8, 90, 'far');
  ctx.terrain.ridge(start - 140, end + 140, laneZ - 150, floor + 2, 22, 0x6a756f, 5, 40, 'mid');

  // Breakwater with armour units and two lit ends.
  t.k.detail = 'mid';
  t.k.withFrame(0, floor - 2, laneZ - 96, 0, () => breakwater(t, span * .8));
  for (const x of [start + span * .16, start + span * .72]) t.k.withFrame(x, floor + .8, laneZ - 96, 0, () => {
    t.k.column(t.m.paint(0xb8452f), 0, 3.2, 0, 1.1, 6.4, false);
    t.k.column(t.m.lampAmber, 0, 6.6, 0, .28, .4, false);
  });
  for (let i = 0; i < 7; i++) t.k.withFrame(start + random() * span, floor - 2.4, laneZ - 130 - random() * 90, random() * 3, () => buoy(t, {color: i % 2 ? 0xb8452f : 0x3e7a5f}));

  // Quay and freight terminal beyond the road, all below deck level.
  t.k.plate(t.m.concreteDark, 0, floor - 4, laneZ - 66, span + 240, 8, 64, {}, 6);
  along(span, 380, (x, index) => {
    band(ctx, laneZ - 58);
    t.k.withFrame(x, floor - 4, laneZ - 52, 0, () => quayWall(t, 110, 6));
    t.k.withFrame(x + 12, floor, laneZ - 84, 0, () => stsCrane(t, {color: index % 2 ? 0xd8ddd6 : 0xcfd6cf}));
    t.k.withFrame(x + 50, floor - 2.4, laneZ - 110, 0, () => workboat(t, {length: 18}));
    t.k.withFrame(x + 70, floor, laneZ - 58, 0, () => warehouse(t, {length: 44, width: 20, color: 0xb9c1bd, sign: 'COAST FREIGHT'}));
    t.k.withFrame(x + 96, floor, laneZ - 54, Math.PI, () => officeBlock(t, {floors: 2, length: 20, sign: 'COAST WATCH'}));
    t.k.withFrame(x + 118, floor, laneZ - 62, 0, () => containerBlock(t, {rows: 2, lanes: 3, tiers: 2, seed: 5 + index}));
  });

  // Headland lighthouse on its own rock mass, clear of the freight apron.
  t.k.detail = 'mid';
  t.k.withFrame(start + span * .34, floor + 8, laneZ - 118, 0, () => {
    t.k.column(t.m.concreteDark, 0, -6.5, 0, 15, 13);
    lighthouse(t);
    t.k.withFrame(0, 0, 9, 0, () => officeBlock(t, {length: 12, width: 8, floors: 1, sign: 'COAST WATCH'}));
  });
  t.k.withFrame(start + span * .12, floor + .4, laneZ + 26, 0, () => rockField(t, {count: 16, spread: 80, seed: 23, tone: 0x716c62}));

  // Viaduct: a pier every 42 m, with inspection walkways and bearings.
  along(span, 42, (x, index) => {
    t.k.detail = index % 3 === 0 ? 'near' : 'far';
    const contact = roadContact(ctx, x, 3);
    if (contact && contact.y > floor + 2) t.k.withFrame(x, floor, contact.z, 0, () => viaductPier(t, {height: contact.y - floor - 1.01, width: 2, capLength: contact.width}));
  });

  // Land-side shelf: low scrub, fence and the coastal road far below.
  t.k.plate(t.m.asphalt, 0, floor + .1, laneZ + 30, span + 200, .16, 9, {}, 6);
  for (let x = -span / 2; x < span / 2; x += 18) t.k.block(t.m.paintedWhite, x, floor + .19, laneZ + 30, 6, .02, .12, 0, false);
  along(span, 150, x => t.k.withFrame(x, floor + .4, laneZ + 14, 0, () => fence(t, 40, 1.8)));
  for (let i = 0; i < Math.ceil(span / 14); i++) {
    const x = start + random() * span;
    t.k.withFrame(x, floor + .4, laneZ + 8 + random() * 26, random() * 3, () => shrub(t, {tone: 0x6d7458}));
  }
  for (let x = -span / 2; x < span / 2; x += 88) {
    t.k.withFrame(x, floor + .4, laneZ + 18, 0, () => lightMast(t, {height: 11}));
    if (x % 176 === 0) t.k.withFrame(x + 30, floor + .4, laneZ + 26, 0, () => serviceTruck(t));
  }
  t.k.withFrame(start + span * .52, floor + .4, laneZ + 26, 0, () => tankFarm(t, {count: 2}));
  t.k.withFrame(start + span * .66, floor + .4, laneZ + 34, 0, () => controlTower(t));

  // Deck furniture: rails on both edges, gantries, cones and warning boards.
  along(span, 130, (x, index) => {
    t.k.detail = 'near';
    roadRail(ctx, x, 26, 1);
    roadRail(ctx, x, 26, -1);
    if (index % 2 === 0) for (let i = 0; i < 3; i++) roadProp(ctx, x + 16 + i * 3.4, 4.4, () => trafficCone(t));
  });
  along(span, 320, (x, index) => {
    t.k.detail = 'mid';
    roadGantry(ctx, x, {span: 12, label: index % 2 ? 'AFTERSHOCK 03' : 'COAST VIADUCT', caption: index % 2 ? 'LOAD LIMIT 24 T' : 'GALE WARNING'});
    roadProp(ctx, x + 150, -5, () => warningBoard(t, 'CROSSWIND', 'REDUCE SPEED', 3.4), 4.5);
  });
  along(span, 460, (x, index) => {
    t.k.withFrame(x, floor + .4, laneZ + 14, 0, () => billboard(t, {label: index % 2 ? 'COAST ROAD' : 'TIDE 2.4 M', caption: 'GALE WARNING IN FORCE'}));
  });
  void end;
}
