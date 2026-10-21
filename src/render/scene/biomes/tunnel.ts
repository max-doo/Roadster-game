import {roadRail, roadProp, roadGantry} from './roadside';
import * as THREE from 'three';
import {TUNNEL} from '../units';
import {along, band} from './types';
import type {BiomeContext} from './types';
import {lightMast, warningBoard} from '../props';

/**
 * BLACKOUT TUNNEL — level 7.
 *
 * The game camera looks at the car from the side, so a fully enclosed bore would
 * hide the vehicle behind its own near wall. The corridor is therefore authored
 * as a real rock gallery / avalanche shed: a full mountain wall on the far side,
 * a roof slab cantilevered over the carriageway and a row of columns on the
 * valley side. That is a standard Alpine motorway structure, keeps the car in
 * view between the columns, and still gives 7.2 m of clearance and a blacked-out
 * ceiling. Lining, kerbs, cable trays, jet fans and cross-passages are modelled.
 */
export function tunnel(ctx: BiomeContext) {
  const {t, level, floor, start, end, laneZ} = ctx;
  const {roadWidth} = TUNNEL;
  const wallZ = -roadWidth / 2 - 1.1;
  const columnZ = roadWidth / 2 + 1.4;
  const crown = 7.2;

  const sections: {x: number; y: number; z: number; yaw: number; length: number}[] = [];
  for (const track of level.tracks) {
    // Recovery aprons are included: the camera sees them between stages, and an
    // unlined gap would expose the exterior of the gallery.
    if (track.kind || track.optional) continue;
    for (let i = 1; i < track.points.length; i++) {
      const a = track.points[i - 1], b = track.points[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const length = Math.hypot(dx, dy);
      if (length < 6) continue;
      const yaw = Math.atan2(dy, dx);
      const steps = Math.ceil(length / 6);
      for (let s = 0; s < steps; s++) {
        const u = (s + .5) / steps;
        sections.push({x: a.x + dx * u, y: a.y + dy * u, z: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * u, yaw, length: length / steps});
      }
    }
  }

  const fanHousing = t.k.keyed('jet-fan-housing', () => new THREE.CylinderGeometry(TUNNEL.jetFan.diameter / 2, TUNNEL.jetFan.diameter / 2, TUNNEL.jetFan.length, 14, 1, true));
  const fanBlades = t.k.keyed('jet-fan-blades', () => new THREE.CylinderGeometry(.14, .14, TUNNEL.jetFan.diameter * .8, 8, 1));

  sections.forEach((section, index) => {
    t.k.detail = index % 3 === 0 ? 'near' : 'mid';
    t.k.withFrame(section.x, section.y, section.z, 0, () => {
      const span = section.length + .4;
      // Transverse cantilevers carry the gallery columns beyond the road edge.
      t.k.block(t.m.steel, 0, -.35, -.3, .8, .7, roadWidth + 4, 0, false);
      // Mountain-side wall, kerb and cable trays.
      t.k.panel(t.m.concreteDark, 0, crown / 2, wallZ, span, crown, .7, 2.4, 0, index % 2 === 0);
      t.k.block(t.m.concrete, 0, .12, -roadWidth / 2 - .1, span, .24, .5, 0, false);
      for (const y of [4.6, 5.1]) t.k.block(t.m.steel, 0, y, wallZ + .45, span, .1, .12, 0, false);
      t.k.block(t.m.graphite, 0, 5.6, wallZ + .42, span, .22, .28, 0, false);
      // Roof slab cantilevered across the carriageway, with a downstand beam.
      t.k.plate(t.m.concreteDark, 0, crown, -1.1, span, .42, 8.6, {}, 2.4, index % 2 === 0);
      t.k.block(t.m.steel, 0, crown - .52, columnZ - .55, span, .5, .6, 0, false);
      // Valley-side columns with a continuous edge beam.
      t.k.column(t.m.concrete, 0, crown / 2 - .2, columnZ, .22, crown - .4, index % 2 === 0);
      t.k.block(t.m.aluminum, 0, 1.05, columnZ, .5, .12, .5, 0, false);
      t.k.block(t.m.hazardTape, 0, 1.45, columnZ, .5, .6, .5, 0, false);
      // Kerb and reflective delineators on the open side.
      t.k.block(t.m.concrete, 0, .12, roadWidth / 2 - .1, span, .24, .5, 0, false);
      t.k.block(t.m.lampWhite, 0, .62, roadWidth / 2 - .42, .12, .12, .04, 0, false);
      // Ceiling luminaire every ~29 m.
      if (index % 5 === 1) {
        t.k.block(t.m.steelDark, 0, crown - .62, -1.2, 1.4, .22, .5, 0, false);
        t.k.block(t.m.lampAmber, 0, crown - .76, -1.2, 1, .05, .34, 0, false);
      }
      // Emergency cross-passage door in the mountain wall every ~48 m.
      if (index % 8 === 4) {
        t.k.block(t.m.rubber, 0, 1.2, wallZ + .5, 1.3, 2.2, .22, 0, false);
        t.k.block(t.m.lampCyan, 0, 2.75, wallZ + .56, 1.5, .12, .1, 0, false);
        t.k.block(t.m.steel, -.75, 1.2, wallZ + .6, .1, 2.4, .12, 0, false);
        t.k.block(t.m.steel, .75, 1.2, wallZ + .6, .1, 2.4, .12, 0, false);
      }
      // Jet fans hung from the roof every ~72 m.
      if (index % 12 === 7) {
        t.k.mesh(fanHousing, t.m.steel, 0, 5.9, -1.6, new THREE.Euler(0, 0, Math.PI / 2), false);
        t.k.mesh(fanBlades, t.m.steelDark, 0, 5.9, -1.6, new THREE.Euler(0, 0, Math.PI / 2), false);
        for (const x of [-1.2, 1.2]) t.k.beam(t.m.steel, [x, crown - .5, -1.6], [x, 5.9, -1.6], .06, false);
        t.k.block(t.m.steelDark, 0, 6.55, -1.6, 3.2, .16, .7, 0, false);
      }
    }, section.yaw);
  });

  // Portal frames outside the drivable range, opening toward the route.
  for (const section of [sections[0], sections.at(-1)]) {
    if (!section) continue;
    t.k.withFrame(section.x, section.y, section.z, 0, () => {
      t.k.block(t.m.concreteDark, 0, crown / 2, wallZ - .4, 1.4, crown + 1, 1.6);
      t.k.block(t.m.concreteDark, 0, crown + .5, -1.1, 1.4, 1.2, 8.8);
      t.k.block(t.m.concreteDark, 0, crown / 2 - .4, columnZ, 1.4, crown, 1.2);
      t.k.block(t.m.hazardTape, 0, 1.5, columnZ + .65, 1.4, 3, .2, 0, false);
      t.k.block(t.m.lampWhite, 0, crown - .5, -1.1, .8, .16, 6, 0, false);
    }, section.yaw);
  }

  // Buried mass above the gallery so the section reads as cut into rock.
  t.k.detail = 'far';
  ctx.terrain.ridge(start - 160, end + 160, laneZ - 40, crown + 4, 42, 0x4a555c, 2, 34, 'mid');
  ctx.terrain.ridge(start - 200, end + 200, laneZ - 200, floor + 10, 46, 0x59646c, 2, 70, 'far');

  // Surface approach hardware just outside each portal.
  for (const x of [start - 26, end + 26]) {
    for (const side of [-1, 1]) roadRail(ctx, x, 26, side);
    roadGantry(ctx, x, {span: 12, label: 'TUNNEL', caption: 'HEADLIGHTS / 7.2 M'});
    roadProp(ctx, x, -5, () => warningBoard(t, 'BLACKOUT', 'EMERGENCY LIGHTS ONLY', 3.2), 4.5);
  }
  along(end - start, 120, (offset, index) => t.k.withFrame(start + 40 + offset + 60, floor, laneZ + 14, 0, () => lightMast(t, {height: 9})));
  void band;
}
