import {describe, expect, it} from 'vitest';
import {
  BUILDING, CAR, CONTAINER, ENERGY, HUMAN, NATURE, PORT, ROAD, ROADSIDE, SCALE_INVARIANTS, TUNNEL,
} from '../src/render/scene/units';
import {biomeForLevel} from '../src/render/scene/biomes';
import {LEVELS} from '../src/game/levels/index';
import * as THREE from 'three';
import {SceneKit} from '../src/render/scene/kit';
import {createRegistry} from '../src/render/scene/registry';
import {roadContact, roadRail} from '../src/render/scene/biomes/roadside';
import type {BiomeContext} from '../src/render/scene/biomes/types';
import {boulder, conifer} from '../src/render/scene/props/nature';
import type {Tools} from '../src/render/scene/props/tools';

/**
 * The world is authored in metres. These tests protect the relationships that
 * make a scene read at the right size, and the separate biome coverage that
 * keeps every level from sharing one backdrop.
 */
describe('metric scale contract', () => {
  it('keeps every published ratio inside its physical bounds', () => {
    for (const invariant of SCALE_INVARIANTS) {
      expect(`${invariant.label}:${invariant.actual >= invariant.min && invariant.actual <= invariant.max}`)
        .toBe(`${invariant.label}:true`);
    }
  });

  it('matches ISO 668 20 ft and 40 ft container envelopes', () => {
    expect(CONTAINER.ft20.length).toBeCloseTo(6.058, 2);
    expect(CONTAINER.ft20.width).toBeCloseTo(2.438, 2);
    expect(CONTAINER.ft20.height).toBeCloseTo(2.591, 2);
    expect(CONTAINER.ft40.length).toBeCloseTo(12.192, 2);
    // A 20 ft box must still be longer and taller than the car.
    expect(CONTAINER.ft20.length).toBeGreaterThan(CAR.length);
    expect(CONTAINER.ft20.height).toBeGreaterThan(CAR.height * 2);
  });

  it('keeps the road at two 3.5 m lanes and the car in one lane', () => {
    expect(ROAD.width).toBeCloseTo(ROAD.laneWidth * 2, 5);
    expect(CAR.width).toBeLessThan(ROAD.laneWidth);
    expect(CAR.width / ROAD.laneWidth).toBeGreaterThan(.55);
  });

  it('sizes roadside hardware against the roofline', () => {
    expect(ROADSIDE.jerseyBarrier.height).toBeCloseTo(.81, 2);
    expect(ROADSIDE.guardrail.railTop).toBeCloseTo(.75, 2);
    expect(ROADSIDE.cone).toBeCloseTo(.75, 2);
    expect(ROADSIDE.delineator).toBeCloseTo(1.07, 2);
    // A person stands taller than the car; obstacles reach the wing tops.
    expect(HUMAN.height).toBeGreaterThan(CAR.height);
    expect(ROADSIDE.jerseyBarrier.height).toBeGreaterThan(CAR.height * .55);
    expect(ROADSIDE.jerseyBarrier.height).toBeLessThan(CAR.height * .8);
  });

  it('gives buildings industrial clear heights', () => {
    expect(BUILDING.warehouse.eaves).toBeGreaterThan(8);
    expect(BUILDING.warehouse.dockHeight).toBeCloseTo(1.2, 2);
    expect(BUILDING.office.floor).toBeCloseTo(3.9, 2);
    expect(BUILDING.hangar.doorHeight).toBeGreaterThan(ROADSIDE.signGantry.clearance);
    expect(BUILDING.silo.height).toBeGreaterThan(CAR.length * 3);
  });

  it('keeps tunnel clearance and port hardware plausible', () => {
    expect(TUNNEL.bore).toBeGreaterThan(CAR.width * 4.5);
    expect(TUNNEL.jetFan.mount).toBeGreaterThan(CAR.height * 3);
    expect(TUNNEL.jetFan.mount).toBeLessThan(TUNNEL.bore);
    expect(PORT.stsCrane.lift).toBeGreaterThan(35);
    expect(PORT.ship.length).toBeGreaterThan(200);
    expect(PORT.bollardSpacing / CAR.length).toBeGreaterThan(6);
  });

  it('keeps nature at real heights', () => {
    expect(NATURE.conifer.height).toBeGreaterThan(BUILDING.warehouse.eaves);
    expect(NATURE.shrub.height).toBeGreaterThan(CAR.height);
    expect(ENERGY.turbine.hub / CAR.length).toBeGreaterThan(18);
    expect(ENERGY.turbine.blade).toBeGreaterThan(CAR.length * 10);
  });

  it('gives each shipped level its own biome', () => {
    const ids = LEVELS.map(level => biomeForLevel(level));
    expect(new Set(ids).size).toBe(LEVELS.length);
    expect(ids).toEqual(['desert', 'lab', 'canyon', 'coast', 'tower', 'harbor', 'tunnel', 'windfarm', 'anchor', 'terminus']);
  });
});

describe('scenery placement', () => {
  it('joins full-size conifer crowns to their trunk and seats every boulder size in the ground', () => {
    const registry = createRegistry(), kit = new SceneKit(registry), material = new THREE.MeshBasicMaterial();
    const tools = {k: kit, m: {paint: () => material, rock: () => material}} as unknown as Tools;
    conifer(tools, {height: 10});
    kit.withFrame(20, 0, 0, .4, () => boulder(tools, {size: 1}));
    kit.withFrame(40, 0, 0, -.3, () => boulder(tools, {size: 5}));
    kit.flush();
    const matrix = new THREE.Matrix4(), bounds = new THREE.Box3();
    const crowns: THREE.Box3[] = [], rocks: THREE.Box3[] = [];
    for (const object of kit.group.children as THREE.InstancedMesh[]) for (let i = 0; i < object.count; i++) {
      object.getMatrixAt(i, matrix);object.geometry.computeBoundingBox();bounds.copy(object.geometry.boundingBox!).applyMatrix4(matrix);
      if (object.geometry.type === 'ConeGeometry') crowns.push(bounds.clone());
      if (object.geometry.type === 'IcosahedronGeometry') rocks.push(bounds.clone());
    }
    expect(crowns).toHaveLength(3);let connectedTop = 4.2;
    for (const crown of crowns.sort((a, b) => a.min.y - b.min.y)) {expect(crown.min.y).toBeLessThan(connectedTop);connectedTop = crown.max.y;}
    expect(connectedTop).toBeCloseTo(10.4, 4);
    expect(rocks).toHaveLength(2);
    for (const rock of rocks) {expect(rock.min.y).toBeLessThanOrEqual(0);expect(rock.min.y).toBeGreaterThan(-.5);}
    expect((rocks[1].max.y - rocks[1].min.y) / (rocks[0].max.y - rocks[0].min.y)).toBeCloseTo(5, 4);
    registry.dispose();material.dispose();
  });

  it('transforms nested prop positions, tilted parts and beams as one rigid assembly', () => {
    const registry = createRegistry(), kit = new SceneKit(registry), material = new THREE.MeshBasicMaterial();
    const local = new THREE.Vector3(2, 3, 4), tilt = new THREE.Euler(.4, -.2, .3);
    const parent = new THREE.Matrix4().makeRotationY(.6).setPosition(10, 20, 30);
    const child = new THREE.Matrix4().compose(new THREE.Vector3(-3, 2, 5), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -.3, .2, 'YXZ')), new THREE.Vector3(1, 1, 1));
    kit.withFrame(10, 20, 30, .6, () => kit.withFrame(-3, 2, 5, -.3, () => {
      kit.plate(material, ...local.toArray() as [number, number, number], 2, .1, 1, tilt);
      kit.beam(material, [2, 3, 4], [2, 5, 4], .1);
    }, .2));
    kit.flush();
    const expected = parent.multiply(child), plate = kit.group.children[0] as THREE.InstancedMesh;
    const matrix = new THREE.Matrix4(); plate.getMatrixAt(0, matrix);
    expect(new THREE.Vector3().setFromMatrixPosition(matrix).distanceTo(local.clone().applyMatrix4(expected))).toBeLessThan(.00001);
    const rotation = new THREE.Quaternion().setFromRotationMatrix(expected).multiply(new THREE.Quaternion().setFromEuler(tilt));
    expect(new THREE.Quaternion().setFromRotationMatrix(matrix).angleTo(rotation)).toBeLessThan(.00001);
    const beam = kit.group.children[1] as THREE.InstancedMesh; beam.getMatrixAt(0, matrix);
    expect(new THREE.Vector3(0, -.5, 0).applyMatrix4(matrix).distanceTo(local.clone().applyMatrix4(expected))).toBeLessThan(.00001);
    registry.dispose();material.dispose();
  });

  it('rejects gaps, moving decks and collapsing slabs instead of placing props at zero', () => {
    const level = {...LEVELS[0], tracks: [
      {id: 'fixed', suction: false, points: [{x: 0, y: 8, z: 6}, {x: 20, y: 8, z: 6}]},
      {id: 'moving', suction: false, motion: {period: 4}, points: [{x: 22, y: 8}, {x: 30, y: 8}]},
      {id: 'collapse', suction: false, stability: {delay: 1}, points: [{x: 32, y: 8}, {x: 40, y: 8}]},
    ]};
    const ctx = {level} as BiomeContext;
    expect(roadContact(ctx, 10)).toMatchObject({y: 8, z: 6, width: 7});
    for (const x of [-2, 20.1, 21, 25, 35, 42]) expect(roadContact(ctx, x)).toBeNull();
    expect(roadContact(ctx, 19, 4)).toBeNull();
  });

  it('keeps every sloped railing post on its real deck and clips both sides of a gap', () => {
    const registry = createRegistry(), kit = new SceneKit(registry), material = new THREE.MeshBasicMaterial();
    const level = {...LEVELS[0], tracks: [
      {id: 'slope', suction: false, points: [{x: 0, y: 8, z: 6}, {x: 12, y: 10.4, z: 6}]},
      {id: 'landing', suction: false, points: [{x: 20, y: 8, z: 6}, {x: 32, y: 8, z: 6}]},
    ]};
    const ctx = {level, t: {k: kit, m: {galvanized: material, steel: material}}} as unknown as BiomeContext;
    roadRail(ctx, 16, 40, 1);kit.flush();
    const posts: THREE.Vector3[] = [], matrix = new THREE.Matrix4(), scale = new THREE.Vector3(), pos = new THREE.Vector3(), q = new THREE.Quaternion();
    for (const item of kit.group.children as THREE.InstancedMesh[]) for (let i = 0; i < item.count; i++) {
      item.getMatrixAt(i, matrix);matrix.decompose(pos, q, scale);
      if (Math.abs(scale.x - .12) < .0001 && Math.abs(scale.y - ROADSIDE.guardrail.postHeight) < .0001) posts.push(new THREE.Vector3(pos.x, pos.y - scale.y / 2, pos.z));
    }
    expect(posts.length).toBeGreaterThan(6);
    for (const post of posts) {
      expect(post.x < 12 || post.x > 20).toBe(true);
      expect(post.y).toBeCloseTo(post.x < 12 ? 8 + post.x * .2 : 8, 5);
      expect(post.z).toBeCloseTo(9.15, 5);
    }
    registry.dispose();material.dispose();
  });
});
