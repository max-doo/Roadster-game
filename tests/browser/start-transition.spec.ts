import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';

for(const quality of ['auto','low'])test(`Start button enters Freightline and real time advances (${quality})`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.stack??e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.setViewportSize({width:2320,height:1317});
  await page.addInitScript(quality=>localStorage.setItem('gravity-breaker-v1',JSON.stringify({version:1,unlocked:6,records:{},tutorials:[],settings:{language:'zh',quality,muted:true}})),quality);
  await page.goto('/');await page.getByRole('button',{name:'开始游戏',exact:true}).waitFor();
  await page.getByRole('button',{name:'开始游戏',exact:true}).click();
  await expect(page.locator('.hud-level .health')).toBeVisible();
  await expect(page.locator('.hud-level>strong')).toHaveCount(0);
  await page.keyboard.down('d');await page.waitForTimeout(1300);await page.keyboard.up('d');
  const state=await page.evaluate(()=>(window as any).__ROADSTER__.snapshot());
  const dir='artifacts/start-transition';await mkdir(dir,{recursive:true});
  await page.screenshot({path:`${dir}/${quality}.png`});await writeFile(`${dir}/${quality}.json`,JSON.stringify({state,errors},null,2));
  expect(errors).toEqual([]);expect(state.time).toBeGreaterThan(.5);expect(state.x).toBeGreaterThan(6);expect(state.speed).toBeGreaterThan(10);
});

test('all ten mission buttons start a live scene on mobile landscape',async({browser})=>{
  const context=await browser.newContext({viewport:{width:780,height:360},isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.stack??e.message));
  await page.addInitScript(()=>localStorage.setItem('gravity-breaker-v1',JSON.stringify({version:1,unlocked:10,records:{},tutorials:[],settings:{language:'zh',quality:'low',muted:true}})));
  const states=[];
  for(let id=1;id<=10;id++){
    await page.goto('/');await page.getByRole('button',{name:'开始游戏',exact:true}).waitFor();
    await page.getByRole('button',{name:/选择关卡/}).tap();const row=page.locator('.mission-row').nth(id-1);await row.scrollIntoViewIfNeeded();await row.tap();
    await page.keyboard.down('d');await page.waitForTimeout(900);await page.keyboard.up('d');
    const s=await page.evaluate(()=>(window as any).__ROADSTER__.snapshot());expect(s.time,`mission ${id}`).toBeGreaterThan(.2);expect(s.speed).toBeGreaterThan(5);expect(s.x).toBeGreaterThan(4);
    states.push({id,time:s.time,x:s.x,speed:s.speed});
    if(id===6)await page.screenshot({path:'artifacts/start-transition/mobile-6.png'});
  }
  expect(errors).toEqual([]);await writeFile('artifacts/start-transition/mobile-all-ten.json',JSON.stringify({states,errors},null,2));await context.close();
});
