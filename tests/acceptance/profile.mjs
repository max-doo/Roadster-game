import {chromium} from '@playwright/test';
import {writeFile,readdir,stat} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.ROADSTER_CHROME||process.env.LOCALAPPDATA+'/ms-playwright/chromium-1208/chrome-win64/chrome.exe',args:['--enable-webgl','--ignore-gpu-blocklist']});
const results=[];const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__ROADSTER__);
for(const quality of ['high','medium','low','auto']){
  await page.evaluate(()=>window.__ROADSTER__.menu());await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByLabel('画面质量').selectOption(quality);await page.getByRole('button',{name:'返回',exact:true}).click();
  for(const id of [1,2,3]){
    await page.evaluate(i=>window.__ROADSTER__.start(i),id);await page.keyboard.down('KeyD');if(id>1)await page.keyboard.press('KeyE');await page.waitForTimeout(700);
    const samples=[];for(let i=0;i<4;i++){await page.waitForTimeout(450);samples.push(await page.evaluate(()=>window.__ROADSTER__.stats()));}
    results.push({quality,level:id,viewport:'844x390 mobile emulation',samples,averageFPS:samples.reduce((a,s)=>a+s.fps,0)/samples.length,averageFrameMs:samples.reduce((a,s)=>a+s.frameMs,0)/samples.length});await page.keyboard.up('KeyD');
  }
}
await page.evaluate(()=>window.__ROADSTER__.menu());await page.waitForTimeout(700);const before=await page.evaluate(()=>window.__ROADSTER__.stats());for(let i=0;i<12;i++){await page.evaluate(i=>{window.__ROADSTER__.start(i%3+1);window.__ROADSTER__.step(2);},i);await page.waitForTimeout(40);await page.evaluate(()=>window.__ROADSTER__.menu());}await page.waitForTimeout(700);const after=await page.evaluate(()=>window.__ROADSTER__.stats());
async function size(path){let bytes=0;for(const e of await readdir(path,{withFileTypes:true})){const p=path+'/'+e.name;bytes+=e.isDirectory()?await size(p):(await stat(p)).size;}return bytes;}
let buildBytes;try{buildBytes=await size('dist');}catch{}
const navigation=await page.evaluate(()=>{const t=performance.getEntriesByType('navigation')[0];return {domContentLoaded:t.domContentLoadedEventEnd,loadEvent:t.loadEventEnd};});
await writeFile('artifacts/performance.json',JSON.stringify({environment:'Windows desktop Chromium headless, mobile viewport emulation; not physical phone hardware',browserVersion:browser.version(),results,sceneSwitches:{count:12,before,after},navigation,buildBytes,errors},null,2));await browser.close();console.log(JSON.stringify({samples:results.map(r=>({quality:r.quality,level:r.level,fps:r.averageFPS,frameMs:r.averageFrameMs})),sceneSwitches:{before,after},errors},null,2));

if(errors.length)throw new Error("Browser profiling recorded runtime errors");
