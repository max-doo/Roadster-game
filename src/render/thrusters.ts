import type { GameSnapshot } from '../game/types';

// Original game model layout, not measured manufacturer nozzle coordinates.
export const REAR_NOZZLE_X = -2.45;
export const REAR_NOZZLE_Z = [-.45, -.15, .15, .45] as const;
export const LIFT_NOZZLE_X = [-1.95, 1.98] as const;
export const LIFT_NOZZLE_Z = [-.72, .72] as const;
export const ATTITUDE_UP_PORTS=LIFT_NOZZLE_X.flatMap(x=>LIFT_NOZZLE_Z.map(z=>({x,y:x<0?.383:.146,z})));

type JetState=Pick<GameSnapshot,'x'|'y'|'z'|'vx'|'vy'|'angle'|'angularVelocity'>;
function worldJet(s:JetState,x:number,y:number,z:number,dx:number,dy:number,kind:'rear'|'lift'|'attitude'){
  const c=Math.cos(s.angle),n=Math.sin(s.angle),rx=x*c-y*n,ry=x*n+y*c;
  return {kind,x:s.x+rx,y:s.y+ry,z:s.z+z,
    vx:s.vx-s.angularVelocity*ry+dx*c-dy*n,
    vy:s.vy+s.angularVelocity*rx+dx*n+dy*c,vz:0};
}

/** Exhaust goes opposite to each body-local thrust component, then rotates with the car. */
export function exhaustJets(s: JetState & {boosting?:boolean}) {
  return [
    ...REAR_NOZZLE_Z.map(z=>worldJet(s,REAR_NOZZLE_X,-.18,z,-12,0,'rear')),
    ...(s.boosting?[]:LIFT_NOZZLE_X.flatMap(x=>LIFT_NOZZLE_Z.map(z=>worldJet(s,x,-.475,z,0,-18,'lift')))),
  ];
}

/** Opposed front/rear jets represent a pitch couple, with no extra net lift. */
export function attitudeJets(s:JetState & Pick<GameSnapshot,'pitchInput'|'grounded'|'mode'>){
  if(!['airborne','overturned'].includes(s.mode)||s.grounded||Math.abs(s.pitchInput)<=.05)return [];
  const pitch=Math.max(-1,Math.min(1,s.pitchInput)),speed=14*Math.abs(pitch);
  const frontDown=pitch>0;
  return [
    ...LIFT_NOZZLE_X.filter(x=>(x>0)===frontDown).flatMap(x=>LIFT_NOZZLE_Z.map(z=>worldJet(s,x,-.475,z,0,-speed,'attitude'))),
    ...ATTITUDE_UP_PORTS.filter(p=>(p.x<0)===frontDown).map(p=>worldJet(s,p.x,p.y,p.z,0,speed,'attitude')),
  ];
}
