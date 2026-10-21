import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';

for(const mobile of [false,true])test(`FAULTLINE seven complete browser runs ${mobile?'mobile':'desktop'}`,async({browser})=>{
  test.setTimeout(240000);
  const context=await browser.newContext({viewport:mobile?{width:780,height:360}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{if(!localStorage.getItem('gravity-breaker-v1'))localStorage.setItem('gravity-breaker-v1',JSON.stringify({version:1,unlocked:4,records:{3:{revision:3,time:70,stars:2,crashes:0,flips:0}},tutorials:[],settings:{language:'zh',quality:'low',reducedMotion:true,muted:true}}));});
  await page.goto('/');await page.waitForFunction(()=>(window as any).__ROADSTER__);
  await page.getByRole('button',{name:/选择关卡/}).click();
  await expect(page.locator('.mission-row')).toHaveCount(10);
  const finalRow=page.locator('.mission-row').last();await finalRow.scrollIntoViewIfNeeded();await expect(finalRow.locator('.mission-index')).toHaveText('10');await expect(finalRow).toBeDisabled();
  const dir='artifacts/faultline',suffix=mobile?'mobile':'desktop';await mkdir(dir,{recursive:true});
  await page.screenshot({path:`${dir}/missions-${suffix}.png`});
  await page.evaluate(async()=>{(window as any).__policy=(await import('/tests/replay-policy.ts' as string)).collectReplayInput;});
  const results=[];
  for(let id=4;id<=10;id++){
    await page.evaluate(id=>{const a=(window as any).__ROADSTER__;a.start(id);a.manual(true);},id);
    await expect(page.locator('.collection-caption strong')).toHaveText(/0\s*\/\s*4/);
    let state:any,captured=false,platformFrames=0,collapsed=0,windFrames=0;
    for(let batch=0;batch<240;batch++){
      const sample=await page.evaluate(id=>{
        const a=(window as any).__ROADSTER__;let s=a.snapshot(),platform=0,wind=0;
        for(let f=0;f<120;f++){a.input((window as any).__policy(id,s));s=a.step(1,false);if(s.platform)platform++;if(s.windForce&&Math.hypot(s.windForce.x,s.windForce.y)>1)wind++;if(['finished','crashed'].includes(s.mode))break;}
        return {s,platform,wind};
      },id);
      state=sample.s;platformFrames+=sample.platform;windFrames+=sample.wind;collapsed=Math.max(collapsed,state.collapsedTracks?.length??0);
      expect(state.mode,`${id}: ${state.message}`).not.toBe('crashed');
      const showcase=id===4?state.collapseWarnings?.length:id===5?state.y>20&&Math.cos(state.angle)<-.8:id===6?state.platform:id===7?Math.cos(state.angle)<-.8:id===8?sample.wind:id===9?Math.cos(state.angle)<-.8:state.platform;
      if(!captured&&showcase){await page.evaluate(()=>(window as any).__ROADSTER__.step(0,true));await page.waitForTimeout(1600);await page.screenshot({path:`${dir}/${id}-mechanic-${suffix}.png`});captured=true;}
      if(state.mode==='finished')break;
    }
    expect(state.mode).toBe('finished');expect(state.collectedStars).toHaveLength(4);expect(captured).toBe(true);
    await expect(page.locator('.result-collection strong')).toHaveText(/\d\s*\/\s*4/);
    if(id===10){await expect(page.getByRole('heading',{name:'试验计划完成'})).toBeVisible();await expect(page.getByRole('button',{name:/返回(机库|车库)/,exact:true})).toBeVisible();}
    await page.waitForTimeout(1000);await page.screenshot({path:`${dir}/${id}-complete-${suffix}.png`});
    results.push({id,snapshot:state,platformFrames,windFrames,collapsed,stats:await page.evaluate(()=>(window as any).__ROADSTER__.stats())});
  }
  const saved=await page.evaluate(()=>(window as any).__ROADSTER__.state().save);expect(saved.unlocked).toBe(10);expect(saved.records[3].revision).toBe(3);
  await page.reload();await page.waitForFunction(()=>(window as any).__ROADSTER__);expect(await page.evaluate(()=>(window as any).__ROADSTER__.state().save.records)).toEqual(saved.records);
  expect(errors).toEqual([]);await writeFile(`${dir}/replays-${suffix}.json`,JSON.stringify({results,errors},null,2));await context.close();
});
