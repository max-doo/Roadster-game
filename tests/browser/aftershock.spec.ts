import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';

for(const mobile of [false,true])test(`AFTERSHOCK moving bridge, retry and four stars ${mobile?'mobile':'desktop'}`,async({browser})=>{
  const context=await browser.newContext({viewport:mobile?{width:780,height:360}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.waitForFunction(()=>(window as any).__ROADSTER__);
  await page.evaluate(async()=>{const a=(window as any).__ROADSTER__;a.start(4);a.manual(true);(window as any).__policy=(await import('/tests/replay-policy.ts' as string)).collectReplayInput;});
  const dir='artifacts/faultline/aftershock-revision';await mkdir(dir,{recursive:true});const suffix=mobile?'mobile':'desktop';
  let retried=false,low=false,high=false,s:any;const decks=new Set<string>();
  for(let batch=0;batch<190;batch++){
    const sample=await page.evaluate(async()=>{
      const a=(window as any).__ROADSTER__;let s=a.snapshot();
      for(let i=0;i<90;i++){a.input((window as any).__policy(4,s));s=a.step(1,false);if(['finished','crashed'].includes(s.mode))break;}
      const {LEVELS}=await import('/src/game/levels/index.ts' as string),{motionAt}=await import('/src/game/motion.ts' as string);
      const track=LEVELS[3].tracks.find((t:any)=>t.id===s.platform);
      return {s,height:track?motionAt(track.motion,s.worldTime).y:0};
    });s=sample.s;expect(s.mode,s.message).not.toBe('crashed');
    if(s.platform?.includes('-heave-')){
      decks.add(s.platform);
      if(!retried){
        await page.getByRole('button',{name:'暂停游戏',exact:true}).click();await page.getByRole('button',{name:'从检查点复活',exact:true}).click();
        const reset=await page.evaluate(()=>(window as any).__ROADSTER__.snapshot());expect(reset.speed).toBe(0);expect(reset.checkpoint).toBe(await page.evaluate(async()=>{const {LEVELS}=await import('/src/game/levels/index.ts' as string);return LEVELS[3].checkpoints.findIndex((c:any)=>c.label==='错层震荡桥');}));expect(reset.worldTime).toBeLessThan(s.worldTime);retried=true;continue;
      }
      if((!low&&sample.height<2)||(!high&&sample.height>5)){
        const name=sample.height<2?'low':'high';if(name==='low')low=true;else high=true;
        await page.evaluate(()=>(window as any).__ROADSTER__.step(0,true));await page.waitForTimeout(1100);await page.screenshot({path:`${dir}/${suffix}-${name}.png`});
      }
    }
    if(s.mode==='finished')break;
  }
  expect(retried).toBe(true);expect(low).toBe(true);expect(high).toBe(true);expect(decks.size).toBe(2);expect(s.mode).toBe('finished');expect(s.collectedStars).toHaveLength(4);expect(errors).toEqual([]);
  await page.screenshot({path:`${dir}/${suffix}-complete.png`});await writeFile(`${dir}/${suffix}.json`,JSON.stringify({snapshot:s,decks:[...decks],retried,low,high,errors},null,2));await context.close();
});
