import type {Level} from '../../../game/types';
import {biomeForLevel} from './index';
import type {BiomeId} from './types';

/**
 * Per-biome atmosphere.
 *
 * The engine used to derive sky, fog and sun from the three ground themes, which
 * is why a night container port and a sunlit proving ground could share a
 * palette. Each biome now owns its own air: horizon colour, fog density, sun
 * tint/intensity and tone-mapping exposure.
 */
export type Atmosphere = {
  sky: boolean;
  background: string;
  fogColor: string;
  fogDensity: number;
  topColor: string;
  horizonColor: string;
  sunColor: string;
  sunTint: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  exposure: number;
  night: boolean;
};

const PRESETS: Record<BiomeId, Atmosphere> = {
  desert: {
    sky: true, background: '#b6a18b', fogColor: '#c9b7a1', fogDensity: .0032,
    topColor: '#657e94', horizonColor: '#e6c39c', sunColor: '#ffe0b8', sunTint: '#ffe0b8', sunIntensity: 3.8,
    hemiSky: '#dbe5ef', hemiGround: '#7d6a52', exposure: 1.12, night: false,
  },
  lab: {
    sky: false, background: '#111b27', fogColor: '#1b2a35', fogDensity: .009,
    topColor: '#243646', horizonColor: '#43586a', sunColor: '#d6eaf5', sunTint: '#d6eaf5', sunIntensity: 2.6,
    hemiSky: '#c9dce8', hemiGround: '#2a333a', exposure: 1.02, night: false,
  },
  canyon: {
    sky: true, background: '#7e94a2', fogColor: '#a2b2bc', fogDensity: .0022,
    topColor: '#53758f', horizonColor: '#ccd4d6', sunColor: '#ffe4b5', sunTint: '#ffe4b5', sunIntensity: 3.4,
    hemiSky: '#dbe5ef', hemiGround: '#5b5348', exposure: 1.04, night: false,
  },
  coast: {
    sky: true, background: '#8a8b8a', fogColor: '#b9b3ae', fogDensity: .0034,
    topColor: '#4d6a86', horizonColor: '#f0c49a', sunColor: '#ffd9a6', sunTint: '#ffd9a6', sunIntensity: 3.1,
    hemiSky: '#d8e0e8', hemiGround: '#4f5a58', exposure: 1.08, night: false,
  },
  tower: {
    sky: true, background: '#9aa7ae', fogColor: '#b8c2c6', fogDensity: .003,
    topColor: '#5e7f97', horizonColor: '#d9d6c9', sunColor: '#ffe7c2', sunTint: '#ffe7c2', sunIntensity: 3.2,
    hemiSky: '#dfe7ec', hemiGround: '#5b6167', exposure: 1.04, night: false,
  },
  harbor: {
    sky: false, background: '#0d1720', fogColor: '#182832', fogDensity: .0034,
    topColor: '#0f1c2b', horizonColor: '#2c4453', sunColor: '#8fb4c9', sunTint: '#93b8cc', sunIntensity: .9,
    hemiSky: '#54708a', hemiGround: '#141d23', exposure: .98, night: true,
  },
  tunnel: {
    sky: false, background: '#05090c', fogColor: '#0c1317', fogDensity: .015,
    topColor: '#0b1418', horizonColor: '#1a2429', sunColor: '#6b7f8c', sunTint: '#6b7f8c', sunIntensity: .4,
    hemiSky: '#2b3a42', hemiGround: '#0c1013', exposure: .9, night: true,
  },
  windfarm: {
    sky: true, background: '#93a09a', fogColor: '#b5c1b8', fogDensity: .0028,
    topColor: '#5c7f96', horizonColor: '#d7d8c9', sunColor: '#ffeac8', sunTint: '#ffeac8', sunIntensity: 3.6,
    hemiSky: '#dde8e5', hemiGround: '#4f5648', exposure: 1.06, night: false,
  },
  anchor: {
    sky: true, background: '#8b93a0', fogColor: '#b3b9c4', fogDensity: .0024,
    topColor: '#47637f', horizonColor: '#e8c9ad', sunColor: '#ffdcb2', sunTint: '#ffdcb2', sunIntensity: 3,
    hemiSky: '#d5dee7', hemiGround: '#4a4a4d', exposure: 1.06, night: false,
  },
  terminus: {
    sky: true, background: '#7d8a93', fogColor: '#a9b3b8', fogDensity: .003,
    topColor: '#3f5f7c', horizonColor: '#e8bf95', sunColor: '#ffd8a8', sunTint: '#ffd8a8', sunIntensity: 2.9,
    hemiSky: '#d6dfe6', hemiGround: '#4d4c4a', exposure: 1.08, night: false,
  },
};

export function atmosphereFor(level: Level): Atmosphere {
  return PRESETS[biomeForLevel(level)];
}
