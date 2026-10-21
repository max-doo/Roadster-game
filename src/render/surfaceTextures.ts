import * as THREE from 'three';

/** Local CC0 scans. Color is sRGB; normals and roughness stay linear data. */
export function createSurfaceTextures() {
  const textures = new Map<string, THREE.Texture>();
  const loader = new THREE.TextureLoader();
  let disposed = false;
  function texture(file: string, color = false) {
    const existing = textures.get(file);
    if (existing) return existing;
    const map = loader.load(`${import.meta.env.BASE_URL}textures/environment/${file}`, loaded => {
      if (disposed) loaded.dispose();
    });
    map.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 4;
    textures.set(file, map);
    return map;
  }
  function apply(material: THREE.MeshStandardMaterial, kind: 'concrete' | 'rock' | 'sand', normalStrength = .5) {
    const asset = {concrete: 'concrete_floor_02', rock: 'rock_face_03', sand: 'coast_sand_01'}[kind];
    material.map = texture(`${asset}-Diffuse.webp`, true);
    material.normalMap = texture(`${asset}-nor_gl.webp`);
    material.normalScale.setScalar(normalStrength);
    material.roughnessMap = texture(`${asset}-Rough.webp`);
    material.needsUpdate = true;
  }
  return {apply, dispose() {disposed = true; textures.forEach(t => t.dispose()); textures.clear();}};
}

export type SurfaceTextures = ReturnType<typeof createSurfaceTextures>;
