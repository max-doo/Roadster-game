import type { Level, RoadEvent, RoadEventKind, Track } from '../types';
import { p } from './helpers';

type Slot={stage:number;kind:RoadEventKind;escape:RoadEvent['escape']};
const slots:Record<number,Slot[]>={
  4:[{stage:0,kind:'battery',escape:'jump'},{stage:1,kind:'stall',escape:'jump'},{stage:2,kind:'battery',escape:'jump'},{stage:3,kind:'parking',escape:'jump'}],
  5:[{stage:0,kind:'battery',escape:'jump'},{stage:3,kind:'parking',escape:'jump'},{stage:5,kind:'battery',escape:'jump'}],
  6:[{stage:0,kind:'chase',escape:'jump'},{stage:1,kind:'parking',escape:'jump'},{stage:2,kind:'battery',escape:'jump'},{stage:3,kind:'stall',escape:'jump'},{stage:5,kind:'chase',escape:'jump'}],
  7:[{stage:0,kind:'battery',escape:'jump'},{stage:1,kind:'parking',escape:'jump'},{stage:2,kind:'chase',escape:'jump'},{stage:3,kind:'battery',escape:'jump'},{stage:4,kind:'chase',escape:'jump'}],
  8:[{stage:0,kind:'battery',escape:'jump'},{stage:1,kind:'stall',escape:'jump'},{stage:3,kind:'chase',escape:'jump'},{stage:4,kind:'battery',escape:'jump'}],
  9:[{stage:0,kind:'battery',escape:'jump'},{stage:3,kind:'parking',escape:'jump'},{stage:5,kind:'chase',escape:'jump'}],
  10:[{stage:0,kind:'battery',escape:'jump'},{stage:1,kind:'stall',escape:'jump'},{stage:2,kind:'combo',escape:'jump'},{stage:3,kind:'chase',escape:'jump'},{stage:4,kind:'battery',escape:'jump'},{stage:5,kind:'parking',escape:'jump'},{stage:6,kind:'chase',escape:'jump'}],
};

/** Replace the recovery straight with an authored encounter; retain a quiet apron on both sides. */
export function eventRecovery(level:Level,stage:number,track:Track):number {
  const slot=slots[level.id]?.find(s=>s.stage===stage);if(!slot)return 0;
  const a=track.points[0],b=track.points.at(-1)!,base=a.x+38;
  const length=slot.kind==='combo'?158:slot.kind==='chase'?142:slot.kind==='battery'?112:100;
  const end=Math.max(b.x,base+length+22),added=end-b.x;
  track.points=[a,p(end,a.y,a.z)];
  const event:RoadEvent={...slot,id:`event-${level.id}-${stage}`,x:base,y:a.y,z:a.z??0,length,trackId:track.id,first:level.id===4&&stage===0||level.id===6&&stage===0};
  (level.roadEvents??=[]).push(event);
  return added;
}

export function earlyRoadEvents(level:Level):Level {
  level={...level};
  const make=(id:string,x:number,y:number,z:number,trackId:string,kind:'stall'|'parking',length:number):RoadEvent=>({id,kind,x,y,z,trackId,length,escape:'jump'});
  level.roadEvents=level.id===1?[make('event-1-0',306,0,0,'long-jump','stall',76)]:level.id===2?[make('event-2-0',143,-5,-8,'release-bay','parking',47)]:[
    make('event-3-0',86,4,6,'midair-platform','stall',68),make('event-3-1',354,-4,12,'freight-exit','parking',44),
  ];
  if(level.id===1)level.hazards=level.hazards.filter(h=>h.x!==362);
  if(level.id===2)level.hazards=level.hazards.filter(h=>h.x!==174);
  level.revision=(level.revision??1)+1;
  return level;
}
