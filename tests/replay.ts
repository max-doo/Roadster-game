import { pathToFileURL } from 'node:url';
import { GameCore, initPhysics } from '../src/game/core';
import { LEVELS } from '../src/game/levels';
import { replayInput } from './replay-policy';
export { replayInput } from './replay-policy';

export async function runReplay(level:number,trace=false,policy=replayInput) {
  await initPhysics();
  const game=new GameCore(LEVELS[level-1]);
  let invertedFrames=0,invertedLaunchFrames=0,thrustFrames=0,airFrames=0,pitchFrames=0,lastSecond=-1;
  for(let frame=0;frame<120*300;frame++) {
    const s=game.snapshot();
    game.input=policy(level,s);
    if(s.grounded&&Math.cos(s.angle)<-.8)invertedFrames++;
    if(s.mode==='airborne'&&Math.cos(s.angle)<-.8)invertedLaunchFrames++;
    if(game.input.thrust)thrustFrames++;
    if(Math.abs(game.input.pitch)>.1)pitchFrames++;
    if(s.mode==='airborne')airFrames++;
    if(trace&&Math.floor(s.time)!==lastSecond){lastSecond=Math.floor(s.time);console.log(level,s.time.toFixed(1),s.x.toFixed(1),s.y.toFixed(1),s.angle.toFixed(2),s.speed.toFixed(0),s.mode,s.checkpoint,s.pressure.toFixed(0));}
    if(s.mode==='crashed'||s.mode==='finished')break;
    game.step(1/120);
  }
  const result={level,...game.snapshot(),invertedFrames,invertedLaunchFrames,thrustFrames,airFrames,pitchFrames};
  game.dispose();return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  void (async()=>{for(const level of LEVELS){const result=await runReplay(level.id,process.argv.includes('--trace'));console.log(JSON.stringify(result));if(result.mode!=='finished')process.exitCode=1;}})();
}
