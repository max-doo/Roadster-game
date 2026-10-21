import type { Level } from '../types';
import { earlyRoadEvents } from './roadEvents';
import { ignition } from './01-ignition';
import { inversion } from './02-inversion';
import { skyfall } from './03-skyfall';

import { level04 } from './04-aftershock';
import { level05 } from './05-vertigo';
import { level06 } from './06-freightline';
import { level07 } from './07-blackout';
import { level08 } from './08-crosswind';
import { level09 } from './09-the-needle';
import { level10 } from './10-terminus';

export const LEVELS:Level[] = [earlyRoadEvents(ignition),earlyRoadEvents(inversion),earlyRoadEvents(skyfall),level04,level05,level06,level07,level08,level09,level10];

// Full-size commercial vehicles replace the shallow passenger-car roadblocks.
for(const level of LEVELS){
  if(level.id>=4)level.tutorials=[];
  if(level.id<=3)level.revision=(level.revision??1)+2;
  if(level.id===1)level.hazards=level.hazards.filter(h=>h.x!==135&&h.x!==153);
  level.hazards=level.hazards.map(h=>h.kind==='car'||h.kind==='van'?{...h,motion:undefined,x:h.x,y:h.y-h.h/2+1.65,w:7.2,h:3.3}:h);
  if(level.id<=3){
    for(const c of level.collectibles??[])if(c.kind==='pressure')c.amount=40;
    // Visible supplies replace the old invisible refill at checkpoints.
    const cans=level.id===1?[{x:50,y:1.6},{x:164,y:1.6},{x:300,y:1.6}]:level.id===3?[{x:60,y:5.6,z:6},{x:240,y:-8.4,z:12},{x:365,y:-2.4,z:12}]:[];
    for(const [i,p] of cans.entries())(level.collectibles??=[]).push({id:`route-${level.id}-gas-${i}`,kind:'pressure',...p,amount:40});
  }
}
