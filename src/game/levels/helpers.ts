import type { TrackPoint } from '../types';

export const p = (x:number,y:number,z=0):TrackPoint => ({x,y,z});

export function loop(cx:number, floor:number, radius:number,z0=0,z1=0):TrackPoint[] {
  return Array.from({length:129},(_,i)=>{
    const a=-Math.PI/2+i*Math.PI*2/128;
    return p(cx+Math.cos(a)*radius,floor+radius+Math.sin(a)*radius,z0+(z1-z0)*i/128);
  });
}
