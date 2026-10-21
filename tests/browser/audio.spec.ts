import {test,expect} from '@playwright/test';
test('live audio graph follows road, brake, jet, pause and mute states',async({page})=>{
  await page.addInitScript(()=>{if(!localStorage.getItem('gravity-breaker-v1'))localStorage.setItem('gravity-breaker-v1',JSON.stringify({version:1,unlocked:1,records:{},tutorials:[],settings:{language:'en'}}));});await page.goto('/');await page.getByRole('button',{name:'START',exact:true}).click();
  await page.keyboard.down('KeyD');await page.waitForTimeout(1400);await page.keyboard.up('KeyD');
  let stats=await page.evaluate(()=>(window as any).__ROADSTER__.stats());expect(stats.audioContext).toBe('running');expect(stats.audio.road).toBeGreaterThan(.01);
  await page.keyboard.down('KeyA');await page.waitForTimeout(180);stats=await page.evaluate(()=>(window as any).__ROADSTER__.stats());expect(stats.audio.brake).toBeGreaterThan(.005);await page.keyboard.up('KeyA');
  await page.keyboard.down('Space');await page.waitForTimeout(700);stats=await page.evaluate(()=>(window as any).__ROADSTER__.stats());expect(stats.audio.jet).toBeGreaterThan(.1);expect(stats.audio.road).toBeLessThan(.002);await page.keyboard.up('Space');
  await page.keyboard.press('Escape');await page.waitForTimeout(500);stats=await page.evaluate(()=>(window as any).__ROADSTER__.stats());expect(stats.audio.jet).toBeLessThan(.001);expect(stats.audio.road).toBeLessThan(.001);expect(stats.audio.brake).toBeLessThan(.001);
  await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.getByLabel('Mute all audio').check();await page.waitForTimeout(400);stats=await page.evaluate(()=>(window as any).__ROADSTER__.stats());expect(stats.audio.master).toBeLessThan(.001);
});
