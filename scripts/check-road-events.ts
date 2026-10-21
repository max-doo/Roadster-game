import { GameCore, initPhysics } from '../src/game/core';
import { LEVELS } from '../src/game/levels';
import { replayInput, collectReplayInput } from '../tests/replay-policy';
await initPhysics();
const ids=process.argv.slice(2).filter(v=>/^\d+$/.test(v)).map(Number);
for(const level of LEVELS.filter(l=>!ids.length||ids.includes(l.id))){
  const g=new GameCore(level);const seen=new Set<string>();let previous=-1,retried=-1;
  for(let i=0;i<120*480;i++){
    const s=g.snapshot();if(['finished','crashed'].includes(s.mode))break;
    for(const e of s.roadEvents??[])seen.add(e.id);
    if(process.argv.includes('--trace')&&Math.floor(s.time)!==previous){previous=Math.floor(s.time);console.log(JSON.stringify({id:level.id,t:+s.time.toFixed(1),x:+s.x.toFixed(1),y:+s.y.toFixed(1),vx:+s.vx.toFixed(1),vy:+s.vy.toFixed(1),a:+s.angle.toFixed(1),cp:s.checkpoint,p:+s.pressure.toFixed(0),h:s.health,track:level.tracks[s.trackIndex]?.id,event:s.roadEvents?.filter(e=>e.phase!=='clear')}));}
    if(process.argv.includes('--checkpoints')&&s.checkpoint>retried){retried=s.checkpoint;g.retry();for(let j=0;j<240;j++)g.step();}
    const now=g.snapshot();g.input=(process.argv.includes('--stars')?collectReplayInput:replayInput)(level.id,now);
    if(process.argv.includes('--lower')&&level.tracks[now.trackIndex]?.id.startsWith('7-4-')&&!level.tracks[now.trackIndex]?.id.endsWith('-recovery'))g.input.suction=false;
    g.step();
  }
  const s=g.snapshot();console.log(JSON.stringify({id:level.id,mode:s.mode,message:s.message,x:s.x,y:s.y,cp:s.checkpoint,expectedCp:level.checkpoints.length-1,time:s.time,pressure:s.pressure,health:s.health,stars:s.collectedStars.length,expectedEvents:level.roadEvents?.length,seen:seen.size,cleared:s.eventsCleared?.length}));
  if(s.mode!=='finished'||s.eventsCleared?.length!==level.roadEvents?.length)process.exitCode=1;
  g.dispose();
}
