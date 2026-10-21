import {test,expect} from '@playwright/test';

test('keyboard suction is held, thrust has priority and pause clears held controls',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'开始游戏',exact:true}).click();
  const state=()=>page.evaluate(()=>(window as any).__ROADSTER__.snapshot());
  await page.keyboard.down('KeyE');await expect.poll(async()=>(await state()).suction).toBe(true);
  await page.keyboard.down('Space');await expect.poll(async()=>(await state()).thrusting).toBe(true);
  expect((await state()).suction).toBe(false);expect((await state()).suctionForce).toEqual({x:0,y:0});
  await page.keyboard.up('Space');await expect.poll(async()=>(await state()).suction).toBe(true);
  await page.keyboard.up('KeyE');await expect.poll(async()=>(await state()).suction).toBe(false);
  await page.keyboard.down('KeyE');await expect.poll(async()=>(await state()).suction).toBe(true);
  await page.keyboard.press('Escape');await page.keyboard.up('KeyE');await page.getByRole('button',{name:'继续游戏',exact:true}).click();
  await expect.poll(async()=>(await state()).suction).toBe(false);
  await page.keyboard.press('KeyE');await expect.poll(async()=>(await state()).suction).toBe(false);
  await page.screenshot({path:'artifacts/suction-hold-desktop.png'});
});

test('touch suction stays active only while held, with thrust priority and cancellation',async({browser})=>{
  const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const page=await context.newPage();
  await page.goto('/');await page.getByRole('button',{name:'开始游戏',exact:true}).tap();
  const state=()=>page.evaluate(()=>(window as any).__ROADSTER__.snapshot());
  const pad=(await page.getByRole('button',{name:'按住吸附',exact:true}).boundingBox())!,jet=(await page.getByRole('button',{name:'喷气起飞',exact:true}).boundingBox())!;
  const a={id:0,x:pad.x+pad.width/2,y:pad.y+pad.height/2},b={id:1,x:jet.x+jet.width/2,y:jet.y+jet.height/2};const cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});await page.waitForTimeout(400);expect((await state()).suction).toBe(true);
  await page.screenshot({path:'artifacts/suction-hold-mobile.png'});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});await expect.poll(async()=>(await state()).thrusting).toBe(true);expect((await state()).suction).toBe(false);
  await page.screenshot({path:'artifacts/suction-thrust-priority-mobile.png'});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await expect.poll(async()=>(await state()).suction||(await state()).thrusting).toBe(false);
  await page.getByRole('button',{name:'按住吸附',exact:true}).tap();await expect.poll(async()=>(await state()).suction).toBe(false);
  await context.close();
});
