import {test,expect,type Page} from '@playwright/test';

async function overturnFromRing(page:Page){
  await page.goto('/');await page.waitForFunction(()=>(window as any).__ROADSTER__);
  await page.evaluate(async()=>{
    const a=(window as any).__ROADSTER__,path='/tests/replay-policy.ts',policy=(await import(path)).replayInput;
    a.start(2);a.manual(true);
    for(let i=0;i<2000;i++){a.input(policy(2,a.snapshot()));a.step(1,false);if(a.snapshot().checkpoint===0)break;}
    a.retry();a.manual(true);a.input({accelerate:false,brake:false,suction:true,thrust:false,pitch:0});a.step(1,false);
    a.input({suction:false});a.step(480,false);
  });
  await expect.poll(()=>page.evaluate(()=>(window as any).__ROADSTER__.snapshot().mode)).toBe('overturned');
  await expect(page.getByRole('status')).toContainText('翻正');
}

for(const mobile of [false,true])test(`recovers a naturally overturned car with ${mobile?'touch pitch':'keyboard pitch'}`,async({browser})=>{
  const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});const page=await context.newPage();
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await overturnFromRing(page);
  await page.waitForTimeout(300);await page.screenshot({path:`artifacts/overturned-warning-${mobile?'mobile':'desktop'}.png`});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>(window as any).__ROADSTER__.manual(false));
  let release:()=>Promise<void>;
  if(mobile){
    const p=(await page.locator('.joystick').boundingBox())!,cdp=await context.newCDPSession(page),finger={id:0,x:p.x+p.width/2,y:p.y+p.height*.5};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...finger,y:finger.y-55}]});
    release=async()=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
  }else {await page.keyboard.down('KeyW');release=()=>page.keyboard.up('KeyW');}
  await expect.poll(()=>page.evaluate(()=>{const s=(window as any).__ROADSTER__.snapshot();return s.grounded&&Math.cos(s.angle)>.8;}),{timeout:4500}).toBe(true);
  await release();const s=await page.evaluate(()=>(window as any).__ROADSTER__.snapshot());expect(s.crashes).toBe(0);expect(s.health).toBeGreaterThan(0);
  await page.screenshot({path:`artifacts/overturned-recovered-${mobile?'mobile':'desktop'}.png`});expect(errors).toEqual([]);await context.close();
});

test('stranded timeout pauses with the game, fails, and permits a safe inverted checkpoint retry',async({page})=>{
  await overturnFromRing(page);await page.evaluate(()=>(window as any).__ROADSTER__.pause());
  const before=await page.evaluate(()=>(window as any).__ROADSTER__.snapshot().time);await page.waitForTimeout(600);
  expect(await page.evaluate(()=>(window as any).__ROADSTER__.snapshot().time)).toBe(before);
  await page.getByRole('button',{name:'继续游戏',exact:true}).click();
  await page.evaluate(()=>{const a=(window as any).__ROADSTER__;a.manual(true);a.step(720,false);});
  await expect(page.getByRole('heading',{name:'行驶中断'})).toBeVisible();await expect(page.locator('.result-panel')).toContainText('车辆受困');
  await page.waitForTimeout(400);
  await page.screenshot({path:'artifacts/overturned-timeout.png'});
  await page.getByRole('button',{name:'从检查点复活',exact:true}).click();
  await page.evaluate(()=>{const a=(window as any).__ROADSTER__;a.manual(true);a.step(360,false);});
  const s=await page.evaluate(()=>(window as any).__ROADSTER__.snapshot());expect(s.mode).toBe('adhered');expect(s.health).toBe(100);expect(s.checkpoint).toBe(0);expect(s.crashes).toBe(1);
  await page.screenshot({path:'artifacts/overturned-checkpoint-restored.png'});
});
