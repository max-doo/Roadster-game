import {describe,expect,it} from 'vitest';
import * as THREE from 'three';
import {createVehicle} from '../src/render/vehicle';
import {createTrafficSuv} from '../src/render/trafficSuv';
import {ATTITUDE_UP_PORTS,REAR_NOZZLE_X,REAR_NOZZLE_Z,exhaustJets} from '../src/render/thrusters';
import type {GameSnapshot} from '../src/game/types';

const moving:GameSnapshot={x:0,y:4,z:0,health:100,damageEvents:0,lastDamage:0,angle:0,vx:25,vy:0,angularVelocity:0,speed:25,pressure:80,mode:'airborne',suction:true,respawnProtected:false,thrusting:true,boosting:false,grounded:false,time:1,worldTime:1,collectedStars:[],collectedItems:[],pickup:'',pickupEvent:0,platform:null,progress:0,checkpoint:0,trackIndex:0,crashes:0,airtime:1,flips:0,maxSpeed:25,stars:0,message:'',suspension:[0,0],contactNormal:{x:0,y:1},contactPoints:[],force:{x:0,y:0},suctionForce:{x:0,y:0},thrustForce:{x:13,y:26},braking:false,adhesionWarning:false,pitchInput:1};

describe('reference-refined vehicle asset',()=>{
  it('builds the detailed SUV with finite normals and geometry within a mobile triangle budget',()=>{
    const geometries:THREE.BufferGeometry[]=[],materials:THREE.Material[]=[];
    const suv=createTrafficSuv(g=>{geometries.push(g);return g;},(color,metalness=.3,roughness=.5,emissive=0)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness,emissive});materials.push(m);return m;});
    try{
      const bounds=new THREE.Box3().setFromObject(suv),size=bounds.getSize(new THREE.Vector3());let triangles=0;
      for(const g of geometries){const p=g.getAttribute('position'),n=g.getAttribute('normal');expect([...p.array,...n.array].every(Number.isFinite)).toBe(true);triangles+=(g.index?.count??p.count)/3;}
      expect(size.x).toBeGreaterThan(4.5);expect(size.x).toBeLessThan(5.1);expect(size.y).toBeLessThan(2);expect(triangles).toBeGreaterThan(8000);expect(triangles).toBeLessThan(60000);
    }finally{geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
  });
  it('has finite geometry within the existing mesh budget and an outward rear skin',()=>{
    const rig=createVehicle();
    try{
      let triangles=0,meshes=0;
      rig.group.traverse(o=>{
        if(!(o instanceof THREE.Mesh))return;
        meshes++;
        const position=o.geometry.getAttribute('position');
        triangles+=(o.geometry.index?.count??position.count)/3;
        for(const key of ['position','normal']){
          const attribute=o.geometry.getAttribute(key);
          for(const value of attribute.array)if(!Number.isFinite(value))throw new Error(`${o.name}: non-finite ${key}`);
        }
      });
      expect(triangles).toBeLessThan(240000);expect(meshes).toBeLessThanOrEqual(100);
      const valance=rig.group.getObjectByName('Sculpted-rear-valance') as THREE.Mesh;
      const normal=valance.geometry.getAttribute('normal');
      for(let i=0;i<normal.count;i++)expect(normal.getX(i)).toBeLessThan(0);
      const canopy=rig.group.getObjectByName('Bronze-aircraft-canopy') as THREE.Mesh;
      canopy.geometry.computeBoundingBox();
      expect(canopy.geometry.boundingBox!.min.x).toBeLessThan(-2);
      expect(canopy.geometry.boundingBox!.max.x).toBeGreaterThan(1.4);
      expect(canopy.geometry.boundingBox!.max.y).toBeLessThan(.65);
      const wheel=rig.group.getObjectByName('Wheel-front-port')!;
      const wheelBounds=new THREE.Box3().setFromObject(wheel);
      expect(wheelBounds.min.y).toBeCloseTo(-.712,2);
      expect(wheelBounds.max.z).toBeLessThan(1.08);
    }finally{rig.dispose();}
  });

  it('keeps exhaust origins on the recessed rear outlets and flush attitude ports',()=>{
    const rig=createVehicle();
    try{
      const bank=rig.group.getObjectByName('Rear-vectored-nozzle-bank')!;
      const jets=exhaustJets({...moving,x:0,y:0,z:0}).filter(j=>j.kind==='rear');
      expect(jets.map(j=>j.z)).toEqual([...REAR_NOZZLE_Z]);
      for(const jet of jets){expect(jet.x).toBeCloseTo(bank.position.x-.04);expect(jet.x).toBe(REAR_NOZZLE_X);expect(jet.y).toBe(bank.position.y);}
      const ports:THREE.Object3D[]=[];
      rig.group.traverse(o=>{if(o.name==='Upper-attitude-nozzle')ports.push(o);});
      expect(ports.map(p=>p.position.toArray())).toEqual(ATTITUDE_UP_PORTS.map(p=>[p.x,p.y,p.z]));
    }finally{rig.dispose();}
  });

  it('exposes two recessed headlamps with clear lenses, reflectors and illuminated cells',()=>{
    const rig=createVehicle();
    try{
      rig.group.updateMatrixWorld(true);
      for(const [name,side] of [['Headlamp-port',1],['Headlamp-starboard',-1]] as const){
        const lamp=rig.group.getObjectByName(name)!;
        expect(lamp).toBeDefined();
        const bounds=new THREE.Box3().setFromObject(lamp);
        expect(bounds.min.x).toBeGreaterThan(1.9);expect(bounds.max.x).toBeLessThan(2.5);
        expect(bounds.max.z*side).toBeGreaterThan(.70);expect(bounds.min.z*side).toBeGreaterThan(-.01);
        const lens=lamp.getObjectByName('Headlamp-lens') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshPhysicalMaterial>;
        expect(lens.material.transparent).toBe(true);expect(lens.material.opacity).toBeLessThan(.3);expect(lens.castShadow).toBe(false);
        expect(lamp.getObjectByName('Headlamp-reflectors')).toBeDefined();
        const emitters=lamp.getObjectByName('Headlamp-LED-array') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
        expect(emitters.material.emissiveIntensity).toBeGreaterThan(1);
        // Probe an actual LED triangle through the body. This catches the original missing
        // light and a lamp added beneath an uncut painted fender or an opaque cover.
        const points=emitters.geometry.getAttribute('position');
        const target=new THREE.Vector3();
        for(let i=0;i<3;i++)target.add(new THREE.Vector3().fromBufferAttribute(points,i));target.multiplyScalar(1/3);
        emitters.localToWorld(target);
        const ray=new THREE.Raycaster(new THREE.Vector3(target.x,2,target.z),new THREE.Vector3(0,-1,0));
        const hits=ray.intersectObject(rig.group,true);
        expect(hits[0].object).toBe(lens);
        expect(hits.some(hit=>hit.object===emitters)).toBe(true);
        const floor=lamp.getObjectByName('Headlamp-recess-floor') as THREE.Mesh;
        floor.geometry.computeBoundingBox();lens.geometry.computeBoundingBox();
        expect(floor.geometry.boundingBox!.max.y).toBeLessThan(lens.geometry.boundingBox!.max.y-.02);
      }
    }finally{rig.dispose();}
  });

  it('deploys the wing, rolls the wheels and restores the complete rest pose',()=>{
    const rig=createVehicle();
    try{
      const transforms=()=>{const items:unknown[]=[];rig.group.traverse(o=>items.push([o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.visible]));return items;};
      const initial=transforms(),wing=rig.group.getObjectByName('Active-rear-wing')!,restY=wing.position.y;
      for(let i=0;i<100;i++)rig.update({...moving,time:i/60},1/60);
      expect(wing.position.y-restY).toBeGreaterThan(.20);
      const wheel=rig.group.getObjectByName('Wheel-front-port')!;
      expect(Math.abs(wheel.children[0].rotation.z)).toBeGreaterThan(1);
      for(const part of wing.parent!.children.filter(o=>o.name==='Articulated-wing-strut')){
        expect(part.visible).toBe(true);
        expect(part.position.y+.025*part.scale.y).toBeCloseTo(wing.position.y);
      }
      rig.reset!();expect(transforms()).toEqual(initial);
    }finally{rig.dispose();}
  });
});
