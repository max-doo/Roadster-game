import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';

for(const mobile of [false,true])test(`ground boost uses ordinary ${mobile?'multitouch':'keyboard'} input without lift`,async({browser})=>{
 const context=await browser.newContext({viewport:mobile?{width:780,height:360}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
 const page=await context.newPage(),errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>localStorage.setItem('gravity-breaker-v1',JSON.stringify({version:1,unlocked:1,records:{},tutorials:[],settings:{language:'zh',quality:'low',reducedMotion:true,muted:true}})));
 await page.goto('/');await page.getByRole('button',{name:'开始游戏',exact:true}).click();
 const boost=page.getByRole('button',{name:'喷气加速',exact:true});await expect(boost).toBeVisible();
 let cdp:any;
 if(mobile){
  const joystick=(await page.locator('.joystick').boundingBox())!,b=(await boost.boundingBox())!;
  expect(b.x).toBeGreaterThan(joystick.x+joystick.width);expect(b.width).toBeGreaterThanOrEqual(48);
  cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:joystick.x+joystick.width*.8,y:joystick.y+joystick.height/2,id:1},{x:b.x+b.width/2,y:b.y+b.height/2,id:2}]});
 }else{await page.keyboard.down('d');await page.keyboard.down('Shift');}
 await expect.poll(()=>page.evaluate(()=>(window as any).__ROADSTER__.snapshot().boosting)).toBe(true);
 await page.waitForTimeout(350);
 const s=await page.evaluate(()=>(window as any).__ROADSTER__.snapshot());
 expect(s.pressure).toBeLessThan(98);expect(s.thrusting).toBe(false);expect(s.y).toBeLessThan(1.1);expect(s.grounded).toBe(true);expect(s.speed).toBeGreaterThan(20);
 await mkdir('artifacts/boost-gameplay',{recursive:true});
 await page.screenshot({path:`artifacts/boost-gameplay/${mobile?'mobile':'desktop'}-controls.png`});
 if(mobile)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});else{await page.keyboard.up('Shift');await page.keyboard.up('d');}
 await expect.poll(()=>page.evaluate(()=>(window as any).__ROADSTER__.snapshot().boosting)).toBe(false);
 expect(errors).toEqual([]);await writeFile(`artifacts/boost-gameplay/${mobile?'mobile':'desktop'}-input.json`,JSON.stringify({state:s,errors},null,2));await context.close();
});

test('gas reserve exceeds 100, checkpoints preserve it, and retries cannot duplicate cans',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('gravity-breaker-v1',JSON.stringify({version:1,unlocked:10,records:{},tutorials:[],settings:{language:'zh',quality:'low',muted:true}})));
 await page.goto('/');await page.waitForFunction(()=>(window as any).__ROADSTER__);
 const result=await page.evaluate(async()=>{
  const a=(window as any).__ROADSTER__,policy=(await import('/tests/replay-policy.ts' as string)).replayInput;
  a.start(4);a.manual(true);let s=a.snapshot(),saved=0;
  for(let i=0;i<120*20;i++){a.input(policy(4,s));s=a.step(1,false);if(s.checkpoint===0&&!saved)saved=s.pressure;if(s.collectedItems.includes('4-0-air'))break;}
  const stock=s.pressure;a.step(0,true);a.retry();const retry=a.snapshot();return {saved,stock,retry};
 });
 expect(result.saved).toBe(100);expect(result.stock).toBe(140);expect(result.retry.pressure).toBe(100);expect(result.retry.collectedItems).not.toContain('4-0-air');
 await expect(page.locator('.pressure strong')).toContainText('100');await expect(page.locator('.pressure')).not.toContainText('%');
});
