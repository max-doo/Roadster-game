import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';

const dir='artifacts/pause-restart';

test('pause offers a full mission restart that fits a short phone screen',async({browser})=>{
  await mkdir(dir,{recursive:true});
  const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('gravity-breaker-v1',JSON.stringify({version:1,unlocked:10,records:{},tutorials:[],settings:{quality:'low',muted:true,reducedMotion:true}})));
  await page.goto('/');
  await page.getByRole('button',{name:'开始游戏',exact:true}).tap();
  // Drive well past the start line so a checkpoint retry would be distinguishable.
  await page.evaluate(()=>{const a=(window as any).__ROADSTER__;a.manual(true);a.input({accelerate:true});a.step(300);a.pause();});
  const restart=page.getByRole('button',{name:'重新开始',exact:true});
  await expect(restart).toBeVisible();
  await expect(page.getByRole('button',{name:'从检查点复活',exact:true})).toBeVisible();
  const box=(await restart.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(390);
  await page.screenshot({path:`${dir}/pause-zh-844.png`});
  await restart.tap();
  await expect(page.getByRole('button',{name:'喷气起飞',exact:true})).toBeVisible();
  const s=await page.evaluate(()=>(window as any).__ROADSTER__.snapshot());
  expect(s.checkpoint).toBe(-1);expect(s.x).toBeLessThan(8);expect(s.time).toBeLessThan(2);expect(s.speed).toBeLessThan(6);
  expect(errors).toEqual([]);
  await context.close();
});
