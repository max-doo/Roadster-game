import type { RoadActor, RoadEvent, RoadEventView, Vec } from './types';

type Run={at:number;hit:boolean;clear:boolean};
export type EventSave=[string,Run][];
/** Fixed per encounter, so retries teach timing without a global three-second countdown. */
export function trafficTiming(e:RoadEvent){
  const seed=[...e.id].reduce((n,c)=>n+c.charCodeAt(0),0);
  return {release:.42+(seed%4)*.1,batterySpeed:24+seed%5*2,lead:32+seed%4*3,rearGap:48+seed%3*8,chaseSpeed:40+seed%4*2};
}

/** In-scene jokes begin with the incident itself, never as advance instructions. */
export function trafficSpeech(e:RoadEvent,age:number):{actor:string;lines:string[]}|undefined {
  const release=trafficTiming(e).release;
  if((e.kind==='battery'||e.kind==='combo')&&age>=release&&age<release+2.6)
    return {actor:`${e.id}-source`,lines:['电池先走，','我垫后。']};
  const rearAge=age-(e.kind==='combo'?1.65:0);
  if((e.kind==='chase'||e.kind==='combo')&&rearAge>=.8&&rearAge<5.5)
    return {actor:`${e.id}-chaser`,lines:['踏板断了！','借过——']};
}

/** Continuous SAT of a moving actor box against the oriented chassis.
 * Relative motion is swept over the whole physics step, including a fast battery. */
export function sweptActorHit(from:Vec,to:Vec,angle:number,a:RoadActor,b:RoadActor):boolean {
  const c=Math.cos(angle),s=Math.sin(angle);
  const dx=from.x-s*.16-a.x,dy=from.y+c*.16-a.y;
  const vx=to.x-from.x-(b.x-a.x),vy=to.y-from.y-(b.y-a.y);
  let entry=0,exit=1;
  for(const [nx,ny] of [[1,0],[0,1],[c,s],[-s,c]]){
    const r=2.25*Math.abs(nx*c+ny*s)+.41*Math.abs(-nx*s+ny*c)+a.w/2*Math.abs(nx)+a.h/2*Math.abs(ny);
    const p=dx*nx+dy*ny,v=vx*nx+vy*ny;
    if(Math.abs(v)<1e-9){if(Math.abs(p)>r)return false;continue;}
    const t0=(-r-p)/v,t1=(r-p)/v;entry=Math.max(entry,Math.min(t0,t1));exit=Math.min(exit,Math.max(t0,t1));
    if(entry>exit)return false;
  }
  return true;
}

export class RoadEvents {
  private runs=new Map<string,Run>();
  constructor(readonly definitions:RoadEvent[]){}
  save():EventSave{return [...this.runs].map(([id,r])=>[id,{...r}]);}
  restore(saved:EventSave){this.runs=new Map(saved.map(([id,r])=>[id,{...r}]));}
  begin(time:number,p:Vec,z:number,vx:number,trackId:string){
    for(const e of this.definitions)if(!this.runs.has(e.id)&&trackId===e.trackId&&vx>1&&p.x>=e.x&&p.x<e.x+28&&Math.abs(p.y-e.y)<3&&Math.abs(z-e.z)<2.5)this.runs.set(e.id,{at:time,hit:false,clear:false});
  }
  finish(p:Vec,z:number):RoadEvent[]{
    const cleared:RoadEvent[]=[];
    for(const e of this.definitions){
      const r=this.runs.get(e.id);
      if(r&&!r.clear&&p.x>=e.x+e.length&&Math.abs(z-e.z)<3){r.clear=true;cleared.push(e);}
    }
    return cleared;
  }
  actors(time:number):RoadActor[]{
    const out:RoadActor[]=[];
    for(const e of this.definitions){const r=this.runs.get(e.id);if(r?.clear&&e.kind!=='stall'&&e.kind!=='parking')continue;const age=r?Math.max(0,time-r.at):0;
      const tuning=trafficTiming(e);
      const car=(id:string,x:number,y:number,dangerous:boolean,warning:boolean,w=4.54,h=1.72)=>out.push({id:`${e.id}-${id}`,eventId:e.id,kind:'car',x,y,z:e.z,w,h,warning,dangerous:dangerous&&!r?.hit,direction:1});
      if(e.kind==='battery'||e.kind==='combo'){
        const release=tuning.release,launch=e.x+tuning.lead+12*release;
        const source=e.x+tuning.lead+12*Math.min(age,release);
        if(source<e.x+e.length+50)car('source',source,e.y+.86,false,false);
        if(r&&age>=release){const x=launch-tuning.batterySpeed*(age-release);if(x>e.x-45)out.push({id:`${e.id}-battery`,eventId:e.id,kind:'battery',x,y:e.y+.55,z:e.z,w:2.4,h:.36,warning:false,dangerous:true,direction:-1});}
      }
      if(e.kind==='stall'||e.kind==='parking'){
        const x=e.x+Math.min(50,Math.max(32,e.length-18));
        car('blocker',x,e.y+1.65,!!r&&!r.clear,false,7.2,3.3);
      }
      if(!r)continue;
      if(e.kind==='chase'||e.kind==='combo'){
        const delay=e.kind==='combo'?1.65:0,t=age-delay;
        if(t>=0){const x=e.x-tuning.rearGap+tuning.chaseSpeed*t;if(x<e.x+e.length+30)car('chaser',x,e.y+.95,true,false,5.5,1.9);}
      }
    }
    return out;
  }
  hitCar(eventId:string):boolean {const r=this.runs.get(eventId);if(!r||r.hit)return false;r.hit=true;return true;}
  collision(from:Vec,to:Vec,z:number,angle:number,time:number,dt:number):'battery'|'car'|undefined {
    const previous=this.actors(time),next=this.actors(time+dt);
    for(const b of next){if(!b.dangerous||Math.abs(z-b.z)>2.1)continue;const a=previous.find(v=>v.id===b.id)??b;
      if(sweptActorHit(from,to,angle,a,b)){if(b.kind==='battery')return 'battery';this.runs.get(b.eventId)!.hit=true;return 'car';}
    }
  }
  views(time:number):RoadEventView[]{return this.definitions.flatMap(e=>{const r=this.runs.get(e.id);if(!r)return [];const age=Math.max(0,time-r.at);return [{id:e.id,kind:e.kind,age,phase:r.clear?'clear':'active',x:e.x,y:e.y,z:e.z,end:e.x+e.length,escape:e.escape,hit:r.hit}];});}
  warning(time:number){
    const e=this.definitions.find(e=>{const r=this.runs.get(e.id);return r&&!r.clear;});if(!e)return undefined;
    const age=time-this.runs.get(e.id)!.at,rear=e.kind==='chase'||e.kind==='combo'&&age>=5;
    const action=e.escape==='ceiling'?'HOLD SUCTION · UPPER ROUTE':e.escape==='bridge'?rear?'HIGH DECK · BRAKE AND WAIT':'THRUST · HIGH DECK':rear?'THRUST · ESCAPE AHEAD':e.kind==='parking'?'WAIT OR THRUST OVER':'THRUST · CLEAR THE HAZARD';
    return {id:e.id,direction:rear?'rear' as const:'front' as const,text:rear?'BRAKE PEDAL BROKEN!':e.kind==='battery'||e.kind==='combo'?'BATTERY EJECTION':e.kind==='parking'?'PARKING · PLEASE WAIT':'POWERTRAIN TAKING A BREAK',action};
  }
}
