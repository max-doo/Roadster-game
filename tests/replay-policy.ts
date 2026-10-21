import type { GameSnapshot, InputState } from '../src/game/types';
import { motionAt } from '../src/game/motion';
import { LEVELS } from '../src/game/levels';
import { trafficTiming } from '../src/game/roadEvents';
const wrap=(v:number)=>Math.atan2(Math.sin(v),Math.cos(v));
/** Feedback replay emits only ordinary player controls, including attitude input.
 * It cannot alter body transforms, checkpoints, resources or finish state. */
export function replayInput(level:number,s:GameSnapshot):InputState {
  let thrust=false,boost=false,pitch=0,suction=level>1,accelerate=true,brake=false;
  const speed=(target:number)=>{accelerate=s.vx<target-.25;brake=s.vx>target+(target<1?.03:.25);};
  if(level===1)thrust=(s.x>5&&s.x<29&&s.y<4.5)||(s.x>108&&s.x<139&&s.y<6)||(s.x>72&&s.x<90)||(s.x>186&&s.x<232)||(s.x>249&&s.x<268&&s.y<15&&s.vy<-5)||(s.x>338&&s.x<359&&s.y<5.5)||(s.x>440&&s.x<474&&s.y<6);
  if(level===2){suction=s.checkpoint<0||s.x<58;thrust=s.checkpoint>=0&&((s.x>59&&s.x<95&&s.y<8)||(s.x>138&&s.x<148&&s.y<-1&&s.vy<-8)||(s.x>148&&s.x<177&&s.y<.5)||(s.x>185&&s.x<226&&s.y<5));
    if(s.x>250&&s.x<282){const gate=motionAt(LEVELS[1].hazards.find(h=>h.kind==='gate')!.motion,s.worldTime);if(s.x<269&&gate.y<4.2)speed(Math.max(0,(267-s.x)*1.5));else speed(14);}
  }
  if(s.mode==='airborne')pitch=Math.max(-1,Math.min(1,-wrap(s.angle)*2.1-s.angularVelocity*.85));
  if(level===3&&s.mode==='airborne') {
    pitch=Math.max(-1,Math.min(1,-wrap(s.angle)*2.1-s.angularVelocity*.85));
    const floor=s.checkpoint>=2?-10:4;
    thrust=Math.abs(wrap(s.angle))<.35&&s.y<floor+24&&s.vy<-8;
  }
  if(level===3&&s.checkpoint>=3){
    suction=false;thrust=false;
    if(s.checkpoint===3){
      const ferry=motionAt(LEVELS[2].tracks.find(t=>t.id==='cargo-ferry')!.motion,s.worldTime);
      if(s.platform==='cargo-ferry'){
        if(ferry.x>21)speed(10);
        else{accelerate=s.x<263+ferry.x-1.2;brake=!accelerate;}
      }else if(s.x<256){const open=ferry.x<5;speed(open?8:Math.max(0,Math.min(8,(249-s.x)*1.5)));}
      else speed(9);
      if(s.y<-11){thrust=true;accelerate=true;brake=false;}
    }else if(s.checkpoint===4){
      const lift=motionAt(LEVELS[2].tracks.find(t=>t.id==='cargo-lift')!.motion,s.worldTime);
      if(s.platform==='cargo-lift'){
        if(lift.y>5.8)speed(9);
        else{accelerate=s.x<337;brake=!accelerate;}
      }else if(s.x<331){speed(lift.y<.15&&Math.abs(lift.vy)<.2?7:Math.max(0,Math.min(7,(321-s.x)*1.5)));}
      else speed(9);
      if(s.y<-11){thrust=true;accelerate=true;brake=false;}
    }
  }
  if(level>=4){
    const data=LEVELS[level-1];suction=true;thrust=false;
    const current=data.tracks[s.trackIndex];
    if(current?.id.endsWith('-curved-road')){speed(18);boost=s.grounded&&s.angle>.28&&s.vx<18;}
    for(const climb of data.tracks.filter(t=>t.id.endsWith('-boost-climb'))){
      const a=climb.points[0],b=climb.points.at(-1)!;
      if(s.x>a.x-5&&s.x<b.x+1&&s.y>a.y-2){boost=s.grounded;accelerate=true;brake=false;}
    }
    for(const entry of data.tracks.filter(t=>t.id.endsWith('-ceiling-entry'))){
      const edge=entry.points.at(-1)!;
      if(s.trackIndex===data.tracks.indexOf(entry)&&s.x<edge.x+16&&s.y>edge.y-3){boost=s.grounded&&Math.abs(s.vx)<28;}
    }
    const moving=data.tracks.filter(t=>t.motion);
    const riding=moving.find(t=>t.id===s.platform);
    const upcoming=moving.find(t=>t.points[0].x>s.x-35&&t.points[0].x<s.x+28&&Math.abs(t.points[0].y-s.y)<5);
    const track=riding??upcoming;
    if(track){
      const offset=motionAt(track.motion,s.worldTime),a=track.points[0],b=track.points.at(-1)!;
      if(riding){
        const ready=track.motion!.dx?offset.x>track.motion!.dx-2:offset.y>(track.motion!.dy??0)-.2;
        if(ready)speed(9);
        else {const center=(a.x+b.x)/2+offset.x;accelerate=s.x<center-1.2;brake=!accelerate;}
      }else{
        const phase=((s.worldTime+(track.motion!.phase??0))/track.motion!.period)%1;
        const window=phase<.06||phase>.98;
        const ready=window&&(track.motion!.dx?offset.x<.2:offset.y<.15&&Math.abs(offset.vy)<.2);
        speed(ready?7:Math.max(0,Math.min(7,(a.x-6-s.x)*1.5)));
      }
    }
    for(const gate of data.hazards.filter(h=>h.kind==='gate'))if(s.x>gate.x-30&&s.x<gate.x+4){
      const off=s.gateOffsets?.[data.hazards.indexOf(gate)]??motionAt(gate.motion,s.worldTime);speed(off.y<7.2?Math.max(0,Math.min(12,(gate.x-9-s.x)*1.7)):14);
    }
    for(const t of data.tracks.filter(t=>t.id.endsWith('-ramp'))){
      const edge=t.points.at(-1)!;
      const landing=data.tracks.find(next=>next.id===t.id.replace(/-ramp$/,'-landing'));
      if(s.x>edge.x-6&&s.x<(landing?.points[0].x??edge.x+20)+4&&s.y<edge.y+8)thrust=true;
    }
    for(const t of data.tracks.filter(t=>t.id.endsWith('-ceiling-arc'))){const end=t.points.at(-1)!;if(s.trackIndex===data.tracks.indexOf(t)&&s.y>end.y-8&&s.x<end.x+12){suction=false;if(s.mode==='airborne')pitch=Math.max(-1,Math.min(1,-wrap(s.angle)*2.1-s.angularVelocity*.85));}}
    const transfers=data.tracks.filter(t=>/-transfer-\d$/.test(t.id));
    if(transfers.length&&s.x>transfers[0].points[0].x-42&&s.x<transfers.at(-1)!.points.at(-1)!.x+6){
      speed(16);
      for(const [i,landing] of transfers.entries()){
        const a=landing.points[0],edge=i?transfers[i-1].points.at(-1)!.x:a.x-16;
        if(s.x>edge-9&&s.x<a.x+10&&s.y<a.y+3.5&&s.vy<7)thrust=true;
      }
    }
    for(const t of data.tracks.filter(t=>/-step-\d$/.test(t.id))){const edge=t.points.at(-1)!;if(s.x>edge.x-1&&s.x<edge.x+4&&s.y<edge.y+1)thrust=true;}
  }
  return roadEventInput(level,s,{accelerate,brake,suction,thrust,boost,pitch});
}

/** Read visible actors and authored escape roads, emit ordinary controls only. */
export function roadEventInput(id:number,s:GameSnapshot,input:InputState):InputState {
  const e=LEVELS[id-1].roadEvents?.find(e=>s.roadEvents?.some(v=>v.id===e.id&&v.phase!=='clear'));
  if(!e)return input;
  const out={...input,suction:false,thrust:false,boost:false};
  const speed=(v:number)=>{out.accelerate=s.vx<v-.3;out.brake=s.vx>v+.3;};
  speed(e.kind==='combo'?22:23);
  const actors=s.roadActors?.filter(a=>a.eventId===e.id&&(a.kind==='battery'?a.x>s.x:a.id.endsWith('chaser')?a.x<s.x+3:a.x>s.x-4))??[];
  const actor=actors.find(a=>a.kind==='battery')??actors[0];
  if(actor){
    const rear=actor.id.endsWith('chaser');
    const t=rear?(s.x-actor.x)/Math.max(1,trafficTiming(e).chaseSpeed-s.vx):
      (actor.x-s.x)/(Math.max(1,s.vx)+(actor.kind==='battery'?trafficTiming(e).batterySpeed:0));
    const truck=actor.id.endsWith('blocker');
    out.thrust=t<(truck?1.9:rear?1.2:actor.kind==='battery'?.72:1.1)&&t>-.3&&s.y<e.y+(truck?6:4)&&s.vy<(rear?9:8);
  }
  if(id===2){out.thrust=out.thrust||input.thrust;out.suction=input.suction;out.accelerate=true;out.brake=false;}

  return out;
}

/** A second ordinary-input route deliberately takes optional star detours. */
export function collectReplayInput(id:number,s:GameSnapshot):InputState {
  const input=replayInput(id,s),level=LEVELS[id-1];
  if(id<4)return input;
  for(const star of level.collectibles?.filter(t=>t.kind==='star'&&!t.trackId&&!s.collectedStars.includes(t.id))??[]){
    const dx=star.x-s.x,dy=star.y-s.y;
    const balcony=level.tracks.some(t=>t.optional&&Math.abs(t.points[0].x-star.x)<20);
    if(dx> -2&&dx<(balcony?55:id===9?23:30)&&Math.abs((star.z??0)-s.z)<2.6&&Math.cos(s.angle)>.7)input.thrust=dy>.7&&s.vy<(id===9?7:8);
  }
  return roadEventInput(id,s,input);
}
