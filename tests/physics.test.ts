import { beforeAll, describe, expect, it } from 'vitest';
import { GameCore, initPhysics } from '../src/game/core';
import { LEVELS } from '../src/game/levels';
import type { Level } from '../src/game/types';
import { replayInput, runReplay } from './replay';
import { exhaustJets, attitudeJets } from '../src/render/thrusters';
import { Effects } from '../src/render/effects';

const flat:Level={...LEVELS[0],start:{x:0,y:.86},finish:{x:990,y:0},tracks:[{id:'test-flat',suction:false,points:[{x:-20,y:0},{x:1000,y:0}]}],checkpoints:[],hazards:[],killY:-200};
const advance=(game:GameCore,seconds:number)=>{for(let i=0;i<seconds*120;i++)game.step(1/120);};
beforeAll(async()=>{await initPhysics();});

describe('cold gas plume lifecycle',()=>{
  it('emits the same volume at 30 and 120 FPS, including low quality',()=>{
    const game=new GameCore(flat),s={...game.snapshot(),thrusting:true,grounded:false,mode:'airborne' as const,pitchInput:0};
    for(const density of [1,.3]){
      const counts=[30,120].map(fps=>{const fx=new Effects();fx.density=density;for(let i=0;i<fps;i++)fx.update(s,1/fps);const count=fx.cursor;fx.dispose();return count;});
      expect(counts[0]).toBe(counts[1]);expect(counts[0]).toBeCloseTo(1200*density,0);
    }
    game.dispose();
  });
  it('stops the core on release, lets mist expire and clears every live plume on reset',()=>{
    const game=new GameCore(flat),s={...game.snapshot(),thrusting:true,grounded:false,mode:'airborne' as const,pitchInput:0};
    const fx=new Effects(),core=fx.group.getObjectByName('Cold-gas-jet-cores')!;
    fx.update(s,1/60);expect(core.visible).toBe(true);const emitted=fx.cursor;
    fx.update({...s,thrusting:false},1/60);expect(fx.cursor).toBe(emitted);expect(core.visible).toBe(false);expect(fx.life.some(v=>v>0)).toBe(true);
    for(let i=0;i<60;i++)fx.update(null,1/60);expect(fx.life.every(v=>v===0)).toBe(true);
    fx.update(s,1/60);fx.clear();expect(core.visible).toBe(false);expect(fx.life.every(v=>v===0)).toBe(true);
    for(const mode of ['finished','crashed'] as const){fx.update({...s,mode},1/60);expect(core.visible).toBe(false);}
    fx.dispose();game.dispose();
  });
});

describe('cold gas exhaust direction',()=>{
  it('uses only rear exhaust for ground boost',()=>{
    const g=new GameCore(flat);try{const jets=exhaustJets({...g.snapshot(),boosting:true});expect(jets).toHaveLength(4);expect(jets.every(j=>j.kind==='rear'&&j.vy===0)).toBe(true);}finally{g.dispose();}
  });
  for(const pitchInput of [-1,1])it(`uses an opposed jet couple for pitch ${pitchInput} at every vehicle angle`,()=>{
    for(const angle of [0,Math.PI/2,Math.PI]){
      const s={x:12,y:30,z:-8,vx:7,vy:-3,angle,angularVelocity:0,pitchInput,grounded:false,mode:'airborne' as const};
      const jets=attitudeJets(s);expect(jets).toHaveLength(4);
      let fx=0,fy=0,torque=0;
      for(const p of jets){const x=p.x-s.x,y=p.y-s.y,dx=s.vx-p.vx,dy=s.vy-p.vy;fx+=dx;fy+=dy;torque+=x*dy-y*dx;}
      expect(fx).toBeCloseTo(0);expect(fy).toBeCloseTo(0);expect(torque*pitchInput).toBeGreaterThan(100);
    }
  });
  it('stops attitude exhaust on release, at ground contact and after the run',()=>{
    const s={x:0,y:20,z:0,vx:0,vy:0,angle:0,angularVelocity:0,pitchInput:1,grounded:false,mode:'airborne' as const};
    expect(attitudeJets({...s,pitchInput:0})).toEqual([]);expect(attitudeJets({...s,grounded:true})).toEqual([]);
    for(const mode of ['adhered','grounded','landing','finished','crashed'] as const)expect(attitudeJets({...s,mode})).toEqual([]);
    const strong=attitudeJets(s),gentle=attitudeJets({...s,pitchInput:.5});
    strong.forEach((p,i)=>expect(Math.abs(gentle[i].vy)).toBeCloseTo(Math.abs(p.vy)/2));
  });
  for(const angle of [0,Math.PI/2,Math.PI])it(`opposes body-local thrust at angle ${angle}`,()=>{
    const s={x:12,y:30,z:-8,vx:7,vy:-3,angle,angularVelocity:0};
    const jets=exhaustJets(s),c=Math.cos(angle),n=Math.sin(angle);
    expect(jets.filter(p=>p.kind==='lift')).toHaveLength(4);
    expect(jets.filter(p=>p.kind==='rear')).toHaveLength(4);
    for(const p of jets){
      const dx=p.vx-s.vx,dy=p.vy-s.vy;
      if(p.kind==='lift'){expect(dx*(-n)+dy*c).toBeCloseTo(-18);expect(dx*c+dy*n).toBeCloseTo(0);}
      else {expect(dx*c+dy*n).toBeCloseTo(-12);expect(dx*(-n)+dy*c).toBeCloseTo(0);}
      expect(p.vz).toBe(0);
    }
    const other=exhaustJets({...s,z:12});
    jets.forEach((p,i)=>{expect(p.vx).toBe(other[i].vx);expect(p.vy).toBe(other[i].vy);expect(other[i].z-p.z).toBeCloseTo(20);});
  });
});

describe('force-driven vehicle controls',()=>{
  it('lets thrust override held suction and restores suction only when thrust is released',()=>{
    const g=new GameCore({...flat,tracks:[{...flat.tracks[0],suction:true}]});
    g.input.suction=true;g.step();expect(Math.hypot(g.snapshot().suctionForce.x,g.snapshot().suctionForce.y)).toBeGreaterThan(50);
    g.input.thrust=true;g.step();expect(g.snapshot().suction).toBe(false);expect(g.snapshot().suctionForce).toEqual({x:0,y:0});expect(g.snapshot().thrustForce.y).toBeGreaterThan(20);
    g.input.thrust=false;g.step();expect(g.snapshot().suction).toBe(true);expect(Math.hypot(g.snapshot().suctionForce.x,g.snapshot().suctionForce.y)).toBeGreaterThan(50);
    g.input.suction=false;g.step();expect(g.snapshot().suction).toBe(false);expect(g.snapshot().suctionForce).toEqual({x:0,y:0});g.dispose();
  });
  it('ends inverted respawn protection on first input without latching suction',()=>{
    const g=new GameCore({...LEVELS[1],start:{x:54,y:29.2,z:-4}});g.retry();advance(g,2);
    expect(g.snapshot().respawnProtected).toBe(true);expect(g.input.suction).toBe(false);expect(g.snapshot().mode).toBe('adhered');
    g.input.suction=true;g.step();expect(g.snapshot().respawnProtected).toBe(false);expect(g.snapshot().suction).toBe(true);
    const y=g.snapshot().y;g.input.suction=false;advance(g,.5);expect(g.snapshot().suction).toBe(false);expect(g.snapshot().y).toBeLessThan(y);
    g.retry();g.input.thrust=true;g.step();expect(g.snapshot().respawnProtected).toBe(false);expect(g.snapshot().suctionForce).toEqual({x:0,y:0});g.dispose();
  });
  it('does not restart suction while an empty thrust command is still held',()=>{
    const g=new GameCore(flat);g.input={accelerate:false,brake:false,suction:true,thrust:true,pitch:0};advance(g,4.5);
    expect(g.snapshot().pressure).toBe(0);expect(g.snapshot().thrusting).toBe(false);expect(g.snapshot().suction).toBe(false);expect(g.snapshot().suctionForce).toEqual({x:0,y:0});
    g.input.thrust=false;g.step();expect(g.snapshot().suction).toBe(true);g.dispose();
  });
  it('accelerates, brakes, reverses and remains supported by the road',()=>{
    const g=new GameCore(flat);g.input.accelerate=true;advance(g,2);
    expect(g.snapshot().vx).toBeGreaterThan(15);expect(g.snapshot().grounded).toBe(true);
    g.input.accelerate=false;g.input.brake=true;advance(g,.8);
    expect(g.snapshot().vx).toBeLessThan(4);advance(g,1.2);
    expect(g.snapshot().vx).toBeLessThan(-2);expect(g.snapshot().y).toBeCloseTo(.84,1);g.dispose();
  });
  it('reaches the same top speed in reverse as forward',()=>{
    const g=new GameCore({...flat,start:{x:2000,y:.86},finish:{x:9000,y:0},tracks:[{id:'test-flat',suction:false,points:[{x:-20,y:0},{x:4000,y:0}]}]});
    g.input.accelerate=true;advance(g,16);
    const forward=Math.abs(g.snapshot().vx);
    g.input.accelerate=false;g.input.brake=true;advance(g,40);
    const reverse=Math.abs(g.snapshot().vx);
    expect(forward).toBeGreaterThan(20);
    expect(reverse).toBeGreaterThan(forward*.9);expect(reverse).toBeLessThan(forward*1.1);
    g.dispose();
  });
  it('thrust lifts through acceleration, consumes finite pressure and stops when empty',()=>{
    const g=new GameCore(flat);advance(g,.2);const y=g.snapshot().y;
    g.input.thrust=true;g.step(1/120);
    expect(g.snapshot().y-y).toBeLessThan(.01);expect(g.snapshot().vy).toBeGreaterThan(0);
    advance(g,4.5);expect(g.snapshot().pressure).toBe(0);expect(g.snapshot().thrusting).toBe(false);
    const vx=g.snapshot().vx;g.input.thrust=false;advance(g,.1);expect(g.snapshot().vx).toBeGreaterThan(vx*.9);g.dispose();
  });
  it('air control creates opposite angular response to opposite inputs',()=>{
    const a=new GameCore({...flat,start:{x:0,y:30}}),b=new GameCore({...flat,start:{x:0,y:30}});
    a.input.pitch=1;b.input.pitch=-1;advance(a,.5);advance(b,.5);
    expect(a.snapshot().angle).toBeGreaterThan(.3);expect(b.snapshot().angle).toBeLessThan(-.3);
    expect(a.snapshot().y).toBeCloseTo(b.snapshot().y,5);a.dispose();b.dispose();
  });
  it('does not progress without driving input',()=>{const g=new GameCore(LEVELS[0]);advance(g,12);expect(g.snapshot().x).toBeCloseTo(4,1);expect(g.snapshot().mode).not.toBe('finished');g.dispose();});
});

describe('three complete playable paths',()=>{
  for(const level of LEVELS.slice(0,3))it(`finishes ${level.name} using only player input`,async()=>{
    const r=await runReplay(level.id);
    expect(r.mode).toBe('finished');expect(r.crashes).toBe(0);expect(r.progress).toBe(1);expect(r.stars).toBe(3);
    expect(r.thrustFrames).toBeGreaterThan(0);expect(r.airFrames).toBeGreaterThan(60);
    if(level.id>1)expect(r.invertedFrames).toBeGreaterThan(100);
    if(level.id===3){expect(r.pitchFrames).toBeGreaterThan(100);expect(r.invertedLaunchFrames).toBeGreaterThan(40);}
  });
  it('fails Ignition if the player never uses thrust',async()=>{
    const r=await runReplay(1,false,(level,s)=>({...replayInput(level,s),thrust:false}));
    expect(r.mode).not.toBe('finished');expect(r.x).toBeLessThan(268);expect(r.health).toBeLessThan(100);
  });
  it('cannot bypass the inversion checkpoint by driving underneath the loop',async()=>{
    const r=await runReplay(2,false,(level,s)=>({...replayInput(level,s),suction:false}));
    expect(r.mode).not.toBe('finished');expect(r.checkpoint).toBe(-1);
  });
  it('fails Skyfall without active air control',async()=>{
    const r=await runReplay(3,false,(level,s)=>({...replayInput(level,s),pitch:0}));
    expect(r.mode).not.toBe('finished');expect(r.checkpoint).toBeLessThan(2);
  });
});

describe('adhesion, gravity and recovery',()=>{
  it('loses inverted contact with fans off while world gravity stays down',()=>{
    const g=new GameCore(LEVELS[1]);
    for(let i=0;i<120*12;i++){const s=g.snapshot();g.input=replayInput(2,s);if(s.grounded&&Math.cos(s.angle)<-.98)break;g.step(1/120);}
    const top=g.snapshot();expect(top.mode).toBe('adhered');expect(top.y).toBeGreaterThan(28);
    g.input={accelerate:false,brake:false,thrust:false,pitch:0,suction:false};advance(g,.5);
    const falling=g.snapshot();expect(falling.mode).toBe('airborne');expect(falling.y).toBeLessThan(top.y);expect(falling.vy).toBeLessThan(0);expect(g.world.gravity.y).toBe(-18);g.dispose();
  });
  it('restores the reached checkpoint, its pressure and zero motion after a failed jump',()=>{
    const g=new GameCore(LEVELS[0]);let saved=0;
    for(let i=0;i<120*30;i++){const s=g.snapshot();g.input=replayInput(1,s);if(s.checkpoint>=0){g.input.thrust=false;if(!saved)saved=s.pressure;}g.step(1/120);if(g.snapshot().mode==='crashed')break;}
    expect(g.snapshot().mode).toBe('crashed');expect(g.snapshot().checkpoint).toBe(0);expect(g.snapshot().crashes).toBe(1);
    g.retry();const s=g.snapshot();expect(s.x).toBe(52);expect(s.y).toBeCloseTo(.84);expect(s.pressure).toBeCloseTo(saved);expect(s.speed).toBe(0);expect(s.mode).toBe('airborne');expect(s.crashes).toBe(1);
    for(let i=0;i<120*35;i++){g.input=replayInput(1,g.snapshot());g.step(1/120);if(g.snapshot().mode==='finished'||g.snapshot().mode==='crashed')break;}
    expect(g.snapshot().mode).toBe('finished');g.dispose();
  });
  it('recovers an upside-down checkpoint and can complete the remaining inverted releases',()=>{
    const g=new GameCore(LEVELS[2]);
    for(let i=0;i<120*20;i++){g.input=replayInput(3,g.snapshot());g.step(1/120);if(g.snapshot().checkpoint===0)break;}
    expect(g.snapshot().checkpoint).toBe(0);g.retry();expect(Math.cos(g.snapshot().angle)).toBeLessThan(-.99);
    for(let i=0;i<120*70;i++){g.input=replayInput(3,g.snapshot());g.step(1/120);if(g.snapshot().mode==='finished'||g.snapshot().mode==='crashed')break;}
    expect(g.snapshot().mode).toBe('finished');g.dispose();
  });
  it('produces the same physics path at 30, 60 and 144 Hz rendering with a fixed-step accumulator',()=>{
    const results=[30,60,144].map(hz=>{
      const g=new GameCore(flat);g.input.accelerate=true;let accumulator=0;
      for(let frame=0;frame<hz*4;frame++){accumulator+=1/hz;while(accumulator>=1/120-1e-10){g.step(1/120);accumulator-=1/120;}}
      const s=g.snapshot();g.dispose();return s;
    });
    for(const s of results){expect(s.x).toBeCloseTo(results[0].x,5);expect(s.vx).toBeCloseTo(results[0].vx,5);}
  });
});


describe('health, solid recovery roads and safe checkpoint respawns',()=>{
  for(const pitch of [-1,1])it(`rights a roof-supported car with pitch ${pitch} without changing its transform`,()=>{
    const g=new GameCore({...flat,start:{x:0,y:.6}});g.body.setRotation(Math.PI,true);advance(g,2);
    expect(g.snapshot().mode).toBe('overturned');expect(g.snapshot().message).toContain('RECOVERY WINDOW');
    g.input.pitch=pitch;let recovered=false;
    for(let i=0;i<120*4;i++){g.step();const s=g.snapshot();if(s.grounded&&Math.cos(s.angle)>.8){recovered=true;break;}}
    expect(recovered).toBe(true);expect(g.snapshot().crashes).toBe(0);expect(g.snapshot().health).toBeGreaterThan(0);
    expect(g.snapshot().message).not.toContain('VEHICLE OVERTURNED');g.dispose();
  });
  it('fails a persistently stranded roof contact once and clears the timeout on retry',()=>{
    const g=new GameCore({...flat,start:{x:0,y:.6}});g.body.setRotation(Math.PI,true);advance(g,3);
    expect(g.snapshot().mode).toBe('overturned');expect(g.snapshot().airtime).toBeLessThan(.2);advance(g,4);
    expect(g.snapshot().mode).toBe('crashed');expect(g.snapshot().message).toContain('VEHICLE STUCK');expect(g.snapshot().crashes).toBe(1);
    advance(g,10);expect(g.snapshot().crashes).toBe(1);g.retry();advance(g,7);
    expect(g.snapshot().mode).not.toBe('crashed');expect(g.snapshot().health).toBe(100);expect(g.snapshot().message).toBe('');g.dispose();
  });
  it('falls onto a distant-route road, takes damage and remains playable',()=>{
    const level:Level={...flat,start:{x:0,y:20},tracks:[{id:'ceiling',suction:true,points:[{x:100,y:25},{x:-20,y:25}]},{id:'catch-road',suction:false,points:[{x:-20,y:0},{x:100,y:0}]}]};
    const g=new GameCore(level);advance(g,3);const s=g.snapshot();expect(s.mode).not.toBe('crashed');expect(s.grounded).toBe(true);expect(s.y).toBeCloseTo(.84,1);expect(s.health).toBeGreaterThan(0);expect(s.health).toBeLessThan(100);expect(s.damageEvents).toBeGreaterThan(0);g.dispose();
  });
  it('depletes health on a second heavy impact and enters the failed state',()=>{
    const g=new GameCore({...flat,start:{x:0,y:35}});advance(g,4);expect(g.snapshot().health).toBeGreaterThan(0);expect(g.snapshot().health).toBeLessThan(100);
    g.input.thrust=true;advance(g,14);expect(g.snapshot().health).toBe(0);expect(g.snapshot().mode).toBe('crashed');g.retry();expect(g.snapshot().health).toBe(100);g.dispose();
  });
  for(const level of LEVELS)it(`respawns every ${level.name} checkpoint safely without controls`,()=>{
    const g=new GameCore(level);
    for(let cp=0;cp<level.checkpoints.length;cp++){
      for(let i=0;i<120*90&&g.snapshot().checkpoint<cp;i++){g.input=replayInput(level.id,g.snapshot());g.step(1/120);}
      expect(g.snapshot().checkpoint).toBeGreaterThanOrEqual(cp);g.retry();const spawn=g.snapshot();expect(spawn.health).toBe(100);expect(spawn.speed).toBe(0);advance(g,2);
      const settled=g.snapshot();expect(settled.mode).not.toBe('crashed');expect(settled.grounded).toBe(true);expect(settled.health).toBe(100);expect(Math.abs(settled.y-spawn.y)).toBeLessThan(1.5);
      if(Math.cos(level.checkpoints[cp].angle??0)<0){expect(settled.suction).toBe(true);expect(settled.mode).toBe('adhered');}
    }g.dispose();
  });
  it('drives from the lower recovery deck back onto the main road without a respawn',()=>{
    const g=new GameCore({...LEVELS[1],start:{x:45,y:-7.16,z:-4},finish:{x:208,y:-5,z:-8},checkpoints:[LEVELS[1].checkpoints[1]]});g.input.accelerate=true;advance(g,11);const s=g.snapshot();expect(s.health).toBeGreaterThan(0);expect(s.y).toBeGreaterThan(-5);expect(s.mode).toBe('finished');g.dispose();
  });
  it('separates the ring entry and exit by more than a complete deck width',()=>{
    const t=LEVELS[1].tracks[0],entry=t.points[2],exit=t.points[130];expect(Math.abs((exit.z??0)-(entry.z??0))).toBeGreaterThan(t.width!+1);expect(LEVELS[1].tracks.some(t=>t.recovery)).toBe(true);
  });
});
