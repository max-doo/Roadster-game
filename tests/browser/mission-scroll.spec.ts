import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';

/** Native touch swipe; the archive must scroll even though its rows are <button>s. */
async function swipe(page:Page,from:{x:number;y:number},to:{x:number;y:number},steps=14){
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:from.x,y:from.y}]});
  for(let i=1;i<=steps;i++){
    const t=i/steps;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t}]});
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await cdp.detach();
}

async function openArchive(page:Page,portrait=false){
  await page.addInitScript(()=>localStorage.setItem('gravity-breaker-v1',JSON.stringify({version:1,unlocked:10,records:{},tutorials:[],settings:{quality:'low',muted:true,reducedMotion:true}})));
  await page.goto('/');
  await page.getByRole('button',{name:'开始游戏',exact:true}).waitFor();
  if(portrait)await page.getByRole('button',{name:'继续竖屏游玩',exact:true}).tap();
  await page.getByRole('button',{name:/选择关卡/}).tap();
  await expect(page.locator('.missions-panel')).toBeVisible();
}

for(const [label,viewport,portrait] of [
  ['landscape phone',{width:844,height:390},false],
  ['portrait phone',{width:390,height:844},true],
] as const){
  test(`mission archive scrolls by touch on a ${label}`,async({browser})=>{
    const context=await browser.newContext({viewport,hasTouch:true,isMobile:true});
    const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await openArchive(page,portrait);
    const panel=page.locator('.missions-panel');
    expect(await panel.evaluate(el=>el.scrollHeight>el.clientHeight+40)).toBe(true);
    const box=(await panel.boundingBox())!;
    const x=box.x+box.width/2,bottom=box.y+box.height*.85,top=box.y+box.height*.25;
    await swipe(page,{x,y:bottom},{x,y:top});
    await expect.poll(()=>panel.evaluate(el=>el.scrollTop)).toBeGreaterThan(40);
    await swipe(page,{x,y:top},{x,y:bottom});
    await expect.poll(()=>panel.evaluate(el=>el.scrollTop)).toBeLessThan(5);
    // Scrolling must not break tap-to-start.
    const row=page.locator('.mission-row').nth(2);
    await row.scrollIntoViewIfNeeded();await row.tap();
    await expect.poll(()=>page.evaluate(()=>(window as any).__ROADSTER__.state().screen)).toBe('playing');
    expect(errors).toEqual([]);
    await context.close();
  });
}
