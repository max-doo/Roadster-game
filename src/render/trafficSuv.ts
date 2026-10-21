import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Original 03T-inspired bodywork, authored at the actor's 4.54 × 1.72 m envelope.
 * Separate stamped panels, glazing, fender flares and wheels are merged by the caller. */
export function createTrafficSuv(own:<T extends THREE.BufferGeometry>(g:T)=>T,material:(color:number,metalness?:number,roughness?:number,emissive?:number)=>THREE.MeshStandardMaterial){
  const car=new THREE.Group();car.name='detailed-battery-suv';
  const paint=material(0x86927d,.58,.27),trim=material(0x20272b,.1,.62),seal=material(0x0c1216,.1,.8);
  const glass=material(0x203b46,.68,.15),edge=material(0xadb5b2,.8,.25),tire=material(0x16191b,0,.95);
  const rim=material(0x737c80,.84,.25),brake=material(0xb76035,.5,.45),white=material(0xe4eddf,.3,.18,0x596b67),red=material(0xb43b30,.3,.23,0x64160d);
  const mesh=(g:THREE.BufferGeometry,m:THREE.Material,x=0,y=0,z=0)=>{const o=new THREE.Mesh(own(g),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;car.add(o);return o;};
  const box=(m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,r=.025)=>mesh(r<=.01?new THREE.BoxGeometry(w,h,d):new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.2,h*.2,d*.2)),m,x,y,z);
  const line=(m:THREE.Material,a:number[],b:number[],r=.008)=>{
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
    const o=mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),m);o.position.copy(start).add(end).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;
  };
  const panel=(m:THREE.Material,points:number[][],z:number)=>{
    const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    const o=mesh(new THREE.ShapeGeometry(shape),m,0,0,z);m.side=THREE.DoubleSide;return o;
  };
  // Wheel openings cut into the body, rather than tires pasted onto a solid box.
  const profile=new THREE.Shape();profile.moveTo(-2.22,-.70);
  for(const x of [-1.36,1.36]){profile.lineTo(x-.49,-.70);profile.lineTo(x-.49,-.47);profile.absarc(x,-.47,.49,Math.PI,0,true);profile.lineTo(x+.49,-.70);}
  profile.lineTo(2.22,-.70);profile.lineTo(2.22,.15);profile.lineTo(1.22,.23);profile.lineTo(.98,.74);profile.quadraticCurveTo(.95,.80,.86,.80);profile.lineTo(-1.93,.80);profile.quadraticCurveTo(-2.15,.80,-2.16,.64);profile.lineTo(-2.22,-.70);profile.closePath();
  mesh(new THREE.ExtrudeGeometry(profile,{depth:1.72,bevelEnabled:true,bevelSize:.055,bevelThickness:.055,bevelSegments:4,curveSegments:32}),paint,0,0,-.86);
  // Hood stamping, roof panel and the panoramic inset have distinct highlights.
  box(paint,1.68,.19,0,1.02,.10,1.67,.04);
  for(const side of [-1,1])line(paint,[1.22,.252,side*.53],[2.12,.22,side*.63],.016);
  box(trim,-.52,.825,0,2.55,.035,1.56,.04);box(glass,-.45,.848,0,1.68,.016,1.16,.03);
  for(const side of [-1,1]){
    const z=side*.925;
    // Three window panes with painted pillars and rubber surrounds.
    panel(seal,[[-2.04,.19],[-2.02,.69],[.88,.69],[1.12,.20]],z);
    panel(glass,[[-1.97,.26],[-1.96,.63],[-1.35,.65],[-1.35,.26]],z+side*.006);
    panel(glass,[[-1.27,.26],[-1.27,.65],[-.34,.65],[-.34,.26]],z+side*.006);
    panel(glass,[[-.25,.26],[-.25,.65],[.85,.65],[1.01,.26]],z+side*.006);
    // Glass glints follow the window's plane, not an opaque blue rectangle.
    line(edge,[-1.93,.61,z+side*.009],[-1.40,.61,z+side*.009],.006);
    line(edge,[-1.20,.61,z+side*.009],[-.45,.61,z+side*.009],.006);
    for(const [rear,front] of [[-1.28,-.28],[-.25,1.03]]){
      panel(paint,[[rear,-.48],[front,-.48],[front,.16],[rear,.16]],z+side*.012);
      for(const [a,b] of [[[rear,-.46],[rear,.17]],[[rear,-.46],[front,-.46]],[[front,-.46],[front,.17]]])line(seal,[a[0],a[1],z+side*.017],[b[0],b[1],z+side*.017],.006);
      box(trim,rear+.20,.07,z+side*.025,.22,.045,.026,.008);
      box(edge,rear+.19,.084,z+side*.041,.16,.012,.016,.004);
    }
    box(trim,-.06,-.64,z+side*.026,2.0,.15,.11,.025);
    box(edge,-.02,-.727,side*1.01,2.28,.045,.19,.015);
    box(paint,.88,.28,side*1.04,.27,.17,.25,.04);box(trim,.90,.24,side*.947,.13,.07,.12,.012);
    box(white,.89,.28,side*1.175,.18,.024,.012,.003);
    // Roof rails, two mount feet per side, rear quarter vents and door hinges.
    for(const x of [-1.65,.49])box(trim,x,.85,side*.72,.18,.07,.10,.012);
    line(trim,[-1.76,.89,side*.72],[.63,.89,side*.72],.028);
    for(let i=0;i<4;i++)box(seal,-2.12,.12+i*.055,z+side*.018,.08,.021,.025,.004);
    for(const x of [-1.25,-.23])for(const y of [-.34,.08])box(paint,x,y,z+side*.035,.075,.065,.04,.009);
    for(const x of [-1.36,1.36]){
      const arch=mesh(new THREE.TorusGeometry(.50,.074,8,40,Math.PI),trim,x,-.47,z);arch.scale.y=1.02;
      line(trim,[x-.50,-.47,z],[x-.50,-.66,z],.07);line(trim,[x+.50,-.47,z],[x+.50,-.66,z],.07);
      const wheelZ=side*.93;
      // Rounded tire shoulders, block tread, machined spokes and recessed brake disc.
      mesh(new THREE.TorusGeometry(.318,.105,12,48),tire,x,-.47,wheelZ);
      for(let i=0;i<36;i++){
        const a=i*Math.PI/18,block=box(tire,x+Math.cos(a)*.411,-.47+Math.sin(a)*.411,wheelZ,.065,.032,.19,.005);block.rotation.z=a-Math.PI/2;
      }
      const rotor=mesh(new THREE.CylinderGeometry(.25,.25,.035,40),edge,x,-.47,wheelZ+side*.042);rotor.rotation.x=Math.PI/2;
      const rimLip=mesh(new THREE.TorusGeometry(.285,.018,8,40),rim,x,-.47,wheelZ+side*.108);
      rimLip.castShadow=false;box(brake,x+.17,-.43,wheelZ+side*.065,.10,.19,.045,.014);
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;line(rim,[x+Math.cos(a)*.07,-.47+Math.sin(a)*.07,wheelZ+side*.11],[x+Math.cos(a+.12)*.27,-.47+Math.sin(a+.12)*.27,wheelZ+side*.11],.026);
      }
      const cap=mesh(new THREE.CylinderGeometry(.073,.073,.035,20),trim,x,-.47,wheelZ+side*.132);cap.rotation.x=Math.PI/2;
      for(let i=0;i<5;i++){const a=i*Math.PI*2/5;box(edge,x+Math.cos(a)*.05,-.47+Math.sin(a)*.05,wheelZ+side*.153,.017,.017,.01,.002);}
    }
  }
  // Windshield, wipers and rear screen occupy the actual end faces.
  const windshield=box(glass,1.18,.475,0,.026,.52,1.52,.012);windshield.rotation.z=.44;
  line(trim,[1.30,.25,-.62],[1.23,.42,-.13],.011);line(trim,[1.30,.25,.10],[1.23,.41,.63],.011);
  box(glass,-2.205,.44,0,.024,.48,1.51,.01);
  box(trim,2.25,-.25,0,.15,.38,1.83,.045);box(trim,-2.25,-.38,0,.15,.25,1.82,.035);
  box(trim,2.245,.04,0,.055,.20,1.17,.012);
  for(let i=0;i<9;i++)box(seal,2.281,.045,-.49+i*.123,.012,.14,.04,.005);
  for(const side of [-1,1]){
    box(seal,2.25,.07,side*.72,.06,.43,.29,.025);
    box(white,2.289,.08,side*.72,.025,.34,.067,.008);box(white,2.29,.14,side*.72,.027,.065,.23,.008);
    box(red,-2.29,.10,side*.72,.032,.40,.075,.009);
    box(edge,2.31,-.31,side*.62,.055,.055,.16,.008);
    line(trim,[-2.16,.71,side*.71],[-2.31,.71,side*.71],.025);
  }
  box(edge,2.31,-.49,0,.065,.10,.80,.012);box(seal,2.338,-.22,0,.012,.10,.38,.008);
  // Spare storage box, tailgate seam and rear hinge retain the boxy reference silhouette.
  box(paint,-2.38,-.05,0,.25,.66,.66,.06);box(trim,-2.515,-.05,0,.024,.54,.54,.024);
  for(const side of [-1,1])line(seal,[-2.29,-.36,side*.60],[-2.29,.66,side*.60],.007);
  box(trim,-2.30,.74,0,.12,.06,1.67,.015);box(red,-2.37,.73,0,.016,.025,.48,.005);
  return car;
}
