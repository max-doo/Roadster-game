import {beforeAll,expect,it,vi} from 'vitest';
import {GameCore,initPhysics} from '../src/game/core';
import {LEVELS} from '../src/game/levels';
import {RoadEvents,sweptActorHit,trafficTiming,trafficSpeech} from '../src/game/roadEvents';
import {loadSave} from '../src/game/save';
import type {Level,RoadActor,RoadEvent} from '../src/game/types';
import {replayInput} from './replay-policy';

beforeAll(initPhysics);
const event:RoadEvent={id:'battery-test',kind:'battery',x:0,y:0,z:0,length:190,trackId:'flat',escape:'jump'};
const flat=(e=event):Level=>({...LEVELS[0],start:{x:0,y:.84},finish:{x:220,y:0},killY:-30,tracks:[{id:'flat',suction:false,points:[{x:-200,y:0},{x:260,y:0}]}],checkpoints:[],hazards:[],collectibles:[],roadEvents:[e]});

it('authors 35 reachable encounters with sparse stage checkpoints and no event bypasses',()=>{
  expect(LEVELS.map(l=>l.roadEvents?.length)).toEqual([1,1,2,4,3,5,5,4,3,7]);
  expect(new Set(LEVELS.flatMap(l=>l.roadEvents!.map(e=>e.id))).size).toBe(35);
  for(const l of LEVELS.slice(3))for(const e of l.roadEvents!){
    expect(l.checkpoints.length).toBeLessThanOrEqual(4);
    expect(l.checkpoints.every((c,i)=>i===0||c.x-l.checkpoints[i-1].x>200)).toBe(true);
    expect(l.tracks.find(t=>t.id===e.trackId)?.motion).toBeUndefined();
    const bypass=l.tracks.filter(t=>t.id.startsWith(e.id));
    expect(Math.max(e.x,...bypass.flatMap(t=>t.points.map(p=>p.x)))).toBeLessThan(e.x+e.length);
  }
});

it('has no event escape bridges and keeps battery release and relative reaction windows bounded',()=>{
  const batteries=LEVELS.flatMap(l=>l.roadEvents!.filter(e=>e.kind==='battery'||e.kind==='combo'));
  expect(new Set(batteries.map(e=>trafficTiming(e).release)).size).toBeGreaterThan(1);
  for(const level of LEVELS){
    expect(level.tracks.some(t=>t.id.includes('escape-'))).toBe(false);
    expect(level.roadEvents!.every(e=>e.escape==='jump')).toBe(true);
  }
  for(const e of batteries){
    const tuning=trafficTiming(e),system=new RoadEvents([e]);
    system.begin(0,{x:e.x,y:e.y+.84},e.z,32,e.trackId);
    expect(system.actors(tuning.release-.001).some(a=>a.kind==='battery')).toBe(false);
    const pack=system.actors(tuning.release+.001).find(a=>a.kind==='battery')!;
    expect(pack).toBeDefined();expect(tuning.release).toBeLessThan(.8);
    const contact=tuning.release+(tuning.lead+12*tuning.release-32*tuning.release-3.45)/(32+tuning.batterySpeed);
    expect(contact).toBeGreaterThan(.65);expect(contact).toBeLessThan(1.4);
    const next=system.actors(tuning.release+.101).find(a=>a.kind==='battery')!;
    expect((pack.x-next.x)/.1).toBeCloseTo(tuning.batterySpeed,5);
  }
});

it('shows the source before triggering, freezes it at launch and speaks only at the incident',()=>{
  const system=new RoadEvents([event]),tuning=trafficTiming(event);
  expect(system.actors(0).map(a=>a.id)).toEqual(['battery-test-source']);
  expect(system.actors(0)[0].x).toBe(event.x+tuning.lead);
  expect(system.views(0)).toEqual([]);
  system.begin(0,{x:0,y:.84},0,20,'flat');
  const launch=system.actors(tuning.release).find(a=>a.id.endsWith('-source'))!;
  expect(system.actors(tuning.release+2).find(a=>a.id===launch.id)?.x).toBe(launch.x);
  expect(system.actors(tuning.release).find(a=>a.kind==='battery')?.x).toBe(launch.x);
  expect(trafficSpeech(event,tuning.release-.001)).toBeUndefined();
  expect(trafficSpeech(event,tuning.release)?.actor).toBe(launch.id);
  expect(trafficSpeech(event,tuning.release)?.lines.join('')).toContain('电池先走');
  expect(trafficSpeech({...event,kind:'chase'},1)?.lines.join('')).toContain('踏板断了');
});

it('solid event trucks stop a driven chassis and stay solid after a damage event',()=>{
  const g=new GameCore(flat({...event,kind:'stall'}));g.input.accelerate=true;
  let touched=false,blockedFrames=0;
  try{
    for(let i=0;i<120*5;i++){
      g.step();const s=g.snapshot(),truck=s.roadActors?.find(a=>a.id.endsWith('-blocker'));
      if(!truck)continue;
      if(s.damageEvents)touched=true;
      if(touched){expect(s.x+2.25).toBeLessThanOrEqual(truck.x-truck.w/2+.18);blockedFrames++;}
    }
    expect(touched).toBe(true);expect(blockedFrames).toBeGreaterThan(120);
    expect(g.snapshot().health).toBeGreaterThan(0);
    const truck=g.snapshot().roadActors!.find(a=>a.id.endsWith('-blocker'))!;
    for(let i=0;i<120*15;i++)g.step();
    expect(g.snapshot().mode).not.toBe('finished');
    expect(g.snapshot().roadActors!.find(a=>a.id===truck.id)?.x).toBe(truck.x);
    g.retry();expect(g.snapshot().roadActors?.every(a=>a.id.endsWith('-blocker')&&!a.dangerous)).toBe(true);
    for(let i=0;i<120;i++)g.step();expect(g.snapshot().health).toBe(100);
  }finally{g.dispose();}
});

it('sweeps fast batteries and respects chassis orientation and visible vertical clearance',()=>{
  const a:RoadActor={id:'b',eventId:'e',kind:'battery',x:12,y:.55,z:0,w:2.4,h:.36,warning:false,dangerous:true,direction:-1};
  expect(sweptActorHit({x:0,y:.84},{x:0,y:.84},0,a,{...a,x:-12})).toBe(true);
  expect(sweptActorHit({x:0,y:3},{x:0,y:3},0,a,{...a,x:-12})).toBe(false);
  expect(sweptActorHit({x:0,y:2},{x:0,y:2},Math.PI/2,a,{...a,x:-12})).toBe(true);
});

it('returns an iterable on the first frame and reports each newly completed encounter once',()=>{
  const system=new RoadEvents([event]);
  expect(system.finish({x:0,y:.84},0)).toEqual([]);
  system.begin(0,{x:1,y:.84},0,20,'flat');
  expect(system.finish({x:100,y:.84},0)).toEqual([]);
  expect(system.finish({x:190,y:.84},0)).toEqual([event]);
  expect(system.finish({x:191,y:.84},0)).toEqual([]);
});

it('releases a fast battery within a second and kills only once on an actual hit',()=>{
  const g=new GameCore(flat());g.body.setLinvel({x:32,y:0},true);g.input.accelerate=true;
  try{
    for(let i=0;i<120*8&&g.snapshot().mode!=='crashed';i++){
      g.step();const s=g.snapshot();if((s.roadEvents?.[0]?.age??Infinity)<trafficTiming(event).release){expect(s.roadActors?.some(a=>a.kind==='battery')).toBe(false);expect(s.health).toBe(100);}
    }
    const s=g.snapshot();expect(s.mode).toBe('crashed');expect(s.time).toBeGreaterThanOrEqual(trafficTiming(event).release);expect(s.health).toBe(0);expect(s.message).toContain('BATTERY IMPACT');
    for(let i=0;i<120;i++)g.step();expect(g.snapshot().crashes).toBe(1);expect(g.snapshot().worldTime).toBe(s.worldTime);
    g.retry();expect(g.snapshot().roadActors?.every(a=>a.id.endsWith('-source')&&!a.dangerous)).toBe(true);expect(g.snapshot().roadEvents).toEqual([]);expect(g.snapshot().health).toBe(100);
  }finally{g.dispose();}
});

it('allows a stationary player to observe, then survive a first rear impact without repeated contact damage',()=>{
  const g=new GameCore(flat({...event,kind:'chase'}));g.input.accelerate=true;
  try{
    while(!g.snapshot().roadWarning)g.step();g.input.accelerate=false;g.input.brake=true;
    while(g.snapshot().vx>1)g.step();g.input.brake=false;
    for(let i=0;i<120*7;i++)g.step();
    const s=g.snapshot();expect(s.mode).not.toBe('crashed');expect(s.health).toBe(30);expect(s.damageEvents).toBe(1);
    expect(s.roadEvents?.[0].hit).toBe(true);expect(s.roadEvents?.[0].age).toBeGreaterThan(4);
  }finally{g.dispose();}
});

it('freezes with no physics steps, requires the correct road layer/direction, and restores independent checkpoint state',()=>{
  const system=new RoadEvents([event]);
  system.begin(0,{x:1,y:.84},-5,20,'flat');system.begin(0,{x:1,y:.84},0,-20,'flat');system.begin(0,{x:1,y:.84},0,20,'other');expect(system.views(0)).toEqual([]);
  system.begin(0,{x:1,y:.84},0,20,'flat');const before=system.save();
  expect(system.actors(2)).toEqual(system.actors(2));system.begin(3,{x:1,y:.84},0,20,'flat');expect(system.views(3)[0].age).toBe(3);
  system.finish({x:190,y:.84},0);expect(system.views(4)[0].phase).toBe('clear');
  system.restore(before);expect(system.views(1)[0].phase).toBe('active');expect(before[0][1].clear).toBe(false);
  const complete=system.save();system.finish({x:190,y:.84},0);const after=system.save();system.restore(after);expect(system.actors(10)).toEqual([]);system.restore(complete);expect(system.actors(1).length).toBeGreaterThan(0);
});

it('archives pre-event course records while preserving unlocks, settings and star identities',()=>{
  const record={revision:2,time:30,stars:3,crashes:0,flips:0,collectedStars:['ignition-1']};
  vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({version:1,unlocked:10,records:{1:record},settings:{language:'en'},tutorials:['1:thrust']})});
  try{const save=loadSave();expect(save.unlocked).toBe(10);expect(save.settings.language).toBe('en');expect(save.legacyRecords?.['1:v2']).toEqual(record);expect(save.tutorials).toContain('1:thrust');}finally{vi.unstubAllGlobals();}
});

for(const l of LEVELS)it(`activates and clears every event in ${l.name} using collectible gas supplies`,()=>{
  const g=new GameCore({...l,collectibles:l.collectibles?.filter(c=>c.kind==='pressure')});
  try{for(let frame=0;frame<120*360;frame++){const s=g.snapshot();if(['crashed','finished'].includes(s.mode))break;g.input=replayInput(l.id,s);g.step();}
    const s=g.snapshot();expect(s.mode,s.message).toBe('finished');expect(s.roadEvents).toHaveLength(l.roadEvents!.length);expect(s.eventsCleared).toHaveLength(l.roadEvents!.length);
    expect(s.roadEvents?.filter(e=>e.hit)).toEqual([]);
  }finally{g.dispose();}
},20000);
