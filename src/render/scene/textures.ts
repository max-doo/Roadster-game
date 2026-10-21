import * as THREE from 'three';
import type { Registry } from './registry';

/**
 * Small cached text/decal textures for industrial signage.
 * Cached by content so repeating labels (bay numbers, gate plates) cost one
 * texture and one material across a whole level.
 */
export type TextureFactory = ReturnType<typeof createTextureFactory>;

type SignOptions = {
  width?: number;
  height?: number;
  background?: string;
  color?: string;
  /** Emissive signage for night levels. */
  glow?: number;
  align?: 'left' | 'center';
  caption?: string;
};

export function createTextureFactory(registry: Registry) {
  const cache = new Map<string, THREE.Material>();

  function sign(label: string, options: SignOptions = {}) {
    const width = options.width ?? 512, height = options.height ?? 128;
    const background = options.background ?? '#15222b';
    const color = options.color ?? '#d5e0dd';
    const key = `sign:${label}:${width}:${height}:${background}:${color}:${options.glow ?? 0}:${options.align ?? 'left'}:${options.caption ?? ''}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const element = document.createElement('canvas');
    element.width = width; element.height = height;
    const ctx = element.getContext('2d')!;
    ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
    // Fine border and rule: industrial plates read as fabricated, not printed.
    ctx.strokeStyle = 'rgba(210,224,222,.22)'; ctx.lineWidth = Math.max(2, width * .006);
    ctx.strokeRect(width * .012, height * .06, width * .976, height * .88);
    const align = options.align ?? 'left';
    const inset = align === 'center' ? width / 2 : width * .05;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    let size = Math.floor(height * (options.caption ? .42 : .54));
    ctx.font = `600 ${size}px "Barlow Condensed", "Microsoft YaHei", sans-serif`;
    while (ctx.measureText(label).width > width * .9 && size > 8) { size--; ctx.font = `600 ${size}px "Barlow Condensed", "Microsoft YaHei", sans-serif`; }
    ctx.fillStyle = color;
    ctx.fillText(label, inset, height * (options.caption ? .4 : .52));
    if (options.caption) {
      ctx.font = `500 ${Math.floor(height * .16)}px "Barlow", "Microsoft YaHei", sans-serif`;
      ctx.fillStyle = 'rgba(196,212,212,.66)';
      ctx.fillText(options.caption, inset, height * .72);
    }
    const texture = new THREE.CanvasTexture(element);
    texture.colorSpace = THREE.SRGBColorSpace;
    registry.texture(texture);
    const material = registry.material(new THREE.MeshStandardMaterial({
      map: texture, roughness: .55, metalness: .15,
      emissive: new THREE.Color(options.glow ? color : '#000000'),
      emissiveMap: options.glow ? texture : null,
      emissiveIntensity: options.glow ?? 0,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
    cache.set(key, material);
    return material;
  }

  /** Flat livery used on tank shells and viaduct girders. */
  function livery(text: string, color = '#2c3a42') {
    return sign(text, {width: 512, height: 96, background: color, color: '#e2e8e2', align: 'center'});
  }

  return {sign, livery};
}
