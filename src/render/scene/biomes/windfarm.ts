import {roadRail, roadProp, roadGantry} from './roadside';
import {along} from './types';
import type {BiomeContext} from './types';
import {
  billboard, broadleaf, cameraMast, conifer, fence, lightMast, metMast, officeBlock,
  powerLine, rockField, serviceTruck, shrub, substation, trafficCone, transmissionPylon,
  warningBoard, warehouse, windTurbine,
} from '../props';

/**
 * CROSSWIND HIGHLAND — level 8.
 *
 * An upland wind farm: 90 m hub-height turbines on two ridge lines, a service
 * road with catenary power lines, a substation compound and conifer shelter
 * belts. Rotor planes face the camera, so a passing tower gives the clearest
 * possible read of the car's 4.65 m length.
 */
export function windfarm(ctx: BiomeContext) {
  const {t, floor, laneZ, span, start, end, random} = ctx;

  t.k.detail = 'far';
  ctx.terrain.ground(0x6c7860, 'rock', floor, laneZ - 110, span + 1100, 800);
  ctx.terrain.ridge(start - 200, end + 200, laneZ - 210, floor, 38, 0x6f7d72, 5, 70, 'far');
  ctx.terrain.ridge(start - 320, end + 320, laneZ - 340, floor + 4, 60, 0x7d8a8a, 2, 100, 'far');

  // The turbine lines. Turbines are authored in world space so their rotors can
  // spin independently of the batched static geometry.
  t.k.detail = 'mid';
  along(span, 210, (x, index) => {
    const near = index % 2 === 0;
    const z = laneZ - (near ? 126 : 178);
    const rotor = windTurbine(t, x, floor, z, 0);
    const phase = index * 1.7;
    ctx.animate(rotor, time => {rotor.rotation.z = time * .55 + phase;});
    if (index % 2 === 0) t.k.withFrame(x + 66, floor, laneZ - 64, 0, () => metMast(t));
  });

  // Service road, culverts and mast line along the ridge.
  t.k.plate(t.m.asphalt, 0, floor + .05, laneZ - 22, span + 120, .16, 9, {}, 6);
  for (let x = start; x < end; x += 18) {
    t.k.block(t.m.paintedWhite, x, floor + .13, laneZ - 22, 5, .02, .14, 0, false);
    t.k.block(t.m.hazardTape, x + 9, floor + .13, laneZ - 17.4, .4, .02, 5, 0, false);
  }
  along(span, 74, (x, index) => {
    t.k.withFrame(x, floor, laneZ - 26, 0, () => cameraMast(t));
    if (index % 2 === 0) t.k.withFrame(x + 30, floor, laneZ - 34, 0, () => serviceTruck(t, {color: 0xa9b2a2}));
  });

  // Power collection: pylons, sagging conductors and the substation.
  for (let x = start; x < end; x += 130) {
    t.k.withFrame(x, floor, laneZ - 120, 0, () => transmissionPylon(t));
    if (x + 130 < end) for (const side of [-1, 1]) powerLine(t, [x, floor + 32.55, laneZ - 120 + side * 6], [x + 130, floor + 32.55, laneZ - 120 + side * 6], 3.2);
  }
  t.k.withFrame(start + span * .55, floor, laneZ - 52, 0, () => substation(t));
  t.k.withFrame(start + span * .55 + 34, floor, laneZ - 44, Math.PI, () => officeBlock(t, {floors: 2, length: 18, sign: 'WIND FARM CONTROL'}));
  t.k.withFrame(start + span * .3, floor, laneZ - 50, 0, () => warehouse(t, {length: 40, width: 20, color: 0xb3bbae, sign: 'O&M BASE'}));

  // Shelter belts on the camera side and scattered rock on the verge.
  t.k.detail = 'mid';
  for (let i = 0; i < Math.ceil(span / 13); i++) {
    const x = start + random() * span;
    const z = laneZ + 8 + random() * 30;
    t.k.withFrame(x, floor, z, random() * 3, () => (random() > .45
      ? conifer(t, {height: 9 + random() * 6, tone: 0x44543f})
      : broadleaf(t, {height: 7 + random() * 5, tone: 0x4c5f42})));
  }
  for (let i = 0; i < Math.ceil(span / 30); i++) {
    const x = start + random() * span;
    t.k.withFrame(x, floor, laneZ - 12 - random() * 14, random() * 3, () => shrub(t, {tone: 0x67744f}));
  }
  for (const x of [start + span * .22, start + span * .68]) {
    t.k.withFrame(x, floor, laneZ - 40, 0, () => rockField(t, {count: 12, spread: 70, seed: Math.round(x), tone: 0x6b6c63}));
  }
  along(span, 46, x => t.k.withFrame(x, floor, laneZ - 38, 0, () => fence(t, 24, 1.6)));

  // Deck-level furniture.
  along(span, 130, (x, index) => {
    t.k.detail = 'near';
    roadRail(ctx, x, 24, 1);
    roadRail(ctx, x, 24, -1);
    if (index % 2 === 0) for (let i = 0; i < 3; i++) roadProp(ctx, x + 16 + i * 3.4, 4.4, () => trafficCone(t));
  });
  along(span, 300, (x, index) => {
    t.k.detail = 'mid';
    roadGantry(ctx, x, {span: 12, label: index % 2 ? 'WIND FARM 07' : 'CROSSWIND', caption: index % 2 ? 'SERVICE ROAD' : 'GUSTS TO 24 M/S'});
    t.k.withFrame(x + 150, floor, laneZ - 16, 0, () => lightMast(t, {height: 10}));
    roadProp(ctx, x + 210, -5, () => warningBoard(t, 'SIDE WIND', 'HOLD YOUR LINE', 3.2), 4.5);
  });
  t.k.withFrame(start + span * .5, floor, laneZ - 22, 0, () => billboard(t, {label: 'CROSSWIND', caption: 'RIDGE 480 M / WIND 18 M/S'}));
}
