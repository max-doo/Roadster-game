import type { Motion } from './types';

/** One simulation clock drives collision, suspension and rendering. Both docks dwell. */
export function motionAt(motion:Motion|undefined,time:number) {
  if(!motion)return {x:0,y:0,vx:0,vy:0};
  const phase=(((time+(motion.phase??0))/motion.period)%1+1)%1;
  const outward=phase<.5,leg=outward?phase:phase-.5;
  const dwell=Math.max(0,Math.min(.35,motion.dwell??.12)),travel=.5-dwell;
  const u=Math.max(0,Math.min(1,(leg-dwell)/travel));
  const blend=u*u*(3-2*u),rate=(u>0&&u<1?6*u*(1-u)/(travel*motion.period):0)*(outward?1:-1);
  const offset=outward?blend:1-blend;
  return {x:(motion.dx??0)*offset,y:(motion.dy??0)*offset,vx:(motion.dx??0)*rate,vy:(motion.dy??0)*rate};
}
