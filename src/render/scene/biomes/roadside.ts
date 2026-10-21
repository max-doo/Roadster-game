import {guardrail, signGantry} from '../props';
import type {BiomeContext} from './types';

/** Only fixed, upright deck segments can carry static roadside dressing. */
export function roadContact(ctx: BiomeContext, x: number, length = .6, maxGrade = .02) {
  for (const track of ctx.level.tracks) {
    if (track.optional || track.motion || track.stability || track.kind || track.suction) continue;
    for (let i = 1; i < track.points.length; i++) {
      const a = track.points[i - 1], b = track.points[i], dx = b.x - a.x;
      if (dx <= 0 || x - length / 2 < a.x || x + length / 2 > b.x) continue;
      const grade = (b.y - a.y) / dx;
      if (Math.abs(grade) > maxGrade || Math.abs((b.z ?? 0) - (a.z ?? 0)) > .01) continue;
      const u = (x - a.x) / dx;
      return {y: a.y + (b.y - a.y) * u, z: a.z ?? 0, width: track.width ?? 7, grade};
    }
  }
  return null;
}

/** Keep the complete footprint on a flat deck, including its actual lane in Z. */
export function roadProp(ctx: BiomeContext, x: number, side: number, build: () => void, length = .6) {
  const contact = roadContact(ctx, x, length);
  if (!contact) return;
  const z = contact.z + Math.sign(side) * Math.min(Math.abs(side), contact.width / 2 - .65);
  ctx.t.k.withFrame(x, contact.y, z, 0, build);
}

/** Clip each railing to a real segment; never span a jump or a moving slab. */
export function roadRail(ctx: BiomeContext, x: number, length: number, side: number) {
  for (const track of ctx.level.tracks) {
    if (track.optional || track.motion || track.stability || track.kind || track.suction) continue;
    for (let i = 1; i < track.points.length; i++) {
      const a = track.points[i - 1], b = track.points[i], dx = b.x - a.x;
      if (dx <= 0 || Math.abs((b.z ?? 0) - (a.z ?? 0)) > .01) continue;
      const grade = (b.y - a.y) / dx;
      if (Math.abs(grade) > .35) continue;
      const left = Math.max(x - length / 2, a.x + .25), right = Math.min(x + length / 2, b.x - .25);
      if (right - left < 2) continue;
      const center = (left + right) / 2, y = a.y + (center - a.x) * grade;
      const z = (a.z ?? 0) + Math.sign(side) * ((track.width ?? 7) / 2 - .35);
      ctx.t.k.withFrame(center, y, z, 0, () => guardrail(ctx.t, right - left, {grade}));
    }
  }
}

export function roadGantry(ctx: BiomeContext, x: number, options: Parameters<typeof signGantry>[1]) {
  const contact = roadContact(ctx, x, 1.5);
  if (!contact || contact.width < 5) return;
  ctx.t.k.withFrame(x, contact.y, contact.z, 0, () => signGantry(ctx.t, {...options, span: contact.width - 1.5}));
}
