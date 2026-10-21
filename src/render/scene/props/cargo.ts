import {CONTAINER} from '../units';
import {plateSign} from './tools';
import type {Tools} from './tools';

/** ISO freight containers, yard cargo and the plant that moves it. */

/**
 * A single ISO container, origin at ground level of its centre, length along X.
 * Corner castings, door hardware and rails are modelled because they are the
 * parts that make the box read as 2.59 m tall next to a 1.16 m car.
 */
export function isoContainer(t: Tools, options: {length?: number; variant?: number; height?: number; shadow?: boolean} = {}) {
  const {k, m} = t;
  const length = options.length ?? CONTAINER.ft20.length;
  const width = CONTAINER.ft20.width;
  const height = options.height ?? CONTAINER.ft20.height;
  const skin = m.container(options.variant ?? 0);
  const shadow = options.shadow ?? true;

  k.panel(skin, 0, height / 2, 0, length - .16, height - .16, width - .16, length, 0, shadow);
  const near = k.detail === 'near';
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    k.block(m.steelDark, sx * (length / 2 - .1), near ? .1 : height * .12, sz * (width / 2 - .1), .2, near ? .2 : height * .24, .2, 0, false);
    if (near) k.block(m.steelDark, sx * (length / 2 - .1), height - .1, sz * (width / 2 - .1), .2, .2, .2, 0, false);
    k.block(m.steelDark, sx * (length / 2 - .1), height / 2, sz * (width / 2 - .04), .16, height - .2, .1, 0, false);
  }
  if (near) {
    // Top and bottom side rails, door bars and handles: near-field only.
    for (const sz of [-1, 1]) {
      k.block(m.steelDark, 0, height - .05, sz * (width / 2 - .04), length - .1, .12, .1, 0, false);
      k.block(m.steelDark, 0, .05, sz * (width / 2 - .04), length - .1, .12, .1, 0, false);
    }
    k.block(m.steelDark, -length / 2 - .01, height / 2, 0, .04, height - .18, width - .1, 0, false);
    for (const z of [-width * .24, -width * .08, width * .08, width * .24]) {
      k.block(m.galvanized, -length / 2 - .05, height / 2, z, .05, height - .3, .05, 0, false);
      k.block(m.galvanized, -length / 2 - .09, height * .34, z + width * .04, .05, .07, .16, 0, false);
    }
  }
}

/** A yard block: rows along X, lanes along Z, stacked tiers. */
export function containerBlock(t: Tools, options: {rows?: number; lanes?: number; tiers?: number; seed?: number; length?: number} = {}) {
  const rows = options.rows ?? 4, lanes = options.lanes ?? 5, tiers = options.tiers ?? 3;
  const length = options.length ?? CONTAINER.ft40.length;
  let state = (options.seed ?? 11) * 2654435761 >>> 0;
  const next = () => {state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296;};
  for (let row = 0; row < rows; row++) {
    const x = (row - (rows - 1) / 2) * (length + .35);
    const tierCount = 1 + Math.floor(next() * tiers);
    for (let lane = 0; lane < lanes; lane++) {
      const z = (lane - (lanes - 1) / 2) * (CONTAINER.ft20.width + .18);
      const stack = Math.max(1, tierCount - (next() < .25 ? 1 : 0));
      for (let tier = 0; tier < stack; tier++) {
        t.k.withFrame(x, tier * CONTAINER.ft20.height, z, 0, () => isoContainer(t, {length, variant: row * 3 + lane * 2 + tier, shadow: tier > 0 || row % 2 === 0}));
      }
    }
  }
}

/** Wooden pallet, 1.2 x 0.8 m, optionally stacked with cartons. */
export function pallet(t: Tools, options: {cargo?: boolean} = {}) {
  const {k, m} = t;
  const {length, width, height} = CONTAINER.pallet;
  for (let i = 0; i < 5; i++) k.block(m.paint(0x9c8158), 0, height - .018, -width / 2 + .09 + i * (width - .18) / 4, length, .032, .09, 0, false);
  for (const z of [-width / 2 + .08, 0, width / 2 - .08]) k.block(m.paint(0x826a47), 0, height / 2, z, length, height - .04, .1, 0, false);
  if (options.cargo) {
    k.block(m.paint(0xb59a70), 0, height + .32, 0, length - .1, .64, width - .08, 0, false);
    k.block(m.hazardTape, 0, height + .64, 0, length - .2, .02, .06, 0, false);
  }
}

/** 200 litre steel drum, 0.58 m x 0.88 m. */
export function drum(t: Tools, options: {color?: number} = {}) {
  const {k, m} = t;
  k.column(m.paint(options.color ?? 0x4a6b74), 0, .44, 0, .29, .88);
  for (const y of [.24, .44, .64]) k.torus(m.steel, 0, y, 0, .295, .022, 'xz', false);
  k.column(m.steel, 0, .885, 0, .27, .02, false);
  k.column(m.steel, .13, .9, 0, .045, .024, false);
  k.block(m.hazardTape, 0, .5, .291, .26, .16, .01, 0, false);
}

/** Truck tyre stack, 1.05 m across and 1.8 m high when stacked. */
export function tyreStack(t: Tools, options: {count?: number} = {}) {
  const {k, m} = t;
  const count = options.count ?? 6;
  for (let i = 0; i < count; i++) k.torus(m.rubber, 0, .17 + i * .29, 0, .52, .17, 'xz', true);
}

/** Cable spool on a timber trestle. */
export function cableSpool(t: Tools) {
  const {k, m} = t;
  for (const side of [-1, 1]) k.column(m.paint(0x9b7c55), side * .8, 1.05, 0, 1.1, .12);
  k.column(m.paint(0x6b5c48), 0, 1.05, 0, .55, 1.62);
  for (const side of [-1, 1]) k.block(m.paint(0x8a7351), side * 1.05, .18, 0, .9, .18, 1.9, 0, false);
  k.beam(m.steel, [0, .3, 0], [0, .95, 0], .04, false);
}

/** Counterbalance forklift, 2.4 m long with its forks retracted. */
export function forklift(t: Tools, options: {color?: number} = {}) {
  const {k, m} = t;
  const body = m.paint(options.color ?? 0xc79a3f);
  k.rounded(body, -.2, .85, 0, 1.7, .9, 1.1, .08);
  k.block(m.steelDark, -.85, .8, 0, .5, 1.1, 1.1, 0, false);
  k.block(m.rubber, .45, .78, 0, .5, .5, .95, 0, false);
  k.block(body, .5, 1.55, 0, .7, .1, 1.05, 0, false);
  for (const z of [-.42, .42]) k.block(m.steel, .18, 1.7, z, .07, .12, .07, 0, false);
  k.block(m.steel, .0, 1.82, 0, .1, .1, .95, 0, false);
  // Mast and fork carriage.
  for (const z of [-.28, .28]) k.block(m.steelDark, .62, 1.05, z, .1, 2.1, .1, 0, false);
  k.block(m.steel, .68, .28, 0, .08, .2, 1.05, 0, false);
  for (const z of [-.3, .3]) k.block(m.steel, .95, .2, z, 1, .07, .12, 0, false);
  for (const x of [-.55, .35]) for (const z of [-.5, .5]) {
    k.tubeZ(m.rubber, x, .36, z, .36, .26, false);
    k.tubeZ(m.aluminum, x, .36, z + Math.sign(z) * .14, .17, .02, false);
  }
}

/** Container reach stacker: 10 m of boom and a raised spreader. */
export function reachStacker(t: Tools, options: {color?: number} = {}) {
  const {k, m} = t;
  const body = m.paint(options.color ?? 0x9d7d2f);
  k.rounded(body, -.6, 1.3, 0, 5.4, 1.6, 2.6, .12);
  k.rounded(m.glass, 1.1, 2.2, 0, 1.9, 1.5, 2.2, .1, false);
  k.block(body, -2.6, 1.5, 0, 1.6, 1.4, 2.5, 0, false);
  k.block(m.steelDark, -.6, .55, 0, 3.4, .5, 2.2, 0, false);
  for (const x of [-2.2, 1.3]) for (const z of [-1.15, 1.15]) k.tubeZ(m.rubber, x, .62, z, .62, .42, false);
  k.beam(body, [.6, 2.1, 0], [4.4, 3.6, 0], .35);
  k.beam(m.steel, [3.4, 3.2, 0], [5.1, 2.6, 0], .16, false);
  k.block(m.hazardTape, 5.3, 2.4, 0, .8, .5, 2.5, 0, false);
}

/** Open timber crate with batten framing. */
export function crate(t: Tools, options: {size?: number} = {}) {
  const {k, m} = t;
  const size = options.size ?? 1.8;
  k.block(m.paint(0xa8834f), 0, size / 2, 0, size, size, size, 0);
  for (const y of [size * .18, size * .82]) for (const face of [-1, 1]) {
    k.block(m.paint(0x8b6b3f), 0, y, face * (size / 2 + .01), size, .12, .03, 0, false);
    k.block(m.paint(0x8b6b3f), face * (size / 2 + .01), y, 0, .03, .12, size, 0, false);
  }
  k.block(m.hazardTape, 0, size * .5, size / 2 + .02, size * .5, size * .2, .02, 0, false);
}

/** Instrumented target board from the proving ground. */
export function targetBoard(t: Tools, options: {label?: string} = {}) {
  const {k, m, tex} = t;
  for (const x of [-1.6, 1.6]) k.column(m.steel, x, 1.1, 0, .09, 2.2);
  k.block(m.paintedWhite, 0, 2.1, 0, 4, 2.4, .14);
  k.block(m.paint(0xb8452f), 0, 2.1, .08, 3.4, 1.8, .03, 0, false);
  k.block(m.paintedWhite, 0, 2.1, .1, 1.2, 1.2, .03, 0, false);
  k.block(m.paint(0xb8452f), 0, 2.1, .12, .5, .5, .03, 0, false);
  if (options.label) plateSign(t, tex.livery(options.label), 0, 2.55, .08, 3.2, .4);
}

/** Arrow board trailer used to close a lane. */
export function warningTrailer(t: Tools) {
  const {k, m} = t;
  k.block(m.steelDark, 0, .55, 0, 3.4, .25, 1.7, 0, false);
  for (const z of [-.85, .85]) k.tubeZ(m.rubber, .7, .34, z, .34, .28, false);
  k.column(m.steel, -1.2, .95, 0, .08, .8);
  k.block(m.paint(0xd9a24e), 0, 1.7, 0, 2.6, 1.3, .16, 0, false);
  for (let i = 0; i < 5; i++) {
    k.block(m.lampAmber, -.7 + i * .42, 1.9, .1, .12, .12, .04, 0, false);
    k.block(m.lampAmber, -.9 + i * .42, 1.55, .1, .12, .12, .04, 0, false);
  }
  k.block(m.hazardTape, 0, .2, 0, 1.6, .3, .18, 0, false);
}

/** Parked service pick-up used as a scale reference beside buildings. */
export function serviceTruck(t: Tools, options: {color?: number} = {}) {
  const {k, m} = t;
  const body = m.paint(options.color ?? 0xb9bcb4);
  k.rounded(body, .1, .85, 0, 4.9, .75, 1.9, .08);
  k.rounded(body, 1.75, 1.25, 0, 2.3, .7, 1.85, .08);
  k.block(m.glass, 2.35, 1.42, 0, .06, .55, 1.7, 0, false);
  k.rounded(body, -1.1, 1.35, 0, 2.1, .55, 1.85, .08);
  k.block(m.steelDark, -1.1, 1.55, 0, 1.6, .18, 1.55, 0, false);
  for (const x of [1.5, -1.4]) for (const z of [-.92, .92]) k.tubeZ(m.rubber, x, .4, z, .4, .26, false);
  k.block(m.lampWhite, 2.3, .92, 0, .08, .16, 1.2, 0, false);
  k.block(m.lampRed, -1.55, .95, 0, .08, .14, 1.2, 0, false);
}
