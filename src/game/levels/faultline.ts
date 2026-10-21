import type { Level, Track, TrackPoint } from '../types';
import { loop, p } from './helpers';
import { eventRecovery } from './roadEvents';

export type Stage = {name:string;length:number;kind:'road'|'ascent'|'collapse'|'loop'|'ferry'|'lift'|'relay'|'gap'|'wind'|'gust'|'stairs'|'gate'|'ceiling'|'drop'|'switchback'|'transfer'|'railgap'|'heave'|'sweep'|'bowl'|'rollers';gap?:number;collapseDelay?:number;rise?:number;star?:boolean;checkpoint?:boolean;width?:number};
type Brief = {id:number;revision?:number;name:string;subtitle:string;description:string;theme:Level['theme'];lighting?:Level['lighting'];scenery?:Level['scenery'];tutorial?:{text:string;action:string};stages:Stage[]};

/** Author stages in driving order. Length includes arcs, slopes and disconnected spans. */
export function faultline(brief:Brief):Level {
  const {stages,tutorial,...metadata}=brief;
  const level:Level={...metadata,chapter:'faultline',revision:brief.revision??1,start:p(4,.86),finish:p(0,0),finishWidth:10,killY:-60,stars:[0,0],tracks:[],checkpoints:[],hazards:[],collectibles:[],sections:[],tutorials:[],windZones:[],blackoutZones:[]};
  let x=0,y=0,z=0,addedRoute=0;
  for(const [index,stage] of stages.entries()){
    const origin=x,baseY=y,baseZ=z,prefix=`${brief.id}-${index}`,before=level.tracks.length;
    const point=(dx:number,dy=0,dz=0)=>p(origin+dx,baseY+dy,baseZ+dz);
    const road=(id:string,points:TrackPoint[],extra:Partial<Track>={})=>{const track:Track={id:`${prefix}-${id}`,suction:false,width:stage.width??7,points,...extra};level.tracks.push(track);return track;};
    if(stage.checkpoint===true||stage.checkpoint!==false&&index%2===0)level.checkpoints.push({x:x+18,y:y+.86,z,pressure:100,label:stage.name,trackId:`${prefix}-approach`});
    level.sections!.push(stage.name);
    road('approach',[point(0),point(40)]);
    let end=40;
    let star=point(28,2.8),starTrack:string|undefined;
    if(stage.kind==='ascent'){
      const rise=stage.rise??48,points:TrackPoint[]=[];
      // Long enough to exhaust momentum on motor power alone, with eased slope transitions.
      for(let i=0;i<=30;i++){const u=i/30;points.push(point(40+58*u,rise*(u*u*(3-2*u))));}
      road('boost-climb',points,{suction:true});
      road('summit',[point(98,rise),point(120,rise)]);
      const descent:TrackPoint[]=[];
      for(let i=0;i<=28;i++){const u=i/28;descent.push(point(120+94*u,rise-(rise-8)*u*u*(3-2*u)));}
      road('descent',descent,{suction:true});end=214;y+=8;star=point(109,rise+2.6);
    }else if(stage.kind==='loop'){
      const radius=15;
      road('arc',[point(40),point(54),...loop(origin+54,baseY,radius,baseZ,baseZ-8).slice(1),point(88,0,-8)],{suction:true,width:4.5});
      star=point(54,28.5,-4);z-=8;end=88;
      if(brief.scenery==='tunnel'&&stage.name.includes('支线'))road('lower-maintenance',[point(22,-8,-4),point(62,-8,-4),point(88,0,-4)],{recovery:true,width:22});
     }else if(stage.kind==='railgap'){
      road('ceiling-entry',[point(40),point(54),...loop(origin+54,baseY,12,baseZ,baseZ-8).slice(1,65),point(38,24,-4)],{suction:true,width:4.5});
      road('ceiling-exit',[point(30,24,-4),point(24,24,-4),...loop(origin+24,baseY,12,baseZ-4,baseZ-8).slice(65),point(88,0,-8)],{suction:true,width:4.5});
      z-=8;end=88;star=point(46,22.5,-4);
    }else if(stage.kind==='switchback'){
      road('reverse-rail',[point(40),point(70),...loop(origin+70,baseY,12,baseZ,baseZ-4).slice(1,65),point(30,24,-4),...loop(origin+30,baseY,12,baseZ-4,baseZ-8).slice(65),point(108,0,-8)],{suction:true,width:4.5});
      z-=8;end=108;star=point(46,22.5,-4);
    }else if(stage.kind==='ceiling'){
      road('ceiling-arc',[point(40),point(70),...loop(origin+70,baseY,15,baseZ,baseZ-8).slice(1,65),point(40,30,-4)],{suction:true,width:4.5});
      road('catch-deck',[point(-8,-12,-4),point(104,-12,-4)]);end=104;y-=12;z-=4;star=point(48,28.8,-4);
    }else if(stage.kind==='drop'){
      road('drop-launch',[point(40),point(68)]);
      road('drop-catch',[point(88,-14),point(142,-14)]);end=142;y-=14;star=point(78,-3);
    }else if(stage.kind==='collapse'){
      road('entry',[point(40),point(50)]);
      for(let i=0;i<6;i++)road(`collapse-${i}`,[point(50+i*16),point(65+i*16)],{stability:{delay:stage.collapseDelay??1.4},kind:'slab'});
      road('landing',[point(146),point(172)]);end=172;star=point(124,4.8);
    }else if(stage.kind==='ferry'||stage.kind==='relay'){
      const count=stage.kind==='relay'?2:1;
      road('dock',[point(40),point(54)]);
      for(let i=0;i<count;i++){
        const a=54+i*66;
        const t=road(`ferry-${i}`,[point(a-4),point(a+22)],{kind:'container',motion:{dx:24,period:9,phase:i*1.1,dwell:.25}});
        road(`arrival-${i}`,[point(a+36),point(a+66)]);
        if(i===0){star=point(a+9,1.5);starTrack=t.id;}
      }
      end=54+count*66;
    }else if(stage.kind==='lift'){
      road('dock',[point(40),point(60)]);
      const height=stage.rise??6;
      const t=road('lift',[point(58),point(80)],{kind:'lift',suction:true,motion:{dy:height,period:10,dwell:.25}});
      road('upper',[point(78,height),point(108,height)]);end=108;y+=height;
      star=point(69,1.5);starTrack=t.id;
    }else if(stage.kind==='heave'){
      road('waiting-deck',[point(40),point(62)]);
      road('heave-0',[point(60),point(82)],{kind:'slab',motion:{dy:6,period:7,phase:1,dwell:.24}});
      road('safe-island',[point(80,6),point(110,6),point(134)]);
      const t=road('heave-1',[point(132),point(154)],{kind:'slab',motion:{dy:6,period:8,phase:3,dwell:.24}});
      road('upper-exit',[point(152,6),point(178,6),point(202)]);
      end=202;star=point(143,1.5);starTrack=t.id;
    }else if(stage.kind==='gap'){
      const gap=stage.gap??34;
      road('ramp',[point(40),point(64),point(78,3),point(84,3)]);
      road('landing',[point(84+gap),point(118+gap)]);end=118+gap;star=point(84+gap*.5,6);
    }else if(stage.kind==='transfer'){
      road('transfer-entry',[point(40),point(58)]);
      for(let i=0;i<4;i++){const h=i%2?3:0;road(`transfer-${i}`,[point(74+i*50,h),point(110+i*50,h)],{suction:true,width:4.5});}
      end=260;y+=3;star=point(142,5);
    }else if(stage.kind==='stairs'){
      road('step-entry',[point(40),point(50)]);
      for(let i=0;i<3;i++){
        const a=50+i*42,h=i*5;
        road(`step-${i}`,[point(a,h),point(a+12,h),point(a+24,h+5)],{suction:true,width:4.5});
        road(`step-landing-${i}`,[point(a+34,h+5),point(a+42,h+5)],{suction:true,width:4.5});
      }
      end=176;y+=15;star=point(119,14);
    }else if(stage.kind==='gate'){
      road('gate-deck',[point(40),point(120)]);end=120;
      level.hazards.push({x:origin+82,y:baseY+3.6,z:baseZ,w:1.2,h:7.2,kind:'gate',...(brief.lighting==='blackout'||stage.name.includes('无光')?{lampActivated:true}:{motion:{dy:8,period:6,dwell:.15}})});star=point(105,2.6);
    }else if(stage.kind==='wind'||stage.kind==='gust'){
      if(stage.kind==='wind'){
        const height=stage.rise?3:0;
        road('wind-ramp',[point(40),point(62),point(80,6),point(86,6)]);
        road('wind-landing',[point(108,height),point(150,height)]);end=150;y+=height;star=point(98,10);
      }else{road('wind-deck',[point(40),point(70),point(100,2),point(130,2),point(160)]);end=160;star=point(110,5);}
      level.windZones!.push({x:origin+48,y:baseY-4,w:105,h:28,force:{x:stage.kind==='gust'?-7:7,y:stage.rise?7:0},ramp:10,...(stage.kind==='gust'?{period:6}: {})});
    }else if(stage.kind==='sweep'||stage.kind==='bowl'||stage.kind==='rollers'){
      const span=stage.kind==='bowl'?124:144;
      const points:TrackPoint[]=[];
      for(let i=0;i<=32;i++){
        const u=i/32,fade=Math.sin(Math.PI*u)**2;
        const height=stage.kind==='bowl'?-18*fade:stage.kind==='rollers'?11*Math.sin(u*Math.PI*4)*fade:18*Math.sin(u*Math.PI*2)*fade;
        points.push(point(40+span*u,height));
      }
      road('curved-road',points,{suction:true,width:stage.width??5.5});
      end=40+span;star=point(40+span*.5,stage.kind==='bowl'?-15.5:4);
    }else{
      const run=Math.max(10,Math.min(50,stage.length-65)),h=run*.04;
      road('contour',[point(40),point(40+run*.24,h),point(40+run*.48,h),point(40+run*.76,-h),point(40+run)]);end=40+run;star=point(62,4.8);if(stage.star){road('star-balcony',[point(52,7),point(78,7)],{optional:true,width:5});star=point(65,8.6);}
    }
    // Keep the final part of each stage as a readable recovery apron.
    let driven=0;
    for(const t of level.tracks.slice(before).filter(t=>!t.optional&&!t.recovery))for(let i=1;i<t.points.length;i++)driven+=Math.hypot(t.points[i].x-t.points[i-1].x,t.points[i].y-t.points[i-1].y);
    // Gaps count toward the effective driving route, rather than becoming hidden roads.
    const gaps=stage.kind==='wind'?22:stage.kind==='drop'?20:stage.kind==='gap'?(stage.gap??34):stage.kind==='collapse'?6:stage.kind==='ferry'?18:stage.kind==='relay'?36:stage.kind==='stairs'?30:stage.kind==='transfer'?56:stage.kind==='railgap'?8:0;
    const tail=Math.max(22,stage.length-driven-gaps);
    const recovery=road('recovery',[p(origin+end,y,z),p(origin+end+tail,y,z)]);
    const extra=eventRecovery(level,index,recovery);addedRoute+=extra;
    // The lower ramp stays in a separate depth lane until level with the upper deck.
    if(brief.scenery==='tunnel'&&stage.name.includes('支线'))road('maintenance-merge',[point(88,0,-4),point(end+16,0,-6),point(end+32,0,-8)],{recovery:true,width:7});
    x=origin+end+tail+extra;
    if(stage.name.includes('无光'))level.blackoutZones!.push({x:origin,w:x-origin});
    if(stage.star){level.collectibles!.push({id:`${prefix}-star`,kind:'star',...star,...(starTrack?{trackId:starTrack}:{})});}
    level.collectibles!.push({id:`${prefix}-air`,kind:'pressure',x:origin+30,y:baseY+1.6,z:baseZ,amount:40});
  }
  level.revision=(level.revision??1)+3;
  level.finish=p(x-7,y,z);level.killY=Math.min(-60,y-80);
  level.routeLength=stages.reduce((n,s)=>n+s.length,0)+addedRoute;
  level.stars=[Math.round(level.routeLength/12+45),Math.round(level.routeLength/9+70)];
  level.tutorials=[{x:0,...(tutorial??{text:'Read the edge lights. Hold suction on cyan rails; brake on moving decks. Collapse panels cannot support a stopped car.',action:'accelerate'})}];
  return level;
}
