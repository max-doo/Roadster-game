import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

for(const reduced of [false,true])test(`damage tint clears and stays cleared ${reduced?'with reduced motion on mobile':'with normal motion on desktop'}`,async({browser})=>{
  const context=await browser.newContext({viewport:reduced?{width:844,height:390}:{width:1440,height:900},isMobile:reduced,hasTouch:reduced,reducedMotion:reduced?'reduce':'no-preference'});
  const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.waitForFunction(()=>(window as any).__ROADSTER__);
  const damage=await page.evaluate(async()=>{
    const api=(window as any).__ROADSTER__,policy=(await import('/tests/replay-policy.ts' as string)).replayInput;
    api.start(1);api.manual(true);
    for(let i=0;i<1200;i++){api.input(policy(1,api.snapshot()));api.step(1,false);if(api.snapshot().damageEvents>0)break;}
    return api.snapshot();
  });
  expect(damage.damageEvents).toBeGreaterThan(0);expect(damage.health).toBeLessThan(100);
  await page.waitForTimeout(650);
  await expect(page.locator('.damage-flash')).toHaveCount(0,{timeout:1800});
  // Frequent snapshot updates, pause/resume and retry must not replay an old hit.
  await page.waitForTimeout(500);await expect(page.locator('.damage-flash')).toHaveCount(0);
  await page.evaluate(()=>(window as any).__ROADSTER__.pause());await page.evaluate(()=>(window as any).__ROADSTER__.pause());await page.waitForTimeout(100);await expect(page.locator('.damage-flash')).toHaveCount(0);
  await page.evaluate(()=>(window as any).__ROADSTER__.retry());await page.waitForTimeout(100);await expect(page.locator('.damage-flash')).toHaveCount(0);
  const nextHit=await page.evaluate(async()=>{
    const api=(window as any).__ROADSTER__,policy=(await import('/tests/replay-policy.ts' as string)).replayInput,old=api.snapshot().damageEvents;
    for(let i=0;i<1200;i++){api.input(policy(1,api.snapshot()));api.step(1,false);if(api.snapshot().damageEvents>old)break;}
    return api.snapshot().damageEvents;
  });
  expect(nextHit).toBeGreaterThan(damage.damageEvents);
  await expect(page.locator('.damage-flash')).toHaveCount(0,{timeout:1800});await expect(page.locator('.damage-flash')).toHaveCount(0);
  await mkdir('artifacts/damage-feedback',{recursive:true});await page.screenshot({path:`artifacts/damage-feedback/${reduced?'reduced-mobile':'normal-desktop'}-cleared.png`});
  expect(errors).toEqual([]);await context.close();
});
