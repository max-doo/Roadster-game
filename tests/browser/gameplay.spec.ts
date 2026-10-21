import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';

for(const mobile of [false,true])test(`expanded levels, full collection and moving-road traversal ${mobile?'mobile':'desktop'}`,async({browser})=>{
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.waitForFunction(()=>(window as any).__ROADSTER__);
 await page.evaluate(async()=>{(window as any).__policy=(await import('/tests/replay-policy.ts' as string)).replayInput;});
 const dir=process.env.ROADSTER_GAMEPLAY_CAPTURE_ROOT??'artifacts/gameplay-expansion';await mkdir(dir,{recursive:true});const suffix=mobile?'mobile':'desktop',results=[];
 for(const id of [1,2,3]){
  await page.evaluate(id=>{const a=(window as any).__ROADSTER__;a.start(id);a.manual(true);},id);
  const shots=new Set<string>();let state:any,platformFrames=0;
  for(let batch=0;batch<900;batch++){
   const r=await page.evaluate(id=>{const a=(window as any).__ROADSTER__;let s=a.snapshot(),frames=0;for(let i=0;i<16;i++){a.input((window as any).__policy(id,s));s=a.step(1,false);if(s.platform)frames++;if(s.mode==='finished'||s.mode==='crashed')break;}return {s,frames};},id);
   state=r.s;platformFrames+=r.frames;expect(state.mode,`level ${id}: ${state.message}`).not.toBe('crashed');
   let shot='';
   if(id===1&&state.x>11&&state.x<30)shot='accident';
   if(id===1&&state.x>389&&state.x<409)shot='loading-ramp';
   if(id===2&&state.x>207&&state.x<220&&state.checkpoint>=1)shot='star-route';
   if(id===2&&state.x>253&&state.x<269)shot='clearance-gate';
   if(id===3&&state.platform==='cargo-ferry'&&state.x>274)shot='cargo-ferry';
   if(id===3&&state.platform==='cargo-lift'&&state.y>-6.8)shot='cargo-lift';
   if(shot&&!shots.has(shot)){shots.add(shot);await page.waitForTimeout(160);await page.screenshot({path:`${dir}/${id}-${shot}-${suffix}.png`});}
   if(state.mode==='finished')break;
  }
  expect(state.mode).toBe('finished');expect(state.collectedStars).toHaveLength(3);expect(state.stars).toBe(3);if(id===3)expect(platformFrames).toBeGreaterThan(400);
  await expect(page.locator('.result-collection strong')).toHaveText(/3\s*\/\s*3/);await expect(page.getByText('金牌通关',{exact:true})).toBeVisible();
  const layout=await page.locator('.result-panel').evaluate(e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,viewport:innerHeight,filter:getComputedStyle(e.parentElement!).filter}));expect(layout.top).toBeGreaterThanOrEqual(0);expect(layout.bottom).toBeLessThanOrEqual(layout.viewport);expect(layout.filter).toBe('none');
  await page.waitForTimeout(250);
  await page.screenshot({path:`${dir}/${id}-complete-${suffix}.png`});results.push({id,snapshot:state,platformFrames,captures:[...shots]});
 }
 const saved=await page.evaluate(()=>(window as any).__ROADSTER__.state().save);expect(saved.unlocked).toBe(4);
 for(const record of Object.values(saved.records) as any[]){expect(record.revision).toBe(3);expect(record.collectedStars).toHaveLength(3);}
 await page.reload();await page.waitForFunction(()=>(window as any).__ROADSTER__);expect(await page.evaluate(()=>(window as any).__ROADSTER__.state().save.records)).toEqual(saved.records);
 expect(errors).toEqual([]);await writeFile(`${dir}/replays-${suffix}.json`,JSON.stringify({results,errors},null,2));await context.close();
});

test('moving scene pauses with physics and checkpoint retry restores a safe dock',async({page})=>{
 await page.goto('/');await page.waitForFunction(()=>(window as any).__ROADSTER__);
 await page.evaluate(async()=>{const a=(window as any).__ROADSTER__,policy=(await import('/tests/replay-policy.ts' as string)).replayInput;a.start(3);a.manual(true);for(let i=0;i<9000;i++){const s=a.snapshot();a.input(policy(3,s));a.step(1,false);if(a.snapshot().platform==='cargo-ferry'&&a.snapshot().x>278)break;}});
 const before=await page.evaluate(()=>(window as any).__ROADSTER__.snapshot());expect(before.platform).toBe('cargo-ferry');
 await page.getByRole('button',{name:'暂停游戏',exact:true}).click();await page.waitForTimeout(350);const after=await page.evaluate(()=>(window as any).__ROADSTER__.snapshot());expect(after.worldTime).toBe(before.worldTime);
 await page.getByRole('button',{name:'从检查点复活',exact:true}).click();const respawn=await page.evaluate(()=>(window as any).__ROADSTER__.snapshot());expect(respawn.x).toBe(235);expect(respawn.health).toBe(100);expect(respawn.speed).toBe(0);expect(respawn.collectedStars).toEqual(before.collectedStars);expect(respawn.worldTime).toBeLessThan(before.worldTime);
});
