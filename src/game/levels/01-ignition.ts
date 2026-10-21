import type { Level } from '../types';
import { p } from './helpers';

export const ignition:Level = {
  id:1,revision:2,name:'IGNITION',subtitle:'DESERT PROVING GROUND',theme:'desert',
  description:'Read the accident scene, launch from loading ramps and collect three stars across the broken highway.',
  start:p(4,.86),finish:p(490,0),finishWidth:10,killY:-24,stars:[36,52],
  tracks:[
    {id:'acceleration',suction:false,points:[p(-18,0),p(22,0),p(34,1.5),p(44,0),p(62,0),p(76,3)]},
    {id:'broken-track',suction:false,points:[p(118,1),p(142,1),p(155,0),p(174,0),p(190,4)]},
    {id:'long-jump',suction:false,points:[p(268,0),p(310,0),p(324,2),p(338,2),p(348,0),p(510,0)]},
    {id:'loading-trailer',suction:false,optional:true,kind:'trailer',points:[p(404,5.5),p(424,5.5)]},
    {id:'trailer-access',suction:false,optional:true,points:[p(388,0),p(404,5.5)]},
    {id:'trailer-exit',suction:false,optional:true,points:[p(424,5.5),p(438,0)]},
  ],
  checkpoints:[{x:52,y:.86,label:'BROKEN SPAN',pressure:100},{x:160,y:.86,label:'THE LONG JUMP',pressure:100},{x:300,y:.86,label:'ROADSIDE RECOVERY',pressure:100},{x:444,y:.86,label:'FINAL STRAIGHT',pressure:100}],
  hazards:[{x:26,y:.65,w:4.8,h:1.3,kind:'car'},{x:135,y:1.7,w:4.8,h:1.4,kind:'car'},{x:153,y:10,w:5,h:2.8,kind:'cargo'},{x:362,y:.7,w:5,h:1.4,kind:'car'},{x:463,y:.75,w:5,h:1.5,kind:'car'}],
  collectibles:[
    {id:'ignition-1',kind:'star',x:38,y:3.5},{id:'ignition-2',kind:'star',x:220,y:18},{id:'ignition-3',kind:'star',x:414,y:7.2,trackId:'loading-trailer'},
    {id:'ignition-air-1',kind:'pressure',x:124,y:3.4,amount:25},{id:'ignition-air-2',kind:'pressure',x:380,y:1.6,amount:25},
  ],
  sections:['ACCIDENT AHEAD','BROKEN SPAN','THE LONG JUMP','LOADING RAMPS','FINAL STRAIGHT'],
  tutorials:[{x:9,text:'Obstacle ahead: pulse THRUST to clear the barrier, then release before the overhead structure.',action:'thrust'},{x:0,text:'Hold D / → to accelerate. A / ← brakes and reverses.',action:'accelerate'},{x:54,text:'Hold SPACE at the ramp edge. Release in flight to conserve pressure.',action:'thrust'},{x:157,text:'Long jump: thrust across, release near the apex, then pulse thrust to soften your descent.',action:'thrust'}],
};
