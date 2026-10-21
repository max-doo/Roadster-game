import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import fontData from 'three/examples/fonts/helvetiker_regular.typeface.json';
import type { GameSnapshot } from '../game/types';
import { REAR_NOZZLE_X, REAR_NOZZLE_Z, LIFT_NOZZLE_X, LIFT_NOZZLE_Z, ATTITUDE_UP_PORTS } from './thrusters';

export type VehicleRig = {
  group: THREE.Group;
  update(state: GameSnapshot, dt: number): void;
  reset?(): void;
  dispose(): void;
};

type Section = [x: number, width: number, center: number, shoulder: number];
// Authored body stations: rear to nose. The lower shell and upper glass use separate sections.
const sections: Section[] = [
  [-2.47,1.035,.365,.345],[-2.10,1.06,.385,.36],[-1.55,1.07,.397,.35],
  [-.95,1.05,.345,.315],[-.20,1.02,.285,.255],[.60,1.035,.23,.18],
  [1.15,1.06,.225,.175],[1.55,1.065,.205,.18],[1.95,1.045,.145,.115],[2.18,1.01,.10,.085],
];
const axle=1.55;
// The old visual wheels were oversized relative to the photographed body. Keep the
// contact height by lowering the visual hub by the same 67 mm removed from its radius.
const wheelY=-.317;
const tireRadius=.395;
const wheelZ=.94;
const wingRestY=.315;
const clamp = THREE.MathUtils.clamp;

// Natural cubic splines provide continuous curvature, avoiding reflection bands at loft stations.
function cubicSections(data: Section[]): (x:number)=>number[] {
  const n=data.length,seconds:number[][]=[];
  for(let k=1;k<=3;k++) {
    const a=new Array(n).fill(0),b=new Array(n).fill(1),c=new Array(n).fill(0),d=new Array(n).fill(0);
    for(let i=1;i<n-1;i++){
      const h0=data[i][0]-data[i-1][0],h1=data[i+1][0]-data[i][0];
      a[i]=h0;b[i]=2*(h0+h1);c[i]=h1;
      d[i]=6*((data[i+1][k]-data[i][k])/h1-(data[i][k]-data[i-1][k])/h0);
    }
    for(let i=1;i<n;i++){const f=a[i]/b[i-1];b[i]-=f*c[i-1];d[i]-=f*d[i-1];}
    const m=new Array(n).fill(0);m[n-1]=d[n-1]/b[n-1];
    for(let i=n-2;i>=0;i--)m[i]=(d[i]-c[i]*m[i+1])/b[i];seconds.push(m);
  }
  return(x:number)=>{
    let i=0;while(i<n-2&&data[i+1][0]<x)i++;
    const h=data[i+1][0]-data[i][0],t=clamp((x-data[i][0])/h,0,1),a=1-t;
    return[x,...[1,2,3].map(k=>a*data[i][k]+t*data[i+1][k]+((a*a*a-a)*seconds[k-1][i]+(t*t*t-t)*seconds[k-1][i+1])*h*h/6)];
  };
}
const bodySection=cubicSections(sections);

function sectionAt(x: number): number[] {
  return bodySection(x);
}

function gridGeometry(uCount: number, vCount: number, sample: (u:number,v:number)=>THREE.Vector3): THREE.BufferGeometry {
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let i=0;i<=uCount;i++) for(let j=0;j<=vCount;j++) {
    const p = sample(i/uCount,j/vCount); positions.push(p.x,p.y,p.z); uv.push(i/uCount,j/vCount);
    if(i<uCount && j<vCount) {
      const a=i*(vCount+1)+j,b=a+vCount+1;
      indices.push(a,b,a+1,b,b+1,a+1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(indices); g.computeVertexNormals(); return g;
}

function panel(points: number[][], depth = .01): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(p=>new THREE.Vector2(p[0],p[1])));
  const geometry = new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:Math.min(.003,depth*.30),bevelThickness:Math.min(.002,depth*.25),curveSegments:12});
  geometry.computeVertexNormals(); return geometry;
}

function tube(points: number[][], radius: number, segments = 36, radialSegments = 5, straight = false): THREE.BufferGeometry {
  const vertices=points.map(p=>new THREE.Vector3(...p));
  const lines=new THREE.CurvePath<THREE.Vector3>();
  if(straight)for(let i=1;i<vertices.length;i++)lines.add(new THREE.LineCurve3(vertices[i-1],vertices[i]));
  const curve = straight?lines:new THREE.CatmullRomCurve3(vertices, false, 'centripetal');
  return new THREE.TubeGeometry(curve,segments,radius,radialSegments,false);
}

function roundedLoop(points:number[][],radius:number):THREE.Vector2[] {
  const vertices=points.map(p=>new THREE.Vector2(p[0],p[1]));
  const corners=vertices.map((p,i)=>{
    const previous=vertices[(i+vertices.length-1)%vertices.length],next=vertices[(i+1)%vertices.length];
    return{p,enter:p.clone().add(previous.clone().sub(p).normalize().multiplyScalar(radius)),leave:p.clone().add(next.clone().sub(p).normalize().multiplyScalar(radius))};
  });
  const result:THREE.Vector2[]=[];
  corners.forEach((corner,i)=>{
    const start=corners[(i+corners.length-1)%corners.length].leave;
    for(let j=0;j<8;j++)result.push(start.clone().lerp(corner.enter,j/8));
    const curve=new THREE.QuadraticBezierCurve(corner.enter,corner.p,corner.leave);
    for(let j=0;j<6;j++)result.push(curve.getPoint(j/6));
  });
  return result;
}
function onLoop(loop:THREE.Vector2[],u:number):THREE.Vector2 {
  const index=u*loop.length,i=Math.floor(index)%loop.length;return loop[i].clone().lerp(loop[(i+1)%loop.length],index-Math.floor(index));
}

/** Original, reference-led 2026 concept interpretation. +X nose, +Y roof, Z wheel axles. */
export function createVehicle(): VehicleRig {
  const root = new THREE.Group(); root.name='Roadster-2026';
  const letteringFont=new FontLoader().parse(fontData);
  const sprung = new THREE.Group(); sprung.name='Sprung-body'; root.add(sprung);
  const paint = new THREE.MeshPhysicalMaterial({color:'#d7d8d4',metalness:.32,roughness:.23,clearcoat:1,clearcoatRoughness:.10,envMapIntensity:1.15,side:THREE.DoubleSide});
  const glass = new THREE.MeshPhysicalMaterial({name:'Smoked automotive glazing',color:'#8b7653',metalness:.72,roughness:.085,clearcoat:1,clearcoatRoughness:.07,envMapIntensity:2.8,ior:1.5,specularIntensity:1,transparent:true,opacity:.995,depthWrite:false,side:THREE.FrontSide});
  const carbon = new THREE.MeshStandardMaterial({color:'#101216',metalness:.10,roughness:.40,envMapIntensity:.65,side:THREE.DoubleSide});
  const intakeCarbon=new THREE.MeshStandardMaterial({color:'#080c11',metalness:.16,roughness:.68,envMapIntensity:.3,side:THREE.DoubleSide});
  const black = new THREE.MeshStandardMaterial({color:'#05080b',roughness:.76,side:THREE.DoubleSide});
  const titanium = new THREE.MeshStandardMaterial({color:'#bcc2c6',metalness:.92,roughness:.22});
  const darkMetal = new THREE.MeshStandardMaterial({color:'#171b20',metalness:.72,roughness:.29});
  const rubber = new THREE.MeshStandardMaterial({color:'#111315',metalness:0,roughness:.84});
  const brake = new THREE.MeshStandardMaterial({color:'#b77746',metalness:.8,roughness:.29});
  const headLight = new THREE.MeshStandardMaterial({color:'#eaf6ff',emissive:'#c9e7ff',emissiveIntensity:2.2,toneMapped:false});
  const lampLED=headLight.clone();lampLED.name='Headlamp LED emitter';
  const lampReflector=new THREE.MeshStandardMaterial({name:'Headlamp polished reflectors',color:'#cbd3dc',metalness:.92,roughness:.16,envMapIntensity:1.4,side:THREE.DoubleSide});
  const lampLens=new THREE.MeshPhysicalMaterial({name:'Clear headlamp lens',color:'#e6f3ff',metalness:0,roughness:.045,clearcoat:1,clearcoatRoughness:.025,ior:1.49,transparent:true,opacity:.16,depthWrite:false,side:THREE.FrontSide});
  const tailLight = new THREE.MeshStandardMaterial({color:'#c80e14',emissive:'#ff1019',emissiveIntensity:1.4,toneMapped:false});
  const cyan = new THREE.MeshStandardMaterial({color:'#293b45',emissive:'#4dd4f4',emissiveIntensity:.08,toneMapped:false});
  const nozzleGlow = new THREE.MeshStandardMaterial({color:'#2b2929',emissive:'#dce9ed',emissiveIntensity:0});
  const paintTrim=paint.clone();paintTrim.polygonOffset=true;paintTrim.polygonOffsetFactor=-1;paintTrim.polygonOffsetUnits=-1;paintTrim.userData.detailOverlay=true;
  const seamTrim=black.clone();seamTrim.polygonOffset=true;seamTrim.polygonOffsetFactor=-1;seamTrim.polygonOffsetUnits=-1;seamTrim.userData.detailOverlay=true;
  const allMaterials = [paint,paintTrim,seamTrim,glass,carbon,intakeCarbon,black,titanium,darkMetal,rubber,brake,headLight,lampLED,lampReflector,lampLens,tailLight,cyan,nozzleGlow];
  const geometries = new Set<THREE.BufferGeometry>();

  const mesh = (geometry:THREE.BufferGeometry,material:THREE.Material,parent:THREE.Object3D=sprung,name='') => {
    geometries.add(geometry);
    const m = new THREE.Mesh(geometry,material); m.name=name;
    // A transparent canopy must not become an opaque blocker in the raster shadow map.
    m.castShadow=!material.userData.detailOverlay&&material!==glass&&material!==lampLens;m.receiveShadow=!material.userData.detailOverlay&&material!==glass&&material!==lampLens;parent.add(m);return m;
  };
  const bar = (a:THREE.Vector3,b:THREE.Vector3,r:number,material:THREE.Material,parent:THREE.Object3D=sprung) => {
    const m=mesh(new THREE.CylinderGeometry(r,r,a.distanceTo(b),8),material,parent);
    m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());return m;
  };
  const ring = (r:number,t:number,material:THREE.Material,parent:THREE.Object3D=sprung) => mesh(new THREE.TorusGeometry(r,t,6,56),material,parent);
  const orient=(geometry:THREE.BufferGeometry,direction:THREE.Vector3)=>{
    const normal=geometry.getAttribute('normal');let dot=0;
    for(let i=0;i<normal.count;i++)dot+=normal.getX(i)*direction.x+normal.getY(i)*direction.y+normal.getZ(i)*direction.z;
    if(dot<0){const index=geometry.index!;for(let i=0;i<index.count;i+=3){const j=index.getX(i+1);index.setX(i+1,index.getX(i+2));index.setX(i+2,j);}geometry.computeVertexNormals();}
    return geometry;
  };
  const skin=(geometry:THREE.BufferGeometry,material:THREE.Material,name='',normal=new THREE.Vector3(0,1,0))=>mesh(orient(geometry,normal),material,sprung,name);
  const profile=(data:number[][],x:number)=>{
    let i=0;while(i<data.length-2&&data[i+1][0]<x)i++;
    const t=clamp((x-data[i][0])/(data[i+1][0]-data[i][0]),0,1);
    return THREE.MathUtils.lerp(data[i][1],data[i+1][1],t);
  };
  const rocker=(x:number)=>profile([[-2.47,.105],[-2.10,-.09],[-1.96,-.21],[-1.05,-.28],[-.30,-.365],[.85,-.415],[1.95,-.37],[2.18,-.345]],x);
  const archRadius=.425;
  const archBottom=(x:number)=>{
    const d=Math.min(Math.abs(x-axle),Math.abs(x+axle));
    return Math.max(rocker(x),d<archRadius?wheelY+Math.sqrt(Math.max(0,archRadius*archRadius-d*d)):-1);
  };
  const sidePoint=(x:number,y:number,side:number,offset=0)=>{
    const s=sectionAt(x),depth=clamp((s[3]-y)/(s[3]+.44),0,1);
    // Fixed-depth sectioning avoids the reflection ripples caused by normalizing to each arch.
    return new THREE.Vector3(x,y,side*(s[1]-.085*depth+offset));
  };
  const roofAt=cubicSections([
    [-2.08,.265,.381,0],[-1.72,.35,.435,0],[-1.12,.475,.535,0],
    [-.55,.565,.602,0],[-.12,.605,.613,0],[.32,.655,.566,0],
    [.86,.72,.416,0],[1.43,.785,.231,0],
  ]);
  const roofPoint=(x:number,t:number,extra=0)=>{
    const r=roofAt(x),camber=.010+Math.sin(clamp((x+2.08)/3.51,0,1)*Math.PI)*.009;
    return new THREE.Vector3(x,r[2]-camber*t*t+extra,r[1]*t);
  };
  // The upper shoulder is a ruled surface between the canopy edge and the body crease.
  // Glazing and painted pillars are trimmed from this same surface, so their edges meet.
  const shoulderPoint=(x:number,f:number,side:number,extra=0)=>{
    const r=roofAt(x),s=sectionAt(x),edge=roofPoint(x,side),z=THREE.MathUtils.lerp(r[1],s[1],f);
    return new THREE.Vector3(x,THREE.MathUtils.lerp(edge.y,s[3],f)+Math.sin(f*Math.PI)*.006+extra,side*z);
  };
  const windowRear=-1.27,windowFront=.82,windowLength=windowFront-windowRear;
  const upperWindowAt=cubicSections([[-1.27,.12,0,0],[-1.15,.035,0,0],[-.80,.025,0,0],[-.30,.025,0,0],[.34,.025,0,0],[.82,.94,0,0]]);
  const lowerWindowHeight=cubicSections([[-1.27,.49,0,0],[-1.10,.425,0,0],[-.80,.37,0,0],[-.30,.32,0,0],[.30,.25,0,0],[.82,.20,0,0]]);
  const upperWindow=(x:number)=>x>.34?THREE.MathUtils.lerp(.025,.94,clamp((x-.34)/.48,0,1)):clamp(upperWindowAt(x)[1],.025,.94);
  const lowerWindow=(x:number)=>{
    const edge=roofPoint(x,1).y,shoulder=sectionAt(x)[3];
    return clamp((edge-lowerWindowHeight(x)[1])/Math.max(.001,edge-shoulder),upperWindow(x),.97);
  };
  // One central glazing skin with real roof seals. The side panes are distinct geometry.
  skin(gridGeometry(140,48,(u,v)=>roofPoint(-2.08+3.51*u,v*2-1,.002)),glass,'Bronze-aircraft-canopy');
  for(const x of [-.55,.32]){
    const seal=Array.from({length:25},(_,i)=>{const p=roofPoint(x,i/12-1,.004);return[p.x,p.y,p.z];});
    mesh(tube(seal,.0018,32,5),seamTrim);
  }
  for(const side of [-1,1]){
    const facing=new THREE.Vector3(0,.3,side);
    const patch=(start:number,end:number,low:(x:number)=>number,high:(x:number)=>number,material:THREE.Material,name='')=>
      skin(gridGeometry(Math.max(8,Math.ceil((end-start)*50)),12,(u,v)=>{const x=THREE.MathUtils.lerp(start,end,u);return shoulderPoint(x,THREE.MathUtils.lerp(low(x),high(x),v),side,material===glass?.002:0);}),material,name,facing);
    patch(-2.08,windowRear,()=>0,()=>1,paint);
    patch(windowFront,1.43,()=>0,()=>1,paint);
    patch(windowRear,windowFront,()=>0,upperWindow,paint);
    patch(windowRear,windowFront,lowerWindow,()=>1,paint);
    patch(windowRear,windowFront,upperWindow,lowerWindow,glass,side>0?'Port-side-glazing':'Starboard-side-glazing');
    // Narrow gaskets are attached to the actual trim boundary, not laid across the roof.
    for(const boundary of [upperWindow,lowerWindow]){
      const pts=Array.from({length:97},(_,i)=>{const x=windowRear+windowLength*i/96,p=shoulderPoint(x,boundary(x),side,.003);return[p.x,p.y,p.z];});
      mesh(tube(pts,.0015,96,5,true),seamTrim);
    }
    // B-pillar and front quarter-glass seal follow the same window section.
    for(const x of [-.64,.65]){
      skin(gridGeometry(3,20,(u,v)=>{
        const px=x+(u-.5)*.008+(v-.5)*.045;
        return shoulderPoint(px,THREE.MathUtils.lerp(upperWindow(px),lowerWindow(px),v),side,.004);
      }),seamTrim,'',facing);
    }
    // True open arches and gently tucked slab sides. No decorative raised fender bead.
    skin(gridGeometry(240,18,(u,v)=>{
      const x=-2.47+4.65*u,s=sectionAt(x);
      return sidePoint(x,THREE.MathUtils.lerp(s[3]-.006,archBottom(x),v),side);
    }),paint,side>0?'Port-sculpted-side':'Starboard-sculpted-side',new THREE.Vector3(0,0,side));
    skin(gridGeometry(180,3,(u,v)=>{
      const x=-2.47+4.65*u,s=sectionAt(x);return sidePoint(x,s[3]-.006*v,side,.001*Math.sin(v*Math.PI));
    }),paint,'',facing);
    for(const axleX of [-axle,axle]){
      skin(gridGeometry(72,6,(u,v)=>{
        const a=u*Math.PI,x=axleX+Math.cos(a)*(archRadius+.002),y=wheelY+Math.sin(a)*(archRadius+.002);
        const p=sidePoint(x,y,side);p.z-=side*v*.17;return p;
      }),black,'',facing);
      skin(gridGeometry(72,3,(u,v)=>{
        const a=u*Math.PI,r=archRadius+.002+v*.009,x=axleX+Math.cos(a)*r,y=wheelY+Math.sin(a)*r;
        return sidePoint(x,y,side,.001);
      }),paintTrim,'',facing);
      const innerWell=mesh(new THREE.CircleGeometry(archRadius+.012,96),black);innerWell.position.set(axleX,wheelY,side*.73);if(side<0)innerWell.rotation.y=Math.PI;
    }
    // Closed rocker volume masks the underside structure from exterior viewing angles.
    const sillOutline:number[][]=[];
    for(let i=0;i<=40;i++){const x=-1.11+2.20*i/40;sillOutline.push([x,rocker(x)-.006]);}
    sillOutline.push([1.09,-.502],[-1.11,-.502]);
    const sill=mesh(panel(sillOutline,.05),carbon);sill.position.z=side>0?.915:-.965;
    const seamPoints=[[.98,.205],[.967,.10],[.925,-.12],[.87,-.396],[.83,-.412],[-.48,-.35],[-.53,-.32],[-.60,-.03],[-.70,.297]].map(([x,y])=>{
      const p=sidePoint(x,y,side,.0015);return[p.x,p.y,p.z];
    });
    mesh(tube(seamPoints,.0016,100,5,true),seamTrim);
    // A tiny flush handle and amber marker replace the old floating intake-shaped trim.
    skin(gridGeometry(10,3,(u,v)=>sidePoint(-.67+.095*u,.269+.013*v,side,.0017)),paintTrim,'',facing);
    skin(gridGeometry(8,3,(u,v)=>sidePoint(1.005+.27*u,.115+.035*v+.017*u,side,.0015)),black,'',facing);
    skin(gridGeometry(6,3,(u,v)=>sidePoint(1.18+.075*u,.128+.019*v+.006*u,side,.0025)),brake,'',facing);
    // Rear quarter shut line and the small red reflector above the dark diffuser return.
    const rearSeam=[[-2.20,.362],[-2.18,.22],[-2.12,.015]].map(([x,y])=>{const p=sidePoint(x,y,side,.0015);return[p.x,p.y,p.z];});
    mesh(tube(rearSeam,.0016,22,5,true),seamTrim);
    skin(gridGeometry(8,2,(u,v)=>sidePoint(-2.135+.065*u,-.012+.012*v,side,.003)),tailLight,'',facing);
  }
  // The glass covers a dark cabin rather than an exposed white top plate.
  mesh(gridGeometry(56,12,(u,v)=>{const x=-1.97+3.30*u,r=roofAt(x);return new THREE.Vector3(x,sectionAt(x)[2]-.018,(v*2-1)*r[1]*.98);}),black);
  for(const z of [-.29,.29]){
    const back=mesh(panel([[-.55,.27],[-.59,.43],[-.48,.51],[-.38,.49],[-.32,.27]],.21),black);back.position.z=z-.105;
    const seat=mesh(panel([[-.48,.255],[.04,.255],[.045,.29],[-.40,.315]],.21),black);seat.position.z=z-.105;
  }
  mesh(gridGeometry(24,8,(u,v)=>new THREE.Vector3(.49+.24*v,.27+.035*Math.sin(v*Math.PI),(u*2-1)*.57)),carbon);
  const steering=ring(.075,.009,darkMetal);steering.rotation.y=Math.PI/2;steering.position.set(.42,.36,-.29);

  const hoodHeight=(x:number)=>profile([[1.43,.231],[1.80,.165],[2.15,.060],[2.47,-.065]],x);
  const hoodPoint=(u:number,t:number)=>{
    const nose=2.47-.30*Math.pow(Math.abs(t),8),x=THREE.MathUtils.lerp(1.43,nose,u);
    const section=sectionAt(Math.min(2.18,x)),width=section[1],z=t*width;
    const crease=THREE.MathUtils.lerp(.785,.735,u),outer=clamp((Math.abs(z)-crease)/(width-crease),0,1);
    const inner=hoodHeight(x)-.010*Math.min(1,z*z/(crease*crease))*(1-u);
    return new THREE.Vector3(x,THREE.MathUtils.lerp(inner,section[3],outer)+Math.sin(u*Math.PI)*.002*(1-t*t),z);
  };
  const headlamps:THREE.Group[]=[];
  // The deployed light opening occupies the forward end of each outer fender.
  // These UV boundaries are shared by the painted cutout, gasket and complete lamp shell.
  const lampRear=.66,lampTip=.985,lampInner=.025,lampOuter=.94;
  const triangleGeometry=(sample:(a:number,b:number)=>THREE.Vector3,steps=24)=>{
    const positions:number[]=[],uv:number[]=[],indices:number[]=[],rows:number[]=[];
    for(let i=0;i<=steps;i++){
      rows.push(positions.length/3);
      for(let j=0;j<=steps-i;j++){
        const a=i/steps,b=j/steps,p=sample(a,b);positions.push(p.x,p.y,p.z);uv.push(a,b);
      }
    }
    for(let i=0;i<steps;i++)for(let j=0;j<steps-i;j++){
      const a=rows[i]+j,b=rows[i+1]+j;indices.push(a,b,a+1);
      if(j<steps-i-1)indices.push(b,b+1,a+1);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
  };
  // Separate hood centre and outer fender patches retain the visible fold in the reflections.
  for(const side of [-1,1]){
    skin(gridGeometry(90,22,(u,v)=>hoodPoint(u,side*v*(.785-.05*u)/(1.057-.047*u))),paint,'',new THREE.Vector3(0,1,0));
    const fenderPoint=(u:number,v:number)=>{
      const split=(.785-.05*u)/(1.057-.047*u);return hoodPoint(u,side*THREE.MathUtils.lerp(split,1,v));
    };
    // Four continuous patches surround a true triangular hole. No painted surface remains
    // behind the transparent lens or crosses the reflectors, even from a high viewing angle.
    skin(gridGeometry(60,14,(u,v)=>fenderPoint(lampRear*u,v)),paint);
    skin(gridGeometry(3,14,(u,v)=>fenderPoint(THREE.MathUtils.lerp(lampTip,1,u),v)),paint);
    skin(gridGeometry(30,2,(u,v)=>fenderPoint(THREE.MathUtils.lerp(lampRear,lampTip,u),v*lampInner)),paint);
    skin(gridGeometry(30,14,(u,v)=>fenderPoint(THREE.MathUtils.lerp(lampRear,lampTip,u),THREE.MathUtils.lerp(THREE.MathUtils.lerp(lampOuter,lampInner,u),1,v))),paint);
    const cut=Array.from({length:65},(_,i)=>{const u=i/64,p=hoodPoint(u,side*(.785-.05*u)/(1.057-.047*u));return[p.x,p.y+.001,p.z];});
    mesh(tube(cut,.00135,72,5,true),seamTrim);
    const lamp=new THREE.Group();lamp.name=side>0?'Headlamp-port':'Headlamp-starboard';sprung.add(lamp);headlamps.push(lamp);
    const lampPoint=(a:number,b:number,inset=0,depth=0)=>{
      a=inset/3+(1-inset)*a;b=inset/3+(1-inset)*b;
      const p=fenderPoint(THREE.MathUtils.lerp(lampRear,lampTip,a),THREE.MathUtils.lerp(lampInner,lampOuter,b));
      p.y-=depth*(1-.86*a);return p;
    };
    const perimeter=(u:number)=>{
      const edge=Math.min(2,Math.floor(u*3)),t=u===1?1:u*3-edge;
      return edge===0?[0,t]:edge===1?[t,1-t]:[1-t,0];
    };
    mesh(orient(triangleGeometry((a,b)=>lampPoint(a,b,.035,.043)),new THREE.Vector3(0,1,0)),black,lamp,'Headlamp-recess-floor');
    mesh(gridGeometry(96,5,(u,v)=>{
      const [a,b]=perimeter(u);return lampPoint(a,b,.035*v,.043*v+.0005);
    }),black,lamp,'Headlamp-recess-walls');
    const gasket=Array.from({length:97},(_,i)=>{const[a,b]=perimeter(i/96);return lampPoint(a,b,0,-.0003).toArray();});
    mesh(tube(gasket,.0017,96,6,true),black,lamp);
    // Seven individually scalloped reflector cells sit below the glass, with small vertical
    // LED faces pointing forwards and upwards under the rear lip, as in the deployed photo.
    for(let cell=0;cell<7;cell++){
      const across=.105+cell*.12,reach=Math.min(.21,(1-across-.055)*.78);
      mesh(orient(gridGeometry(8,12,(u,v)=>{
        const a=.035+reach*v,b=across+(u-.5)*.096;
        const p=lampPoint(a,b);p.y-=.010+.020*Math.sin(u*Math.PI)*Math.sin(v*Math.PI);return p;
      }),new THREE.Vector3(.25,1,0)),lampReflector,lamp);
      mesh(orient(gridGeometry(3,6,(u,v)=>{
        const a=.042+Math.min(.09,reach*.62)*v,b=across+(u-.5)*.047;
        const p=lampPoint(a,b);p.y-=.006+.018*v;return p;
      }),new THREE.Vector3(.7,1,0)),lampLED,lamp);
    }
    const rail=Array.from({length:33},(_,i)=>lampPoint(.022,.055+i/32*.845,0,.006).toArray());
    mesh(tube(rail,.0026,32,8,true),lampLED,lamp);
    const lens=mesh(orient(triangleGeometry((a,b)=>lampPoint(a,b,.045,.0028)),new THREE.Vector3(0,1,0)),lampLens,lamp,'Headlamp-lens');
    lens.renderOrder=2;
    // Substantial white bumper cheeks sweep back in plan; the nose is not a flat box.
    skin(gridGeometry(20,24,(u,v)=>{
      const t=THREE.MathUtils.lerp(.735/1.01,1,u),top=hoodPoint(1,side*t);
      return new THREE.Vector3(top.x,THREE.MathUtils.lerp(top.y,-.345,v),top.z+side*.075*(1-u)*v);
    }),paint,'',new THREE.Vector3(1,0,side*.25));
    skin(gridGeometry(20,5,(u,v)=>{
      const top=hoodPoint(1,side*THREE.MathUtils.lerp(.735/1.01,1,u));
      return new THREE.Vector3(top.x,-.345-.052*v,top.z+side*.075*(1-u)-side*v*.006);
    }),carbon,'',new THREE.Vector3(1,0,side*.3));
  }
  // A sealed satin fascia sits above the lower inlet: these are separate real shapes.
  skin(gridGeometry(72,12,(u,v)=>{
    const t=u*2-1,top=hoodPoint(1,t*.735/1.01),z=t*THREE.MathUtils.lerp(.735,.773,v);
    return new THREE.Vector3(top.x+.003-.030*v,THREE.MathUtils.lerp(top.y-.005,-.185,v),z);
  }),darkMetal,'Closed-front-fascia',new THREE.Vector3(1,0,0));
  const lightEdge=Array.from({length:81},(_,i)=>{const p=hoodPoint(1,(i/40-1)*.735/1.01);return[p.x+.005,p.y-.003,p.z];});
  mesh(tube(lightEdge,.0042,80,8,true),headLight,sprung,'Front-lightbar');
  const inletRim=roundedLoop([[-.773,-.185],[.773,-.185],[.81,-.389],[-.81,-.389]],.016);
  skin(gridGeometry(inletRim.length,8,(u,v)=>{
    const p=onLoop(inletRim,u),scale=1-v*.10;
    return new THREE.Vector3(2.438-v*.29,-.285+(p.y+.285)*scale,p.x*scale);
  }),black,'Front-intake-return-walls',new THREE.Vector3(1,0,0));
  const inletBack=new THREE.ShapeGeometry(new THREE.Shape(inletRim.map(p=>new THREE.Vector2(p.x*.90,-.285+(p.y+.285)*.90))));
  inletBack.rotateY(Math.PI/2);inletBack.translate(2.14,0,0);mesh(inletBack,black);
  // Recessed inlet vanes remain behind the fascia, rather than protruding through it.
  for(const z of [-.56,-.28,0,.28,.56]){
    const vane=mesh(panel([[2.17,-.35],[2.205,-.35],[2.21,-.255],[2.18,-.255]],.007),carbon);vane.position.z=z;
  }
  skin(gridGeometry(16,72,(u,v)=>{
    const t=v*2-1,z=t*1.015,x=2.15+.35*u-.24*Math.pow(Math.abs(t),8);
    return new THREE.Vector3(x,-.402+.012*Math.pow(Math.abs(t),3)+.007*Math.sin(u*Math.PI),z);
  }),carbon,'Front-splitter');
  // Rear deck and tail light recess, with short painted sides and a deep dark lower return.
  skin(gridGeometry(28,40,(u,v)=>{
    const x=-2.47+.39*u,s=sectionAt(x),t=v*2-1;
    return new THREE.Vector3(x,s[2]-.012*Math.pow(Math.abs(t),4),s[1]*t);
  }),paint,'Rear-deck');
  skin(gridGeometry(80,18,(u,v)=>{
    const t=1-u*2,z=t*(1.025-.08*v),y=THREE.MathUtils.lerp(.264,-.095+.065*t*t,v);
    return new THREE.Vector3(-2.465+.075*v*(1-.6*Math.abs(t)),y,z);
  }),carbon,'Sculpted-rear-valance',new THREE.Vector3(-1,0,0));
  skin(gridGeometry(64,20,(u,v)=>new THREE.Vector3(-2.245,-.48+.835*v,(u*2-1)*1.015)),black,'Tail-inner-backing',new THREE.Vector3(-1,0,0));
  skin(gridGeometry(64,4,(u,v)=>new THREE.Vector3(-2.455,.25+.10*v,(u*2-1)*1.018)),black,'',new THREE.Vector3(-1,0,0));
  const channel=roundedLoop([[-1.025,.35],[1.025,.35],[1.015,.25],[-1.015,.25]],.008);
  skin(gridGeometry(channel.length,5,(u,v)=>{
    const p=onLoop(channel,u),t=p.x/1.025;return new THREE.Vector3(-2.48+v*.028,p.y,p.x);
  }),carbon,'',new THREE.Vector3(-1,0,0));
  mesh(tube([[-2.486,.303,-.997],[-2.493,.31,0],[-2.486,.303,.997]],.0052,96,8),tailLight,sprung,'Rear-lightbar');
  // A chamfered license-plate recess breaks up the upper tail plane, as in the photo.
  const plate=mesh(panel([[-.17,-.048],[.17,-.048],[.16,.102],[-.16,.102]],.008),paint);plate.rotation.y=-Math.PI/2;plate.position.set(-2.45,0,0);
  const plateTextGeometry=new TextGeometry('RDSTR',{font:letteringFont,size:.052,depth:.0012,curveSegments:3});
  plateTextGeometry.computeBoundingBox();plateTextGeometry.translate(-plateTextGeometry.boundingBox!.max.x/2,0,0);
  const plateText=mesh(plateTextGeometry,black);plateText.rotation.y=-Math.PI/2;plateText.position.set(-2.461,-.01,0);
  const rearLoop=roundedLoop([[-.80,-.105],[.80,-.105],[.69,-.46],[-.69,-.46]],.042);
  skin(gridGeometry(rearLoop.length,10,(u,v)=>{
    const p=onLoop(rearLoop,u),scale=1-v*.10;
    return new THREE.Vector3(-2.467+v*.23,-.28+(p.y+.28)*scale,p.x*scale);
  }),carbon,'Recessed-rear-diffuser-surround',new THREE.Vector3(-1,0,0));
  const rearBack=new THREE.ShapeGeometry(new THREE.Shape(rearLoop.map(p=>new THREE.Vector2(p.x*.91,-.28+(p.y+.28)*.91))));
  rearBack.rotateY(-Math.PI/2);rearBack.translate(-2.22,0,0);mesh(rearBack,black);
  for(const side of [-1,1]){
    skin(gridGeometry(32,14,(u,v)=>{
      const x=-2.47+.48*u,s=sectionAt(x),y=THREE.MathUtils.lerp(rocker(x)-.004,-.475,v);
      return new THREE.Vector3(x,y,side*(s[1]-.055-.045*v));
    }),carbon,'',new THREE.Vector3(0,0,side));
  }

  const trayShape=new THREE.Shape([[-2.43,-.86],[-1.92,-.94],[1.83,-.91],[2.10,-.78],[2.10,.78],[1.83,.91],[-1.92,.94],[-2.43,.86]].map(p=>new THREE.Vector2(...p)));
  for(const x of [-.68,.65]){const hole=new THREE.Path();hole.absarc(x,0,.438,0,Math.PI*2,true);trayShape.holes.push(hole);}
  const undertray=mesh(new THREE.ExtrudeGeometry(trayShape,{depth:.085,bevelEnabled:true,bevelSize:.009,bevelThickness:.006,bevelSegments:2,curveSegments:28}),carbon,sprung,'Machined-undertray-with-fan-apertures');
  undertray.rotation.x=Math.PI/2;undertray.position.y=-.35;
  // Underbody longitudinal rails, exposed suspension wishbones and diffuser vanes.
  for(const side of [-1,1]) {
    mesh(tube([[-2.2,-.45,side*.68],[-1.15,-.455,side*.84],[.9,-.455,side*.84],[2.2,-.4,side*.65]],.021,30,6),darkMetal);
    for(const x of [-axle,axle]) for(const offset of [-.2,.2]) {
      bar(new THREE.Vector3(x+offset,-.457,side*.60),new THREE.Vector3(x,-.25,side*.98),.018,titanium);
    }
    const bank=mesh(panel([[-1.16,.53],[1.12,.53],[1.16,.79],[-1.2,.79]],.027),darkMetal);bank.rotation.x=Math.PI/2;bank.position.set(0,-.445,side>0?0:-1.32);
    for(let i=0;i<10;i++) {
      const x=-1.02+i*.225;
      bar(new THREE.Vector3(x,-.478,side*.565),new THREE.Vector3(x-.045,-.478,side*.745),.009,black);
    }
    for(const x of [-1.85,-1.2,0,1.2,1.85]) {
      const bolt=mesh(new THREE.CylinderGeometry(.019,.019,.014,6),titanium);bolt.position.set(x,-.473,side*.82);
    }
  }
  for(const x of [-1.21,0,1.19])bar(new THREE.Vector3(x,-.46,-.81),new THREE.Vector3(x,-.46,.81),.019,titanium);
  for(const x of [-1.65,1.65])for(const side of [-1,1])bar(new THREE.Vector3(x,-.457,side*.76),new THREE.Vector3(x+Math.sign(x)*.44,-.457,0),.022,darkMetal);
  for(const z of [-.79,-.51,-.25,0,.25,.51,.79]) {
    const fin=mesh(panel([[-2.44,-.455],[-2.03,-.43],[-1.86,-.42],[-2.2,-.515],[-2.43,-.52]],.018),carbon);
    fin.position.z=z;
  }

  const fans:THREE.Group[]=[];
  for(const x of [-.68,.65]) {
    const ductProfile=[new THREE.Vector2(.437,-.45),new THREE.Vector2(.437,-.405),new THREE.Vector2(.38,-.25),new THREE.Vector2(.35,-.225),new THREE.Vector2(.334,-.24),new THREE.Vector2(.402,-.429),new THREE.Vector2(.414,-.45)];
    const duct=mesh(new THREE.LatheGeometry(ductProfile,64),darkMetal);duct.position.x=x;
    const outer=ring(.433,.015,titanium);outer.rotation.x=Math.PI/2;outer.position.set(x,-.451,0);
    const light=ring(.413,.006,cyan);light.rotation.x=Math.PI/2;light.position.set(x,-.448,0);
    const inner=ring(.346,.012,darkMetal);inner.rotation.x=Math.PI/2;inner.position.set(x,-.237,0);
    const cavity=mesh(new THREE.CylinderGeometry(.347,.347,.018,48),black);cavity.position.set(x,-.213,0);
    const rotor=new THREE.Group();rotor.name=`Suction-rotor-${x<0?'rear':'front'}`;rotor.position.set(x,-.325,0);sprung.add(rotor);fans.push(rotor);
    for(let i=0;i<9;i++) {
      mesh(gridGeometry(14,5,(u,v)=>{
        const r=.074+.295*u,a=i/9*Math.PI*2+u*.38+(v-.5)*(.64-.30*u);
        return new THREE.Vector3(Math.cos(a)*r,Math.sin(v*Math.PI)*.018+u*.017+(v-.5)*.035,Math.sin(a)*r);
      }),titanium,rotor);
    }
    const hub=mesh(new THREE.CylinderGeometry(.062,.087,.075,24),darkMetal,rotor);hub.position.y=-.012;
    for(let i=0;i<4;i++) {
      const a=i*Math.PI/2;
      bar(new THREE.Vector3(x+Math.cos(a)*.06,-.458,Math.sin(a)*.06),new THREE.Vector3(x+Math.cos(a)*.43,-.458,Math.sin(a)*.43),.008,carbon);
    }
    for(let i=0;i<12;i++) {
      const bolt=mesh(new THREE.SphereGeometry(.012,5,4),titanium);const a=i/12*Math.PI*2;
      bolt.position.set(x+Math.cos(a)*.434,-.456,Math.sin(a)*.434);
    }
  }

  // Active rear aerofoil is an actual cambered surface, mounted on articulated struts.
  const wing=new THREE.Group();wing.name='Active-rear-wing';wing.position.set(-2.285,wingRestY,0);sprung.add(wing);
  const foil=mesh(gridGeometry(16,40,(u,v)=>{
    const x=-.185+u*.37,z=(v*2-1)*1.045;
    return new THREE.Vector3(x,.014+u*.030+Math.sin(u*Math.PI)*.004+Math.pow(Math.abs(v*2-1),3)*.003,z);
  }),paint,wing);
  foil.name='Cambered-aerofoil';
  mesh(tube([[-.182,.012,-1.045],[-.19,.012,0],[-.182,.012,1.045]],.003,32,5),carbon,wing);
  for(const z of [-1.05,1.038]){
    const end=mesh(panel([[-.185,.014],[.185,.044],[.13,-.065],[-.16,-.035]],.012),paint,wing);end.position.z=z;
  }
  const wingStruts:THREE.Mesh[]=[];
  for(const z of [-.53,.53]) {
    const strut=mesh(new THREE.CylinderGeometry(.019,.026,.05,8),darkMetal,sprung,'Articulated-wing-strut');strut.position.set(-2.285,wingRestY-.025,z);strut.visible=false;wingStruts.push(strut);
  }

  // Four rear outlets and four downward underbody lift outlets.
  const nozzles:THREE.Group[]=[];
  const rearBank=new THREE.Group();rearBank.name='Rear-vectored-nozzle-bank';rearBank.position.set(REAR_NOZZLE_X+.04,-.18,0);sprung.add(rearBank);nozzles.push(rearBank);
  const liftBank=new THREE.Group();liftBank.name='Underbody-vectored-nozzle-bank';liftBank.position.y=-.39;liftBank.visible=false;sprung.add(liftBank);nozzles.push(liftBank);
  for(const z of REAR_NOZZLE_Z) {
    const nozzle=new THREE.Group();nozzle.position.z=z;rearBank.add(nozzle);
    const profile=[new THREE.Vector2(.033,-.055),new THREE.Vector2(.033,.008),new THREE.Vector2(.049,.036),new THREE.Vector2(.054,.040),new THREE.Vector2(.053,.025),new THREE.Vector2(.039,-.055)];
    const bell=mesh(new THREE.LatheGeometry(profile,28),darkMetal,nozzle);bell.rotation.z=Math.PI/2;
    const lip=ring(.051,.0025,brake,nozzle);lip.rotation.y=Math.PI/2;lip.position.x=-.04;
    const throat=mesh(new THREE.CircleGeometry(.033,32),nozzleGlow,nozzle);throat.rotation.y=-Math.PI/2;throat.position.x=.05;
  }
  for(const x of LIFT_NOZZLE_X) for(const z of LIFT_NOZZLE_Z) {
    const nozzle=new THREE.Group();nozzle.position.set(x,0,z);liftBank.add(nozzle);
    const bell=mesh(new THREE.CylinderGeometry(.055,.093,.1,20,1,true),darkMetal,nozzle);bell.position.y=-.035;
    const lip=ring(.09,.008,titanium,nozzle);lip.rotation.x=Math.PI/2;lip.position.y=-.085;
    const throat=mesh(new THREE.CircleGeometry(.054,16),nozzleGlow,nozzle);throat.rotation.x=Math.PI/2;throat.position.y=-.01;
  }

  // Concealed attitude outlets are visible only while their corresponding jet is active.
  const attitudePorts:THREE.Group[]=[];
  for(const p of ATTITUDE_UP_PORTS){
    const port=new THREE.Group();port.name='Upper-attitude-nozzle';port.position.set(p.x,p.y,p.z);port.visible=false;sprung.add(port);attitudePorts.push(port);
    // Flush dark hatch and machined lip replace the exposed cups on the painted hood.
    const bell=mesh(new THREE.CylinderGeometry(.049,.035,.035,16,1,true),darkMetal,port);bell.position.y=-.016;
    const lip=ring(.048,.0025,darkMetal,port);lip.rotation.x=Math.PI/2;lip.position.y=.001;
    const throat=mesh(new THREE.CircleGeometry(.045,16),black,port);throat.rotation.x=-Math.PI/2;throat.position.y=.001;
  }

  // Independent wheels; visual suspension does not move the collision body or hide wheel contact.
  const wheels: { mount:THREE.Group;spin:THREE.Group;x:number;side:number }[]=[];
  const tireProfile=[new THREE.Vector2(.333,-.105),new THREE.Vector2(.354,-.115),new THREE.Vector2(.378,-.108),new THREE.Vector2(.392,-.073),new THREE.Vector2(.395,0),new THREE.Vector2(.392,.073),new THREE.Vector2(.378,.108),new THREE.Vector2(.354,.115),new THREE.Vector2(.333,.105)];
  const polar=(r:number,a:number,z:number)=>new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,z);
  for(const x of [-axle,axle])for(const side of [-1,1]){
    const mount=new THREE.Group();mount.name=`Wheel-${x>0?'front':'rear'}-${side>0?'port':'starboard'}`;mount.position.set(x,wheelY,side*wheelZ);root.add(mount);
    const spin=new THREE.Group();mount.add(spin);wheels.push({mount,spin,x,side});
    const tire=mesh(new THREE.LatheGeometry(tireProfile,112),rubber,spin);tire.rotation.x=Math.PI/2;
    for(const z of [-.049,0,.049]){const groove=ring(.394,.0020,black,spin);groove.position.z=z;}
    for(const r of [.347,.359,.382]){const bead=ring(r,.0012,rubber,spin);bead.position.z=side*.111;}
    // Fine diagonal sipes end before the sidewall, leaving a clean molded shoulder.
    for(let i=0;i<72;i++){
      const a=i/72*Math.PI*2,pts:number[][]=[];
      for(let j=0;j<7;j++){const z=-.09+j*.03,ang=a+(j-3)*.012,r=.395-.009*Math.pow(z/.105,4);pts.push([Math.cos(ang)*r,Math.sin(ang)*r,z]);}
      mesh(tube(pts,.00125,8,4),black,spin);
    }
    const rotor=mesh(new THREE.CylinderGeometry(.279,.279,.012,80),darkMetal,mount);rotor.rotation.x=Math.PI/2;rotor.position.z=side*.038;
    const rotorInner=ring(.204,.003,darkMetal,mount);rotorInner.position.z=side*.046;
    for(let row=0;row<3;row++)for(let i=0;i<32;i++){
      const a=i/32*Math.PI*2+row*.065,r=.221+row*.019;
      const hole=mesh(new THREE.CircleGeometry(.004,7),black,mount);hole.position.set(Math.cos(a)*r,Math.sin(a)*r,side*.045);if(side<0)hole.rotation.y=Math.PI;
    }
    const caliper=mesh(panel([[-.030,-.105],[.036,-.095],[.048,.075],[.018,.115],[-.045,.095]],.045),brake,mount);caliper.position.set(-.225,0,side>0?.028:-.073);
    const barrel=mesh(new THREE.CylinderGeometry(.337,.337,.17,96,1,true),darkMetal,spin);barrel.rotation.x=Math.PI/2;
    for(const [r,t,mat] of [[.337,.005,titanium],[.327,.003,darkMetal],[.304,.0015,titanium]] as [number,number,THREE.Material][]){
      const rim=ring(r,t,mat,spin);rim.position.z=side*.108;
    }
    for(let i=0;i<5;i++){
      const a=i/5*Math.PI*2+Math.PI/2,step=Math.PI*2/5;
      // Sculpted silver infill between the black Y spokes has an actual dish and folded lip.
      const blade=mesh(gridGeometry(18,18,(u,v)=>{
        const r=.085+.244*u,lo=.16+.16*(1-u),hi=step-.16-.05*(1-u),angle=a+THREE.MathUtils.lerp(lo,hi,v);
        const depth=.096+.015*u+.003*Math.abs(v-.5)*2;
        return polar(r,angle*side,side*depth);
      }),titanium,spin);
      // Front faces of the opposite wheel must be reversed after mirroring.
      orient(blade.geometry,new THREE.Vector3(0,0,side));
      const spoke=mesh(panel([[.055,-.013],[.325,-.014],[.332,.012],[.055,.014]],.012),darkMetal,spin);
      spoke.rotation.z=a*side;spoke.scale.y=side;spoke.position.z=side>0?.108:-.120;
      for(const delta of [-.14,.14]){
        const p=polar(.175,a,0),q=polar(.328,a+delta,0),d=q.clone().sub(p).normalize(),n=new THREE.Vector3(-d.y,d.x,0).multiplyScalar(.011);
        const points=[p.clone().add(n),q.clone().add(n),q.clone().sub(n),p.clone().sub(n)].map(v=>[v.x,v.y]);
        const fork=mesh(panel(points,.011),darkMetal,spin);fork.scale.y=side;fork.position.z=side>0?.108:-.119;
        const lip=[p.clone().addScaledVector(n,1.1),q.clone().addScaledVector(n,1.1)].map(v=>[v.x,v.y*side,side*.122]);
        mesh(tube(lip,.0011,4,4,true),titanium,spin);
      }
    }
    const hub=mesh(new THREE.CylinderGeometry(.060,.064,.018,32),darkMetal,spin);hub.rotation.x=Math.PI/2;hub.position.z=side*.118;
    const cap=mesh(new THREE.CylinderGeometry(.032,.034,.021,32),darkMetal,spin);cap.rotation.x=Math.PI/2;cap.position.z=side*.122;
    for(let i=0;i<5;i++){
      const a=i/5*Math.PI*2,bolt=mesh(new THREE.CylinderGeometry(.005,.005,.005,6),titanium,spin);bolt.rotation.x=Math.PI/2;bolt.position.copy(polar(.047,a,side*.132));
    }
    // Raised sidewall lettering is real geometry and survives the portable GLB export.
    const word='MICHELIN';
    for(let i=0;i<word.length;i++){
      const a=Math.PI*.67+i*.046,g=new TextGeometry(word[i],{font:letteringFont,size:.014,depth:.00055,curveSegments:2});
      const letter=mesh(g,rubber,spin);letter.position.copy(polar(.367,a,side*.114));letter.rotation.set(0,side>0?0:Math.PI,(a-Math.PI/2)*side);
    }
    for(let i=0;i<24;i++){
      const a=i/24*Math.PI*2,mark=mesh(new THREE.BoxGeometry(.006,.001,.0008),rubber,spin);mark.position.copy(polar(.371,a,side*.114));mark.rotation.z=a;
    }
  }

  // Static material batches keep the detailed model affordable on a phone GPU.
  // Dynamic pivots and individually named hero surfaces remain intact for animation/inspection.
  const batch=(parent:THREE.Object3D) => {
    const bins=new Map<THREE.Material,THREE.Mesh[]>();
    for(const child of [...parent.children]) if(child instanceof THREE.Mesh&&!child.name&&!Array.isArray(child.material)){
      const list=bins.get(child.material)||[];list.push(child);bins.set(child.material,list);
    }
    for(const [material,list] of bins) {
      if(list.length<2)continue;
      const parts=list.map(m=>{
        m.updateMatrix();let g=m.geometry.clone();if(g.index)g=g.toNonIndexed();
        g.applyMatrix4(m.matrix);g.deleteAttribute('uv');return g;
      });
      const combined=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());
      if(!combined)continue;
      list.forEach(m=>parent.remove(m));mesh(combined,material,parent,`Batch-${material.uuid.slice(0,6)}`);
    }
  };
  // Flatten the meshes into each nozzle bank before material batching. Each bank has one
  // articulation pivot, avoiding a separate draw call per tiny nozzle component.
  for(const bank of nozzles) {
    for(const child of [...bank.children]) {
      child.updateMatrix();
      for(const part of [...child.children]) if(part instanceof THREE.Mesh) {
        part.updateMatrix();part.geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(child.matrix,part.matrix));
        part.position.set(0,0,0);part.rotation.set(0,0,0);part.scale.set(1,1,1);bank.add(part);
      }
      bank.remove(child);
    }
    batch(bank);
  }
  for(const lamp of headlamps){
    batch(lamp);
    for(const child of lamp.children)if(child instanceof THREE.Mesh){
      if(child.material===lampLED)child.name='Headlamp-LED-array';
      if(child.material===lampReflector)child.name='Headlamp-reflectors';
    }
  }
  batch(sprung);for(const w of wheels){batch(w.spin);batch(w.mount);}for(const f of fans)batch(f);batch(wing);

  let lastV=0,roll=0,wingLift=0,bodyPitch=0,bodyHeave=0;
  return {
    group:root,
    update(state,dt) {
      const step=clamp(dt,0,.05),speed=state.vx*Math.cos(state.angle)+state.vy*Math.sin(state.angle);
      roll-=speed*step/tireRadius;
      const acceleration=step>.0001?clamp((speed-lastV)/step,-40,40):0;lastV=speed;
      const brakeAmount=clamp(-acceleration/18,0,1);
      const targetPitch=state.grounded?clamp(-acceleration*.00065,-.023,.023):0;
      bodyPitch=THREE.MathUtils.damp(bodyPitch,targetPitch,9,step);
      const compression=(state.suspension[0]+state.suspension[1])*.5;
      bodyHeave=THREE.MathUtils.damp(bodyHeave,state.grounded?clamp(-compression*.14,-.045,.03):0,12,step);
      sprung.rotation.z=bodyPitch;sprung.position.y=bodyHeave;
      // Nearly imperceptible high-speed vibration, derived from road speed and actual grounded state.
      if(state.grounded&&Math.abs(speed)>24)sprung.position.y+=Math.sin(state.time*91)*Math.min(.003,Math.abs(speed)*.00006);
      for(const w of wheels) {
        w.spin.rotation.z=roll;
        const amount=state.suspension[w.x>0?1:0];
        // Rapier ray suspension: axleY - (restLength - radius) + compression * travel.
        w.mount.position.y=clamp(-.457+amount*.20,-.472,-.267);
      }
      const targetLift=brakeAmount>.25?.28:state.mode==='airborne'?.24:clamp((Math.abs(speed)-12)/45,0,.22);
      wingLift=THREE.MathUtils.damp(wingLift,targetLift,7,step);wing.position.y=wingRestY+wingLift;
      wing.rotation.z=THREE.MathUtils.damp(wing.rotation.z,brakeAmount*.52+(!state.grounded?.10:.02),8,step);
      wingStruts.forEach(s=>{s.scale.y=1+wingLift/.05;s.position.y=wingRestY-.025+wingLift*.5;s.visible=wingLift>.025;});
      cyan.emissiveIntensity=state.suction?(state.mode==='adhered'?2.6:1.15):.08;
      cyan.color.set(state.suction?'#58c4db':'#293b45');
      for(const f of fans) f.rotation.y+=(state.suction?75:0)*step;
      nozzleGlow.emissiveIntensity=state.thrusting||state.boosting?.25:0;
      liftBank.visible=state.thrusting||(!state.grounded&&['airborne','overturned'].includes(state.mode)&&Math.abs(state.pitchInput)>.05);
      for(const port of attitudePorts)port.visible=!state.grounded&&['airborne','overturned'].includes(state.mode)&&Math.abs(state.pitchInput)>.05&&((port.position.x<0)===(state.pitchInput>0));
      for(let i=0;i<nozzles.length;i++){
        const target=0; // Fixed local axes match the gameplay force and exhaust direction.
        nozzles[i].rotation.z=THREE.MathUtils.damp(nozzles[i].rotation.z,target,15,step);
      }
      tailLight.emissiveIntensity=brakeAmount>.15?3.4:1.3;
    },
    reset() {
      lastV=0;roll=0;wingLift=0;bodyPitch=0;bodyHeave=0;
      sprung.position.set(0,0,0);sprung.rotation.set(0,0,0);
      for(const w of wheels){w.mount.position.y=wheelY;w.spin.rotation.z=0;}
      wing.position.y=wingRestY;wing.rotation.z=0;
      wingStruts.forEach(s=>{s.scale.y=1;s.position.y=wingRestY-.025;s.visible=false;});
      fans.forEach(f=>{f.rotation.y=0;});nozzles.forEach(n=>{n.rotation.z=0;});attitudePorts.forEach(p=>{p.visible=false;});liftBank.visible=false;
      cyan.emissiveIntensity=.08;cyan.color.set('#293b45');nozzleGlow.emissiveIntensity=0;tailLight.emissiveIntensity=1.3;
    },
    dispose() {
      geometries.forEach(g=>g.dispose());allMaterials.forEach(m=>m.dispose());root.clear();
    },
  };
}
