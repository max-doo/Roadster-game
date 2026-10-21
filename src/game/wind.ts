import type { Vec, WindZone } from './types';

/** Edge ramps and periodic reversal share the paused simulation clock. */
export function windAt(zones:WindZone[],point:Vec,time:number):Vec {
  for(const zone of zones){
    const edge=Math.min(point.x-zone.x,zone.x+zone.w-point.x,point.y-zone.y,zone.y+zone.h-point.y);
    if(edge<=0)continue;
    const blend=Math.min(1,edge/Math.max(1,zone.ramp));
    const phase=zone.period?Math.tanh(Math.sin((time+(zone.phase??0))*Math.PI*2/zone.period)*1.5):1;
    return {x:Math.max(-8,Math.min(8,zone.force.x))*blend*phase,y:Math.max(-7,Math.min(7,zone.force.y))*blend};
  }
  return {x:0,y:0};
}
