import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';

const dir='artifacts/mobile-feedback';

async function frameProbe(page:Page){
  await page.evaluate(async()=>{
    // Vite may version an imported module after an edit; probe the actual loaded class.
    const url=performance.getEntriesByType('resource').map(e=>e.name).find(url=>new URL(url).pathname==='/src/render/engine.ts');
    if(!url)throw new Error('The gameplay renderer module was not loaded');
    const {GameRenderer}=await import(url),original=GameRenderer.prototype.render;
    GameRenderer.prototype.render=function(...args:any[]){
      original.apply(this,args);if(!args[0])return;
      const points=[];
      for(const x of [-2.5,2.3])for(const y of [-.85,.95])for(const z of [-1.1,1.1])points.push(this.car.group.localToWorld(this.camera.position.clone().set(x,y,z)).project(this.camera));
      const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x));
      (window as any).__frame={left,right,top:Math.max(...points.map(p=>p.y)),bottom:Math.min(...points.map(p=>p.y)),width:(right-left)*innerWidth/2};
    };
  });
}

async function settle(page:Page){
  return page.evaluate(()=>{const a=(window as any).__ROADSTER__;for(let i=0;i<100;i++)a.step(0,true);return {frame:(window as any).__frame,state:a.snapshot(),stats:a.stats()};});
}

test('phone follow shot makes the car larger while retaining gameplay framing',async({browser})=>{
  test.setTimeout(180000);await mkdir(dir,{recursive:true});
  const results:any[]=[];
  for(const touch of [false,true]){
    const context=await browser.newContext({viewport:{width:780,height:360},hasTouch:touch,isMobile:touch});
    const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>localStorage.setItem('gravity-breaker-v1',JSON.stringify({version:1,unlocked:10,records:{},tutorials:[],settings:{quality:'low',muted:true,reducedMotion:true}})));
    await page.goto('/');await page.getByRole('button',{name:'开始游戏',exact:true}).waitFor();await frameProbe(page);
    await page.getByRole('button',{name:'开始游戏',exact:true}).click();
    await page.evaluate(()=>{const a=(window as any).__ROADSTER__;a.manual(true);a.input({accelerate:false,brake:true,thrust:false,boost:false,suction:false,pitch:0});a.step(12,false);});
    const sample=await settle(page);expect(sample.frame.left).toBeGreaterThan(-.95);expect(sample.frame.right).toBeLessThan(.95);
    await page.screenshot({path:`${dir}/${touch?'phone-close':'desktop-framing'}-780.png`});
    results.push({touch,...sample,errors});expect(errors).toEqual([]);await context.close();
  }
  expect(results[1].frame.width/results[0].frame.width).toBeGreaterThan(1.35);
  expect(results[1].frame.width/results[0].frame.width).toBeLessThan(1.55);
  await writeFile(`${dir}/framing-comparison.json`,JSON.stringify(results,null,2));
});

test('phone camera keeps traffic, inverted driving, drops and moving platforms in view',async({browser})=>{
  test.setTimeout(180000);await mkdir(dir,{recursive:true});
  const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>localStorage.setItem('gravity-breaker-v1',JSON.stringify({version:1,unlocked:10,records:{},tutorials:[],settings:{quality:'low',muted:true,reducedMotion:true}})));
  await page.goto('/');await page.getByRole('button',{name:'开始游戏',exact:true}).waitFor();await frameProbe(page);
  const samples=[];
  for(const [id,tag] of [[1,'traffic'],[2,'inverted'],[3,'drop'],[4,'platform'],[6,'chaser']] as const){
    await page.evaluate(async({id,tag})=>{
      const a=(window as any).__ROADSTER__,policy=(await import('/tests/replay-policy.ts' as string)).replayInput;
      a.start(id);a.manual(true);let s=a.snapshot();
      for(let i=0;i<120*240;i++){
        a.input(policy(id,s));s=a.step(1,false);
        if(tag==='traffic'&&s.roadActors?.some((v:any)=>v.id.endsWith('blocker')&&v.x>s.x&&v.x-s.x<22)
          ||tag==='inverted'&&s.mode==='adhered'&&Math.cos(s.angle)<-.8
          ||tag==='drop'&&s.mode==='airborne'&&s.vy< -7&&s.y>20
          ||tag==='platform'&&s.platform
          ||tag==='chaser'&&s.roadActors?.some((v:any)=>v.id.endsWith('chaser')&&v.x<s.x&&s.x-v.x<24))return s;
        if(['crashed','finished'].includes(s.mode))break;
      }
      throw new Error(`No ${tag} sample in mission ${id}: ${s.mode} at ${s.x}`);
    },{id,tag});
    const sample=await settle(page);
    expect(sample.frame.left,tag).toBeGreaterThan(-.98);expect(sample.frame.right,tag).toBeLessThan(.98);
    expect(sample.frame.top,tag).toBeLessThan(.98);expect(sample.frame.bottom,tag).toBeGreaterThan(-.98);
    if(tag==='drop')expect(sample.frame.width).toBeGreaterThan(60);
    await page.screenshot({path:`${dir}/phone-${tag}-844.png`});samples.push({id,tag,...sample});
  }
  expect(errors).toEqual([]);await writeFile(`${dir}/special-framing.json`,JSON.stringify({samples,errors},null,2));await context.close();
});

test('touch and real gameplay events request bounded vibration; the setting persists',async({browser})=>{
  await mkdir(dir,{recursive:true});
  const context=await browser.newContext({viewport:{width:780,height:360},hasTouch:true,isMobile:true});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    (window as any).__vibrations=[];
    Object.defineProperty(navigator,'vibrate',{configurable:true,value:(pattern:any)=>{(window as any).__vibrations.push(pattern);return true;}});
    if(!localStorage.getItem('gravity-breaker-v1'))localStorage.setItem('gravity-breaker-v1',JSON.stringify({version:1,unlocked:1,records:{},tutorials:[],settings:{quality:'low',muted:true}}));
  });
  await page.goto('/');await page.getByRole('button',{name:'开始游戏',exact:true}).tap();
  const stick=(await page.locator('.joystick').boundingBox())!,boost=(await page.getByRole('button',{name:'喷气加速',exact:true}).boundingBox())!,cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:stick.x+stick.width*.8,y:stick.y+stick.height/2},{id:2,x:boost.x+boost.width/2,y:boost.y+boost.height/2}]});
  await expect.poll(()=>page.evaluate(()=>(window as any).__ROADSTER__.snapshot().boosting)).toBe(true);
  const first=await page.evaluate(()=>(window as any).__vibrations.length);expect(first).toBeGreaterThan(0);
  await page.waitForTimeout(250);expect(await page.evaluate(()=>(window as any).__vibrations.length)).toBe(first);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  const impactResult=await page.evaluate(async()=>{
    const a=(window as any).__ROADSTER__,policy=(await import('/tests/replay-policy.ts' as string)).replayInput;
    a.start(1);a.manual(true);(window as any).__vibrations=[];
    for(let i=0;i<1200;i++){a.input(policy(1,a.snapshot()));a.step(1,false);if(a.snapshot().damageEvents>0)break;}
    const impacts=[...(window as any).__vibrations];a.pause();return {impacts,stopped:[...(window as any).__vibrations]};
  });
  const {impacts}=impactResult;
  expect(impacts.some((p:any)=>p===30||Array.isArray(p)&&p[0]>=45)).toBe(true);
  expect(impactResult.stopped.at(-1)).toBe(0);
  await page.getByRole('button',{name:'设置',exact:true}).tap();
  const toggle=page.getByRole('checkbox',{name:'震动反馈',exact:true});await expect(toggle).toBeChecked();await toggle.uncheck();
  await page.screenshot({path:`${dir}/phone-settings-780.png`});
  await page.reload();await page.getByRole('button',{name:'设置',exact:true}).tap();await expect(toggle).not.toBeChecked();
  await page.getByRole('button',{name:'返回',exact:true}).tap();await page.getByRole('button',{name:'开始游戏',exact:true}).tap();await page.getByRole('button',{name:'喷气起飞',exact:true}).tap();
  expect(await page.evaluate(()=>(window as any).__vibrations)).toEqual([]);expect(errors).toEqual([]);
  await writeFile(`${dir}/vibration-integration.json`,JSON.stringify({mockedBrowserAPI:true,impacts,errors},null,2));await context.close();
});

test('an unsupported vibration API leaves settings honest and the game playable',async({browser})=>{
  const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>Object.defineProperty(navigator,'vibrate',{configurable:true,value:undefined}));
  await page.goto('/');await page.getByRole('button',{name:'设置',exact:true}).tap();
  await expect(page.getByRole('checkbox',{name:'震动反馈',exact:true})).toBeDisabled();
  await expect(page.locator('#vibration-help')).toHaveText('当前浏览器不支持震动反馈。');
  await page.getByRole('button',{name:'返回',exact:true}).tap();await page.getByRole('button',{name:'开始游戏',exact:true}).tap();
  await page.getByRole('button',{name:'喷气起飞',exact:true}).tap();
  await expect(page.getByRole('button',{name:'暂停游戏'})).toBeVisible();expect(errors).toEqual([]);await context.close();
});
