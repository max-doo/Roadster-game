import {roadRail, roadProp, roadGantry} from './roadside';
import {along, band} from './types';
import type {BiomeContext} from './types';
import {
  cablePylon, cameraMast, containerBlock, controlTower, fence, hangar,
  lightMast, officeBlock, powerLine, radarDish, tankFarm, trafficCone,
  rockField, transmissionPylon, utilityPole, warningBoard, waterTower,
} from '../props';

/**
 * AEROSPACE CANYON — level 3.
 *
 * Layered mesas with a working flight-test valley: suspended gantries, service
 * pads on the canyon floor, a launch services area and stacked stratus banks
 * that give the vertical drops a sense of depth.
 */
export function canyon(ctx: BiomeContext) {
  const {t, floor, laneZ, span, start, end, random} = ctx;

  ctx.terrain.ground(0x6a6259, 'rock', floor, laneZ - 120, span + 700, 620);
  ctx.terrain.ridge(start - 220, end + 220, laneZ - 250, floor + 20, 74, 0x67767f, 3, 58, 'far');
  ctx.terrain.ridge(start - 160, end + 160, laneZ - 150, floor + 14, 48, 0x5f6e78, 5, 34, 'far');
  ctx.terrain.ridge(start - 90, end + 90, laneZ - 76, floor + 9, 33, 0x55636c, 1, 22, 'mid');
  ctx.terrain.ridge(start - 62, end + 62, laneZ - 42, floor, 24, 0x4c5a63, 6, 18, 'mid');

  // Valley floor service pads and the infrastructure that makes them real.
  t.k.detail = 'mid';
  t.k.plate(t.m.concreteDark, 0, floor + .06, laneZ - 46, span + 80, .22, 34, {}, 6);
  along(span, 240, (x, index) => {
    band(ctx, laneZ - 70);
    t.k.withFrame(x - 40, floor, laneZ - 78, 0, () => {
      hangar(t, {span: 40, depth: 28, height: 16});
    });
    t.k.detail = 'near';
    t.k.withFrame(x + 32, floor, laneZ - 62, Math.PI, () => officeBlock(t, {floors: 2, length: 20, sign: 'CANYON CONTROL'}));
    t.k.withFrame(x + 58, floor, laneZ - 52, .2, () => waterTower(t));
    t.k.detail = 'mid';
    t.k.withFrame(x + 84, floor, laneZ - 88, -.3, () => tankFarm(t, {count: 2}));
    t.k.withFrame(x + 118, floor, laneZ - 104, 0, () => controlTower(t));
    t.k.withFrame(x + 140, floor, laneZ - 96, 0, () => radarDish(t, {radius: 5.5}));
    t.k.withFrame(x + 66, floor, laneZ - 58, 0, () => containerBlock(t, {rows: 2, lanes: 3, tiers: 2, seed: 3 + index}));
  });

  // Service road at the valley floor with its own lights and markings.
  t.k.plate(t.m.asphalt, 0, floor + .05, laneZ - 34, span + 80, .14, 12, {}, 6);
  for (let x = -span / 2; x < span / 2; x += 24) {
    t.k.block(t.m.paintedWhite, x, floor + .13, laneZ - 34, 6, .02, .16, 0, false);
    t.k.block(t.m.lampAmber, x + 12, floor + .2, laneZ - 28.4, .22, .1, .22, 0, false);
  }
  along(span, 200, x => {
    t.k.withFrame(x, floor, laneZ - 30, 0, () => lightMast(t, {height: 12}));
    t.k.withFrame(x + 30, floor, laneZ - 26, 0, () => cameraMast(t));
  });

  // Suspended gantries over the route: the deck hangs from cable-stayed pylons.
  along(span, 300, (x, index) => {
    t.k.detail = 'mid';
    t.k.withFrame(x, floor - 4, laneZ, 0, () => cablePylon(t, {height: 46, span: 70}));
    roadGantry(ctx, x + 90, {
      span: 12,
      label: index % 2 ? 'CANYON 04' : 'FLIGHT CORRIDOR',
      caption: index % 2 ? 'SERVICE GANTRY' : 'CLEARANCE 5.5 M',
    });
  });

  // Wind and transmission lines on the canyon rim.
  t.k.detail = 'far';
  for (let x = -span / 2; x < span / 2; x += 110) {
    t.k.withFrame(x, floor, laneZ - 120, 0, () => transmissionPylon(t));
  }
  t.k.detail = 'mid';
  for (let x = -span / 2; x < span / 2; x += 80) {
    t.k.withFrame(x, floor, laneZ - 100, 0, () => utilityPole(t));
    if (x + 80 < span / 2) for (const z of [-.95, 0, .95]) powerLine(t, [x, floor + 9.96, laneZ - 100 + z], [x + 80, floor + 9.96, laneZ - 100 + z], 2.4);
  }

  // Deck-level safety hardware at each exposed span.
  along(span, 110, (x, index) => {
    t.k.detail = 'near';
    roadRail(ctx, x, 22, 1);
    roadRail(ctx, x, 22, -1);
    if (index % 2 === 0) for (let i = 0; i < 3; i++) roadProp(ctx, x + 14 + i * 3.2, 4.5, () => trafficCone(t));
  });
  along(span, 420, x => roadProp(ctx, x, -5, () => warningBoard(t, 'CANYON DROP', 'RECOVERY 2.4 KM', 3.2), 4.5));

  // Cloud banks sit in front of the far mesas, never over the driving line.
  for (let i = 0; i < 3; i++) ctx.terrain.cloudBank(0, floor + 18 + i * 22, laneZ - 150 - i * 60, span + 500, 40 - i * 5, i);

  // Rock scatter on the valley floor, plus a fence line along the rim road.
  t.k.detail = 'mid';
  for (const x of [start + span * .2, start + span * .5, start + span * .8]) {
    t.k.withFrame(x, floor, laneZ - 68, 0, () => rockField(t, {count: 16, spread: 130, seed: Math.round(x), tone: 0x655c53}));
  }
  for (let i = 0; i < Math.ceil(span / 40); i++) {
    t.k.withFrame(start + random() * span, floor, laneZ - 96, 0, () => fence(t, 60, 2.4));
  }
  roadGantry(ctx, end - 70, {span: 12, label: 'SKYFALL', caption: 'FINAL DESCENT'});
}
