import {translate} from '../game/i18n';
import type {Language} from '../game/i18n';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { GameSnapshot, Level, Track, TrackPoint } from '../game/types';
import { createRoadObjects } from './roadObjects';
import { createSurfaceTextures } from './surfaceTextures';
import { createRegistry } from './scene/registry';
import { createMaterials } from './scene/materials';
import { createTextureFactory } from './scene/textures';
import { SceneKit } from './scene/kit';
import { buildBiome, biomeForLevel } from './scene/biomes';
import type { BiomeContext, Terrain } from './scene/biomes/types';

/**
 * Original, runtime-generated architectural assets. Coordinates share the physics
 * plane, and one world unit is one metre: the road is 7 m wide, containers are
 * 6.06 x 2.44 x 2.59 m and the car is 4.65 m long, as in `scene/units.ts`.
 */
export function createEnvironment(level: Level | null,language:Language='zh') {
  const group = new THREE.Group();
  group.name = level ? `environment-${biomeForLevel(level)}` : 'aerospace-hangar';
  const registry = createRegistry();
  const geometries = registry.geometries;
  const materials = registry.materials;
  const textures = registry.textures;
  const surfaces = createSurfaceTextures();
  const night = level?.lighting === 'night' || level?.lighting === 'blackout';
  const matLib = createMaterials(registry, surfaces, !!night);
  const labels = createTextureFactory(registry);
  const kit = new SceneKit(registry, 'biome-dressing');
  const biomeAnimations: ((time: number) => void)[] = [];
  const batches = new Map<string, { geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[]; shadow: boolean }>();
  const roundedGeometries = new Map<string, THREE.BufferGeometry>();
  const turbines:THREE.Group[]=[];
  const animated: { mesh: THREE.Mesh; x: number; phase: number }[] = [];
  const box = ownGeometry(new THREE.BoxGeometry(1, 1, 1));
  const cylinder = ownGeometry(new THREE.CylinderGeometry(1, 1, 1, 10));
  const rockGeometry = ownGeometry(new THREE.IcosahedronGeometry(1, 3));
  // Rounded, irregular erosion forms: shared geometry, never spherical cloud substitutes.
  const rockPositions = rockGeometry.getAttribute('position');
  for (let i = 0; i < rockPositions.count; i++) {
    const x = rockPositions.getX(i), y = rockPositions.getY(i), z = rockPositions.getZ(i);
    const erosion = 1 + Math.sin(x * 5.3 + z * 2.8) * 0.055 + Math.sin(y * 7.1 - z * 3.4) * 0.035;
    rockPositions.setXYZ(i, x * erosion, y * erosion, z * erosion);
  }
  const rockNormals = rockGeometry.getAttribute('normal');
  for (let i = 0; i < rockPositions.count; i++) {
    const length = Math.hypot(rockPositions.getX(i), rockPositions.getY(i), rockPositions.getZ(i));
    rockNormals.setXYZ(i, rockPositions.getX(i) / length, rockPositions.getY(i) / length, rockPositions.getZ(i) / length);
  }
  const dummy = new THREE.Object3D();
  const tempA = new THREE.Vector3();
  const tempB = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let seed = 3217 + (level?.id ?? 0) * 173;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  function ownGeometry<T extends THREE.BufferGeometry>(g: T): T { geometries.add(g); return g; }
  function ownMaterial<T extends THREE.Material>(m: T): T { materials.add(m); return m; }
  function material(color: number, metalness = 0.1, roughness = 0.7, emissive?: number) {
    return ownMaterial(new THREE.MeshStandardMaterial({ color, metalness, roughness, ...(emissive !== undefined ? { emissive, emissiveIntensity: 1.4 } : {}) }));
  }
  // Shared palette: the road surface and the biome props draw from one library.
  const steel = matLib.steel;
  const graphite = matLib.graphite;
  const aluminum = matLib.aluminum;
  const concrete = matLib.concrete;
  const deck = matLib.galvanized;
  const white = matLib.paintedWhite;
  const cyan = matLib.lampCyan;
  const amber = matLib.lampAmber;
  const light = matLib.lampWhite;
  const black = matLib.rubber;

  const hazeMaterials = new Map<number, THREE.MeshStandardMaterial>();
  function hazeMaterial(color: number) {
    const cached = hazeMaterials.get(color);
    if (cached) return cached;
    // Backdrop ridges sit in full sun; pre-darken so ACES exposure keeps the
    // silhouette readable instead of washing to paper white.
    const m = material(color, 0, 1);
    m.color.multiplyScalar(.52);
    hazeMaterials.set(color, m);
    return m;
  }
  function naturalMaterial(color: number, kind: 'rock' | 'sand' = 'rock') {
    const m = material(color, 0, 0.98);
    surfaces.apply(m, kind, kind === 'sand' ? .28 : .8);
    // Distant terrain uses geometric relief. Avoid an unrelated UV normal map under world projection.
    m.normalMap = null;
    m.color.lerp(new THREE.Color(0xffffff), .2);
    m.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vTerrainPosition;');
      shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 terrainPoint = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          terrainPoint = instanceMatrix * terrainPoint;
        #endif
        vTerrainPosition = (modelMatrix * terrainPoint).xyz;`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vTerrainPosition;
        float terrainNoise(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 38.44))) * 43758.5453); }
        float terrainSmooth(vec3 p) {
          vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(terrainNoise(i), terrainNoise(i+vec3(1.,0.,0.)), f.x), mix(terrainNoise(i+vec3(0.,1.,0.)), terrainNoise(i+vec3(1.,1.,0.)), f.x), f.y), mix(mix(terrainNoise(i+vec3(0.,0.,1.)), terrainNoise(i+vec3(1.,0.,1.)), f.x), mix(terrainNoise(i+vec3(0.,1.,1.)), terrainNoise(i+vec3(1.,1.,1.)), f.x), f.y), f.z);
        }`);
      // Project scans in world space so large scaled rocks and ground blocks never stretch UVs.
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        vec3 terrainWeights = pow(abs(inverseTransformDirection(normalize(vNormal), viewMatrix)), vec3(4.0));
        terrainWeights /= max(dot(terrainWeights, vec3(1.0)), 0.001);
        vec3 terrainUV = vTerrainPosition / ${kind === 'sand' ? '10.0' : '16.0'};
        vec3 terrainScan = texture2D(map, terrainUV.zy).rgb * terrainWeights.x
          + texture2D(map, terrainUV.xz).rgb * terrainWeights.y
          + texture2D(map, terrainUV.xy).rgb * terrainWeights.z;
        terrainScan = mix(vec3(dot(terrainScan, vec3(0.2126, 0.7152, 0.0722))), terrainScan, ${level?.theme === 'canyon' ? '0.16' : '0.85'});
        diffuseColor.rgb *= terrainScan;
        float strata = terrainSmooth(vTerrainPosition * vec3(0.10, 1.5, 0.10));
        float broad = terrainSmooth(vTerrainPosition * 0.065);
        float erosion = terrainSmooth(vTerrainPosition * vec3(0.65, 0.055, 0.65));
        float fineGrain = terrainNoise(floor(vTerrainPosition * 42.0));
        diffuseColor.rgb *= 0.88 + broad * 0.10 + strata * 0.035 + erosion * 0.05 + fineGrain * 0.01;`);
      shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
        float terrainRoughness = texture2D(roughnessMap, terrainUV.zy).g * terrainWeights.x
          + texture2D(roughnessMap, terrainUV.xz).g * terrainWeights.y
          + texture2D(roughnessMap, terrainUV.xy).g * terrainWeights.z;
        float roughnessFactor = clamp(roughness * terrainRoughness, 0.72, 1.0);`);
    };
    m.customProgramCacheKey = () => `scanned-terrain-${kind}-${level?.theme ?? 'hangar'}-4`;
    return m;
  }
  function instance(g: THREE.BufferGeometry, m: THREE.Material, position: number[], scale: number[], angle = 0, shadow = true) {
    const key = `${g.uuid}:${m.uuid}:${shadow}`;
    let batch = batches.get(key);
    if (!batch) { batch = { geometry: g, material: m, matrices: [], shadow }; batches.set(key, batch); }
    dummy.position.set(position[0], position[1], position[2]); dummy.scale.set(scale[0], scale[1], scale[2]);
    dummy.rotation.set(0, 0, angle); dummy.updateMatrix(); batch.matrices.push(dummy.matrix.clone());
  }
  function block(m: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, angle = 0, shadow = true) {
    instance(box, m, [x, y, z], [sx, sy, sz], angle, shadow);
  }
  // Actual radii in world units retain deliberate edge highlights on long, shallow industrial modules.
  function rounded(m: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, radius = 0.09, angle = 0) {
    const r = Math.min(radius, Math.min(sx, sy, sz) * 0.24);
    const key = `${sx}:${sy}:${sz}:${r}`;
    let g = roundedGeometries.get(key);
    if (!g) { g = ownGeometry(new RoundedBoxGeometry(sx, sy, sz, 1, r)); roundedGeometries.set(key, g); }
    instance(g, m, [x, y, z], [1, 1, 1], angle);
  }
  function joint(x: number, y: number, z: number, size = 0.8) {
    block(aluminum, x, y, z, size, size, 0.12);
    for (const dx of [-0.27, 0.27]) for (const dy of [-0.27, 0.27]) block(graphite, x + dx * size, y + dy * size, z + 0.075, 0.08, 0.08, 0.045);
  }
  function beam(m: THREE.Material, a: number[], b: number[], radius = 0.16) {
    tempA.fromArray(a); tempB.fromArray(b);
    const delta = tempB.clone().sub(tempA); const length = delta.length();
    dummy.position.copy(tempA).add(tempB).multiplyScalar(0.5); dummy.scale.set(radius, length, radius);
    dummy.quaternion.setFromUnitVectors(up, delta.normalize()); dummy.updateMatrix();
    const key = `${cylinder.uuid}:${m.uuid}:true`;
    let batch = batches.get(key);
    if (!batch) { batch = { geometry: cylinder, material: m, matrices: [], shadow: true }; batches.set(key, batch); }
    batch.matrices.push(dummy.matrix.clone());
  }
  function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
    const item = new THREE.Mesh(geometry, mat); item.position.set(x, y, z); item.castShadow = true; item.receiveShadow = true; group.add(item); return item;
  }
  function sign(text: string, x: number, y: number, z: number, width: number, color = '#D4DDD9', background = '#13212A', height = width * 0.23, checkpoint = false) {
    // Keep recovery markers while omitting explanatory scenery billboards during driving.
    if(level&&!checkpoint)return;
    text=translate(text,language);
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = Math.max(96, Math.round(1024 * height / width));
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = background; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color; let size = Math.floor(canvas.height * (checkpoint ? 0.62 : 0.52));
    ctx.font = `600 ${size}px "Barlow Condensed", "Microsoft YaHei", sans-serif`; ctx.textBaseline = 'middle';
    while (ctx.measureText(text).width > canvas.width - 72 && size > 12) { size--; ctx.font = `600 ${size}px "Barlow Condensed", "Microsoft YaHei", sans-serif`; }
    ctx.textAlign = checkpoint ? 'center' : 'left';
    ctx.fillText(text, checkpoint ? canvas.width / 2 : 36, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture);
    const mat = ownMaterial(new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, metalness: 0.2, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.12 }));
    const plate=mesh(ownGeometry(new THREE.PlaneGeometry(width, height)), mat, x, y, z);plate.name=checkpoint?'checkpoint-sign':'environment-sign';return plate;
  }

  /** Miter normals keep adjoining rendered sections closed while the top uses the exact physics samples. */
  function surface(track: Track) {
    const pts = track.points; if (pts.length < 2) return;
    const width = track.width ?? 7; const thickness = track.suction ? 0.46 : 0.78;
    const normals = pts.map((p, i) => {
      const before = pts[Math.max(0, i - 1)]; const after = pts[Math.min(pts.length - 1, i + 1)];
      const dx = after.x - before.x; const dy = after.y - before.y; const length = Math.hypot(dx, dy) || 1;
      return { x: -dy / length, y: dx / length };
    });
    const positions: number[] = []; const uv: number[] = []; const indices: number[] = [];
    const sidePositions: number[] = []; const sideUv: number[] = []; const sideIndices: number[] = [];
    let distance = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]; const n = normals[i];
      if (i) distance += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
      positions.push(p.x, p.y, (p.z??0)-width / 2, p.x, p.y, (p.z??0)+width / 2);
      uv.push(distance / 8, 0, distance / 8, width / 8);
      // A shallow rolled lip and chamfered bottom expose real highlight bands, without moving the top.
      for (const side of [-1, 1]) {
        for (const [inset, depth] of [[0, 0], [-0.04, 0.065], [-0.04, thickness - 0.07], [0.055, thickness]]) {
          sidePositions.push(p.x - n.x * depth, p.y - n.y * depth, (p.z??0)+side * (width / 2 - inset));
          sideUv.push(distance / 8, depth / 6);
        }
      }
      if (i < pts.length - 1) {
        const v = i * 2; indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
        const s = i * 8;
        for (let j = 0; j < 3; j++) sideIndices.push(s+j, s+j+8, s+j+1, s+j+1, s+j+8, s+j+9, s+j+4, s+j+5, s+j+12, s+j+5, s+j+13, s+j+12);
        sideIndices.push(s+3, s+11, s+7, s+7, s+11, s+15);
      }
    }
    function geometry(p: number[], u: number[], ind: number[]) {
      const g = ownGeometry(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2)); g.setIndex(ind); g.computeVertexNormals(); return g;
    }
    mesh(geometry(positions, uv, indices), track.suction ? deck : concrete);
    mesh(geometry(sidePositions, sideUv, sideIndices), track.suction ? steel : deck);
    // Caps close otherwise conspicuously hollow jump edges.
    for (const i of [0, pts.length - 1]) {
      const p = pts[i]; const n = normals[i]; const angle = Math.atan2(-n.x, n.y);
      rounded(track.suction ? steel : deck, p.x - n.x * thickness * 0.5, p.y - n.y * thickness * 0.5, p.z??0, 0.14, thickness, width + 0.06, 0.035, angle);
      for (const z of [-width / 2 + 0.13, width / 2 - 0.13]) {
        rounded(aluminum, p.x - n.x * 0.19, p.y - n.y * 0.19, (p.z??0)+z, 0.26, 0.26, 0.29, 0.045, angle);
      }
    }
    let cursor = 0; let nextMark = 2; let nextSupport = 8; let markIndex = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]; const b = pts[i + 1]; const dx = b.x - a.x; const dy = b.y - a.y; const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx); const nx = -Math.sin(angle); const ny = Math.cos(angle);
      const midX = (a.x + b.x) / 2; const midY = (a.y + b.y) / 2; const midZ=((a.z??0)+(b.z??0))/2;
      // Thin stripes carry the exact polyline tangent; no smoothing changes collision alignment.
      for (const z of [-width / 2 + 0.13, width / 2 - 0.13]) {
        block(track.suction ? cyan : white, midX + nx * 0.035, midY + ny * 0.035, midZ+z, length + 0.025, 0.055, 0.12, angle, false);
        beam(steel, [a.x - nx * 0.2, a.y - ny * 0.2, (a.z??0)+z], [b.x - nx * 0.2, b.y - ny * 0.2, (b.z??0)+z], 0.075);
      }
      while (nextMark < cursor + length) {
        const t = Math.max(0, (nextMark - cursor) / length); const x = a.x + dx * t; const y = a.y + dy * t; const lane=(a.z??0)+((b.z??0)-(a.z??0))*t;
        block(track.suction ? aluminum : white, x + nx * 0.015, y + ny * 0.015, lane-0.2, 1.45, 0.026, 0.09, angle, false);
        // Expansion joints and access-bolt points remain readable at the game camera distance.
        block(graphite, x + nx * 0.012, y + ny * 0.012, lane, 0.035, 0.018, width - 0.55, angle, false);
        // Brackets and bolt pads alternate: the same rhythm at a third of the instances.
        if (markIndex % 2 === 0) {
          for (const z of [-width / 2 + 0.45, width / 2 - 0.45]) block(aluminum, x + nx * 0.04, y + ny * 0.04, lane+z, 0.09, 0.04, 0.09, angle, false);
          for (const z of [-width / 2 - 0.05, width / 2 + 0.05]) {
            block(steel, x - nx * thickness * 0.52, y - ny * thickness * 0.52, lane+z, 0.24, thickness * 0.65, 0.045, angle);
            block(aluminum, x - nx * 0.2, y - ny * 0.2, lane+z, 0.095, 0.095, 0.075, angle, false);
          }
        }
        markIndex++;
        nextMark += 7;
      }
      while (nextSupport < cursor + length) {
        const t = Math.max(0, (nextSupport - cursor) / length); const x = a.x + dx * t; const y = a.y + dy * t; const lane=(a.z??0)+((b.z??0)-(a.z??0))*t;
        if (ny > 0.6) support(x, y - thickness, width, level?.theme ?? 'lab',lane);
        nextSupport += level?.theme === 'canyon' ? 24 : 30;
      }
      cursor += length;
    }
    // Hazard chevrons at every actual exposed launch / landing edge.
    for (const i of [0, pts.length - 1]) {
      const p = pts[i]; const n = normals[i]; const angle = Math.atan2(-n.x, n.y);
      for (let z = -width / 2 + 0.5; z < width / 2; z += 0.7) block(i === pts.length - 1 ? amber : white, p.x + n.x * 0.04, p.y + n.y * 0.04, (p.z??0)+z, 0.42, 0.045, 0.3, angle, false);
    }
  }

  function support(x: number, y: number, width: number, theme: string, lane=0) {
    const base = level?.scenery ? Math.min(-18,...level.tracks.flatMap(t=>t.points.map(p=>p.y-18))) : theme === 'canyon' ? -52 : theme === 'desert' ? -11 : -8;
    if (y < base + 1) return;
    // Canyon decks overlap vertically. Keep their cantilever supports behind the
    // playable lane so an upper deck's columns cannot hide the lower vehicle.
    const supportZ = theme === 'canyon' ? [-width * 1.1, -width * 0.36] : [-width * 0.36, width * 0.36];
    for (const offset of supportZ) { const z=lane+offset;
      block(theme === 'desert' ? concrete : steel, x, (y + base) / 2, z, theme === 'desert' ? 1.5 : 0.7, y - base, 0.8);
      rounded(steel, x, y - 0.3, z, 3, 0.45, 1.3, 0.08);
      block(aluminum, x, y - 0.63, z, 1.8, 0.22, 1.1);
      block(graphite, x, y - 0.48, z, 1.6, 0.12, 1);
      joint(x, y - 0.95, z + 0.46, 0.65);
      for (const direction of [-1, 1]) beam(steel, [x + direction * 1.2, y - 0.4, z], [x + direction * 0.25, y - 1.6, z], 0.1);
      rounded(steel, x, base + 0.2, z, 2.3, 0.4, 1.8, 0.08);
      if (theme === 'canyon') {
        for (let h = base + 7; h < y - 5; h += 8) {
          block(steel, x, h, lane+(supportZ[0] + supportZ[1]) / 2, 0.6, 0.45, supportZ[1] - supportZ[0]);
          beam(aluminum, [x, h, lane+supportZ[0]], [x, h + 8, lane+supportZ[1]], 0.09);
        }
      }
    }
    block(steel, x, y - 0.4, lane, 1.1, 0.5, width + 0.6);
  }

  function ridge(start: number, end: number, z: number, baseline: number, height: number, color: number, phase: number, depth = 18, quality: 'near' | 'mid' | 'far' = 'mid') {
    const p: number[] = []; const uv: number[] = []; const ind: number[] = []; const colors: number[] = [];
    // Backdrop bands use a coarser quad grid: silhouette and strata survive, cost drops ~6x.
    const step = quality === 'far' ? 6.5 : quality === 'mid' ? 2.8 : 1.45;
    const count = Math.ceil((end - start) / step); const rows = quality === 'far' ? 11 : quality === 'mid' ? 17 : 25;
    const hash = (n: number) => { const v = Math.sin(n * 127.1 + phase * 311.7) * 43758.5453; return v - Math.floor(v); };
    const noise = (v: number) => { const i = Math.floor(v); let f = v - i; f = f * f * f * (f * (f * 6 - 15) + 10); return hash(i) * (1 - f) + hash(i + 1) * f; };
    const smooth = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    for (let i = 0; i <= count; i++) {
      const x = start + (end - start) * i / count;
      const n = noise(x * 0.021) * 0.43 + noise(x * 0.064 + 71) * 0.23 + noise(x * 0.17 + 29) * 0.065;
      for (let j = 0; j < rows; j++) {
        const d = j / (rows - 1);
        const crest = smooth(0.02, 0.68, d) * (0.34 + n) - smooth(0.76, 1.0, d) * 0.17;
        const face = -38 * (1 - smooth(0, 0.13, d));
        // Lateral channels and small ledges keep the mass read as rock rather than a smooth dune.
        const ledge = Math.sin(d * 31 + noise(x * 0.19) * 7) * smooth(0.12, 0.9, d) * height * 0.025;
        const eroded = Math.sin(d * 19 + noise(x * 0.11) * 3) * height * 0.018 + (noise(x * 0.23 + d * 37) - 0.5) * height * 0.045 + ledge;
        const y = baseline + height * crest + face + eroded;
        const zz = z - depth * d + Math.sin(x * 0.047 + d * 4 + phase) * depth * 0.10;
        p.push(x, y, zz); uv.push(x / 16, y / 16);
        const crevice = noise(x * 0.31 + d * 63) * 0.11 + noise(x * 0.083 + d * 17) * 0.10;
        const shade = 0.68 + crevice + smooth(0, 0.65, d) * 0.15;
        colors.push(shade * 1.03, shade * (0.99 - d * 0.035), shade * (0.96 - d * 0.08));
        if (i < count && j < rows - 1) { const v = i * rows + j; ind.push(v, v + rows, v + 1, v + 1, v + rows, v + rows + 1); }
      }
    }
    const g = ownGeometry(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.setIndex(ind); g.computeVertexNormals();
    const m = quality === 'near' ? naturalMaterial(color) : hazeMaterial(color); m.vertexColors = true;
    const terrain = mesh(g, m); terrain.castShadow = false; terrain.receiveShadow = false;
  }
  function duneFields(start: number, end: number, baseline: number, color: number, quality: 'near' | 'mid' | 'far' = 'mid') {
    const p: number[] = []; const uv: number[] = []; const ind: number[] = []; const colors: number[] = [];
    const cols = Math.ceil((end - start) / (quality === 'far' ? 7 : 3.2)), rows = quality === 'far' ? 13 : 23;
    const hash = (n: number) => { const v = Math.sin(n * 91.73) * 43758.5453; return v - Math.floor(v); };
    const noise = (v: number) => { const i = Math.floor(v); let f = v - i; f = f * f * (3 - 2 * f); return hash(i) * (1 - f) + hash(i + 1) * f; };
    for (let i = 0; i <= cols; i++) {
      const x = start + (end - start) * i / cols;
      for (let j = 0; j < rows; j++) {
        const d = j / (rows - 1), z = -12 - d * 174;
        const swell = Math.sin(x * 0.035 + d * 8) * 1.1 + Math.sin(x * 0.011 - d * 13) * 2.5;
        const ripples = Math.sin(x * 0.36 + d * 5.7 + noise(x * 0.02) * 3) * .13;
        const edge = baseline + .8 + swell + ripples + d * 3.2;
        p.push(x, edge, z); uv.push(x / 10, z / 10);
        const shade = 0.84 + noise(x * 0.07 + d * 31) * 0.12 + Math.sin(x * 0.045 + d * 9) * 0.04;
        colors.push(shade * 1.04, shade * 0.91, shade * 0.75);
        if (i < cols && j < rows - 1) { const v = i * rows + j; ind.push(v, v + rows, v + 1, v + 1, v + rows, v + rows + 1); }
      }
    }
    const g = ownGeometry(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.setIndex(ind); g.computeVertexNormals();
    const m = naturalMaterial(color, 'sand'); m.vertexColors = true; mesh(g, m).castShadow = false;
  }
  function truss(x: number, y: number, z: number, span: number, tall: number) {
    for (const side of [-1, 1]) {
      const sx = x + side * span / 2;
      block(steel, sx, y + tall / 2, z, 0.45, tall, 0.65);
      rounded(concrete, sx, y + 0.3, z - 0.25, 1.9, 0.6, 2, 0.08);
      block(aluminum, sx, y + 0.72, z, 0.9, 0.14, 1.3);
      joint(sx, y + tall - 0.8, z + 0.39, 1.3);
      joint(sx, y + 1.35, z + 0.39, 0.75);
      beam(steel, [sx + side * 2.5, y + tall, z - 0.1], [sx, y + tall - 3.2, z - 0.1], 0.15);
    }
    block(steel, x, y + tall, z, span + 0.5, 0.5, 0.65);
    block(steel, x, y + tall, z - 1.3, span + 0.5, 0.35, 0.35);
    block(aluminum, x, y + tall - 2, z, span, 0.2, 0.3);
    const count = Math.ceil(span / 5);
    for (let i = 0; i < count; i++) {
      const ax = x - span / 2 + span * i / count; const bx = x - span / 2 + span * (i + 1) / count;
      beam(steel, [ax, y + tall, z], [bx, y + tall - 2, z], 0.1);
      beam(steel, [ax, y + tall - 2, z], [bx, y + tall, z], 0.1);
      beam(aluminum, [ax, y + tall, z + 0.1], [bx, y + tall, z - 1.3], 0.065);
      joint(ax, y + tall - 0.15, z + 0.4, 0.44);
    }
  }
  function aerospaceFacility(x: number, y: number, z: number, large = false) {
    const scale = large ? 1.6 : 1;
    rounded(concrete, x, y + 4 * scale, z, 22 * scale, 8 * scale, 11 * scale, 0.24);
    rounded(steel, x, y + 0.35 * scale, z, 22.15 * scale, 0.7 * scale, 11.15 * scale, 0.09);
    rounded(steel, x, y + 8.2 * scale, z, 23 * scale, 0.4 * scale, 12 * scale, 0.075);
    rounded(aluminum, x, y + 8.43 * scale, z, 22.9 * scale, 0.1 * scale, 11.9 * scale, 0.025);
    block(graphite, x, y + 3.8 * scale, z + 5.52 * scale, 15.5 * scale, 5.45 * scale, 0.1);
    rounded(steel, x, y + 6.55 * scale, z + 5.8 * scale, 16.3 * scale, 0.35 * scale, 1.1 * scale, 0.065);
    block(steel, x, y + 1.1 * scale, z + 5.75 * scale, 16 * scale, 0.25 * scale, 0.7 * scale);
    for (let h = 2; h < 6; h += 0.75) block(steel, x, y + h * scale, z + 5.6 * scale, 14.8 * scale, 0.035, 0.045);
    for (let i = -7; i <= 7; i += 2) block(aluminum, x + i * scale, y + 3.8 * scale, z + 5.7 * scale, 0.1, 5 * scale, 0.15);
    block(light, x, y + 6.1 * scale, z + 5.8 * scale, 15 * scale, 0.11, 0.18, 0, false);
    for (let i = -9; i <= 9; i += 3) {
      block(steel, x + i * scale, y + 4 * scale, z + 5.6 * scale, 0.18, 8 * scale, 0.22);
      block(graphite, x + i * scale + 1, y + 7.2 * scale, z + 5.65 * scale, 1.2 * scale, 0.3, 0.15);
    }
    for (const side of [-1, 1]) {
      rounded(steel, x + side * 10.6 * scale, y + 4.1 * scale, z, 0.5 * scale, 8 * scale, 11.1 * scale, 0.09);
      block(graphite, x + side * 11.04 * scale, y + 5.7 * scale, z, 0.035, 0.8 * scale, 8 * scale);
      for (let k = -4; k <= 4; k += 2) {
        block(aluminum, x + side * 11.07 * scale, y + 5.7 * scale, z + k * scale, 0.055, 0.85 * scale, 0.05);
        block(steel, x + side * 11.02 * scale, y + 2.7 * scale, z + k * scale, 0.04, 3.6 * scale, 0.04);
      }
      joint(x + side * 9.8 * scale, y + 7.6 * scale, z + 5.58 * scale, 0.7);
    }
    rounded(steel, x + 7 * scale, y + 9.8 * scale, z - 2, 4 * scale, 2.8 * scale, 6 * scale, 0.16);
    rounded(aluminum, x + 7 * scale, y + 11.3 * scale, z - 2, 4.25 * scale, 0.25 * scale, 6.25 * scale, 0.06);
    block(black, x + 7 * scale, y + 9.8 * scale, z + 1.1 * scale, 3.1 * scale, 1.8 * scale, 0.1);
    for (let h = 9.1; h < 10.7; h += 0.22) block(aluminum, x + 7 * scale, y + h * scale, z + 1.2 * scale, 2.8 * scale, 0.065, 0.08);
    beam(aluminum, [x + 8 * scale, y + 12 * scale, z], [x + 8 * scale, y + 18 * scale, z], 0.08);
    block(amber, x + 8 * scale, y + 18 * scale, z, 0.24, 0.24, 0.24, 0, false);
  }
  function tower(x: number, y: number, z: number, h: number) {
    for (const dz of [-1.2, 1.2]) for (const dx of [-1.2, 1.2]) beam(steel, [x + dx, y, z + dz], [x + dx * 0.4, y + h, z + dz * 0.4], 0.15);
    for (let i = 0; i < h; i += 5) {
      for (const dz of [-1.2, 1.2]) {
        beam(aluminum, [x - 1, y + i, z + dz], [x + 1, y + i + 5, z + dz], 0.07);
        block(steel, x, y + i, z + dz, 2.6, 0.2, 0.2);
      }
    }
    block(amber, x, y + h, z, 0.35, 0.3, 0.35, 0, false);
  }

  const points: TrackPoint[] = level?.tracks.flatMap(t => t.points) ?? [];
  const start = Math.min(-35, ...points.map(p => p.x)) - 50;
  const end = Math.max(150, level?.finish.x ?? 80, ...points.map(p => p.x)) + 100;
  const top = Math.max(20, ...points.map(p => p.y)) + 14;
  const span = end - start;

  if (!level) {
    const floorMat = ownMaterial(new THREE.MeshPhysicalMaterial({ color: 0x4d565b, metalness: 0.6, roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.35, map: concrete.map }));
    block(floorMat, 0, -0.38, 0, 180, 0.4, 130);
    block(graphite, 0, 14, -32, 180, 29, 1.2);
    block(steel, 0, 28, 0, 180, 0.6, 64);
    for (let x = -80; x <= 80; x += 12) {
      block(steel, x, 14, -30, 0.7, 28, 2);
      beam(aluminum, [x, 15, -30], [x, 27, -18], 0.18);
      block(graphite, x, 27.4, 0, 0.75, 1, 62);
      block(light, x + 1.2, 27, -2, 0.25, 0.08, 54, 0, false);
      block(black, x, -0.16, 0, 0.035, 0.018, 130, 0, false);
    }
    for (let z = -50; z < 50; z += 12) block(black, 0, -0.16, z, 180, 0.018, 0.03, 0, false);
    const turntable = mesh(ownGeometry(new THREE.CylinderGeometry(6.2, 6.3, 0.22, 96)), graphite, 0, -0.102, 0);
    turntable.receiveShadow = true;
    const ring = mesh(ownGeometry(new THREE.TorusGeometry(6.08, 0.018, 4, 128)), aluminum, 0, 0.016, 0); ring.rotation.x = Math.PI / 2;
    const outerRing = mesh(ownGeometry(new THREE.TorusGeometry(8.1, 0.028, 4, 128)), steel, 0, 0.012, 0); outerRing.rotation.x = Math.PI / 2;
    const guideRing = mesh(ownGeometry(new THREE.TorusGeometry(7.08, 0.012, 3, 128)), cyan, 0, 0.022, 0); guideRing.rotation.x = Math.PI / 2;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
      const radius = 7.52;
      block(a % (Math.PI / 3) < .01 ? amber : aluminum, Math.cos(a) * radius, .018, Math.sin(a) * radius, .48, .025, .10, a, false);
    }
    for (const z of [-8.8, 8.8]) block(black, 0, .006, z, 25, .012, .045, 0, false);
    for (const x of [-12.2, 12.2]) block(black, x, .006, 0, .045, .012, 17.8, 0, false);

    // Rear test cell: recessed service doors, instrument bays and a raised observation gallery.
    function instrumentScreen(label: string, hue: string) {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#102027'; context.fillRect(0, 0, 512, 256);
      context.strokeStyle = 'rgba(139,207,218,.24)'; context.lineWidth = 1;
      for (let x = 0; x <= 512; x += 32) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, 256); context.stroke(); }
      for (let y = 0; y <= 256; y += 32) { context.beginPath(); context.moveTo(0, y); context.lineTo(512, y); context.stroke(); }
      context.strokeStyle = hue; context.lineWidth = 5; context.beginPath();
      for (let x = 20; x < 490; x += 12) { const y = 178 - Math.sin(x * .035) * 36 - Math.sin(x * .11) * 10; if (x === 20) context.moveTo(x, y); else context.lineTo(x, y); }
      context.stroke();
      context.fillStyle = '#e2ece9'; context.font = '600 23px "Barlow Condensed", sans-serif'; context.fillText(label, 18, 34);
      context.fillStyle = '#f0b27c'; context.fillRect(384, 20, 108, 8);
      context.fillStyle = hue; context.fillRect(18, 224, 116, 8); context.fillRect(150, 224, 54, 8);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture);
      return ownMaterial(new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
    }
    const displayMaterials = [
      instrumentScreen('ADHESION / THRUST', '#8ce9f4'),
      instrumentScreen('ROTOR BALANCE', '#f0b27c'),
      instrumentScreen('THERMAL LOAD', '#9ae3c4'),
      instrumentScreen('ACTUATOR STATUS', '#d6e3d5'),
    ];
    function display(x: number, y: number, z: number, width: number, height: number, material: THREE.Material) {
      const item = mesh(ownGeometry(new THREE.PlaneGeometry(width, height)), material, x, y, z);
      item.castShadow = false; item.receiveShadow = false; return item;
    }
    for (const x of [-29, -23, -17, -11]) {
      rounded(steel, x, 6.3, -31.0, 5.25, 10.8, .42, .07);
      block(graphite, x, 6.3, -30.75, 4.55, 9.5, .09);
      for (let y = 2.1; y < 10.8; y += .75) block(aluminum, x, y, -30.68, 4.25, .035, .05);
      for (const side of [-1, 1]) block(aluminum, x + side * 2.1, 6.3, -30.63, .10, 9.7, .05);
      block(amber, x, 11.1, -30.62, 4.2, .07, .06, 0, false);
      for (let xx = -1.8; xx <= 1.8; xx += .6) block(steel, x + xx, 1.2, -30.61, .05, .36, .04);
    }
    const galleryZ = -25.0;
    block(steel, -18, 7.55, galleryZ + .2, 29, .55, 5.2);
    block(deck, -18, 7.87, galleryZ + 1.2, 27.6, .16, 2.9);
    block(black, -18, 10.25, galleryZ - .35, 26.4, 4.85, .10);
    for (let x = -31; x <= -5; x += 3.25) {
      block(aluminum, x, 10.25, galleryZ - .24, .09, 4.9, .07);
      block(steel, x, 8.45, galleryZ + 2.9, .13, 1.15, .13);
      block(cyan, x, 9.02, galleryZ + 2.91, .16, .08, .12, 0, false);
      block(steel, x, 9.5, galleryZ + 2.9, .13, .13, .13);
    }
    block(aluminum, -18, 9.0, galleryZ + 2.9, 26.2, .075, .075);
    block(cyan, -18, 8.21, galleryZ + 2.92, 24.5, .035, .04, 0, false);
    for (const [index, x] of [-27, -22, -17, -12, -7].entries()) {
      block(steel, x, 10.15, galleryZ - .10, 3.2, 2.4, .2);
      display(x, 10.15, galleryZ + .02, 2.55, 1.17, displayMaterials[index % displayMaterials.length]);
      block(cyan, x, 9.0, galleryZ + .02, 1.8, .035, .03, 0, false);
    }
    for (const x of [-31, -18, -5]) rounded(steel, x, 14.25, -27.0, .55, 6.5, .65, .06);
    for (const y of [14.85, 15.85]) {
      beam(aluminum, [-32, y, -26.4], [-4, y, -26.4], .10);
      for (let x = -30; x <= -5; x += 5) block(steel, x, y, -26.3, .28, .35, .28);
    }
    // Full-height supports and a service stair expose the gallery as a human-scale walkway.
    for (const x of [-29, -20, -11]) {
      block(steel, x, 3.85, -27.0, .55, 7.7, .68);
      rounded(steel, x, .16, -27.0, 1.35, .32, 1.3, .06);
      joint(x, 4.1, -26.56, .64);
      block(aluminum, x, 7.28, -26.58, .82, .12, .2);
    }
    const stairStartX = -32.2, stairZ = -23.9;
    for (let i = 0; i < 12; i++) {
      const y = .38 + i * .62;
      block(steel, stairStartX + i * .76, y, stairZ, .82, .12, 2.1);
      block(graphite, stairStartX + i * .76, y - .28, stairZ, .12, .55, 1.9);
    }
    for (const z of [stairZ - 1.0, stairZ + 1.0]) beam(aluminum, [stairStartX - .2, 1.1, z], [stairStartX + 9.05, 8.45, z], .045);

    // Overhead service crane and its trolley give the high, dark ceiling a readable working function.
    block(steel, -16, 22.1, -13.5, 33, .62, .82);
    block(aluminum, -16, 22.47, -13.5, 32.3, .14, .42);
    for (const x of [-32, 0]) {
      rounded(steel, x, 22.1, -13.5, 1.5, .9, 2.0, .08);
      for (const z of [-14.2, -12.8]) block(graphite, x, 21.9, z, 1.2, .65, .45);
    }
    rounded(graphite, -8.5, 20.95, -13.5, 3.4, 1.35, 1.7, .08);
    block(steel, -8.5, 20.2, -13.5, 2.8, .18, 1.35);
    beam(steel, [-8.5, 20.1, -13.5], [-8.5, 11.7, -13.5], .025);
    const hook = mesh(ownGeometry(new THREE.TorusGeometry(.34, .055, 8, 20, Math.PI * 1.45)), aluminum, -8.5, 11.35, -13.5); hook.rotation.z = -.7;
    block(amber, -8.5, 20.25, -12.56, .24, .16, .05, 0, false);
    for (const x of [-30, -23, -16, -9, -2]) {
      beam(graphite, [x, 27.8, -10.8], [x, 25.4, -10.8], .025);
      block(light, x, 25.15, -10.8, .42, .08, .92, 0, false);
    }

    // A large turbofan test article anchors the service bay without competing with the hero car.
    const turbineX = -8.2, turbineY = 3.85, turbineZ = -20.6, turbineRadius = 2.35;
    const turbineRim = mesh(ownGeometry(new THREE.TorusGeometry(turbineRadius, .21, 8, 48)), steel, turbineX, turbineY, turbineZ);
    const turbineGuide = mesh(ownGeometry(new THREE.TorusGeometry(turbineRadius - .34, .045, 5, 48)), cyan, turbineX, turbineY, turbineZ + .16);
    turbineRim.castShadow = true; turbineGuide.castShadow = false;
    const turbineHousing = mesh(ownGeometry(new THREE.CylinderGeometry(turbineRadius + .12, turbineRadius + .3, 1.15, 48, 1, true)), graphite, turbineX, turbineY, turbineZ - .55);
    turbineHousing.rotation.x = Math.PI / 2; turbineHousing.castShadow = true;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      block(aluminum, turbineX + Math.cos(a) * (turbineRadius + .28), turbineY + Math.sin(a) * (turbineRadius + .28), turbineZ - .58, .08, .36, .12, a, false);
    }
    const rotor = new THREE.Group(); rotor.position.set(turbineX, turbineY, turbineZ - .18); group.add(rotor);
    const bladeGeometry = ownGeometry(new THREE.BoxGeometry(.24, turbineRadius * .73, .085));
    const bladeMesh = new THREE.InstancedMesh(bladeGeometry, aluminum, 22); bladeMesh.castShadow = true;
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * Math.PI * 2;
      dummy.position.set(Math.cos(a) * turbineRadius * .43, Math.sin(a) * turbineRadius * .43, 0);
      dummy.rotation.set(0, 0, a - Math.PI / 2); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); bladeMesh.setMatrixAt(i, dummy.matrix);
    }
    rotor.add(bladeMesh);
    const spinner = mesh(ownGeometry(new THREE.CylinderGeometry(.52, .76, 1.2, 24)), graphite, turbineX, turbineY, turbineZ - .65); spinner.rotation.x = Math.PI / 2;
    mesh(ownGeometry(new THREE.CylinderGeometry(.4, .4, .14, 24)), aluminum, turbineX, turbineY, turbineZ - 1.28).rotation.x = Math.PI / 2;
    for (const side of [-1, 1]) {
      beam(steel, [turbineX + side * 2.15, 0, turbineZ], [turbineX + side * 1.38, turbineY - .9, turbineZ], .17);
      beam(steel, [turbineX + side * 2.15, .2, turbineZ - 1.7], [turbineX + side * 1.38, turbineY - .9, turbineZ], .13);
      rounded(steel, turbineX + side * 2.15, .25, turbineZ, 1.18, .5, 1.8, .06);
      block(amber, turbineX + side * 1.38, turbineY, turbineZ + .26, .18, .18, .09, 0, false);
    }
    rounded(graphite, turbineX, turbineY - 2.62, turbineZ, 4.65, .38, 1.75, .08);
    for (const x of [-29, -25, -21]) {
      block(steel, x, 1.15, -28.3, 1.15, 2.3, .9);
      block(black, x, 1.35, -27.82, .86, .72, .07);
      block(cyan, x, 1.7, -27.77, .58, .035, .03, 0, false);
    }
    for (const x of [-13, -11.5]) for (const z of [-24.4, -22.9]) {
      const tyre = mesh(ownGeometry(new THREE.CylinderGeometry(.62, .62, .27, 18)), black, x, .28 + (x === -11.5 ? .55 : 0), z);
      tyre.rotation.x = Math.PI / 2;
    }
    block(steel, -12.25, .75, -23.65, 2.8, .10, 1.9);
    for (const x of [-13.3, -11.2]) beam(steel, [x, .15, -24.3], [x, 1.55, -23.2], .045);
    // Low service carts and hanging hazard markers occupy the visible gap between the car and rear wall.
    for (const [x, z] of [[-8.4, -10.2], [8.8, -12.8]]) {
      block(steel, x, .28, z, 1.45, .14, .55);
      block(aluminum, x, .77, z, 1.3, 1.0, .48);
      block(graphite, x, .79, z + .26, 1.0, .58, .05);
      block(cyan, x, .98, z + .29, .62, .045, .025, 0, false);
      for (const side of [-1, 1]) for (const depth of [-1, 1]) {
        const wheel = mesh(ownGeometry(new THREE.CylinderGeometry(.15, .15, .08, 12)), black, x + side * .53, .13, z + depth * .18);
        wheel.rotation.x = Math.PI / 2;
      }
      for (const side of [-1, 1]) block(steel, x + side * .48, 1.45, z, .06, 1.25, .06);
      block(amber, x, 2.10, z, .92, .05, .08, 0, false);
    }
    for (const x of [-28, -20, -10]) {
      block(graphite, x, .8, -12.5, 1.1, 1.6, .8);
      block(aluminum, x, 1.62, -12.5, .88, .08, .62);
      block(cyan, x, 1.2, -12.08, .36, .06, .03, 0, false);
    }
    // A large open hangar mouth catches late-day sun without turning the interior into a neon room.
    block(aluminum, 7.5, 12, -29, 30, 24, 1);
    block(graphite, 7.5, 10.5, -28.3, 26, 21, 0.5);
    const portal = ownMaterial(new THREE.MeshBasicMaterial({ color: 0xd4b290 }));
    block(portal, 7.5, 10.3, -28, 23, 20.2, 0.06, 0, false);
    for (let y = 3; y < 20; y += 3) block(steel, 7.5, y, -27.8, 23, 0.12, 0.1);
    block(amber, -5.7, 10.4, -27.5, 0.16, 20, 0.12, 0, false);
    sign('FLIGHT SYSTEMS  /  07', 7, 7, -30.8, 8, '#C6D7D8', '#15212A', 0.85);
    sign('AEROSPACE DEVELOPMENT', 7, 5.7, -30.75, 8, '#84999F', '#15212A', 0.5);
    sign('SERVICE BAY  /  DYNAMIC TEST', -18.5, 14.40, -26.6, 10.5, '#C6D7D8', '#15212A', .62);
    for (const x of [-24, 23]) {
      block(steel, x, 1.7, -17, 5, 3.4, 2.4);
      block(black, x, 2.2, -15.75, 4.3, 1.6, 0.12);
      block(cyan, x, 3.3, -15.7, 3.2, 0.08, 0.15, 0, false);
      for (let j = 0; j < 5; j++) block(aluminum, x - 1.5 + j * 0.75, 0.8, -15.7, 0.35, 0.85, 0.12);
    }
  } else {
    // Every level owns a biome kit. Shared terrain builders stay here so backdrop
    // meshes are authored once; props live in `scene/props`, compositions in
    // `scene/biomes`. One world unit is one metre throughout.
    const routeFloor = Math.min(-18, ...level.tracks.flatMap(t => t.points.map(p => p.y - 18)));
    const floor = level.scenery ? routeFloor : level.theme === 'desert' ? -11 : level.theme === 'lab' ? -10 : -52;
    const zs = points.map(p => p.z ?? 0).sort((a, b) => a - b);
    const laneZ = zs.length ? zs[Math.floor(zs.length / 2)] : 0;
    const cloudGeometries = new Map<number, THREE.BufferGeometry>();
    function cloudTexture(phase: number) {
      const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 192;
      const ctx = canvas.getContext('2d')!; const pixels = ctx.createImageData(canvas.width, canvas.height);
      const hash = (x: number, y: number) => { const v = Math.sin(x * 127.1 + y * 311.7 + phase * 13.3) * 43758.5453; return v - Math.floor(v); };
      const noise = (x: number, y: number) => {
        const ix = Math.floor(x), iy = Math.floor(y); let fx = x - ix, fy = y - iy;
        fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
        return (hash(ix, iy) * (1 - fx) + hash(ix + 1, iy) * fx) * (1 - fy) + (hash(ix, iy + 1) * (1 - fx) + hash(ix + 1, iy + 1) * fx) * fy;
      };
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
        const u = x / canvas.width, v = y / canvas.height; const nx = u * 12, ny = v * 4;
        const density = noise(nx, ny) * .5 + noise(nx * 2.1, ny * 2.1) * .28 + noise(nx * 4.3, ny * 4.3) * .15 + noise(nx * 8.7, ny * 8.7) * .07;
        const center = .52 + (noise(nx * .36, phase) - .5) * .25;
        const feather = Math.exp(-Math.pow((v - center) / .225, 2)) * Math.min(1, u * 14, (1 - u) * 14);
        const alpha = Math.max(0, density - .28) * feather * 1.12;
        const i = (y * canvas.width + x) * 4;
        pixels.data[i] = 181 + (1 - v) * 28; pixels.data[i + 1] = 196 + (1 - v) * 21; pixels.data[i + 2] = 207 + (1 - v) * 12;
        pixels.data[i + 3] = Math.round(Math.min(.47, alpha) * 255);
      }
      ctx.putImageData(pixels, 0, 0); const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture); return texture;
    }
    function groundSurface(color: number, kind: 'rock' | 'sand', y: number, z: number, width: number, depth: number) {
      block(naturalMaterial(color, kind), 0, y - .5, z, width, 1, depth, 0, false);
    }
    function cloudBank(x: number, y: number, z: number, width: number, height: number, index: number) {
      let geometry = cloudGeometries.get(width);
      if (!geometry) { geometry = ownGeometry(new THREE.PlaneGeometry(width, 1, 12, 1)); cloudGeometries.set(width, geometry); }
      const cloud = ownMaterial(new THREE.MeshBasicMaterial({map: cloudTexture(7 + index * 23), transparent: true, depthWrite: false, opacity: .82, fog: true}));
      const bank = mesh(geometry, cloud, x, y, z);
      bank.scale.y = height; bank.castShadow = false; bank.receiveShadow = false; bank.renderOrder = -index;
    }
    const terrain: Terrain = {ridge, dunes: duneFields, ground: groundSurface, cloudBank};
    const context: BiomeContext = {
      t: {k: kit, m: matLib, tex: labels},
      level, span, start, end, floor, top, laneZ, random, terrain,
      animate(object, update) { group.add(object); biomeAnimations.push(update); },
    };
    buildBiome(context);
    group.add(kit.group);
    kit.flush();
  }

  if (level) {
    for (const track of level.tracks) if(!track.kind)surface(track);
    function contactAt(x: number, y: number) {
      let nearest = { x, y, nx: 0, ny: 1, angle: 0, distance: Infinity };
      for (const track of level!.tracks) for (let i = 0; i < track.points.length - 1; i++) {
        const a = track.points[i]; const b = track.points[i + 1];
        const dx = b.x - a.x; const dy = b.y - a.y; const len2 = dx * dx + dy * dy;
        const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (len2 || 1)));
        const px = a.x + dx * t; const py = a.y + dy * t; const distance = Math.hypot(px - x, py - y);
        if (distance < nearest.distance) { const length = Math.sqrt(len2) || 1; nearest = { x: px, y: py, nx: -dy / length, ny: dx / length, angle: Math.atan2(dy, dx), distance }; }
      }
      return nearest;
    }
    for (let i = 0; i < level.checkpoints.length; i++) {
      const cp = level.checkpoints[i];
      // A single plate behind the route: no post or overhead frame.
      const lamp = mesh(ownGeometry(new THREE.BoxGeometry(5.6, 0.06, 0.08)), cyan, cp.x, cp.y + 3.18, (cp.z??0)-4.15);
      animated.push({ mesh: lamp, x: cp.x, phase: i });
      const label = `${language==='zh'?'检查点':'CHECKPOINT'} ${String(i + 1).padStart(2, '0')}`;
      sign(label, cp.x, cp.y + 3.8, (cp.z??0)-4.2, 5.6, '#DCECEA', '#172731', 1.2, true);
      const contact = contactAt(cp.x, cp.y);
      for (let z = -1.8; z <= 1.9; z += 0.45) block(cyan, contact.x + contact.nx * 0.025, contact.y + contact.ny * 0.025, (cp.z??0)+z, 0.24, 0.035, 0.22, contact.angle, false);
    }
    const f = level.finish;
    for (const z of [(f.z??0)-level.finishWidth*.41,(f.z??0)+level.finishWidth*.41]) {
      block(steel, f.x + 1, f.y + 3.5, z, 1, 7, 0.7);
      block(white, f.x + 1.01, f.y + 3.9, z + 0.37, 0.45, 4.5, 0.06);
      block(cyan, f.x + 0.48, f.y + 3.5, z, 0.06, 6.5, 0.6, 0, false);
    }
    block(steel, f.x + 1, f.y + 7, f.z??0, 0.9, 0.6, level.finishWidth*.9);
    block(light, f.x + 0.5, f.y + 6.8, f.z??0, 0.12, 0.1, level.finishWidth*.8, 0, false);
    sign('FINISH  /  FLIGHT COMPLETE', f.x - 1.2, f.y + 8.5, (f.z??0)-3.9, 12, '#DAE8E4', '#1B2B35', 1.3);
    for (let x = 0; x < 4; x++) for (let z = 0; z < 12; z++) block((x + z) % 2 ? black : white, f.x - 1 + x * 0.4, f.y + 0.025, (f.z??0)-2.75 + z * 0.5, 0.4, 0.025, 0.5, 0, false);
    if(level.id===1){sign('LOADING RAMPS',399,10,1,14);sign('STAR ROUTE',407,8.3,1,7);}
    if(level.id===2){sign('STAR ROUTE',222,8,-7,12);sign('CLEARANCE GATE',268,12,-7,14);}
    if(level.id===3){sign('CARGO CROSSING',244,-3,13,14);sign('WAIT FOR THE DECK',274,-2,13,16);sign('ELEVATOR DECK',340,4,13,13);}
  }

  const roadObjects=level?createRoadObjects(level,language):undefined;if(roadObjects)group.add(roadObjects.group);

  for (const batch of batches.values()) {
    const object = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
    batch.matrices.forEach((matrix, i) => object.setMatrixAt(i, matrix));
    object.castShadow = batch.shadow; object.receiveShadow = true; object.computeBoundingSphere(); group.add(object);
  }
  return {
    group,
    update(time: number, carX: number, snapshot?:GameSnapshot|null) {
      roadObjects?.update(time,snapshot);
      for (const update of biomeAnimations) update(time);
      for (const item of animated) {
        const passed = carX >= item.x;
        item.mesh.scale.x = passed ? 1 : 0.94 + Math.sin(time * 2.3 + item.phase) * 0.05;
      }
    },
    dispose() {
      roadObjects?.dispose();
      group.removeFromParent();
      registry.dispose();
      surfaces.dispose();
      group.clear(); batches.clear(); roundedGeometries.clear(); animated.length = 0; biomeAnimations.length = 0;
    },
  };
}
