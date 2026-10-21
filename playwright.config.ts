import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
const bundled=process.env.LOCALAPPDATA+'/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
export default defineConfig({testDir:'./tests/browser',fullyParallel:false,workers:1,timeout:120000,reporter:[['list'],['html',{open:'never'}]],use:{baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:900},launchOptions:{executablePath:process.env.ROADSTER_CHROME||(existsSync(bundled)?bundled:undefined),args:['--enable-webgl','--ignore-gpu-blocklist']},screenshot:'only-on-failure'},webServer:{command:'npm run dev',url:'http://127.0.0.1:5173',reuseExistingServer:true}});
