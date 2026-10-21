import {roadRail, roadProp, roadGantry} from './roadside';
import {along, band} from './types';
import type {BiomeContext} from './types';
import {
  billboard, cameraMast, containerBlock, fence, lightMast, officeBlock, portableLight,
  radarDish, serviceTruck, tankFarm, towerCrane, trafficCone, warehouse, warningBoard,
} from '../props';

/**
 * VERTIGO — level 5.
 *
 * A vertical megastructure scene: paired supertall slabs with sky bridges,
 * construction cranes above the roofline, and a street-level grid far below the
 * climbing route. Floor bands every 13.6 m and 3.4 m storeys give the towers a
 * legible scale next to the vertical service rail.
 */
function superTower(ctx: BiomeContext, options: {height: number; width?: number; depth?: number; tone?: number; crane?: boolean}) {
  const {k, m} = ctx.t;
  const width = options.width ?? 30, depth = options.depth ?? 22, height = options.height;
  k.panel(m.concreteDark, 0, height * .02, 0, width + 7, height * .04, depth + 7, 4);
  k.panel(m.window, 0, height / 2, 0, width, height, depth, 7.8);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.block(m.steel, sx * width / 2, height / 2, sz * depth / 2, .9, height, .9);
  for (let y = 13.6; y < height; y += 13.6) k.block(m.steelDark, 0, y, 0, width + .9, .5, depth + .9, 0, false);
  // Two setbacks and a mechanical crown.
  k.panel(m.concreteDark, 0, height * .55, 0, width + 1.4, 2.4, depth + 1.4, 4);
  k.panel(m.window, 0, height * .82, 0, width * .86, height * .3, depth * .86, 7.8);
  k.block(m.concreteDark, 0, height + 2.4, 0, width * .8, 4.8, depth * .8);
  k.column(m.steel, 0, height + 10, 0, .35, 16, false);
  k.column(m.lampRed, 0, height + 18.4, 0, .16, .4, false);
  // Entrance canopy and podium shopfronts at street level.
  k.block(m.steelDark, 0, 5.4, depth / 2 + 2.2, width * .5, .4, 5);
  k.block(m.glass, 0, 3, depth / 2 + .2, width * .46, 5.6, .12, 0, false);
  for (let x = -width / 2 + 3; x < width / 2; x += 4) k.column(m.aluminum, x, 3, depth / 2 + 3.4, .14, 5.6, false);
  if (options.crane) k.withFrame(width * .38, height, 0, .4, () => towerCrane(ctx.t, {height: 44, jib: 38, color: 0xd7b23c}));
}

export function tower(ctx: BiomeContext) {
  const {t, floor, laneZ, span, start, end} = ctx;

  // Street grid and blocks far below the route.
  t.k.detail = 'far';
  t.k.plate(t.m.asphalt, 0, floor + .04, laneZ - 60, span + 900, .16, 520, {}, 10, false);
  for (let x = start - 100; x < end + 100; x += 70) t.k.block(t.m.paintedWhite, x, floor + .14, laneZ - 60, .35, .02, 480, 0, false);
  for (let z = -300; z < 160; z += 60) t.k.block(t.m.paintedWhite, 0, floor + .14, laneZ + z, span + 900, .02, .3, 0, false);

  // Paired towers behind the route, with sky bridges between them.
  along(span, 260, (x, index) => {
    t.k.detail = 'far';
    t.k.withFrame(x - 70, floor, laneZ - 118, .06, () => superTower(ctx, {height: 168 + (index % 3) * 36, crane: index % 2 === 0}));
    t.k.withFrame(x + 24, floor, laneZ - 172, -.08, () => superTower(ctx, {height: 132 + (index % 2) * 54, width: 26, depth: 24}));
    // Sky bridge between the pair at mid height.
    const bridgeLength = Math.hypot(94, 54), bridgeYaw = Math.atan2(54, 94);
    t.k.block(t.m.glass, x - 23, floor + 74, laneZ - 145, bridgeLength, 6, 8, bridgeYaw);
    t.k.block(t.m.steel, x - 23, floor + 71, laneZ - 145, bridgeLength, .8, 8.4, bridgeYaw, false);
    t.k.block(t.m.steel, x - 23, floor + 77, laneZ - 145, bridgeLength, .8, 8.4, bridgeYaw, false);
    t.k.detail = 'mid';
    t.k.withFrame(x + 60, floor, laneZ - 60, 0, () => officeBlock(t, {floors: 3, length: 26, sign: 'DECK CONTROL'}));
    t.k.withFrame(x + 96, floor, laneZ - 74, 0, () => warehouse(t, {length: 36, width: 18, color: 0xb6bdbb, sign: 'SERVICE DECK'}));
    t.k.withFrame(x + 124, floor, laneZ - 92, 0, () => tankFarm(t, {count: 2}));
  });

  // Route-level service hardware: gantries, safety rails and work lights.
  along(span, 210, (x, index) => {
    t.k.detail = 'mid';
    roadGantry(ctx, x, {span: 11, label: index % 2 ? 'DECK 07' : 'VERTICAL LINK', caption: index % 2 ? 'SERVICE LIFT' : 'CLEARANCE 5.5 M'});
    roadProp(ctx, x + 70, 6, () => warningBoard(t, 'MIND THE EDGE', 'FALL ARREST ZONE', 3), 4.5);
  });
  along(span, 120, (x, index) => {
    t.k.detail = 'near';
    roadRail(ctx, x, 22, 1);
    roadRail(ctx, x, 22, -1);
    t.k.withFrame(x + 24, floor, laneZ - 12, 0, () => portableLight(t));
    if (index % 2 === 0) t.k.withFrame(x + 40, floor, laneZ - 8, 0, () => cameraMast(t));
    if (index % 3 === 0) for (let i = 0; i < 3; i++) roadProp(ctx, x + 52 + i * 3, 4.5, () => trafficCone(t));
  });

  // Street furniture at the bottom of the frame.
  t.k.detail = 'mid';
  along(span, 190, x => {
    t.k.withFrame(x, floor, laneZ + 18, 0, () => lightMast(t, {height: 12}));
    t.k.withFrame(x + 40, floor, laneZ + 24, 0, () => billboard(t, {label: 'VERTIGO', caption: 'MEGASTRUCTURE 07'}));
    t.k.withFrame(x + 76, floor, laneZ + 30, 0, () => serviceTruck(t));
    t.k.withFrame(x + 100, floor, laneZ + 22, 0, () => containerBlock(t, {rows: 2, lanes: 2, tiers: 2, seed: 31}));
    t.k.withFrame(x + 130, floor, laneZ + 34, 0, () => fence(t, 44, 2.2));
  });
  t.k.withFrame(end - 90, floor, laneZ - 80, 0, () => radarDish(t, {radius: 5}));
}
