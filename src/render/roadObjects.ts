import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { motionAt } from '../game/motion';
import { trafficTiming, trafficSpeech } from '../game/roadEvents';
import { createTrafficSuv } from './trafficSuv';
import type { GameSnapshot, Level, Motion } from '../game/types';

/** Road actors share authored dimensions and the simulation clock with GameCore. */
export function createRoadObjects(level:Level,language:'zh'|'en'='zh') {
  const group=new THREE.Group();group.name='road-actors';
  const fixtures=new THREE.Group();fixtures.name='fixed-road-hardware';group.add(fixtures);
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  const own=<T extends THREE.BufferGeometry>(geometry:T)=>{geometries.add(geometry);return geometry;};
  const mat=(color:number,metalness=.3,roughness=.55,emissive=0)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity:.7});materials.add(m);return m;};
  const steel=mat(0x253744,.75,.4),edge=mat(0xb1b7b5,.7,.34),rubber=mat(0x141c24,0,.85),glass=mat(0x29434c,.72,.16),amber=mat(0xffbb68,.4,.25,0x70400c),white=mat(0xe3e1ce,.2),paint=mat(0x687c8b,.52,.32),cargo=mat(0x3f6872,.42,.46);
  const shadow=mat(0x080c10,.05,.96),chrome=mat(0xc4c9c6,.88,.22),black=mat(0x10161b,.18,.82),lampRed=mat(0xd95c46,.25,.3,0x7a170b),lampWhite=mat(0xf0e6ca,.2,.25,0xc1ae82),tyre=mat(0x111417,0,.98),brake=mat(0x7d4036,.3,.62);
  const box=own(new THREE.BoxGeometry(1,1,1)),wheel=own(new THREE.CylinderGeometry(.36,.36,.2,24));
  const hub=own(new THREE.CylinderGeometry(.19,.19,.215,16)),disc=own(new THREE.CylinderGeometry(.255,.255,.03,20)),capGeometry=own(new THREE.CylinderGeometry(.07,.07,.23,10));
  const moving:{object:THREE.Group;motion?:Motion;base:THREE.Vector3;hazardIndex?:number}[]=[];
  const collapsible:{object:THREE.Group;id:string;base:THREE.Vector3}[]=[];
  const windMarkers:{object:THREE.Group;zone:NonNullable<Level['windZones']>[number]}[]=[];
  const pickups:{object:THREE.Group;id:string;motion?:Motion;base:THREE.Vector3}[]=[];
  const eventActors=new Map<string,THREE.Group>();
  const mountedPacks=new Map<string,THREE.Group>();
  const speechBubbles=new Map<string,THREE.Sprite>();
  function speechBubble(parent:THREE.Group,id:string,lines:string[],height:number){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;
    const ctx=canvas.getContext('2d')!;
    ctx.fillStyle='#f4f0e6';ctx.strokeStyle='#263643';ctx.lineWidth=5;
    ctx.beginPath();ctx.roundRect(4,4,504,158,16);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(238,159);ctx.lineTo(256,187);ctx.lineTo(279,159);ctx.fill();ctx.stroke();
    ctx.fillStyle='#18232d';ctx.font='600 46px "Microsoft YaHei", "PingFang SC", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    lines.forEach((line,i)=>ctx.fillText(line,256,55+i*58,464));
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.add(texture);
    const material=new THREE.SpriteMaterial({map:texture,depthTest:false,depthWrite:false,sizeAttenuation:false,toneMapped:false});materials.add(material);
    const bubble=new THREE.Sprite(material);bubble.name='vehicle-speech';bubble.userData.lines=lines;
    bubble.position.set(0,height/2+.35,0);bubble.center.set(.5,0);bubble.renderOrder=30;bubble.visible=false;
    parent.add(bubble);speechBubbles.set(id,bubble);
  }
  let disposed=false;
  const truckSlots:{parent:THREE.Group;fallback:THREE.Group;w:number;h:number;color:number}[]=[];
  function truck(parent:THREE.Group,w:number,h:number){
    const fallback=new THREE.Group();parent.add(fallback);
    const palette=[0x426e85,0xbdc0af,0x9a4b37,0x496955,0xd1a457,0x576285,0x948c79,0x8b574b,0x3f7c7b,0xbd8151];
    const color=palette[(level.id-1+truckSlots.length*3)%palette.length];
    // Immediate silhouette while the local, licensed asset loads.
    rounded(fallback,mat(color,.5,.35),w*.3,-h*.08,0,w*.27,h*.74,2.5);
    rounded(fallback,mat(color,.35,.5),-w*.15,h*.05,0,w*.65,h*.9,2.6);
    for(const x of [-w*.32,w*.3])for(const z of [-1.2,1.2])roadWheel(fallback,x,-h/2+.42,z,1.2);
    truckSlots.push({parent,fallback,w,h,color});
  }
  function block(parent:THREE.Object3D,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number){const mesh=new THREE.Mesh(box,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function rounded(parent:THREE.Object3D,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,r=.12){
    const geometry=own(new RoundedBoxGeometry(w,h,d,2,Math.min(r,Math.min(w,h,d)*.2)));
    const mesh=new THREE.Mesh(geometry,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function tube(parent:THREE.Object3D,m:THREE.Material,a:number[],b:number[],radius=.06){
    const start=new THREE.Vector3().fromArray(a),end=new THREE.Vector3().fromArray(b),delta=end.clone().sub(start);
    const geometry=own(new THREE.CylinderGeometry(radius,radius,1,8));
    const mesh=new THREE.Mesh(geometry,m);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.scale.y=delta.length();mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());mesh.castShadow=true;parent.add(mesh);return mesh;
  }
  function roadWheel(parent:THREE.Object3D,x:number,y:number,z:number,scale=1){
    const side=Math.sign(z)||1;
    const tire=new THREE.Mesh(wheel,tyre);tire.position.set(x,y,z);tire.scale.setScalar(scale);tire.rotation.x=Math.PI/2;tire.castShadow=true;parent.add(tire);
    const rim=new THREE.Mesh(hub,chrome);rim.position.set(x,y,z+side*.105*scale);rim.scale.setScalar(scale);rim.rotation.x=Math.PI/2;parent.add(rim);
    const rotor=new THREE.Mesh(disc,brake);rotor.position.set(x,y,z+side*.055*scale);rotor.scale.setScalar(scale);rotor.rotation.x=Math.PI/2;parent.add(rotor);
    const cap=new THREE.Mesh(capGeometry,steel);cap.position.copy(rim.position);cap.scale.setScalar(scale);cap.rotation.x=Math.PI/2;parent.add(cap);
  }
  function crateTexture(){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d')!;
    const gradient=ctx.createLinearGradient(0,0,0,256);gradient.addColorStop(0,'#557d84');gradient.addColorStop(.52,'#3f666e');gradient.addColorStop(1,'#2e4d56');ctx.fillStyle=gradient;ctx.fillRect(0,0,512,256);
    for(let x=0;x<512;x+=32){ctx.fillStyle=x%64?'rgba(216,224,211,.075)':'rgba(8,19,24,.16)';ctx.fillRect(x,0,2,256);}
    for(let y=0;y<256;y+=8){ctx.fillStyle='rgba(7,20,25,.09)';ctx.fillRect(0,y,512,1);}
    for(let i=0;i<26;i++){ctx.fillStyle=`rgba(14,28,31,${.025+((i*17)%11)/130})`;const x=(i*89)%512;ctx.fillRect(x,(i*31)%256,22+(i%7)*9,2);}
    ctx.strokeStyle='rgba(16,33,37,.52)';ctx.lineWidth=8;ctx.strokeRect(7,7,498,242);
    ctx.fillStyle='rgba(230,223,196,.72)';ctx.font='600 22px "Barlow Condensed", sans-serif';ctx.fillText('AEROSPACE CARGO',30,42);
    ctx.fillStyle='rgba(234,185,117,.9)';ctx.fillRect(420,24,60,5);ctx.fillRect(420,34,40,5);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;textures.add(texture);return texture;
  }
  const crateMap=crateTexture();
  function container(parent:THREE.Object3D,w:number,h:number,d:number){
    const skinMat=mat(0x496f77,.45,.47);skinMat.map=crateMap;skinMat.needsUpdate=true;
    rounded(parent,skinMat,0,-h/2,0,w-.12,h-.12,d-.12,.06);
    for(const z of [-d/2-.02,d/2+.02]){
      for(let x=-w/2+.27;x<w/2;x+=.68)block(parent,edge,x,-h/2,z,.055,h-.34,.045);
      for(const y of [-.10,-h+.11])block(parent,steel,0,y,z,w,.13,.14);
      for(const x of [-w/2+.11,w/2-.11])block(parent,edge,x,-h/2,z,.15,h,.12);
      for(const x of [-w*.31,w*.31]){block(parent,steel,x,-.075,z+.01,.85,.15,.07);block(parent,amber,x,-.07,z+.06,.55,.055,.025);}
      block(parent,shadow,0,-h*.5,z-.055,w-.3,h-.46,.02);
    }
    block(parent,edge,0,-.035,0,w,.07,d);
    for(let x=-w/2+.3;x<w/2;x+=1.2)block(parent,steel,x,.012,0,.06,.025,d-.3);
    for(const x of [-w*.36,0,w*.36]){
      for(const z of [-d*.31,d*.31]){
        block(parent,steel,x,-h/2-.015,z,.23,.055,.23);
        tube(parent,chrome,[x,-h/2-.025,z],[x,.07,z],.035);
        block(parent,amber,x,.085,z,.16,.04,.16);
      }
    }
    for(const x of [-w/2+.5,w/2-.5]){
      tube(parent,steel,[x,.09,-d*.37],[x,.09,d*.37],.045);
      block(parent,steel,x,-h/2+.24,-d/2-.07,.28,.28,.09);
      block(parent,steel,x,-h/2+.24,d/2+.07,.28,.28,.09);
    }
  }
  /** Original reference-based stand-ins: 03T-type off-road SUV and V800-type MPV.
   * These are explicitly not downloaded or officially accurate manufacturer assets. */
  function trafficCar(parent:THREE.Object3D,mpv:boolean){
    if(!mpv){parent.add(createTrafficSuv(own,mat));return;}
    const w=5.5,h=1.9,d=2.0;
    const paintwork=mat(0x342c29,.65,.28),upper=mat(0xb7a58a,.62,.27);
    const bottom=-h/2+.11,axle=-h/2+.39,wheelX=1.71;
    const profile=new THREE.Shape();profile.moveTo(-w/2,bottom);
    for(const x of [-wheelX,wheelX]){
      profile.lineTo(x-.47,bottom);profile.lineTo(x-.47,axle);
      profile.absarc(x,axle,.47,Math.PI,0,true);profile.lineTo(x+.47,bottom);
    }
    profile.lineTo(w/2,bottom);profile.lineTo(w/2,h*.02);
    profile.quadraticCurveTo(w/2,h*.15,w*.39,h*.19);profile.lineTo(w*.22,h*.43);profile.quadraticCurveTo(w*.18,h*.49,w*.12,h*.49);profile.lineTo(-w*.4,h*.49);profile.quadraticCurveTo(-w*.49,h*.46,-w*.49,h*.27);
    profile.lineTo(-w/2,bottom);profile.closePath();
    const body=new THREE.Mesh(own(new THREE.ExtrudeGeometry(profile,{depth:d-.16,bevelEnabled:true,bevelSize:.065,bevelThickness:.065,bevelSegments:3,curveSegments:20})),paintwork);
    body.position.z=-d/2+.08;body.castShadow=true;body.receiveShadow=true;parent.add(body);
    // Raised roof, recessed greenhouse, actual door shut lines and running boards.
    rounded(parent,upper,-w*.1,h*.47,0,w*.62,.08,d*.88,.035);
    rounded(parent,black,-w*.08,h*.48,0,w*.42,.025,d*.65,.015);
    for(const side of [-1,1]){
      const z=side*(d/2+.002);
      const glazing=new THREE.Shape();glazing.moveTo(-w*.43,h*.09);glazing.lineTo(-w*.43,h*.38);
      glazing.lineTo(w*.19,h*.39);glazing.lineTo(w*.32,h*.09);glazing.closePath();
      const window=new THREE.Mesh(own(new THREE.ShapeGeometry(glazing)),glass);glass.side=THREE.DoubleSide;window.position.z=z;parent.add(window);
      for(const x of [-w*.27,-w*.02])block(parent,black,x,h*.24,z+side*.012,.07,h*.34,.02);
      tube(parent,chrome,[-w*.43,h*.065,z+side*.02],[w*.25,h*.065,z+side*.02],.018);
      for(const x of [-w*.04,w*.23]){
        block(parent,chrome,x,-.01,z+side*.035,.19,.035,.035);
        tube(parent,black,[x+.14,bottom+.18,z+side*.01],[x+.14,h*.08,z+side*.01],.009);
      }
      tube(parent,chrome,[-w*.4,-.14,z+side*.012],[w*.1,-.14,z+side*.012],.016);
      rounded(parent,black,0,bottom+.07,z+side*.025,w*.77,.12,.14,.03);
      rounded(parent,paintwork,w*.24,h*.11,z+side*.12,.27,.16,.26,.035);
      block(parent,lampWhite,w*.24,h*.11,z+side*.255,.16,.025,.015);
      for(const x of [-wheelX,wheelX])roadWheel(parent,x,axle,side*(d/2-.04),1.12);
    }
    // Raked front glazing and rear glass are full 3D panels.
    const windshield=rounded(parent,glass,w*.25,h*.25,0,.055,h*.35,d*.8,.012);
    windshield.rotation.z=.62;
    rounded(parent,glass,-w*.475,h*.24,0,.03,h*.3,d*.78,.01);
    rounded(parent,black,w/2+.045,-h*.19,0,.13,.36,d*.92,.04);
    rounded(parent,black,-w/2-.04,-h*.23,0,.12,.24,d*.92,.04);
    {
      for(let i=0;i<19;i++)block(parent,chrome,w/2+.12,-h*.13,-d*.4+i*d*.8/18,.035,.42,.025);
      block(parent,chrome,w/2+.13,h*.04,0,.025,.025,d*.85);
      for(const side of [-1,1]){
        rounded(parent,lampWhite,w/2+.14,h*.075,side*d*.32,.04,.105,.48,.018);
        block(parent,lampWhite,w/2+.145,-.06,side*d*.42,.035,.24,.045);
        block(parent,lampRed,-w/2-.075,h*.04,side*d*.35,.035,.12,.3);
      }
      block(parent,lampRed,-w/2-.07,h*.05,0,.035,.035,d*.72);
      rounded(parent,upper,-w*.1,-h*.18,0,w*.65,.035,d*.98,.01);
    }
    block(parent,black,w/2+.16,-h*.22,0,.025,.12,.42);
    for(const side of [-1,1])for(let i=0;i<2;i++)block(parent,steel,-w*.2+i*.4,bottom+.04,side*.4,.22,.12,.22);
  }
  function gate(actor:THREE.Group,x:number,y:number,z:number,w:number,h:number){
    rounded(actor,edge,0,0,0,w,h,.48,.06);
    block(actor,shadow,0,0,.26,w*.93,h*.92,.035);
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=512;const ctx=canvas.getContext('2d')!;
    ctx.fillStyle='#d6a450';ctx.fillRect(0,0,128,512);ctx.fillStyle='#20272a';
    for(let y=-128;y<640;y+=88){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(128,y+64);ctx.lineTo(128,y+106);ctx.lineTo(0,y+42);ctx.fill();}
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;textures.add(map);
    const coating=mat(0xffffff,.25,.65);coating.map=map;
    for(const side of [-1,1]){const face=new THREE.Mesh(own(new THREE.PlaneGeometry(w*.83,h*.92)),coating);face.position.z=side*.305;if(side<0)face.rotation.y=Math.PI;actor.add(face);}
    for(const side of [-1,1]){
      block(actor,steel,side*(w/2-.035),0,.275,.07,h-.22,.06);
      block(actor,chrome,side*(w/2-.02),0,.31,.025,h-.18,.025);
    }
    for(const side of [-1,1]){
      rounded(fixtures,steel,x+side*(w/2+1.15),y+h/2+2.1,z,1.1,7.8,.8,.06);
      rounded(fixtures,chrome,x+side*(w/2+1.15),y+h/2+6.05,z,1.25,.28,.95,.04);
      block(fixtures,amber,x+side*(w/2+1.15),y+h/2+5.8,z-.42,.38,.28,.10);
      block(fixtures,shadow,x+side*(w/2+1.15),y+h/2+2.0,z+.42,.72,5.9,.02);
      for(let yy=-2.6;yy<=2.6;yy+=1.3)block(fixtures,chrome,x+side*(w/2+1.15),y+h/2+2.1+yy,z+.45,.42,.08,.04);
    }
    rounded(fixtures,steel,x,y+h/2+6.25,z,w+3.4,.38,.75,.05);
    block(fixtures,amber,x,y+h/2+6.25,z+.4,w*.45,.06,.05);
    // Telescopic rails remain fixed; the striped collision panel moves with the actor.
  }
  function trailer(parent:THREE.Object3D,w:number,d:number){
    rounded(parent,deck,0,-.03,0,w,.18,d-.2,.045);
    for(const z of [-d/2+.12,d/2-.12]){
      tube(parent,steel,[-w/2+.15,-.13,z],[w/2-.15,-.13,z],.07);
      for(let x=-w/2+.4;x<w/2-.2;x+=1.1)block(parent,steel,x,-.14,z,.08,.12,.08);
    }
    for(const x of [-w/2+.22,w/2-.22]){
      block(parent,edge,x,-.20,0,.10,.28,d-.1);
      for(const z of [-d*.34,d*.34])block(parent,amber,x,-.13,z,.15,.18,.32);
    }
    for(const x of [-w*.32,w*.32])for(const z of [-d/2+.12,d/2-.12]){
      roadWheel(parent,x,-.30,z,1.35);
      block(parent,steel,x,-.10,z,.12,.32,.45);
    }
  }
  function warningBeacon(x:number,y:number,z:number){
    const base=own(new THREE.CylinderGeometry(.31,.36,.08,12));
    const cone=own(new THREE.ConeGeometry(.22,.62,12));
    const beacon=new THREE.Group();beacon.position.set(x,y,z);fixtures.add(beacon);
    const foot=new THREE.Mesh(base,tyre);foot.castShadow=true;beacon.add(foot);
    const body=new THREE.Mesh(cone,amber);body.position.y=.34;body.castShadow=true;beacon.add(body);
    const band=new THREE.Mesh(own(new THREE.CylinderGeometry(.125,.16,.13,12)),white);band.position.y=.34;beacon.add(band);
  }
  const deck=mat(0x8e9798,.62,.40);
  function roadHeight(x:number,z:number,expected:number){
    let height=expected,distance=Infinity;
    for(const track of level.tracks)for(let i=1;i<track.points.length;i++){
      const a=track.points[i-1],b=track.points[i],dx=b.x-a.x;
      if(track.kind||Math.abs(dx)<.01||x<Math.min(a.x,b.x)||x>Math.max(a.x,b.x))continue;
      const t=(x-a.x)/dx,lane=(a.z??0)+((b.z??0)-(a.z??0))*t;
      if(Math.abs(z-lane)>(track.width??7)/2)continue;
      const y=a.y+(b.y-a.y)*t,cost=Math.abs(y-expected);
      if(cost<distance){distance=cost;height=y;}
    }
    return height;
  }
  for(const [index,h] of level.hazards.entries()){
    const actor=new THREE.Group();actor.name=`road-${h.kind??'cargo'}-${index}`;actor.position.set(h.x,h.y,h.z??0);group.add(actor);
    if(h.kind==='car'||h.kind==='van'){
      const shell=new THREE.Group();shell.name='wreck-shell';actor.add(shell);
      truck(shell,h.w,h.h);
      const base=h.y-h.h/2,rear=roadHeight(h.x-h.w*.31,h.z??0,base),front=roadHeight(h.x+h.w*.31,h.z??0,base);
      const road=(rear+front)/2,angle=Math.atan2(front-rear,h.w*.62);
      if(Math.abs(road-base)>.1||Math.abs(angle)>.02){
        // This collider exposes a low crushed wreck on a grade. Fit its skin to that real envelope.
        const wheelBase=-h.h/2+.30-.36*Math.min(1.02,h.h/.95),sin=Math.sin(angle),cos=Math.cos(angle);
        let compression=1;
        shell.updateWorldMatrix(true,true);const inverse=shell.matrixWorld.clone().invert(),point=new THREE.Vector3();
        shell.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const transform=inverse.clone().multiply(o.matrixWorld),p=o.geometry.getAttribute('position');
          for(let i=0;i<p.count;i++){point.fromBufferAttribute(p,i).applyMatrix4(transform);if(point.y>wheelBase+.02)compression=Math.min(compression,(h.y+h.h/2-road-sin*point.x)/(cos*(point.y-wheelBase)));}
        });
        shell.scale.y=Math.max(.15,compression);shell.rotation.z=angle;
        shell.position.y=road-h.y-cos*shell.scale.y*wheelBase;
      }
    }else if(h.kind==='gate'){
      gate(actor,h.x,h.y,h.z??0,h.w,h.h);
    }else{
      const shell=new THREE.Group();shell.position.y=h.h/2;actor.add(shell);container(shell,h.w,h.h,h.depth??6);
      for(const x of [-h.w*.35,h.w*.35]){
        tube(actor,chrome,[x,h.h*.62,-2.65],[x,h.h/2+4.2,-2.65],.025);
        block(actor,amber,x,h.h/2+4.25,-2.65,.13,.13,.13);
      }
    }
    moving.push({object:actor,motion:h.motion,base:actor.position.clone(),hazardIndex:index});
    if(h.kind==='car'||h.kind==='van')for(const distance of [9,14])warningBeacon(h.x-distance,h.y-h.h/2+.33,(h.z??0)+2.7);
  }
  for(const track of level.tracks.filter(t=>t.kind)){
    const a=track.points[0],b=track.points.at(-1)!,w=b.x-a.x,d=track.width??7;
    const actor=new THREE.Group();actor.name=track.id;actor.position.set((a.x+b.x)/2,a.y,a.z??0);group.add(actor);
    if(track.kind==='slab'){block(actor,deck,0,-.22,0,w,.44,d);for(const side of [-1,1])block(actor,amber,0,.04,side*(d/2-.12),w,.08,.18);for(let xx=-w/2+1;xx<w/2;xx+=3)block(actor,black,xx,.012,0,.10,.025,d-.3);collapsible.push({object:actor,id:track.id,base:actor.position.clone()});}else if(track.kind==='trailer')trailer(actor,w,d);else container(actor,w,2.4,d);
    if(track.kind==='trailer'){
      for(const x of [-w*.35,w*.35])for(const z of [-d/2+.12,d/2-.12]){
        block(actor,steel,x,-.65,z,.18,1.1,.35);
        tube(actor,chrome,[x,-1.1,z],[x,-.16,z],.045);
      }
      rounded(actor,steel,0,-1.18,d*.28,.55,.28,1.4,.05);
      block(actor,amber,0,-1.18,d*.28+.72,.25,.09,.07);
    }
    if(track.motion){
      moving.push({object:actor,motion:track.motion,base:actor.position.clone()});
      const dx=track.motion.dx??0,dy=track.motion.dy??0;
      for(const z of [-d/2-.6,d/2+.6]){
        if(dx)block(fixtures,steel,actor.position.x+dx/2,a.y-3,(a.z??0)+z,w+dx+3,.16,.2);
        if(dy)for(const x of [a.x-.6,b.x+.6]){block(fixtures,steel,x,a.y+dy/2-1.2,(a.z??0)+z,.22,dy+4,.22);block(fixtures,amber,x,a.y+dy+1,(a.z??0)+z,.45,.16,.45);}
      }
      for(const end of [0,1])for(const z of [-d/2,d/2])block(fixtures,amber,actor.position.x+dx*end,a.y+dy*end-.1,(a.z??0)+z,1.8,.12,.2);
    }
  }
  for(const zone of level.windZones??[]){
    const marker=new THREE.Group();marker.position.set(zone.x-12,zone.y+6,0);group.add(marker);
    block(marker,steel,0,-3,-4,.12,6,.12);
    for(let j=0;j<3;j++){const arrow=block(marker,amber,j*1.1,0,0,1.4,.10,.10);arrow.rotation.z=-.45;block(marker,amber,j*1.1,-.55,0,1.4,.10,.10).rotation.z=.45;}
    windMarkers.push({object:marker,zone});
  }
  const starShape=new THREE.Shape();
  for(let i=0;i<10;i++){const angle=Math.PI/2+i*Math.PI/5,r=i%2?.43:.94;const x=Math.cos(angle)*r,y=Math.sin(angle)*r;i?starShape.lineTo(x,y):starShape.moveTo(x,y);}starShape.closePath();
  const starGeometry=own(new THREE.ExtrudeGeometry(starShape,{depth:.18,bevelEnabled:true,bevelSize:.07,bevelThickness:.05,bevelSegments:2,steps:1}));
  const ringGeometry=own(new THREE.TorusGeometry(1.2,.035,6,40));
  for(const item of level.collectibles??[]){
    const actor=new THREE.Group();actor.name=`pickup-${item.id}`;actor.position.set(item.x,item.y,item.z??0);group.add(actor);
    if(item.kind==='star'){actor.add(new THREE.Mesh(starGeometry,amber));actor.add(new THREE.Mesh(ringGeometry,edge));}
    else{
      const can=new THREE.Mesh(own(new THREE.CylinderGeometry(.35,.35,1.25,12)),white);actor.add(can);
      block(actor,amber,0,.15,.355,.4,.45,.025);block(actor,steel,0,.73,0,.18,.2,.18);
      const ring=new THREE.Mesh(ringGeometry,amber);ring.scale.setScalar(.72);actor.add(ring);
    }
    pickups.push({object:actor,id:item.id,motion:level.tracks.find(t=>t.id===item.trackId)?.motion,base:actor.position.clone()});
  }
  // Event actors use the exact simulation dimensions; lamp pulses never change collision bounds.
  for(const e of level.roadEvents??[]){
    const types=e.kind==='combo'?['source','battery','chaser']:e.kind==='battery'?['source','battery']:e.kind==='chase'?['chaser']:['blocker'];
    for(const type of types){
      const actor=new THREE.Group();actor.name=`${e.id}-${type}`;actor.visible=false;group.add(actor);eventActors.set(actor.name,actor);
      if(type==='battery'){
        rounded(actor,steel,0,0,0,2.4,.36,1.7,.05);
        for(const z of [-.84,.84])block(actor,amber,0,0,z,2.25,.12,.035);
        for(let x=-.9;x<1;x+=.3)block(actor,black,x,.19,0,.06,.025,1.4);
        for(const x of [-1.02,1.02])block(actor,lampRed,x,0,.87,.15,.23,.035);
      }else{
        if(type==='blocker')truck(actor,7.2,3.3);
        else trafficCar(actor,type==='chaser');
      }
    }
  }
  // Bake only within each rigid actor, keeping its motion transform and collectible identity.
  function batchRigid(root:THREE.Group){
    root.updateWorldMatrix(true,true);
    const inverse=root.matrixWorld.clone().invert();
    const byMaterial=new Map<THREE.Material,{meshes:THREE.Mesh[];parts:THREE.BufferGeometry[]}>();
    root.traverse(object=>{
      if(!(object instanceof THREE.Mesh)||Array.isArray(object.material))return;
      const entry=byMaterial.get(object.material)??{meshes:[],parts:[]};
      const part=object.geometry.clone();
      if(!part.index)part.setIndex(Array.from({length:part.getAttribute('position').count},(_,i)=>i));
      entry.meshes.push(object);entry.parts.push(part.applyMatrix4(inverse.clone().multiply(object.matrixWorld)));
      byMaterial.set(object.material,entry);
    });
    for(const [material,entry] of byMaterial){
      const geometry=mergeGeometries(entry.parts,false);
      entry.parts.forEach(g=>g.dispose());
      if(!geometry)continue;
      entry.meshes.forEach(m=>m.removeFromParent());
      const merged=new THREE.Mesh(own(geometry),material);merged.name=`batched-${root.name}`;
      merged.castShadow=entry.meshes.some(m=>m.castShadow);merged.receiveShadow=entry.meshes.some(m=>m.receiveShadow);root.add(merged);
    }
  }
  for(const actor of moving)if(!truckSlots.some(s=>s.parent.parent===actor.object))batchRigid(actor.object);
  for(const actor of eventActors.values())if(!truckSlots.some(s=>s.parent===actor))batchRigid(actor);
  for(const [id,actor] of eventActors){
    if(id.endsWith('-battery'))continue;
    if(id.endsWith('-chaser')){const light=new THREE.SpotLight(0xffe4b4,22,48,.42,.8,1.2);light.position.set(2.5,.1,0);light.target.position.set(24,-1,0);actor.add(light,light.target);}
    if(id.endsWith('-source')){const pack=new THREE.Group();rounded(pack,steel,0,-.54,0,2.4,.36,1.7,.05);block(pack,amber,0,-.54,.86,2.25,.12,.04);actor.add(pack);mountedPacks.set(id,pack);}
    if(id.endsWith('-source'))speechBubble(actor,id,language==='zh'?['电池先走，','我垫后。']:['Battery first.','I will wait.'],1.72);
    if(id.endsWith('-chaser'))speechBubble(actor,id,language==='zh'?['踏板断了！','借过——']:['Pedal snapped!','Coming through!'],1.9);
  }
  batchRigid(fixtures);
  if(truckSlots.length)new GLTFLoader().load(`${import.meta.env.BASE_URL}models/traffic/box-truck.glb`,gltf=>{
    if(disposed){gltf.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{for(const v of Object.values(m))if(v instanceof THREE.Texture)v.dispose();m.dispose();});}});return;}
    const root=gltf.scene;
    // Share the imported geometry/materials, merged once instead of 756 calls per truck.
    root.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const value of Object.values(m))if(value instanceof THREE.Texture)textures.add(value);if(m instanceof THREE.MeshPhysicalMaterial){m.transmission=0;m.transparent=false;m.opacity=1;}}}});
    batchRigid(root);
    const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    for(const slot of truckSlots){
      const model=root.clone(true);model.name='imported-cc0-box-truck';
      model.userData.livery=slot.color;
      model.traverse(o=>{if(o instanceof THREE.Mesh&&o.material instanceof THREE.MeshStandardMaterial&&o.material.name==='paint'){
        const finish=o.material.clone();finish.color.setHex(slot.color);finish.map=null;finish.roughness=.35;materials.add(finish);o.material=finish;
      }});
      model.scale.set(slot.w/size.x,slot.h/size.y,2.7/size.z);
      model.position.set(-center.x*model.scale.x,-slot.h/2-bounds.min.y*model.scale.y,-center.z*model.scale.z);
      // The source truck's cab faces -X.
      model.rotation.y=Math.PI;model.position.x=-model.position.x;
      slot.fallback.visible=false;slot.parent.add(model);
    }
  },undefined,()=>{group.userData.trafficModelError='Box truck failed to load';});
  return {group,update(time:number,s?:GameSnapshot|null){
    for(const bubble of speechBubbles.values()){bubble.visible=false;bubble.scale.set(110/window.innerHeight,42/window.innerHeight,1);}
    for(const view of s?.roadEvents??[]){if(view.phase==='clear')continue;const event=level.roadEvents?.find(e=>e.id===view.id);if(!event)continue;const speech=trafficSpeech(event,view.age);if(speech){const bubble=speechBubbles.get(speech.actor);if(bubble)bubble.visible=true;}}
    for(const actor of eventActors.values())actor.visible=false;
    for(const state of s?.roadActors??[]){const actor=eventActors.get(state.id);if(!actor)continue;actor.visible=true;actor.position.set(state.x,state.y,state.z);const pack=mountedPacks.get(state.id);const event=level.roadEvents?.find(e=>e.id===state.eventId);if(pack&&event)pack.visible=(s?.roadEvents?.find(e=>e.id===state.eventId)?.age??99)<trafficTiming(event).release;}
    for(const item of collapsible){const gone=s?.collapsedTracks?.includes(item.id);const warning=s?.collapseWarnings?.find(w=>w.id===item.id);const age=s?.collapseAges?.[item.id]??0;item.object.visible=!gone||age<2;item.object.position.copy(item.base);item.object.rotation.z=0;if(gone){item.object.position.y-=age*age*8;item.object.rotation.z=age*.18;}else if(warning){item.object.position.y+=Math.sin(time*38)*.055;item.object.rotation.z=Math.sin(time*27)*.005;}}
    for(const item of windMarkers){const sign=item.zone.period?Math.sin(time*Math.PI*2/item.zone.period):item.zone.force.x;item.object.rotation.y=sign<0?Math.PI:0;}
    for(const item of moving){const offset=item.hazardIndex!==undefined&&s?.gateOffsets?s.gateOffsets[item.hazardIndex]:motionAt(item.motion,time);item.object.position.set(item.base.x+offset.x,item.base.y+offset.y,item.base.z);}
    for(const item of pickups){item.object.visible=!s?.collectedItems.includes(item.id);const offset=motionAt(item.motion,time);item.object.position.set(item.base.x+offset.x,item.base.y+offset.y+Math.sin(time*2.5+item.base.x)*.12,item.base.z);item.object.rotation.y=Math.sin(time*1.4)*.32;}
  },dispose(){disposed=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
