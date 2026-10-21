import {translate} from '../game/i18n';
import type {Language} from '../game/i18n';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createVehicle } from './vehicle';
import { createEnvironment } from './environment';
import { Effects } from './effects';
import { atmosphereFor } from './scene/biomes/atmosphere';
import type { GameSnapshot, Level, Quality } from '../game/types';

export type VehicleView='hero'|'front'|'side'|'rear'|'top'|'bottom';
export class GameRenderer {
  renderer:THREE.WebGLRenderer;scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(37,1,.15,1300);car=createVehicle();
  environment:ReturnType<typeof createEnvironment>;effects=new Effects();sun:THREE.DirectionalLight;level:Level|null=null;view:VehicleView='hero';language:Language='zh';menuYaw=0;menuPitch=0;quality:Quality='auto';effective='high';
  private target=new THREE.Vector3();private cameraPosition=new THREE.Vector3();private menuTime=0;private frames=0;private profileTime=0;private simulationTime=0;fps=60;frameMs=16.67;
  private envMap:THREE.Texture;private glassEnvironment:THREE.WebGLRenderTarget;private resizeObserver:ResizeObserver;private host:HTMLElement;debug=false;debugGroup=new THREE.Group();
  private contactShadow:THREE.Mesh;private shadowTexture:THREE.CanvasTexture;private sky:THREE.Mesh;private skyMaterial:THREE.ShaderMaterial;
  private lastMode='';private landingImpulse=0;private finishTime=0;private followScale=1;
  private hemi:THREE.HemisphereLight;private headlights=new THREE.SpotLight(0xdaf0ff,28,45,.58,.65,1.2);
  private skyTexture:THREE.Texture;private disposed=false;
  constructor(host:HTMLElement){
    this.host=host;this.scene.add(this.headlights,this.headlights.target);this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setClearColor('#151e2b');this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.appendChild(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label',translate('Three-dimensional Roadster game scene',this.language));
    const pmrem=new THREE.PMREMGenerator(this.renderer);const room=new RoomEnvironment();const rt=pmrem.fromScene(room,.04);this.envMap=rt.texture;this.scene.environment=this.envMap;room.dispose();
    // Glazing needs continuous softbox bands, rather than discrete room emitters that
    // form distracting angular white patches across the raked side panes.
    const reflection=document.createElement('canvas');reflection.width=512;reflection.height=256;const reflectionContext=reflection.getContext('2d')!;
    const field=reflectionContext.createLinearGradient(0,0,0,256);
    for(const [stop,color] of [[0,'#1b2631'],[.22,'#36404b'],[.35,'#a6adb4'],[.43,'#4c5660'],[.55,'#18222c'],[.72,'#343b42'],[1,'#111921']] as [number,string][])field.addColorStop(stop,color);
    reflectionContext.fillStyle=field;reflectionContext.fillRect(0,0,512,256);
    const reflectionTexture=new THREE.CanvasTexture(reflection);reflectionTexture.colorSpace=THREE.SRGBColorSpace;reflectionTexture.mapping=THREE.EquirectangularReflectionMapping;
    this.glassEnvironment=pmrem.fromEquirectangular(reflectionTexture);reflectionTexture.dispose();
    const canopy=this.car.group.getObjectByName('Bronze-aircraft-canopy') as THREE.Mesh; (canopy.material as THREE.MeshPhysicalMaterial).envMap=this.glassEnvironment.texture;
    pmrem.dispose();
    this.scene.environmentIntensity=.8;this.renderer.toneMappingExposure=.96;
    this.hemi=new THREE.HemisphereLight('#dbe5ef','#514b43',.85);this.scene.add(this.hemi);this.sun=new THREE.DirectionalLight('#ffe0b8',3.4);this.sun.position.set(-10,24,16);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.camera.left=-35;this.sun.shadow.camera.right=35;this.sun.shadow.camera.top=35;this.sun.shadow.camera.bottom=-35;this.sun.shadow.camera.near=1;this.sun.shadow.camera.far=130;this.sun.shadow.normalBias=.02;this.sun.shadow.bias=-.00012;this.scene.add(this.sun,this.sun.target);
    const rim=new THREE.DirectionalLight('#c1d6e5',1.8);rim.position.set(-8,5,-12);this.scene.add(rim);
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;const c=canvas.getContext('2d')!;c.scale(1,.5);const gradient=c.createRadialGradient(64,64,10,64,64,62);gradient.addColorStop(0,'rgba(0,0,0,.65)');gradient.addColorStop(.55,'rgba(0,0,0,.4)');gradient.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gradient;c.fillRect(0,0,128,128);this.shadowTexture=new THREE.CanvasTexture(canvas);
    this.contactShadow=new THREE.Mesh(new THREE.PlaneGeometry(5.8,2.9),new THREE.MeshBasicMaterial({map:this.shadowTexture,transparent:true,opacity:.7,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));this.contactShadow.rotation.x=-Math.PI/2;this.contactShadow.renderOrder=1;
    this.skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{topColor:{value:new THREE.Color('#758d9d')},horizonColor:{value:new THREE.Color('#e6b995')},sunColor:{value:new THREE.Color('#ffe4b5')}},vertexShader:'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 vDirection;uniform vec3 topColor;uniform vec3 horizonColor;uniform vec3 sunColor;void main(){vec3 d=normalize(vDirection);float h=pow(max(d.y,0.0),0.4);vec3 color=mix(horizonColor,topColor,h);vec3 sun=normalize(vec3(-0.65,0.16,-0.7));float s=max(dot(d,sun),0.0);color+=sunColor*(pow(s,500.0)*0.8+pow(s,18.0)*0.14);gl_FragColor=vec4(color,1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
    this.skyMaterial.uniforms.panorama={value:null};this.skyMaterial.uniforms.panoramaReady={value:0};
    this.skyMaterial.fragmentShader=`
      varying vec3 vDirection;
      uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 sunColor;
      uniform sampler2D panorama; uniform float panoramaReady;
      void main() {
        vec3 d=normalize(vDirection);
        float h=pow(max(d.y,0.0),0.4);
        vec3 color=mix(horizonColor,topColor,h);
        vec2 uv=vec2(atan(d.z,d.x)/6.2831853+0.68,asin(clamp(d.y,-1.0,1.0))/3.14159265+0.5);
        vec3 photographed=texture2D(panorama,uv).rgb;
        // The low horizon fades into the same atmospheric tint as distant geometry.
        photographed=mix(horizonColor,photographed,smoothstep(-0.06,0.22,d.y)*0.86);
        color=mix(color,photographed,panoramaReady);
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`;
    this.skyTexture=new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/environment/sky.webp`,texture=>{
      if(this.disposed){texture.dispose();return;}
      this.skyMaterial.uniforms.panoramaReady.value=this.level?.lighting==='night'||this.level?.lighting==='blackout'?0:1;
    });
    this.skyTexture.colorSpace=THREE.SRGBColorSpace;this.skyTexture.wrapS=THREE.RepeatWrapping;
    this.skyMaterial.uniforms.panorama.value=this.skyTexture;
    this.sky=new THREE.Mesh(new THREE.SphereGeometry(650,24,16),this.skyMaterial);this.sky.frustumCulled=false;this.sky.renderOrder=-10;
    this.scene.add(this.car.group,this.effects.group,this.debugGroup,this.contactShadow,this.sky);this.environment=createEnvironment(null,this.language);this.scene.add(this.environment.group);this.setLevel(null);this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();this.setQuality('auto');
  }
  setLanguage(language:Language){if(this.language===language)return;this.language=language;this.renderer.domElement.setAttribute('aria-label',translate('Three-dimensional Roadster game scene',language));this.scene.remove(this.environment.group);this.environment.dispose();this.environment=createEnvironment(this.level,language);this.scene.add(this.environment.group);}
  orbit(yaw:number,pitch:number){this.menuYaw+=yaw;this.menuPitch=THREE.MathUtils.clamp(this.menuPitch+pitch,-.3,1.2);}
  resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(w<1||h<1)return;this.followScale=window.matchMedia('(pointer:coarse)').matches?(Math.min(w,h)<=600?.7:.85):1;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  setQuality(q:Quality){this.quality=q;const mobile=window.matchMedia('(pointer:coarse)').matches;const cores=navigator.hardwareConcurrency||4;this.effective=q==='auto'?(mobile||cores<6?'medium':'high'):q;const cap=this.effective==='high'?1.75:this.effective==='medium'?1.25:.85;this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,cap));this.renderer.shadowMap.enabled=this.effective!=='low';this.sun.shadow.mapSize.set(this.effective==='high'?2048:1024,this.effective==='high'?2048:1024);this.sun.shadow.map?.dispose();this.sun.shadow.map=null;this.effects.density=this.effective==='high'?1:this.effective==='medium'?.6:.3;this.resize();}
  setLevel(level:Level|null){
    this.car.reset?.();
    this.simulationTime=0;this.menuYaw=0;this.menuPitch=0;
    this.lastMode='';this.landingImpulse=0;this.finishTime=0;
    this.scene.remove(this.environment.group);this.environment.dispose();this.level=level;this.environment=createEnvironment(level,this.language);this.scene.add(this.environment.group);this.effects.clear();
    // Each biome owns its air: horizon, fog, sun and exposure are preset, not
    // derived from the three ground themes.
    const air=level?atmosphereFor(level):null;
    const dark=level?.lighting==='blackout'||level?.lighting==='night';
    this.headlights.visible=!!dark;
    this.renderer.toneMappingExposure=air?.exposure??1.15;
    this.sky.visible=air?.sky??false;
    this.skyMaterial.uniforms.topColor.value.set(air?.topColor??'#657e94');
    this.skyMaterial.uniforms.horizonColor.value.set(air?.horizonColor??'#e1b38e');
    this.skyMaterial.uniforms.sunColor.value.set(air?.sunColor??'#ffe4b5');
    this.skyMaterial.uniforms.panoramaReady.value=this.skyTexture.image&&!dark?1:0;
    this.scene.background=new THREE.Color(air?.background??'#111b27');
    this.scene.fog=new THREE.FogExp2(air?.fogColor??'#142230',air?.fogDensity??.008);
    this.sun.color.set(air?.sunTint??'#ffe0b8');
    this.sun.intensity=air?.sunIntensity??3.4;
    this.hemi.color.set(air?.hemiSky??'#dbe5ef');
    this.hemi.groundColor.set(air?.hemiGround??'#514b43');
    if(level){const scale=this.followScale,z=level.start.z??0;this.target.set(level.start.x+6*scale,level.start.y+2*scale,z);this.cameraPosition.set(level.start.x+3*scale,level.start.y+9*scale,z+29*scale);this.camera.position.copy(this.cameraPosition);this.camera.lookAt(this.target);}else{this.car.group.position.set(0,.72,0);this.car.group.rotation.set(0,0,0);this.menuTime=0;this.menuCamera(1,0);}
  }
  menuCamera(dt:number,time:number){
    let offset=new THREE.Vector3(7.1,2.25,8.9);let look=new THREE.Vector3(-1.1,.62,0);
    // Narrow landscape keeps the car legible beside the fixed menu column.
    if(this.camera.aspect<1.6){offset.set(5.75,1.55,7.45);look.set(-.55,.52,0);}
    if(this.view==='front'){offset.set(7.8,2.1,6.1);look.set(.15,.7,0);}if(this.view==='side'){offset.set(.1,1.9,9.7);look.set(0,.6,0);}if(this.view==='rear'){offset.set(-7,2.5,6.6);look.set(0,.6,0);}if(this.view==='top'){offset.set(.1,10,.01);look.set(0,.3,0);}if(this.view==='bottom'){offset.set(1.6,-7,5);look.set(0,.5,0);}
    if(this.view==='hero'){offset.y+=this.menuPitch*4;offset.x+=Math.sin(time*.08)*.35;offset.z+=Math.cos(time*.08)*.3;}
    this.camera.fov=this.camera.aspect<1.6?43:37;this.camera.updateProjectionMatrix();this.camera.position.lerp(offset,1-Math.exp(-dt*4));this.target.lerp(look,1-Math.exp(-dt*4));this.camera.lookAt(this.target);
    // Keep floor from hiding the undertray in the deliberate inspection view.
    this.environment.group.visible=this.view!=='bottom';
  }
  render(s:GameSnapshot|null,dt:number,time:number,reducedMotion=false){
    this.menuTime+=dt;const t=Math.min(dt,.05);this.environment.update(s?.worldTime??time,s?.x||0,s);
    if(s&&this.level){
      const darkness=this.level.lighting==='blackout'||this.level.lighting==='night'||this.level.blackoutZones?.some(zone=>s.x>=zone.x&&s.x<=zone.x+zone.w);this.headlights.visible=!!darkness;
      const air=atmosphereFor(this.level);
      this.renderer.toneMappingExposure=air.exposure*(darkness?.92:1);
      this.sun.intensity=air.sunIntensity*(darkness?.7:1);
      const simulationDt=Math.max(0,Math.min(s.time-this.simulationTime,.08));this.simulationTime=s.time;
      if(s.mode==='landing'&&this.lastMode==='airborne')this.landingImpulse=.12;
      this.lastMode=s.mode;this.landingImpulse*=Math.exp(-t*12);if(s.mode==='finished')this.finishTime+=t;
      this.car.group.position.set(s.x,s.y,s.z);this.car.group.rotation.set(0,0,s.angle);if(simulationDt>0)this.car.update(s,simulationDt);
      this.headlights.position.set(s.x+Math.cos(s.angle)*2,s.y+Math.sin(s.angle)*2+.4,s.z+1);this.headlights.target.position.set(s.x+Math.cos(s.angle)*24,s.y+Math.sin(s.angle)*24-2,s.z);
      // Touch screens need a closer follow shot, including the previously very wide event views.
      const scale=this.followScale,speed=Math.abs(s.vx);const airborne=!s.grounded;let distance=(27+Math.min(speed*.13,8)+(airborne?3:0))*scale;const loop=this.level.tracks.filter(a=>a.suction).some(a=>a.points.some(p=>Math.abs(p.x-s.x)<10&&p.y>s.y+6));if(loop)distance=43*scale;
      const lookAhead=(s.vx<-2?Math.max(-13,s.vx*.28-3):Math.max(3,Math.min(13,s.vx*.28+4)))*scale;let targetY=s.y+(1.6+(airborne?Math.max(-2,Math.min(4,s.vy*.13)):0))*scale,targetX=s.x+lookAhead;
      // Frame the physical landing surface with the car during long gaps and ceiling releases.
      if(airborne&&Math.abs(s.vx)>3){const direction=Math.sign(s.vx);let landing:{x:number;y:number}|undefined,score=Infinity;
        for(const track of this.level.tracks.filter(t=>!t.optional))for(let i=1;i<track.points.length;i++){const a=track.points[i-1],b=track.points[i],dx=b.x-a.x;if(dx<2||Math.abs(b.y-a.y)>dx*.4)continue;const x=THREE.MathUtils.clamp(s.x+direction*12,a.x,b.x),y=a.y+(b.y-a.y)*(x-a.x)/dx;if(direction*(x-s.x)<3||y>s.y+1)continue;const cost=Math.hypot(x-s.x,(y-s.y)*.7);if(cost<score){score=cost;landing={x,y};}}
        if(landing&&(Math.abs(landing.x-s.x)>18||s.y-landing.y>16)){targetX=(s.x+landing.x)/2+direction*3*scale;targetY=(s.y+landing.y)/2+2*scale;const tangent=Math.tan(THREE.MathUtils.degToRad(37/2));distance=Math.min(scale<1?68*scale:130,Math.max(distance,(Math.abs(landing.x-s.x)/2+9*scale)/(tangent*this.camera.aspect),(Math.abs(landing.y-s.y)/2+15*scale)/tangent));
          // A distant lower deck must not reduce the phone's player car to a speck.
          if(scale<1){const reach=distance*tangent*.35;targetY=THREE.MathUtils.clamp(targetY,s.y-reach,s.y+reach);targetX=THREE.MathUtils.clamp(targetX,s.x-reach*this.camera.aspect,s.x+reach*this.camera.aspect);}
        }
      }
      if(this.level.id>3&&s.platform){distance=Math.max(distance,46*scale);targetY=s.y+5*scale;}
      if(this.level.id===3&&s.checkpoint>=3&&s.x>224&&s.x<360){distance=Math.max(distance,43*scale);targetX=s.x+13*scale;targetY=s.y+3*scale;}
      if(this.level.id===2&&s.x>242&&s.x<285){distance=Math.max(distance,38*scale);targetX=s.x+12*scale;targetY=s.y+4*scale;}
      // Physical traffic stays legible without a warning banner or a timed camera reveal.
      if(this.level.roadEvents?.some(e=>s.x>e.x-24&&s.x<e.x+e.length)){distance=Math.max(distance,48*scale);targetX=s.x+14*scale;targetY=s.y+3*scale;}
      const rearTraffic=s.roadActors?.find(a=>a.id.endsWith('-chaser')&&a.x<s.x+10&&a.x>s.x-40);
      if(rearTraffic){const tangent=Math.tan(THREE.MathUtils.degToRad(37/2));distance=Math.max(distance,48*scale,(Math.abs(s.x-rearTraffic.x)/2+6)/(tangent*this.camera.aspect));targetX=(s.x+rearTraffic.x)/2+4*scale;}
      const invertedView=THREE.MathUtils.clamp((-Math.cos(s.angle)-.15)/.7,0,1);
      // Enclosed bores need the camera inside the lining: keep the eye below the
      // 7.2 m crown instead of the open-air 7 m offset over a 5.3 m roof.
      const enclosed=this.level.scenery==='tunnel';
      if(enclosed)distance=Math.min(distance,26*scale);
      const viewHeight=THREE.MathUtils.lerp(enclosed?3.5:7,enclosed?-3:6,invertedView)*scale;
      this.target.lerp(new THREE.Vector3(targetX,targetY,s.z),1-Math.exp(-t*4));this.cameraPosition.set(this.target.x-3*scale,this.target.y+viewHeight,s.z+distance);
      if(!reducedMotion){this.cameraPosition.y-=this.landingImpulse;if(s.mode==='finished'){const reveal=1-Math.exp(-this.finishTime*1.5);this.target.lerp(new THREE.Vector3(s.x,s.y+.5,s.z),reveal*.08);this.cameraPosition.set(s.x-3+reveal*10,s.y+7-reveal*3.5,s.z+distance-reveal*10);}}
      this.camera.position.lerp(this.cameraPosition,1-Math.exp(-t*3.2));this.camera.fov=37+(reducedMotion?0:Math.min(speed*.025,3));this.camera.updateProjectionMatrix();this.camera.lookAt(this.target);
      this.sun.position.set(s.x-12,s.y+26,s.z+16);this.sun.target.position.set(s.x,s.y,s.z);if(simulationDt>0||s.mode==='finished'||s.mode==='crashed')this.effects.update(s,simulationDt>0?simulationDt:t);
      this.contactShadow.visible=s.grounded;this.contactShadow.position.set(s.x+s.contactNormal.x*(-.835),s.y+s.contactNormal.y*(-.835),s.z);this.contactShadow.rotation.set(-Math.PI/2,0,0);this.contactShadow.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),s.angle));
      this.debugGroup.visible=this.debug;if(this.debug)this.drawDebug(s);
    }else{this.car.group.position.set(0,.72,0);this.car.group.rotation.set(0,this.menuYaw,0);this.menuCamera(t,reducedMotion?0:this.menuTime);this.effects.update(null,t);this.debugGroup.visible=false;this.contactShadow.visible=this.view!=='bottom';this.contactShadow.position.set(0,.042,0);this.contactShadow.rotation.set(-Math.PI/2,0,0);}
    this.sky.position.copy(this.camera.position);
    this.renderer.render(this.scene,this.camera);this.frames++;this.profileTime+=dt;if(this.profileTime>=.6){this.fps=this.frames/this.profileTime;this.frameMs=1000/this.fps;this.frames=0;this.profileTime=0;}
    // Auto quality degrades only after a sustained expensive frame window.
    if(this.quality==='auto'&&this.menuTime>6&&this.fps<34&&this.effective!=='low'){this.setQuality('low');this.quality='auto';}
  }
  drawDebug(s:GameSnapshot){
    for(const c of [...this.debugGroup.children]){this.debugGroup.remove(c);if(c instanceof THREE.Line){c.geometry.dispose();(c.material as THREE.Material).dispose();}}
    const lines=(pts:number[],color:string)=>{const g=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(pts,3));this.debugGroup.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color,depthTest:false})));};
    // Rapier roundCuboid(2.15,.31,.10), centered at local Y=.16: arcs include its border radius.
    const outline:number[][]=[];for(const [cx,cy,start] of [[2.15,.47,0],[-2.15,.47,Math.PI/2],[-2.15,-.15,Math.PI],[2.15,-.15,Math.PI*1.5]])for(let i=0;i<=6;i++){const a=start+i*Math.PI/12;outline.push([cx+Math.cos(a)*.1,cy+Math.sin(a)*.1]);}
    const bounds:number[]=[];for(let i=0;i<outline.length;i++)for(const p of [outline[i],outline[(i+1)%outline.length]])bounds.push(s.x+p[0]*Math.cos(s.angle)-p[1]*Math.sin(s.angle),s.y+p[0]*Math.sin(s.angle)+p[1]*Math.cos(s.angle),1.3);lines(bounds,'#edf0e9');
    const contacts:number[]=[];for(const p of s.contactPoints){contacts.push(p.x-.15,p.y,1.3,p.x+.15,p.y,1.3,p.x,p.y-.15,1.3,p.x,p.y+.15,1.3,p.x,p.y,1.3,p.x+s.contactNormal.x*2,p.y+s.contactNormal.y*2,1.3);}lines(contacts,'#75efbc');
    const vector=(v:{x:number;y:number},scale:number,color:string)=>{const dx=v.x*scale,dy=v.y*scale,a=Math.atan2(dy,dx);if(Math.hypot(dx,dy)<.01)return;const x=s.x+dx,y=s.y+dy;lines([s.x,s.y,1.3,x,y,1.3,x,y,1.3,x-.4*Math.cos(a-.5),y-.4*Math.sin(a-.5),1.3,x,y,1.3,x-.4*Math.cos(a+.5),y-.4*Math.sin(a+.5),1.3],color);};
    vector(s.suctionForce,.04,'#64cee7');vector(s.thrustForce,.14,'#f0a364');
    const checkpoints:number[]=[];for(const p of this.level?.checkpoints||[])checkpoints.push(p.x-1,p.y,1.3,p.x+1,p.y,1.3,p.x,p.y-1,1.3,p.x,p.y+1,1.3);lines(checkpoints,'#ffe591');
  }
  /** Triangle/draw budget grouped by scene role; used by the QA capture pass. */
  budget(){
    const roles=new Map<string,{objects:number;instances:number;triangles:number}>();
    this.environment.group.traverse(o=>{
      if(!(o instanceof THREE.Mesh))return;
      const position=o.geometry.getAttribute('position');
      if(!position)return;
      const tris=(o.geometry.index?o.geometry.index.count:position.count)/3;
      const instances=(o as THREE.InstancedMesh).isInstancedMesh?(o as THREE.InstancedMesh).count:1;
      const name=o.name||o.parent?.name||'unassigned';
      const role=name.startsWith('kit')||name==='biome-dressing'?'biome-kit':name.startsWith('batched')||name.startsWith('environment')?'environment':name.startsWith('road')?'road-actors':name.startsWith('fixed')?'road-hardware':name;
      const entry=roles.get(role)??{objects:0,instances:0,triangles:0};
      entry.objects++;entry.instances+=instances;entry.triangles+=tris*instances;
      roles.set(role,entry);
    });
    const objects:{name:string;instances:number;triangles:number}[]=[];
    this.environment.group.traverse(o=>{
      if(!(o instanceof THREE.Mesh))return;
      const position=o.geometry.getAttribute('position');if(!position)return;
      const tris=(o.geometry.index?o.geometry.index.count:position.count)/3;
      const instances=(o as THREE.InstancedMesh).isInstancedMesh?(o as THREE.InstancedMesh).count:1;
      objects.push({name:`${o.name||'unnamed'}/${o.geometry.type}`,instances,triangles:Math.round(tris*instances)});
    });
    objects.sort((a,b)=>b.triangles-a.triangles);
    return {roles:[...roles.entries()].sort((a,b)=>b[1].triangles-a[1].triangles).slice(0,10).map(([role,v])=>({role,...v,triangles:Math.round(v.triangles)})),objects:objects.slice(0,10)};
  }
  stats(){
    const r=this.renderer.info,traffic:{id:string;x:number;y:number;onScreen:boolean;speech:string[]}[]=[];
    let worldSigns=0;
    this.environment.group.traverse(o=>{
      if(o.name==='environment-sign')worldSigns++;
      if(!o.visible||!/^event-\d+-\d+-(source|chaser|blocker)$/.test(o.name))return;
      const p=o.getWorldPosition(new THREE.Vector3()).project(this.camera),bubble=o.getObjectByName('vehicle-speech');
      traffic.push({id:o.name,x:p.x,y:p.y,onScreen:Math.abs(p.x)<.9&&Math.abs(p.y)<.9&&p.z>-1&&p.z<1,speech:bubble?.visible?bubble.userData.lines:[]});
    });
    return {fps:Math.round(this.fps*10)/10,frameMs:Math.round(this.frameMs*10)/10,drawCalls:r.render.calls,triangles:r.render.triangles,geometries:r.memory.geometries,textures:r.memory.textures,quality:this.effective,menuYaw:this.menuYaw,menuPitch:this.menuPitch,traffic,worldSigns,heapMB:((performance as unknown as {memory?:{usedJSHeapSize:number}}).memory?.usedJSHeapSize||0)/1048576};
  }
  dispose(){this.disposed=true;this.resizeObserver.disconnect();this.environment.dispose();this.effects.dispose();this.car.dispose();this.envMap.dispose();this.glassEnvironment.dispose();this.contactShadow.geometry.dispose();(this.contactShadow.material as THREE.Material).dispose();this.shadowTexture.dispose();this.sky.geometry.dispose();this.skyMaterial.dispose();this.skyTexture.dispose();this.headlights.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}
