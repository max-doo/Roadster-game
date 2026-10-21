import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

test('cold gas visibly exits underbody and rear ports in upright and inverted driving',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.waitForFunction(()=>(window as any).__ROADSTER__);
  const captures=[];
  for(const {level,mobile} of [{level:1,mobile:false},{level:2,mobile:false},{level:1,mobile:true}]){
    await page.setViewportSize(mobile?{width:844,height:390}:{width:1440,height:900});
    const result=await page.evaluate(async(id)=>{
      const a=(window as any).__ROADSTER__;
      const policyPath='/tests/replay-policy.ts';
      // Reuse Vite's actual loaded module URL, including any HMR version query.
      const effectsPath=performance.getEntriesByType('resource').map(p=>p.name).filter(p=>p.includes('/src/render/effects.ts')).at(-1)!;
      const {replayInput}=await import(policyPath);
      const {Effects}=await import(effectsPath);
      a.start(id);a.manual(true);let s=a.snapshot();
      for(let i=0;i<2400;i++){
        a.input(replayInput(id,s));s=a.step(1,false);
        if(id===1?s.thrusting&&!s.grounded&&s.y>3:s.grounded&&Math.cos(s.angle)<-.995)break;
      }
      a.input({thrust:true,accelerate:false,pitch:0,suction:id===2});
      const samples:any[]=[];const original=Effects.prototype.emit;let fx:any;
      Effects.prototype.emit=function(...args:any[]){fx=this;samples.push(args.slice(0,6));return original.apply(this,args);};
      try{for(let i=0;i<24;i++){samples.length=0;s=a.step(2,true);}}finally{Effects.prototype.emit=original;}
      const core=fx.group.getObjectByName('Cold-gas-jet-cores');
      return {snapshot:s,samples,coreVisible:core.visible,coreCount:core.geometry.instanceCount};
    },level);
    expect(result.snapshot.thrusting).toBe(true);expect(result.samples.length).toBeGreaterThanOrEqual(8);
    expect(result.coreVisible).toBe(true);expect(result.coreCount).toBe(8);
    // Validate the two exhaust families, independently of their visual emission rate.
    const relativeY=result.samples.map((p:number[])=>p[4]-result.snapshot.vy);
    if(level===1){expect(Math.cos(result.snapshot.angle)).toBeGreaterThan(.9);expect(relativeY.filter((v:number)=>v < -14).length).toBeGreaterThanOrEqual(4);}
    else {expect(Math.cos(result.snapshot.angle)).toBeLessThan(-.9);expect(relativeY.filter((v:number)=>v > 14).length).toBeGreaterThanOrEqual(4);}
    expect(relativeY.filter((v:number)=>Math.abs(v)<4).length).toBeGreaterThanOrEqual(4);
    await page.waitForTimeout(800); // Let the camera settle on the manually stepped pose.
    await page.screenshot({path:`artifacts/jet-effects/thruster-${level===1?'upright':'inverted'}${mobile?'-mobile':''}.png`});captures.push({level,mobile,...result});
  }
  expect(errors).toEqual([]);await writeFile('artifacts/jet-effects/thruster-direction.json',JSON.stringify({errors,captures},null,2));
});
