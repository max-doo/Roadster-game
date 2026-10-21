import * as THREE from 'three';
import type { Registry } from './registry';
import type { SurfaceTextures } from '../surfaceTextures';

/**
 * Shared material library.
 *
 * Textures are either generated at runtime (canvas) or come from the three local
 * CC0 scans already shipped in `public/textures/environment`. Nothing is fetched
 * from a third party at play time, so the kit adds no licence surface and no
 * network weight.
 */

function canvas(registry: Registry, width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat = true) {
  const element = document.createElement('canvas');
  element.width = width; element.height = height;
  const ctx = element.getContext('2d')!;
  draw(ctx);
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return registry.texture(texture);
}

/** Vertically ribbed profiled steel cladding; one tile spans about 2.4 m. */
function corrugatedMap(registry: Registry) {
  return canvas(registry, 128, 256, ctx => {
    ctx.fillStyle = '#b9bcbc'; ctx.fillRect(0, 0, 128, 256);
    for (let x = 0; x < 128; x += 16) {
      const gradient = ctx.createLinearGradient(x, 0, x + 16, 0);
      gradient.addColorStop(0, '#8e9394'); gradient.addColorStop(.35, '#d7d9d8');
      gradient.addColorStop(.62, '#c7cac9'); gradient.addColorStop(1, '#7f8586');
      ctx.fillStyle = gradient; ctx.fillRect(x, 0, 16, 256);
    }
    for (let y = 0; y < 256; y += 64) { ctx.fillStyle = 'rgba(48,58,62,.22)'; ctx.fillRect(0, y, 128, 2); }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(60,54,48,${.02 + (i % 5) * .012})`;
      ctx.fillRect((i * 37) % 128, (i * 61) % 256, 2, 10 + (i % 7) * 6);
    }
  });
}

/** Container skin: corrugation, corner castings, door hardware and stencil marks. */
function containerMap(registry: Registry, variant: number) {
  return canvas(registry, 512, 256, ctx => {
    ctx.fillStyle = '#c9cdce'; ctx.fillRect(0, 0, 512, 256);
    for (let x = 0; x < 512; x += 20) {
      const gradient = ctx.createLinearGradient(x, 0, x + 20, 0);
      gradient.addColorStop(0, '#9aa1a2'); gradient.addColorStop(.4, '#e2e5e4'); gradient.addColorStop(1, '#8f9697');
      ctx.fillStyle = gradient; ctx.fillRect(x, 0, 20, 256);
    }
    ctx.strokeStyle = 'rgba(52,62,66,.55)'; ctx.lineWidth = 6; ctx.strokeRect(10, 10, 492, 236);
    for (const x of [10, 490]) for (const y of [10, 234]) { ctx.fillStyle = 'rgba(44,52,56,.75)'; ctx.fillRect(x - 5, y - 5, 18, 18); }
    if (variant % 2 === 0) {
      ctx.fillStyle = 'rgba(36,44,48,.5)'; ctx.fillRect(392, 14, 6, 228); ctx.fillRect(448, 14, 6, 228);
      for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(38,46,50,.6)'; ctx.fillRect(400 + i * 12, 40, 4, 40); ctx.fillRect(400 + i * 12, 176, 4, 40); }
      ctx.fillStyle = 'rgba(232,238,232,.85)'; ctx.font = '600 26px "Barlow Condensed", sans-serif';
      ctx.fillText(variant === 0 ? 'GBRU 204118 2' : 'TRLU 552907 7', 34, 190);
      ctx.font = '500 18px "Barlow Condensed", sans-serif';
      ctx.fillText('MAX GROSS 30 480 KG', 34, 216); ctx.fillText('TARE 3 780 KG', 34, 236);
    } else {
      ctx.fillStyle = 'rgba(228,234,228,.8)'; ctx.font = '600 24px "Barlow Condensed", sans-serif';
      ctx.fillText('AEROSPACE CARGO', 40, 196); ctx.fillText('DO NOT STACK', 40, 224);
      ctx.fillStyle = 'rgba(214,162,86,.9)'; ctx.fillRect(40, 34, 96, 8); ctx.fillRect(40, 50, 64, 8);
    }
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `rgba(46,50,44,${.02 + (i % 4) * .015})`;
      ctx.fillRect((i * 71) % 512, (i * 43) % 256, 3 + (i % 9), 2);
    }
  });
}

/** Office facade: glazing grid with mullions, baked with a plausible lit/unlit mix. */
function facadeMap(registry: Registry) {
  return canvas(registry, 256, 256, ctx => {
    ctx.fillStyle = '#77848a'; ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
      const x = col * 64 + 8, y = row * 64 + 10, w = 48, h = 42;
      const lit = (row * 4 + col) % 5 === 0;
      const gradient = ctx.createLinearGradient(x, y, x, y + h);
      gradient.addColorStop(0, lit ? '#f0dcb4' : '#27373f'); gradient.addColorStop(1, lit ? '#c9a978' : '#16232a');
      ctx.fillStyle = gradient; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(214,222,222,.42)'; ctx.lineWidth = 3; ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = 'rgba(228,232,230,.35)'; ctx.fillRect(x + w / 2 - 1, y, 2, h);
    }
    for (let row = 0; row < 4; row++) { ctx.fillStyle = 'rgba(238,238,232,.28)'; ctx.fillRect(0, row * 64 + 56, 256, 5); }
  }, false);
}

function hazardMap(registry: Registry) {
  return canvas(registry, 128, 128, ctx => {
    ctx.fillStyle = '#d9a24e'; ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#1d262c';
    for (let i = -128; i < 256; i += 64) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 32, 0); ctx.lineTo(i + 96, 128); ctx.lineTo(i + 64, 128); ctx.fill(); }
  });
}

export type MaterialSet = ReturnType<typeof createMaterials>;

export function createMaterials(registry: Registry, surfaces: SurfaceTextures, night: boolean) {
  const own = <T extends THREE.Material>(m: T) => registry.material(m);
  const std = (color: number, metalness: number, roughness: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => own(new THREE.MeshStandardMaterial({color, metalness, roughness, ...extra}));
  const emit = (color: number, intensity: number) => std(color, .1, .4, {emissive: color, emissiveIntensity: intensity});

  const corrugated = corrugatedMap(registry);
  const facade = facadeMap(registry);
  const containerA = containerMap(registry, 0);
  const containerB = containerMap(registry, 1);
  const hazard = hazardMap(registry);

  const concrete = std(0xb6c1c4, .06, .9);
  surfaces.apply(concrete, 'concrete', .18);

  const concreteDark = std(0x828d91, .06, .92);
  surfaces.apply(concreteDark, 'concrete', .12);

  const asphalt = std(0x50575a, .1, .95);
  surfaces.apply(asphalt, 'concrete', .1);

  const rockCache = new Map<number, THREE.MeshStandardMaterial>();
  /** Flat-shaded matte rock: geological masses must never read as glossy clay. */
  const rock = (color: number) => {
    const cached = rockCache.get(color);
    if (cached) return cached;
    const material = std(color, .02, .96, {flatShading: true});
    rockCache.set(color, material);
    return material;
  };

  const paintCache = new Map<number, THREE.MeshStandardMaterial>();
  function paint(color: number) {
    const cached = paintCache.get(color);
    if (cached) return cached;
    const material = std(color, .45, .42);
    paintCache.set(color, material);
    return material;
  }

  const windowMaterial = std(0xc9d2d2, .04, .52, {map: facade, emissiveMap: facade, emissive: 0xffe9c2, emissiveIntensity: night ? 1.05 : .1});

  return {
    concrete, concreteDark, asphalt,
    steel: std(0x2b3b46, .78, .42),
    steelDark: std(0x1a262e, .7, .5),
    aluminum: std(0x9aa3a4, .82, .32),
    galvanized: std(0x8d9799, .7, .5),
    paintedWhite: std(0xd9dcda, .3, .5),
    graphite: std(0x151f27, .5, .62),
    rubber: std(0x14181b, .02, .95),
    rust: std(0x7a5340, .35, .82),
    glass: std(0x223640, .62, .12),
    window: windowMaterial,
    corrugatedWhite: std(0xffffff, .45, .42, {map: corrugated}),
    /** Two-sided cladding for arched shells (hangars, tunnel linings). */
    shell: std(0xe6e9e6, .4, .55, {map: corrugated, side: THREE.DoubleSide}),
    corrugatedPaint: (color: number) => own(new THREE.MeshStandardMaterial({color, metalness: .45, roughness: .45, map: corrugated})),
    container: (variant: number) => {
      // Six liveries share two scanned-style skins: a working yard is never one colour.
      const palette = [0x3f7c8c, 0x9c4f38, 0x4f7a52, 0xb5813c, 0x546a8c, 0x8c8f92];
      const color = palette[Math.abs(variant) % palette.length];
      return own(new THREE.MeshStandardMaterial({color, metalness: .42, roughness: .48, map: variant % 2 === 0 ? containerA : containerB}));
    },
    hazardTape: std(0xffffff, .3, .6, {map: hazard}),
    lampCyan: emit(0x9fe8f3, 1.6),
    lampWhite: emit(0xf2efe2, 1.5),
    lampAmber: emit(0xf0a55f, 1.5),
    lampRed: emit(0xe0594a, 1.4),
    rock,
    paint,
  };
}
