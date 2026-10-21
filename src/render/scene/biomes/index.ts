import type {Level} from '../../../game/types';
import type {BiomeContext, BiomeId} from './types';
import {desert} from './desert';
import {lab} from './lab';
import {canyon} from './canyon';
import {coast} from './coast';
import {tower} from './tower';
import {harbor} from './harbor';
import {tunnel} from './tunnel';
import {windfarm} from './windfarm';
import {anchor} from './anchor';
import {terminus} from './terminus';

/**
 * Ten authored biomes, one per shipped level.
 *
 * Levels keep their `theme` for ground physics cues (surface material, fog), but
 * scenery is selected by the explicit `scenery` id so two levels sharing a theme
 * never share a backdrop.
 */
const BIOMES: Record<BiomeId, (ctx: BiomeContext) => void> = {
  desert, lab, canyon, coast, tower, harbor, tunnel, windfarm, anchor, terminus,
};

export function biomeForLevel(level: Level): BiomeId {
  if (level.scenery) return level.scenery;
  return level.theme;
}

export function buildBiome(ctx: BiomeContext) {
  BIOMES[biomeForLevel(ctx.level)](ctx);
}

export type {BiomeContext, Terrain} from './types';
