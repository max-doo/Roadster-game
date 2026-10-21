import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';

const browser=await chromium.launch({headless:true,executablePath:process.env.ROADSTER_CHROME||process.env.LOCALAPPDATA+'/ms-playwright/chromium-1208/chrome-win64/chrome.exe',args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400)requests.push(`${r.status()} ${r.url()}`);});
await page.addInitScript(()=>localStorage.setItem('gravity-breaker-v1',JSON.stringify({version:1,unlocked:10,records:{},tutorials:['10:accelerate'],settings:{language:'zh',muted:true}})));
const dir='artifacts/faultline';await mkdir(dir,{recursive:true});
try{
  await page.goto('http://127.0.0.1:4173');await page.getByRole('button',{name:'开始游戏',exact:true}).waitFor();
  const qaAbsent=await page.evaluate(()=>window.__ROADSTER__===undefined);
  await page.getByRole('button',{name:/选择关卡/}).click();
  const count=await page.locator('.mission-row').count();
  await page.locator('.mission-row').last().scrollIntoViewIfNeeded();await page.screenshot({path:`${dir}/production-missions.png`});
  await page.locator('.mission-row').last().click();await page.keyboard.down('KeyD');await page.waitForTimeout(3200);await page.keyboard.up('KeyD');
  const speed=+(await page.locator('.speed strong').innerText());
  const stars=await page.locator('.collection-caption strong').innerText();
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'继续游戏',exact:true}).waitFor();
  await page.screenshot({path:`${dir}/production-terminus-pause.png`});
  await page.getByRole('button',{name:'从检查点复活',exact:true}).click();
  await page.screenshot({path:`${dir}/production-terminus-retry.png`});
  const passed=qaAbsent&&count===10&&speed>30&&/\/\s*4/.test(stars)&&!errors.length&&!requests.length;
  const result={passed,qaAbsent,missionCount:count,speedKmh:speed,stars,errors,requests};
  await writeFile(`${dir}/production-smoke.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  if(!passed)throw new Error('FAULTLINE production smoke failed');
}finally{await browser.close();}
