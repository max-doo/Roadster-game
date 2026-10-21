import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';

test('game selects four licensed tracks and preserves pause, retry and volume controls',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const failed:string[]=[];page.on('response',r=>{if(r.url().includes('/audio/music/')&&r.status()>=400)failed.push(r.url());});
  await page.addInitScript(()=>localStorage.setItem('gravity-breaker-v1',JSON.stringify({version:1,unlocked:3,records:{},tutorials:[],settings:{language:'en'}})));
  await page.goto('/');await page.waitForFunction(()=>!!(window as any).__ROADSTER__);
  const audio=()=>page.evaluate(()=>(window as any).__ROADSTER__.stats().audio);
  expect((await audio()).musicTrack).toBe(''); // No download/playback before interaction.
  await page.getByRole('button',{name:'Roadster home',exact:true}).click();
  await expect.poll(async()=>(await audio()).musicTime).toBeGreaterThan(.2);
  expect((await audio()).musicTrack).toBe('night-club-chill');
  const captures=[];
  for(const [level,track] of [[1,'jumping-cyborg'],[2,'new-factory'],[3,'system-overload']] as const){
    await page.evaluate(id=>{const a=(window as any).__ROADSTER__;a.start(id);a.manual(true);},level);
    await expect.poll(async()=>(await audio()).musicTrack).toBe(track);
    await expect.poll(async()=>(await audio()).musicTime).toBeGreaterThan(.3);
    await page.evaluate(()=>(window as any).__ROADSTER__.pause());
    await expect.poll(async()=>(await audio()).musicPaused).toBe(true);
    const paused=(await audio()).musicTime;await page.waitForTimeout(250);
    expect((await audio()).musicTime).toBeCloseTo(paused,1);
    await page.evaluate(()=>(window as any).__ROADSTER__.pause());
    await expect.poll(async()=>(await audio()).musicTime).toBeGreaterThan(paused+.1);
    const beforeRetry=(await audio()).musicTime;
    await page.evaluate(()=>{const a=(window as any).__ROADSTER__;a.retry();a.manual(true);});
    await expect.poll(async()=>(await audio()).musicTime).toBeGreaterThan(beforeRetry);
    captures.push(await audio());
  }
  await page.evaluate(()=>(window as any).__ROADSTER__.menu());
  await expect.poll(async()=>(await audio()).musicTrack).toBe('night-club-chill');
  await page.getByRole('button',{name:'SETTINGS',exact:true}).click();
  await expect.poll(async()=>(await audio()).musicPaused).toBe(true);
  await page.getByRole('slider',{name:'music volume',exact:true}).fill('0');
  expect((await audio()).musicVolume).toBe(0);
  await page.getByRole('button',{name:'BACK',exact:true}).click();
  await page.waitForTimeout(200);expect((await audio()).musicPaused).toBe(true);
  await page.getByRole('button',{name:'SETTINGS',exact:true}).click();
  await page.getByRole('slider',{name:'music volume',exact:true}).fill('0.35');
  await page.getByRole('button',{name:'BACK',exact:true}).click();
  await expect.poll(async()=>(await audio()).musicPaused).toBe(false);
  await page.getByRole('button',{name:'Mute sound',exact:true}).click();
  await expect.poll(async()=>(await audio()).musicPaused).toBe(true);
  await page.getByRole('button',{name:'Unmute sound',exact:true}).click();
  await expect.poll(async()=>(await audio()).musicPaused).toBe(false);
  expect(errors).toEqual([]);expect(failed).toEqual([]);
  await mkdir('artifacts/music',{recursive:true});
  await writeFile('artifacts/music/game-playback.json',JSON.stringify({captures,final:await audio(),errors,failed},null,2));
});

test('real audio decoding produces a signal, loops, hides and disposes',async({page})=>{
  await page.goto('/');await page.waitForFunction(()=>!!(window as any).__ROADSTER__);
  await page.evaluate(async()=>{
    const {GameAudio}=await import('/src/game/audio.ts' as string);
    const {loadSave}=await import('/src/game/save.ts' as string);
    const a=new GameAudio();(window as any).__musicTest=a;
    const button=document.createElement('button');button.textContent='Enable music fixture';button.id='music-fixture';button.style.cssText='position:fixed;z-index:99999;top:0;left:0';
    button.onclick=()=>{a.setScene('menu',1);void a.unlock({...loadSave().settings,muted:false,music:.4,master:.6});};document.body.append(button);
  });
  await page.locator('#music-fixture').click();
  await expect.poll(()=>page.evaluate(()=>(window as any).__musicTest.levels().musicTime)).toBeGreaterThan(1);
  const signal=await page.evaluate(async()=>{
    const a=(window as any).__musicTest;const analyser=a.context.createAnalyser();a.music.connect(analyser);analyser.fftSize=2048;
    let peak=0;for(let i=0;i<15;i++){await new Promise(r=>setTimeout(r,100));const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);peak=Math.max(peak,...Array.from(data,Math.abs));}analyser.disconnect();
    const element=a.musicElement;element.currentTime=element.duration-.3;return {peak,duration:element.duration,loop:element.loop};
  });
  expect(signal.peak).toBeGreaterThan(.0001);expect(signal.loop).toBe(true);
  await expect.poll(()=>page.evaluate(()=>(window as any).__musicTest.levels().musicTime)).toBeLessThan(2);
  await page.evaluate(()=>(window as any).__musicTest.setScene('menu',1,true));
  expect(await page.evaluate(()=>(window as any).__musicTest.levels().musicPaused)).toBe(true);
  await page.evaluate(()=>(window as any).__musicTest.setScene('menu',1,false));
  await expect.poll(()=>page.evaluate(()=>(window as any).__musicTest.levels().musicPaused)).toBe(false);
  await page.evaluate(()=>(window as any).__musicTest.dispose());
  await expect.poll(()=>page.evaluate(()=>(window as any).__musicTest.context.state)).toBe('closed');
  await mkdir('artifacts/music',{recursive:true});await writeFile('artifacts/music/signal.json',JSON.stringify(signal,null,2));
});
