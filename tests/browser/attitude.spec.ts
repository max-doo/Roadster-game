import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

test('pitch control fires opposite front/rear gas jets and stops on release',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.waitForFunction(()=>(window as any).__ROADSTER__);
  const captures=[];
  for(const level of [1,3])for(const pitch of [1,-1]){
    const result=await page.evaluate(async({level,pitch})=>{
      const a=(window as any).__ROADSTER__,policyPath='/tests/replay-policy.ts';
      const effectsPath=performance.getEntriesByType('resource').map(p=>p.name).filter(p=>p.includes('/src/render/effects.ts')).at(-1)!;
      const {replayInput}=await import(policyPath),{Effects}=await import(effectsPath);
      a.start(level);a.manual(true);let s=a.snapshot();
      for(let i=0;i<4800;i++){
        a.input(replayInput(level,s));s=a.step(1,false);
        if(s.mode==='airborne'&&(level===1?s.y>3:s.y>35&&Math.cos(s.angle)<-.98))break;
      }
      const samples:any[]=[];const original=Effects.prototype.emit;
      Effects.prototype.emit=function(...args:any[]){samples.push(args.slice(0,6));return original.apply(this,args);};
      try{a.input({accelerate:false,brake:false,suction:false,thrust:false,pitch});for(let i=0;i<12;i++)s=a.step(2,true);}
      finally{Effects.prototype.emit=original;}
      return {snapshot:s,samples:samples.slice(-8)};
    },{level,pitch});
    const s=result.snapshot;expect(s.mode).toBe('airborne');expect(s.thrusting).toBe(false);expect(result.samples).toHaveLength(8);
    let torque=0;
    for(const p of result.samples){
      const x=p[0]-s.x,y=p[1]-s.y;
      const fx=s.vx-s.angularVelocity*y-p[3],fy=s.vy+s.angularVelocity*x-p[4];
      torque+=x*fy-y*fx;
    }
    expect(torque*pitch).toBeGreaterThan(150);
    await page.waitForTimeout(700);await page.screenshot({path:`artifacts/attitude-${level===1?'upright':'inverted'}-${pitch===1?'up':'down'}.png`});
    const stopped=await page.evaluate(async()=>{
      const a=(window as any).__ROADSTER__,path=performance.getEntriesByType('resource').map(p=>p.name).filter(p=>p.includes('/src/render/effects.ts')).at(-1)!;
      const {Effects}=await import(path);let emitted=0;const original=Effects.prototype.emit;
      Effects.prototype.emit=function(...args:any[]){emitted++;return original.apply(this,args);};
      try{a.input({pitch:0});a.step(1,true);}finally{Effects.prototype.emit=original;}return emitted;
    });
    expect(stopped).toBe(0);captures.push({level,pitch,...result,stopped});
  }
  expect(errors).toEqual([]);await writeFile('artifacts/attitude-exhaust.json',JSON.stringify({errors,captures},null,2));
});
