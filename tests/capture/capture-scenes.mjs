import {chromium} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';

const bundled = process.env.LOCALAPPDATA + '/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const executablePath = process.env.ROADSTER_CHROME || (existsSync(bundled) ? bundled : undefined);
const out = process.argv[2] || 'artifacts/scene-pass';
const levels = (process.argv[3] || '1,2,3,4,5,6,7,8,9,10').split(',').map(Number);
await mkdir(out, {recursive: true});

const browser = await chromium.launch({headless: true, executablePath, args: ['--enable-webgl', '--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
await page.goto('http://127.0.0.1:5173');
await page.waitForFunction(() => window.__ROADSTER__);
await page.waitForTimeout(1800);

const report = {};
for (const id of levels) {
  await page.evaluate(level => window.__ROADSTER__.start(level), id);
  await page.waitForTimeout(500);
  // Drive for a while so the follow camera settles at speed.
  await page.evaluate(() => {
    window.__ROADSTER__.manual(true);
    window.__ROADSTER__.input({accelerate: true});
    window.__ROADSTER__.step(220);
  });
  await page.waitForTimeout(350);
  await page.evaluate(() => window.__ROADSTER__.step(1));
  await page.screenshot({path: `${out}/level-${String(id).padStart(2, '0')}-a.png`});
  report[id] = await page.evaluate(() => window.__ROADSTER__.stats());

  // A second frame further along the route.
  await page.evaluate(() => window.__ROADSTER__.step(420));
  await page.screenshot({path: `${out}/level-${String(id).padStart(2, '0')}-b.png`});
  const second = await page.evaluate(() => window.__ROADSTER__.stats());
  report[id].second = {drawCalls: second.drawCalls, triangles: second.triangles, geometries: second.geometries, textures: second.textures, fps: second.fps};
  await page.evaluate(() => {window.__ROADSTER__.input({accelerate: false}); window.__ROADSTER__.manual(false);});
}
await writeFile(`${out}/report.json`, JSON.stringify({errors, report}, null, 2));
await browser.close();
console.log(JSON.stringify({errors: errors.slice(0, 6), stats: Object.fromEntries(Object.entries(report).map(([k, v]) => [k, {dc: v.drawCalls, tri: v.triangles, fps: v.fps}]))}, null, 2));
