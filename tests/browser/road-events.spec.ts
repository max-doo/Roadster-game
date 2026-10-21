import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';

for(const mobile of [false,true])test(`revised encounters and distinct worlds ${mobile?'mobile':'desktop'}`,async({browser})=>{
  test.setTimeout(360000);
  const context=await browser.newContext({viewport:mobile?{width:780,height:360}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage(),errors:string[]=[];const models=new Set<string>();
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);if(r.url().endsWith('box-truck.glb')&&r.ok())models.add(r.url());});
  await page.addInitScript(()=>localStorage.setItem('gravity-breaker-v1',JSON.stringify({version:1,unlocked:10,records:{},tutorials:[],settings:{language:'zh',quality:'low',reducedMotion:true,muted:true}})));
  await page.goto('/');await page.waitForFunction(()=>(window as any).__ROADSTER__);
  await page.evaluate(async()=>{(window as any).__policy=(await import('/tests/replay-policy.ts' as string)).collectReplayInput;
    (window as any).__trafficTiming=(await import('/src/game/roadEvents.ts' as string)).trafficTiming;});
  const dir='artifacts/traffic-upgrade',suffix=mobile?'mobile':'desktop';await mkdir(dir,{recursive:true});
  const results:any[]=[];const captured:string[]=[];
  for(let id=1;id<=10;id++){
    await page.evaluate(id=>{const a=(window as any).__ROADSTER__;a.start(id);a.manual(true);},id);
    // Settle local GLB loading before recording this world's view.
    if([1,2,3,4,5,6,7,8,9,10].includes(id))await page.waitForTimeout(800);
    let s:any;const events=new Set<string>();
    for(let batch=0;batch<420;batch++){
      const sample=await page.evaluate(({id,captured})=>{
        const a=(window as any).__ROADSTER__;let s=a.snapshot(),tag='';const seen:string[]=[];
        for(let f=0;f<120;f++){
          a.input((window as any).__policy(id,s));s=a.step(1,false);
          for(const e of s.roadEvents??[])seen.push(e.id);
          const event=s.roadEvents?.find((e:any)=>e.phase!=='clear');
          if(id===3&&s.platform==='cargo-lift')tag='cargo-lift-no-sign';
          if(id>=4&&s.x>65&&s.x<85)tag=`world-${id}`;
          if(event){
            if(id===4&&event.kind==='battery'&&event.age>.12&&event.age<.30)tag='battery-source';

            if(id===4&&s.roadActors?.some((a:any)=>a.kind==='battery'&&Math.abs(a.x-s.x)<20))tag='battery-dodge';
            if(id===6&&event.kind==='chase'&&s.roadActors?.some((a:any)=>a.id.endsWith('chaser')&&Math.abs(a.x-s.x)<18))tag='chase-jump';
            if(id===1&&s.roadActors?.some((a:any)=>a.id.endsWith('blocker')&&a.x>s.x&&a.x-s.x<30))tag='truck';
            if(id===10&&event.kind==='combo'&&event.age>2.2)tag='combo';
            if(id===4&&event.kind==='battery'&&event.age>.78&&event.age<1.0&&!captured.includes('battery-speech'))tag='battery-speech';
          }
          if(tag&&!captured.includes(tag)||['finished','crashed'].includes(s.mode))break;
          tag='';
        }
        return {s,tag,seen};
      },{id,captured});
      s=sample.s;for(const key of sample.seen)events.add(key);
      expect(s.mode,`${id}: ${s.message} cp ${s.checkpoint}`).not.toBe('crashed');
      if(sample.tag&&!captured.includes(sample.tag)){
        await page.evaluate(()=>(window as any).__ROADSTER__.step(0,true));await page.waitForTimeout(700);
        await page.screenshot({path:`${dir}/${suffix}-${sample.tag}.png`});captured.push(sample.tag);
        await expect(page.locator('.road-warning,.route-cue,.hud-level>strong')).toHaveCount(0);
        const diagnostics=await page.evaluate(()=>(window as any).__ROADSTER__.stats());
        expect(diagnostics.worldSigns).toBe(0);
        if(sample.tag==='battery-source'){
          const source=diagnostics.traffic.find((a:any)=>a.id==='event-4-0-source');expect(source.onScreen).toBe(true);expect(source.speech).toEqual([]);
          expect(s.roadActors.some((a:any)=>a.kind==='battery')).toBe(false);
        }
        if(sample.tag==='battery-speech'){
          const source=diagnostics.traffic.find((a:any)=>a.id==='event-4-0-source');expect(source.onScreen).toBe(true);expect(source.speech.join('')).toContain('电池先走');
        }
        if(sample.tag==='chase-jump')expect(diagnostics.traffic.some((a:any)=>a.onScreen&&a.speech.join('').includes('踏板断了'))).toBe(true);
      }
      if(s.mode==='finished')break;
    }
    expect(s.mode,`mission ${id}`).toBe('finished');const count=[1,1,2,4,3,5,5,4,3,7][id-1];
    expect(events.size).toBe(count);expect(s.eventsCleared).toHaveLength(count);expect(s.roadEvents.filter((e:any)=>e.hit)).toEqual([]);
    if(id>=4)expect(s.collectedStars).toHaveLength(4);
    results.push({id,snapshot:s,stats:await page.evaluate(()=>(window as any).__ROADSTER__.stats())});
  }
  expect(captured).toEqual(expect.arrayContaining(['cargo-lift-no-sign','battery-source','battery-speech','battery-dodge','chase-jump','truck','combo','world-4','world-5','world-6','world-7','world-8','world-9','world-10']));
  expect(models.size).toBe(1);expect(errors).toEqual([]);
  await writeFile(`${dir}/${suffix}.json`,JSON.stringify({results,captured,models:[...models],errors},null,2));await context.close();
});

test('unwarned keyboard approach hits a battery once and retries safely',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('gravity-breaker-v1',JSON.stringify({version:1,unlocked:10,records:{},tutorials:[],settings:{language:'zh',quality:'low',muted:true}})));
  await page.goto('/');await page.waitForFunction(()=>(window as any).__ROADSTER__);
  await page.evaluate(()=>(window as any).__ROADSTER__.start(4));
  await page.keyboard.down('d');await page.keyboard.down('Shift');
  await page.waitForFunction(()=>(window as any).__ROADSTER__.snapshot().x>100,{},{timeout:20000});await page.keyboard.up('Shift');
  await expect(page.locator('.failed-overlay')).toBeVisible({timeout:25000});await page.keyboard.up('d');
  const failed=await page.evaluate(()=>(window as any).__ROADSTER__.snapshot());
  expect(failed.health).toBe(0);expect(failed.crashes).toBe(1);expect(failed.message).toContain('BATTERY IMPACT');
  expect(failed.roadEvents[0].age).toBeLessThan(2);await expect(page.locator('.road-warning,.route-cue')).toHaveCount(0);
  await page.screenshot({path:'artifacts/traffic-upgrade/battery-failure.png'});
  await page.getByRole('button',{name:'从检查点复活',exact:true}).click();
  const reset=await page.evaluate(()=>(window as any).__ROADSTER__.snapshot());expect(reset.health).toBe(100);expect(reset.roadActors.every((a:any)=>(a.id.endsWith('-source')||a.id.endsWith('-blocker'))&&!a.dangerous)).toBe(true);
  expect(errors).toEqual([]);
});


test('a live scripted truck blocks the car instead of allowing drive-through',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('gravity-breaker-v1',JSON.stringify({version:1,unlocked:10,records:{},tutorials:[],settings:{language:'zh',quality:'low',muted:true}})));
  await page.goto('/');await page.waitForFunction(()=>(window as any).__ROADSTER__);
  const result=await page.evaluate(async()=>{
    const a=(window as any).__ROADSTER__,policy=(await import('/tests/replay-policy.ts' as string)).replayInput;
    a.start(4);a.manual(true);let s=a.snapshot();
    for(let i=0;i<120*60;i++){
      if(s.roadEvents?.some((e:any)=>e.id==='event-4-1'&&e.phase!=='clear'))break;
      a.input(policy(4,s));s=a.step(1,false);
    }
    const active=s.roadEvents?.find((e:any)=>e.id==='event-4-1');
    let blocked=0,maxOverlap=-Infinity;
    a.input({accelerate:true,brake:false,suction:false,thrust:false,pitch:0});
    for(let i=0;i<120*4;i++){
      s=a.step(1,false);const truck=s.roadActors?.find((v:any)=>v.id==='event-4-1-blocker');
      if(truck&&s.roadEvents.find((e:any)=>e.id==='event-4-1').hit){blocked++;maxOverlap=Math.max(maxOverlap,s.x+2.25-(truck.x-truck.w/2));}
    }
    a.step(0,true);return {active,s,blocked,maxOverlap};
  });
  expect(result.active).toBeDefined();expect(result.s.mode).not.toBe('crashed');
  expect(result.blocked).toBeGreaterThan(120);expect(result.maxOverlap).toBeLessThan(.25);
  await page.waitForTimeout(1000);await page.screenshot({path:'artifacts/traffic-upgrade/solid-truck-block.png'});
  await writeFile('artifacts/traffic-upgrade/solid-truck-block.json',JSON.stringify(result,null,2));expect(errors).toEqual([]);
});
