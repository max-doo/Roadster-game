import * as THREE from 'three';

/**
 * Owns every GPU resource the scene kit allocates, so a level swap can release
 * geometries, materials and textures deterministically instead of leaking one
 * set per visit.
 */
export type Registry = {
  geometry<T extends THREE.BufferGeometry>(geometry: T): T;
  material<T extends THREE.Material>(material: T): T;
  texture<T extends THREE.Texture>(texture: T): T;
  readonly geometries: Set<THREE.BufferGeometry>;
  readonly materials: Set<THREE.Material>;
  readonly textures: Set<THREE.Texture>;
  dispose(): void;
};

export function createRegistry(): Registry {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  let disposed = false;
  return {
    geometries, materials, textures,
    geometry(g) {geometries.add(g); return g;},
    material(m) {materials.add(m); return m;},
    texture(t) {textures.add(t); return t;},
    dispose() {
      if (disposed) return;
      disposed = true;
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
      geometries.clear(); materials.clear(); textures.clear();
    },
  };
}
