import type { Level } from '../types';
import { loop, p } from './helpers';

export const skyfall:Level = {
  id:3,revision:2,name:'SKYFALL',subtitle:'AEROSPACE CANYON',theme:'canyon',
  description:'Link inverted flight with a moving cargo ferry and an elevator deck above the canyon.',
  start:p(4,12.86),finish:p(400,-4,12),finishWidth:10,killY:-40,stars:[66,90],
  tracks:[
    {id:'inverted-launch',suction:true,width:4.5,points:[p(-18,12),p(75,12),p(110,12),...loop(110,12,18,0,12).slice(1,65),p(84,48,6)]},
    {id:'midair-platform',suction:true,width:4.5,points:[p(35,4,6),p(156,4,6),p(210,4,6),...loop(210,4,16,6,18).slice(1,65),p(184,36,12)]},
    {id:'arrival-platform',suction:false,points:[p(130,-10,12),p(260,-10,12)]},
    {id:'cargo-ferry',suction:false,kind:'container',motion:{dx:24,period:8},points:[p(254,-10,12),p(272,-10,12)]},
    {id:'cargo-dock',suction:false,points:[p(290,-10,12),p(330,-10,12)]},
    {id:'cargo-lift',suction:false,kind:'lift',motion:{dy:6,period:10,dwell:.25},points:[p(328,-10,12),p(350,-10,12)]},
    {id:'freight-exit',suction:false,points:[p(348,-4,12),p(424,-4,12)]},
    {id:'cargo-recovery',suction:false,recovery:true,points:[p(250,-22,12),p(268,-22,12),p(290,-10,12)]},
  ],
  checkpoints:[{x:110,y:47.2,angle:Math.PI,z:6,trackId:'inverted-launch',label:'INVERTED LAUNCH',pressure:100},{x:64,y:4.86,z:6,trackId:'midair-platform',label:'CANYON REFILL',pressure:100},{x:210,y:35.2,angle:Math.PI,z:12,trackId:'midair-platform',label:'FINAL INVERSION',pressure:100},{x:235,y:-9.16,z:12,trackId:'arrival-platform',label:'CARGO CROSSING',pressure:100},{x:307,y:-9.16,z:12,trackId:'cargo-dock',label:'ELEVATOR DOCK',pressure:100},{x:365,y:-3.16,z:12,trackId:'freight-exit',label:'FINAL STRAIGHT',pressure:100}],
  hazards:[{x:68,y:24,z:6,w:6,h:8,kind:'cargo'},{x:165,y:13,z:12,w:5,h:8,kind:'cargo'}],
  collectibles:[
    {id:'skyfall-1',kind:'star',x:91,y:46.2,z:6},{id:'skyfall-2',kind:'star',x:263,y:-8.5,z:12,trackId:'cargo-ferry'},{id:'skyfall-3',kind:'star',x:339,y:-8.5,z:12,trackId:'cargo-lift'},
    {id:'skyfall-air-1',kind:'pressure',x:155,y:5.6,z:6,amount:25},
  ],
  sections:['FIRST ASCENT','CONTROLLED DESCENT','SECOND ASCENT','CARGO CROSSING','MOVING CARGO FERRY','ELEVATOR DECK','FINAL STRAIGHT'],
  tutorials:[{x:0,text:'Hold SUCTION to climb the first gravity arc. Release when leaving the ceiling.',action:'suction'},{x:0,text:'Hold S / ↓ to rotate upright after leaving the ceiling.',action:'pitch',condition:'inverted-flight'},{x:0,text:'Pulse THRUST while upright to soften descent. Land, then accelerate right.',action:'thrust',condition:'upright-flight'}],
};
