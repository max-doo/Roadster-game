import type { Level } from '../types';
import { loop, p } from './helpers';

export const inversion:Level = {
  id:2,revision:2,name:'INVERSION',subtitle:'THE GRAVITY LAB',theme:'lab',
  description:'Master the gravity ring, choose the elevated star route and time the moving clearance gate.',
  start:p(4,.86),finish:p(330,-5,-8),finishWidth:16,killY:-24,stars:[34,48],
  tracks:[
    {id:'gravity-ring',suction:true,width:4.5,points:[p(-18,0),p(30,0),p(54,0),...loop(54,0,15,0,-8).slice(1),p(85,0,-8),p(105,3,-8),p(116,7,-8)]},
    {id:'release-bay',suction:false,width:16,points:[p(142,-5,-8),p(196,-5,-8),p(218,-2,-8),p(230,-2,-8),p(244,-5,-8),p(350,-5,-8)]},
    {id:'recovery-deck',suction:false,recovery:true,width:22,points:[p(22,-8,-4),p(118,-8,-4),p(142,-5,-4)]},
    {id:'bonus-deck',suction:false,optional:true,width:7,points:[p(208,3,-8),p(239,3,-8)]},
  ],
  checkpoints:[{x:54,y:29.20,angle:Math.PI,z:-4,trackId:'gravity-ring',label:'FULL INVERSION',pressure:100},{x:154,y:-4.16,z:-6,trackId:'release-bay',label:'FINAL BARRIERS',pressure:100},{x:258,y:-4.16,z:-8,trackId:'release-bay',label:'CLEARANCE GATE',pressure:100}],
  hazards:[{x:99,y:3.3,z:-8,w:4.8,h:2.2,kind:'van'},{x:174,y:-3.7,z:-8,w:5.2,h:2.6,kind:'van'},{x:278,y:-1.4,z:-8,w:1.2,h:7.2,kind:'gate',motion:{dy:8,period:5,phase:.5}}],
  collectibles:[
    {id:'inversion-1',kind:'star',x:54,y:28.5,z:-4},{id:'inversion-2',kind:'star',x:225,y:8.5,z:-8},{id:'inversion-3',kind:'star',x:309,y:-3.4,z:-8},
    {id:'inversion-air-1',kind:'pressure',x:199,y:-3.2,z:-8,amount:25},
  ],
  sections:['GRAVITY RING','RELEASE BAY','HIGH ROAD / STAR ROUTE','CLEARANCE GATE'],
  tutorials:[{x:0,text:'Hold E or the SUCTION button through the gravity ring. Release to disengage.',action:'suction'},{x:42,text:'Keep accelerating. Fans pull toward the track; gravity still pulls down.',action:'suction'},{x:56,text:'After the ring, release SUCTION, then pulse THRUST early to clear the barrier.',action:'release'},{x:62,text:'Release SUCTION and pulse THRUST before the barrier. Thrust overrides suction. Release once clear.',action:'thrust'}],
};
