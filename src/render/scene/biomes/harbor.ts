import {roadRail, roadProp, roadGantry} from './roadside';
import {along, band} from './types';
import type {BiomeContext} from './types';
import {
  billboard, containerBlock, containerShip, controlTower, fence, lightMast, officeBlock,
  pontoon, portableLight, quayWall, rtgCrane, serviceTruck, stsCrane, substation,
  tankFarm, trafficCone, warehouse, warningBoard, workboat,
} from '../props';

/**
 * FREIGHTLINE — level 6, night shift.
 *
 * A two-level container terminal. The route runs on the upper viaduct; a raised
 * yard deck four metres below carries stacked boxes and the ship-to-shore
 * gantries, and the working quay sits eighteen metres down beside the water.
 * That staging keeps the port legible from a side-on camera: box walls, crane
 * portals and ship silhouettes all sit near the driver's eye line.
 */
export function harbor(ctx: BiomeContext) {
  const {t, level, floor, laneZ, span, start, end, random} = ctx;
  const roadY = level.start.y;
  const deckY = roadY - 4;

  // Water at the bottom of the frame.
  t.k.detail = 'far';
  t.k.plate(t.m.paint(0x12232b), 0, floor - .2, laneZ - 300, span + 1600, .4, 900, {}, 14, false);

  // Raised yard deck with an exposed edge beam and support columns.
  t.k.detail = 'mid';
  t.k.plate(t.m.concreteDark, 0, deckY - 1.2, laneZ - 38, span + 200, 2.4, 34, {}, 6);
  t.k.block(t.m.concrete, 0, deckY + .06, laneZ - 21.4, span + 200, .18, .8, 0, false);
  t.k.block(t.m.hazardTape, 0, deckY + .18, laneZ - 21.8, span + 200, .06, .3, 0, false);
  for (let x = start - 20; x < end + 20; x += 20) {
    for (const z of [laneZ - 26, laneZ - 50]) {
      t.k.block(t.m.concrete, x, (floor + deckY - 1.2) / 2, z, 1.6, deckY - 1.2 - floor, 1.6);
      t.k.block(t.m.steelDark, x, deckY - 2.4, z, 2.4, .4, 2.4, 0, false);
    }
  }

  // Container blocks on the yard deck, three tiers tall.
  along(span, 34, (x, index) => {
    t.k.detail = index % 2 === 0 ? 'near' : 'mid';
    t.k.withFrame(x, deckY, laneZ - 34, 0, () => containerBlock(t, {rows: 1, lanes: 2, tiers: 3 + (index % 2), seed: 41 + index}));
    if (index % 3 === 0) t.k.withFrame(x + 20, deckY, laneZ - 46, 0, () => containerBlock(t, {rows: 2, lanes: 3, tiers: 4, seed: 61 + index}));
  });

  // Ship-to-shore gantries standing on the yard deck, booms out over the water.
  along(span, 240, (x, index) => {
    band(ctx, laneZ - 60);
    t.k.withFrame(x, deckY, laneZ - 46, 0, () => stsCrane(t, {color: index % 2 ? 0xd7dcd7 : 0xcfd4cf, boom: 46}));
    t.k.withFrame(x + 96, deckY, laneZ - 38, 0, () => rtgCrane(t, {span: 22}));
  });

  // Lower quay, ship and working buildings beyond the yard.
  t.k.detail = 'mid';
  t.k.withFrame(0, floor, laneZ - 86, 0, () => quayWall(t, span + 240, 5));
  t.k.plate(t.m.concreteDark, 0, floor + .1, laneZ - 80, span + 580, .2, 56, {}, 6);
  along(span, 380, (x, index) => {
    if (index % 2 === 0) t.k.withFrame(x + 40, floor - .5, laneZ - 132, 0, () => containerShip(t));
    else t.k.withFrame(x + 50, floor - 2, laneZ - 108, .2, () => workboat(t, {length: 22}));
    t.k.withFrame(x + 110, floor + .2, laneZ - 78, 0, () => warehouse(t, {length: 46, width: 20, color: 0xb8c0bd, sign: `TERMINAL ${index + 1}`}));
    t.k.withFrame(x + 150, floor + .2, laneZ - 72, Math.PI, () => officeBlock(t, {floors: 3, length: 20, sign: 'TERMINAL CONTROL'}));
    t.k.withFrame(x + 176, floor + .2, laneZ - 96, 0, () => tankFarm(t, {count: 2}));
    t.k.withFrame(x + 208, floor + .2, laneZ - 88, 0, () => substation(t));
    t.k.withFrame(x + 232, floor + .2, laneZ - 84, 0, () => controlTower(t));
    t.k.withFrame(x + 250, floor - 2, laneZ - 104, 0, () => pontoon(t, {length: 20, width: 7}));
  });

  // Yard lighting: masts on the deck, portables and fences between blocks.
  along(span, 84, (x, index) => {
    t.k.withFrame(x, deckY, laneZ - 22, 0, () => lightMast(t, {height: 14}));
    if (index % 2 === 1) t.k.withFrame(x + 30, deckY, laneZ - 52, Math.PI, () => portableLight(t));
    if (index % 3 === 0) t.k.withFrame(x + 52, deckY, laneZ - 24, 0, () => fence(t, 30, 2.2));
    if (index % 4 === 0) t.k.withFrame(x + 60, deckY, laneZ - 30, 0, () => serviceTruck(t, {color: 0xc9ad72}));
  });

  // Roadside rails, signs and lit billboards.
  along(span, 140, (x, index) => {
    t.k.detail = 'near';
    roadRail(ctx, x, 24, 1);
    roadRail(ctx, x, 24, -1);
    if (index % 2 === 0) for (let i = 0; i < 3; i++) roadProp(ctx, x + 18 + i * 3, 4.4, () => trafficCone(t));
  });
  along(span, 280, (x, index) => {
    t.k.detail = 'mid';
    roadGantry(ctx, x, {span: 12, label: index % 2 ? 'BERTH 04' : 'FREIGHTLINE', caption: index % 2 ? 'STS 40 T' : 'AUTHORISED VEHICLES ONLY'});
    t.k.withFrame(x + 130, deckY, laneZ - 24, 0, () => billboard(t, {label: 'PORT 24H', caption: 'GATE 2 / WEIGHBRIDGE'}));
    roadProp(ctx, x + 200, -5, () => warningBoard(t, 'CRANE ZONE', 'NO STOPPING', 3), 4.5);
  });
  void end;
}
