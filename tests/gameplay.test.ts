import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {GameCore,initPhysics} from '../src/game/core';
import {LEVELS} from '../src/game/levels';
import {motionAt} from '../src/game/motion';
import {loadSave,completeLevel} from '../src/game/save';
import {replayInput} from './replay-policy';
import type {Level} from '../src/game/types';

const flat:Level={...LEVELS[0],start:{x:0,y:.84},finish:{x:990,y:0},tracks:[{id:'flat',suction:false,points:[{x:-20,y:0},{x:1000,y:0}]}],checkpoints:[],hazards:[],collectibles:[],killY:-200};
const advance=(game:GameCore,seconds:number)=>{for(let i=0;i<seconds*120;i++)game.step();};
beforeAll(initPhysics);afterEach(()=>vi.unstubAllGlobals());

describe('moving road support',()=>{
 for(const motion of [{dx:12,period:6},{dy:6,period:6}])it(`carries a braked car through complete motion cycles ${JSON.stringify(motion)}`,()=>{
  const game=new GameCore({...flat,tracks:[{id:'carrier',kind:'container',suction:false,motion,points:[{x:-15,y:0},{x:15,y:0}]}]});
  game.input.brake=true;
  for(let i=0;i<120*12;i++){game.step();if(i%30===0){const s=game.snapshot(),offset=motionAt(motion,s.worldTime);expect(Math.abs(s.x-offset.x)).toBeLessThan(.8);expect(Math.abs(s.y-offset.y-.84)).toBeLessThan(.3);expect(s.health).toBe(100);expect(s.mode).not.toBe('crashed');}}
  expect(game.snapshot().platform).toBe('carrier');game.dispose();
 });
 it('restores checkpoint motion phase without rewinding the run timer',()=>{
  const level:Level={...flat,checkpoints:[{x:0,y:.84,pressure:100,label:'SAFE',trackId:'flat'}],tracks:[...flat.tracks,{id:'lift',suction:false,motion:{dy:6,period:6},points:[{x:30,y:0},{x:50,y:0}]}]};
  const g=new GameCore(level);advance(g,.1);const checkpointPhase=g.snapshot().worldTime;advance(g,3);const timer=g.snapshot().time;g.retry();expect(g.snapshot().time).toBe(timer);expect(g.snapshot().worldTime).toBeLessThanOrEqual(checkpointPhase);advance(g,2);expect(g.snapshot().health).toBe(100);expect(g.snapshot().grounded).toBe(true);g.dispose();
 });
 it('does not advance obstacles or platforms without a simulation step',()=>{
  const g=new GameCore(LEVELS[2]);const s=g.snapshot();for(let i=0;i<10;i++)expect(g.snapshot().worldTime).toBe(s.worldTime);g.dispose();
 });
 it('connects the lower cargo recovery road back to the dock through ordinary driving',()=>{
  const g=new GameCore({...LEVELS[2],start:{x:251,y:-21.16,z:12},finish:{x:316,y:-10,z:12},checkpoints:[],collectibles:[]});g.input.accelerate=true;advance(g,14);expect(g.snapshot().mode).toBe('finished');expect(g.snapshot().health).toBeGreaterThan(0);expect(g.snapshot().crashes).toBe(0);g.dispose();
 });
});

describe('collectibles and recovery',()=>{
 it('stockpiles cans above 100 and never manufactures gas at a checkpoint or on repeated retries',()=>{
  const g=new GameCore({...flat,checkpoints:[{x:25,y:.84,pressure:100,label:'SAVE'}],collectibles:[{id:'a',kind:'pressure',x:0,y:1.2,amount:80},{id:'b',kind:'pressure',x:12,y:1.2,amount:80}]});
  try{
   advance(g,.1);expect(g.snapshot().pressure).toBe(180);g.input.accelerate=true;
   for(let i=0;i<600&&g.snapshot().checkpoint<0;i++)g.step();
   expect(g.snapshot().checkpoint).toBe(0);expect(g.snapshot().pressure).toBe(260);
   g.input.boost=true;advance(g,.5);expect(g.snapshot().pressure).toBeLessThan(260);
   for(let i=0;i<3;i++){g.retry();expect(g.snapshot().pressure).toBe(260);expect(g.snapshot().collectedItems).toEqual(['a','b']);}
  }finally{g.dispose();}
 });
 it('saves a depleted gas reserve without refilling and restores only that saved amount',()=>{
  const g=new GameCore({...flat,checkpoints:[{x:10,y:.84,pressure:100,label:'SAVE'}]});
  try{
   g.input={accelerate:true,brake:false,suction:false,thrust:false,boost:true,pitch:0};
   let saved=0;for(let i=0;i<1200;i++){g.step();if(g.snapshot().checkpoint===0){saved=g.snapshot().pressure;break;}}
   expect(saved).toBeGreaterThan(0);expect(saved).toBeLessThan(100);
   advance(g,.5);g.retry();expect(g.snapshot().pressure).toBeCloseTo(saved);
  }finally{g.dispose();}
 });
 it('boosts faster with rear jets only, stays on level ground, and does not burn gas in open air',()=>{
  const normal=new GameCore(flat),boosted=new GameCore(flat);
  try{
   normal.input.accelerate=true;boosted.input.accelerate=true;boosted.input.boost=true;
   advance(normal,2);advance(boosted,2);
   const s=boosted.snapshot();expect(s.vx).toBeGreaterThan(normal.snapshot().vx+10);expect(s.y).toBeCloseTo(.84,1);expect(s.grounded).toBe(true);expect(s.boosting).toBe(true);expect(s.thrusting).toBe(false);expect(s.thrustForce.y).toBeCloseTo(0);expect(s.pressure).toBeLessThan(100);
   const air=new GameCore({...flat,start:{x:0,y:30},tracks:[]});air.input.boost=true;advance(air,.3);expect(air.snapshot().boosting).toBe(false);expect(air.snapshot().pressure).toBe(100);air.dispose();
  }finally{normal.dispose();boosted.dispose();}
 });
 it('keeps challenge stars on retry, commits used cans at checkpoints and resets a new run',()=>{
  const level:Level={...flat,checkpoints:[{x:9,y:.84,pressure:100,label:'SUPPLY'}],collectibles:[{id:'star',kind:'star',x:0,y:1.2},{id:'gas',kind:'pressure',x:0,y:1.2,amount:25}]};
  const g=new GameCore(level);g.input.thrust=true;advance(g,.25);expect(g.snapshot().collectedStars).toEqual(['star']);expect(g.snapshot().collectedItems).toContain('gas');expect(g.snapshot().pickupEvent).toBe(2);
  g.input.thrust=false;g.input.accelerate=true;for(let i=0;i<600&&g.snapshot().checkpoint<0;i++)g.step();expect(g.snapshot().checkpoint).toBe(0);
  const events=g.snapshot().pickupEvent,reserve=g.snapshot().pressure;g.retry();advance(g,.2);expect(g.snapshot().collectedItems).toEqual(['star','gas']);expect(g.snapshot().pickupEvent).toBe(events);expect(g.snapshot().pressure).toBeCloseTo(reserve);g.dispose();
  const fresh=new GameCore(level);expect(fresh.snapshot().collectedItems).toEqual([]);fresh.dispose();
 });
 it('restores uncommitted pressure cans on retry without losing a collected star',()=>{
  const g=new GameCore({...flat,collectibles:[{id:'star',kind:'star',x:0,y:1},{id:'gas',kind:'pressure',x:0,y:1}]});g.input.thrust=true;advance(g,.2);expect(g.snapshot().collectedItems).toContain('gas');g.retry();expect(g.snapshot().collectedItems).toEqual(['star']);expect(g.snapshot().pressure).toBe(100);g.dispose();
 });
 it('can finish all three routes with gas cans and without optional stars',()=>{
  for(const level of LEVELS.slice(0,3)){const g=new GameCore({...level,collectibles:level.collectibles?.filter(c=>c.kind==='pressure')});for(let i=0;i<120*300;i++){const s=g.snapshot();if(s.mode==='finished'||s.mode==='crashed')break;g.input=replayInput(level.id,s);g.step();}expect(g.snapshot().mode).toBe('finished');expect(g.snapshot().collectedStars).toEqual([]);g.dispose();}
 });
});

describe('course records',()=>{
 function storage(initial?:unknown){const data=new Map<string,string>();if(initial)data.set('gravity-breaker-v1',JSON.stringify(initial));vi.stubGlobal('localStorage',{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)});return data;}
 it('enables vibration for existing saves while preserving an explicit opt-out',()=>{
  storage({version:1,unlocked:5,records:{},settings:{muted:true},tutorials:['1:thrust']});
  const old=loadSave();expect(old.settings.vibration).toBe(true);expect(old.settings.muted).toBe(true);expect(old.unlocked).toBe(5);expect(old.tutorials).toEqual(['1:thrust']);
  storage({...old,settings:{...old.settings,vibration:false}});expect(loadSave().settings.vibration).toBe(false);
 });
 it('preserves old records and progression while separating revised course times',()=>{
  const old={time:17,stars:3,crashes:0,flips:1};storage({version:1,unlocked:3,records:{1:old},settings:{language:'en'},tutorials:['1:thrust']});const save=loadSave();expect(save.unlocked).toBe(3);expect(save.records).toEqual({});expect(save.legacyRecords?.['1:v1']).toEqual(old);expect(save.settings.language).toBe('en');expect(save.tutorials).toEqual(['1:thrust']);
 });
 it('unions completed star identities independently of the fastest run',()=>{
  storage();const save=loadSave(),g=new GameCore(flat),s=g.snapshot();completeLevel(save,1,{...s,time:30,stars:3,collectedStars:['a']});completeLevel(save,1,{...s,time:40,stars:1,collectedStars:['b']});const loaded=loadSave();expect(loaded.records[1].time).toBe(30);expect(loaded.records[1].stars).toBe(3);expect(loaded.records[1].collectedStars).toEqual(['a','b']);expect(loaded.records[1].revision).toBe(LEVELS[0].revision);g.dispose();
 });
});
