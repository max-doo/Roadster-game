import type { Language } from './i18n';
import type { Quality, GameSnapshot } from './types';
import { LEVELS } from './levels';
export type Settings = { quality:Quality; language:Language; master:number; music:number; sfx:number; muted:boolean; sensitivity:number; reducedMotion:boolean; vibration:boolean };
export type RecordData = { time:number; stars:number; crashes:number; flips:number; revision?:number; collectedStars?:string[] };
export type SaveData = { version:1; unlocked:number; records:Record<string,RecordData>; legacyRecords?:Record<string,RecordData>; settings:Settings; tutorials:string[] };
const defaults:Settings = {quality:'auto',language:'zh',master:.65,music:.2,sfx:.7,muted:false,sensitivity:1,reducedMotion:false,vibration:true};
const key='gravity-breaker-v1';
export function loadSave():SaveData {
  try { const d=JSON.parse(localStorage.getItem(key)||'null'); if(d?.version===1){
    const records:Record<string,RecordData>={},legacyRecords={...d.legacyRecords};
    for(const [id,record] of Object.entries(d.records??{}) as [string,RecordData][]){if(record.revision===(LEVELS[Number(id)-1]?.revision??1))records[id]=record;else legacyRecords[`${id}:v${record.revision??1}`]=record;}
    return {version:1,unlocked:Math.max(1,Math.min(LEVELS.length,Number(d.unlocked)||1)),records,legacyRecords,tutorials:Array.isArray(d.tutorials)?d.tutorials:[],settings:{...defaults,...d.settings,language:d.settings?.language==='en'?'en':'zh'}};
  } } catch {}
  return {version:1,unlocked:1,records:{},settings:{...defaults},tutorials:[]};
}
export function persist(save:SaveData) {try { localStorage.setItem(key,JSON.stringify(save)); return true; } catch {return false;}}
export function completeLevel(save:SaveData,id:number,s:GameSnapshot) {
  const old=save.records[id]; const best=!old||s.time<old.time;
  save.records[id]={time:best?s.time:old.time,stars:Math.max(s.stars,old?.stars||0),crashes:best?s.crashes:old.crashes,flips:Math.max(s.flips,old?.flips||0),revision:LEVELS[id-1].revision??1,collectedStars:[...new Set([...(old?.collectedStars??[]),...s.collectedStars])]};
  save.unlocked=Math.max(save.unlocked,Math.min(LEVELS.length,id+1)); persist(save); return best;
}
