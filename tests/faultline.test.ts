import {beforeAll,expect,it,vi} from 'vitest';
import {GameCore,initPhysics} from '../src/game/core';
import {LEVELS} from '../src/game/levels';
import {windAt} from '../src/game/wind';
import {loadSave,completeLevel} from '../src/game/save';
import {replayInput,collectReplayInput} from './replay-policy';
import type {Level} from '../src/game/types';

beforeAll(initPhysics);
const advance=(g:GameCore,seconds:number)=>{for(let i=0;i<seconds*120;i++)g.step();};

it('requires ground boost to crest the authored coastal climb, even with a fast motor-only entry',()=>{
 const l=LEVELS[3],climb=l.tracks.find(t=>t.id.endsWith('-boost-climb'))!,summit=l.tracks.find(t=>t.id.endsWith('-summit'))!;
 for(const boost of [false,true]){
  const a=climb.points[0],top=summit.points[0];
  const g=new GameCore({...l,start:{x:a.x-3,y:a.y+.84},tracks:[{id:'entry',suction:false,points:[{x:a.x-10,y:a.y},a]},climb,summit],checkpoints:[],collectibles:[],roadEvents:[],hazards:[],windZones:[],finish:{x:top.x+5,y:top.y}});
  try{
   g.body.setLinvel({x:30,y:0},true);g.input={accelerate:true,brake:false,suction:true,thrust:false,boost,pitch:0};let maxX=a.x;
   for(let i=0;i<120*20;i++){g.step();maxX=Math.max(maxX,g.snapshot().x);if(['finished','crashed'].includes(g.snapshot().mode))break;}
   if(boost){expect(g.snapshot().mode).toBe('finished');expect(g.snapshot().thrusting).toBe(false);expect(g.snapshot().pressure).toBeGreaterThan(0);expect(g.snapshot().pressure).toBeLessThan(100);}
   else{expect(maxX).toBeLessThan(top.x-15);expect(g.snapshot().pressure).toBe(100);}
  }finally{g.dispose();}
 }
});

for(const level of LEVELS.slice(3))it(`finishes ${level.id} ${level.name} with collectible gas and continues after a retry`,()=>{
  const g=new GameCore({...level,collectibles:level.collectibles?.filter(c=>c.kind==='pressure')});let retried=false;
  try{
    for(let frame=0;frame<120*300;frame++){
      const s=g.snapshot();
      if(s.mode==='crashed'||s.mode==='finished')break;
      if(!retried&&s.checkpoint===2&&s.grounded){g.retry();retried=true;}
      g.input=replayInput(level.id,g.snapshot());g.step();
    }
    const s=g.snapshot();expect(retried).toBe(true);expect(s.mode,s.message).toBe('finished');
    expect(s.checkpoint).toBe(level.checkpoints.length-1);expect(s.health).toBeGreaterThan(0);expect(s.collectedStars).toEqual([]);
  }finally{g.dispose();}
},15000);

for(const level of LEVELS.slice(3))it(`collects all four optional stars in ${level.name} using player controls`,()=>{
  const g=new GameCore(level);
  try{
    for(let frame=0;frame<120*300;frame++){const s=g.snapshot();if(['crashed','finished'].includes(s.mode))break;g.input=collectReplayInput(level.id,s);g.step();}
    expect(g.snapshot().mode).toBe('finished');expect(g.snapshot().collectedStars).toHaveLength(4);
  }finally{g.dispose();}
},15000);

for(const stage of [1,4])for(const targetSpeed of [22,7])it(`AFTERSHOCK collapse stage ${stage} ${targetSpeed===22?'allows a committed fast crossing':'collapses under a slow car'}`,()=>{
  const source=LEVELS[3],tracks=source.tracks.filter(t=>t.id.startsWith(`4-${stage}-`));
  const base=tracks[0].points[0];
  const g=new GameCore({...source,start:{x:base.x+18,y:base.y+.86},tracks,checkpoints:[],collectibles:[],hazards:[],roadEvents:[],windZones:[],finish:{x:tracks.at(-1)!.points.at(-1)!.x-5,y:base.y}});
  try{
    g.body.setLinvel({x:targetSpeed,y:0},true);
    for(let frame=0;frame<2400;frame++){
      const s=g.snapshot();if(['finished','crashed'].includes(s.mode))break;
      g.input.accelerate=s.vx<targetSpeed;g.input.brake=s.vx>targetSpeed+.3;g.step();
    }
    expect(g.snapshot().mode).toBe(targetSpeed===22?'finished':'crashed');
    expect(g.snapshot().collapsedTracks!.length).toBeGreaterThan(0);
  }finally{g.dispose();}
});

it('requires speed control through the AFTERSHOCK heaving bridge even with the normal jump inputs',()=>{
  const g=new GameCore(LEVELS[3]);
  try{for(let frame=0;frame<120*100;frame++){
    const s=g.snapshot();if(['finished','crashed'].includes(s.mode))break;
    g.input={...replayInput(4,s),accelerate:true,brake:false};g.step();
  }
    expect(g.snapshot().mode).toBe('crashed');expect(g.level.tracks[g.snapshot().trackIndex].id).toContain('4-3-');
  }finally{g.dispose();}
},15000);

it('returns from the lower BLACKOUT maintenance route without hitting the upper deck underside',()=>{
  const g=new GameCore(LEVELS[6]);let recoveryFrames=0;
  try{for(let frame=0;frame<120*180;frame++){
    const s=g.snapshot();if(['finished','crashed'].includes(s.mode))break;
    g.input={...replayInput(7,s),suction:!(g.level.tracks[s.trackIndex]?.id.startsWith('7-4-')&&!g.level.tracks[s.trackIndex]?.id.endsWith('-recovery'))};g.step();
    if(g.level.tracks[g.snapshot().trackIndex]?.recovery)recoveryFrames++;
  }
    expect(g.snapshot().mode).toBe('finished');expect(recoveryFrames).toBeGreaterThan(50);
  }finally{g.dispose();}
},15000);

it('removes both physical and suspension support when a loaded slab collapses, then restores it on retry',()=>{
  const level:Level={...LEVELS[3],start:{x:0,y:.86},finish:{x:100,y:0},checkpoints:[],hazards:[],collectibles:[],tracks:[{id:'slab',points:[{x:-12,y:0},{x:12,y:0}],suction:false,kind:'slab',stability:{delay:1.4}}]};
  const g=new GameCore(level);
  try{advance(g,.5);expect(g.snapshot().collapseWarnings).toHaveLength(1);expect(g.snapshot().grounded).toBe(true);
    advance(g,1.6);expect(g.snapshot().collapsedTracks).toEqual(['slab']);expect(g.snapshot().grounded).toBe(false);expect(g.snapshot().y).toBeLessThan(-1);
    g.retry();expect(g.snapshot().collapsedTracks).toEqual([]);advance(g,.25);expect(g.snapshot().grounded).toBe(true);
  }finally{g.dispose();}
});

it('ramps deterministic wind at the boundaries and applies it at the body centre',()=>{
  const zone={x:-10,y:-10,w:50,h:50,force:{x:8,y:7},ramp:10,period:6};
  expect(windAt([zone],{x:-10,y:0},1)).toEqual({x:0,y:0});
  expect(windAt([zone],{x:0,y:0},1)).toEqual(windAt([zone],{x:0,y:0},1));
  const a=new GameCore({...LEVELS[0],start:{x:0,y:20},tracks:[],hazards:[],checkpoints:[],collectibles:[],windZones:[zone]});
  const b=new GameCore({...a.level,windZones:[]});
  try{advance(a,.5);advance(b,.5);expect(a.snapshot().vx).toBeGreaterThan(b.snapshot().vx);expect(a.snapshot().vy).toBeGreaterThan(b.snapshot().vy);expect(a.snapshot().angularVelocity).toBeCloseTo(b.snapshot().angularVelocity,5);const time=a.snapshot().worldTime;a.snapshot();expect(a.snapshot().worldTime).toBe(time);a.retry();expect(a.snapshot().worldTime).toBe(0);}finally{a.dispose();b.dispose();}
});

it('opens the emergency gate from headlamp proximity and resets its activation when retrying',()=>{
  const g=new GameCore({...LEVELS[6],start:{x:0,y:.86},finish:{x:100,y:0},tracks:[{id:'floor',suction:false,points:[{x:-15,y:0},{x:100,y:0}]}],checkpoints:[],collectibles:[],hazards:[{x:20,y:3.6,w:1.2,h:7.2,kind:'gate',lampActivated:true}]});
  try{advance(g,2.2);expect(g.snapshot().gateOffsets?.[0].y).toBe(8);g.retry();expect(g.snapshot().gateOffsets?.[0].y).toBe(0);}finally{g.dispose();}
});

it('retains old course records and unlocks all ten missions in order',()=>{
  const storage=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)});
  try{const save=loadSave();save.records[1]={revision:LEVELS[0].revision,time:40,stars:3,crashes:0,flips:0,collectedStars:['ignition-1']};
    for(const level of LEVELS){const g=new GameCore(level);try{completeLevel(save,level.id,{...g.snapshot(),mode:'finished',time:100,stars:2,collectedStars:level.id>3?['test-star']:[]});}finally{g.dispose();}}
    const loaded=loadSave();expect(loaded.unlocked).toBe(10);expect(loaded.records[1].collectedStars).toContain('ignition-1');expect(Object.keys(loaded.records)).toHaveLength(10);expect(loaded.records[10].revision).toBe(LEVELS[9].revision);
  }finally{vi.unstubAllGlobals();}
});
