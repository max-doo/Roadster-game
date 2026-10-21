import {roadRail, roadProp, roadGantry} from './roadside';
import {CONTAINER} from '../units';
import {
  billboard, cameraMast, conifer, containerBlock, controlTower, crate, delineator, drum, fence,
  gateHouse, hangar, lightMast, officeBlock, powerLine, serviceTruck, shrub, 
  tankFarm, targetBoard, trafficCone, transmissionPylon, tyreStack, utilityPole, warningBoard,
  warehouse, waterTower,
} from '../props';
import {along, band} from './types';
import type {BiomeContext} from './types';

/**
 * DESERT PROVING GROUND — level 1.
 *
 * Placement follows the clear-zone contract: low roadside hardware inside 26 m,
 * working buildings in the 30-60 m band, the runway and holding areas at 90 m,
 * and only terrain beyond 160 m. The lakebed sits 11 m under the playable deck,
 * so the piers read as a real elevated test road rather than a floating ribbon.
 */
export function desert(ctx: BiomeContext) {
  const {t, floor, laneZ, span, start, end, random} = ctx;
  const groundLevel = floor;

  // Lakebed, dunes and three receding ridges with aerial perspective.
  t.k.detail = 'far';
  ctx.terrain.ground(0xb99b76, 'sand', groundLevel, laneZ - 90, span + 1000, 980);
  ctx.terrain.dunes(start - 320, end + 320, groundLevel, 0x8c6c4d, 'far');
  ctx.terrain.ridge(start - 240, end + 240, laneZ - 168, groundLevel, 22, 0x8a7761, 5, 40, 'mid');
  ctx.terrain.ridge(start - 260, end + 260, laneZ - 262, groundLevel - 2, 38, 0x8b8580, 8, 56, 'far');
  ctx.terrain.ridge(start - 300, end + 300, laneZ - 372, groundLevel - 4, 58, 0x8f8f97, 2, 80, 'far');

  // Service track along the piers, and the runway further out.
  t.k.detail = 'mid';
  t.k.plate(t.m.asphalt, 0, groundLevel + .05, laneZ - 22, span + 80, .14, 11, {}, 6);
  for (let x = -span / 2; x < span / 2; x += 12) {
    t.k.block(t.m.paintedWhite, x, groundLevel + .13, laneZ - 22, 4.4, .02, .14, 0, false);
    t.k.withFrame(x + 6, groundLevel, laneZ - 16, 0, () => delineator(t));
  }
  t.k.plate(t.m.asphalt, 0, groundLevel + .04, laneZ - 96, span + 120, .12, 46, {}, 6);
  for (let x = -span / 2; x < span / 2; x += 18) {
    t.k.block(t.m.paintedWhite, x, groundLevel + .11, laneZ - 96, 9, .02, .4, 0, false);
    for (const side of [-1, 1]) t.k.block(t.m.lampCyan, x, groundLevel + .2, laneZ - 96 + side * 22, .3, .12, .3, 0, false);
  }
  for (const z of [-112, -80]) t.k.block(t.m.paintedWhite, 0, groundLevel + .11, z, span, .02, .16, 0, false);

  // Test-range buildings in the mid band, repeating every 200 m.
  along(span, 200, (x, index) => {
    band(ctx, laneZ - 50);
    // Alternate the yard so the row never becomes one continuous wall.
    if (index % 3 === 0) t.k.withFrame(x - 26, groundLevel, laneZ - 52, 0, () => warehouse(t, {
      length: 44, width: 20,
      color: [0xc8cec8, 0xbcc4c3, 0xcfc9bb, 0xc2c8c6][index % 4],
      sign: `TEST RANGE  /  BAY ${String(index + 1).padStart(2, '0')}`,
    }));
    else if (index % 3 === 1) t.k.withFrame(x - 20, groundLevel, laneZ - 62, .18, () => hangar(t, {span: 34, depth: 24, height: 13}));
    else t.k.withFrame(x - 10, groundLevel, laneZ - 46, 0, () => warehouse(t, {length: 26, width: 14, color: 0xc3c8bf, sign: 'SERVICE SHED'}));
    t.k.detail = 'near';
    t.k.withFrame(x + 30, groundLevel, laneZ - 36, Math.PI, () => officeBlock(t, {floors: 2, width: 10, sign: 'FLIGHT TEST OPERATIONS'}));
    t.k.withFrame(x + 30, groundLevel, laneZ - 27, 0, () => gateHouse(t));
    t.k.withFrame(x + 44, groundLevel, laneZ - 30, 0, () => serviceTruck(t, {color: 0xb9bcb4}));
    t.k.withFrame(x + 16, groundLevel, laneZ - 26, 0, () => {
      tyreStack(t, {count: 5});
      drum(t, {color: 0x4a6b74});
    });
    // Single-tier boxes sit inside the near band without blocking sight lines.
    t.k.withFrame(x + 2, groundLevel, laneZ - 26, 0, () => containerBlock(t, {rows: 2, lanes: 2, tiers: 1, length: CONTAINER.ft20.length, seed: 7 + index}));
    t.k.detail = 'mid';
    if (index % 2 === 0) t.k.withFrame(x + 66, groundLevel, laneZ - 66, .3, () => tankFarm(t, {count: 3}));
    t.k.withFrame(x + 96, groundLevel, laneZ - 74, 0, () => containerBlock(t, {rows: 2, lanes: 3, tiers: 2, seed: 11 + index}));
    t.k.withFrame(x + 124, groundLevel, laneZ - 92, 0, () => controlTower(t));
    t.k.withFrame(x + 150, groundLevel, laneZ - 120, 0, () => waterTower(t));
    for (let i = 0; i < 5; i++) t.k.withFrame(x + 20 + i * 2.4, groundLevel, laneZ - 30 + (i % 2) * 1.4, random() * .6, () => crate(t, {size: 1.3}));
  });

  // Instrumentation along the run.
  along(span, 64, (x, index) => {
    band(ctx, laneZ - 28);
    t.k.withFrame(x, groundLevel, laneZ - 28, 0, () => cameraMast(t));
    if (index % 2 === 1) t.k.withFrame(x + 12, groundLevel, laneZ - 38, 0, () => targetBoard(t, {label: 'TGT 04'}));
    if (index % 3 === 2) t.k.withFrame(x - 16, groundLevel, laneZ - 40, 0, () => warningBoard(t, 'DANGER', 'HIGH SPEED TEST AREA', 3.4));
  });

  // Utility line with real catenary sag, and a lattice pylon further out.
  t.k.detail = 'mid';
  for (let x = -span / 2; x < span / 2; x += 60) {
    t.k.withFrame(x, groundLevel, laneZ - 52, 0, () => utilityPole(t, {transformer: Math.round(x / 60) % 3 === 0}));
    if (x + 60 < span / 2) for (const z of [-.95, 0, .95]) powerLine(t, [x, groundLevel + 9.96, laneZ - 52 + z], [x + 60, groundLevel + 9.96, laneZ - 52 + z], 1.4);
  }
  t.k.withFrame(-span / 2 + 40, groundLevel, laneZ - 148, 0, () => transmissionPylon(t));

  // Deck furniture: rails, gantries, cones and lighting.
  along(span, 230, (x, index) => {
    t.k.detail = 'mid';
    roadGantry(ctx, x, {
      span: 12,
      label: index % 2 ? 'RANGE 02' : 'FLIGHT CORRIDOR',
      caption: index % 2 ? 'PROVING GROUND' : 'CLEARANCE 5.5 M',
    });
  });
  along(span, 104, (x, index) => {
    t.k.detail = 'near';
    roadRail(ctx, x + 26, 22, 1);
    roadRail(ctx, x + 26, 22, -1);
    t.k.withFrame(x, groundLevel, laneZ - 14, 0, () => lightMast(t, {height: 12}));
    if (index % 2 === 0) for (let i = 0; i < 3; i++) roadProp(ctx, x + 34 + i * 3.2, 4.6, () => trafficCone(t));
  });
  along(span, 360, x => t.k.withFrame(x, groundLevel, laneZ - 20, 0, () => billboard(t, {
    label: Math.abs(Math.round(x / 360)) % 2 ? 'PROVING GROUND' : 'ROADSTER TEST RANGE',
    caption: 'AUTHORISED TEST RANGE',
  })));

  // Scrub and rock scatter on the camera side of the service track.
  t.k.detail = 'mid';
  for (let i = 0; i < Math.ceil(span / 9); i++) {
    const x = start + random() * span;
    const z = laneZ + 7 + random() * 22;
    t.k.withFrame(x, groundLevel, z, random() * 3, () => (random() > .45
      ? shrub(t, {tone: 0x6d6f4c})
      : conifer(t, {height: 5 + random() * 4, tone: 0x55613f})));
  }
  for (let i = 0; i < Math.ceil(span / 22); i++) {
    const x = start + random() * span;
    t.k.withFrame(x, groundLevel, laneZ - 30 - random() * 30, random() * 3, () => {
      t.k.detail = 'far';
      t.k.block(t.m.rust, 0, .25, 0, .4 + random(), .5, .4, random(), false);
      t.k.detail = 'mid';
    });
  }
  for (let x = -span / 2; x < span / 2; x += 96) {
    t.k.withFrame(x, groundLevel, laneZ - 64, 0, () => fence(t, 60, 2.4));
  }
}
