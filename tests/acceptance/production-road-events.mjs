import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true,executablePath:process.env.ROADSTER_CHROME||process.env.LOCALAPPDATA+'/ms-playwright/chromium-1208/chrome-win64/chrome.exe',args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
await page.addInitScript(()=>localStorage.setItem('gravity-breaker-v1',JSON.stringify({version:1,unlocked:10,records:{},tutorials:[],settings:{language:'zh',quality:'low',reducedMotion:true,muted:true}})));
const dir='artifacts/boost-gameplay';await mkdir(dir,{recursive:true});
try{
  await page.goto('http://127.0.0.1:4173');await page.getByRole('button',{name:'开始游戏',exact:true}).waitFor();
  expect(await page.evaluate(()=>window.__ROADSTER__===undefined)).toBe(true);
  await page.getByRole('button',{name:/选择关卡/}).click();await expect(page.locator('.mission-row')).toHaveCount(10);await page.locator('.mission-row').nth(3).click();
  await expect(page.getByRole('button',{name:'喷气加速',exact:true})).toBeVisible();
  await page.keyboard.down('d');await page.keyboard.down('Shift');await page.waitForTimeout(6000);await page.keyboard.up('Shift');
  await expect(page.locator('.road-warning,.route-cue,.hud-level>strong')).toHaveCount(0);
  await expect(page.locator('.failed-overlay')).toContainText('被弹射电池击中',{timeout:25000});await page.keyboard.up('d');
  await page.screenshot({path:`${dir}/production-battery-hit.png`});await page.getByRole('button',{name:'从检查点复活',exact:true}).click();
  await expect(page.getByRole('meter',{name:'车辆生命值'})).toHaveAttribute('aria-valuenow','100');
  const savedGas=parseInt(await page.locator('.pressure strong').innerText());expect(savedGas).toBeGreaterThan(0);expect(savedGas).toBeLessThan(100);
  await expect(page.locator('.pressure')).not.toContainText('%');
  await page.keyboard.press('Escape');await expect(page.getByRole('heading',{name:'已暂停',exact:true})).toBeVisible();
  await page.screenshot({path:`${dir}/production-retry-reserve.png`});
  expect(errors).toEqual([]);const result={passed:true,qaAbsent:true,missionCount:10,keyboardBoostCrested:true,undodgedBatteryFailed:true,retryFullHealth:true,retrySavedGas:savedGas,pausePassed:true,errors};
  await writeFile(`${dir}/production.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}
