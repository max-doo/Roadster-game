import * as THREE from 'three';
import type { GameSnapshot } from '../game/types';
import { exhaustJets, attitudeJets } from './thrusters';

const COUNT=900,MAX_JETS=12;
const GAS_COLOR=new THREE.Color('#e5f0f3');
const noiseGLSL=/* glsl */`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
`;

export class Effects {
  group=new THREE.Group();positions=new Float32Array(COUNT*3);colors=new Float32Array(COUNT*3);vel=new Float32Array(COUNT*3);life=new Float32Array(COUNT);cursor=0;previous?:GameSnapshot;
  geometry=new THREE.BufferGeometry();material:THREE.ShaderMaterial;points:THREE.Points;enabled=true;density=1;
  private durations=new Float32Array(COUNT);private sizes=new Float32Array(COUNT);private opacity=new Float32Array(COUNT);private gas=new Uint8Array(COUNT);
  private jetGeometry=new THREE.InstancedBufferGeometry();private jetMaterial:THREE.ShaderMaterial;private jets:THREE.Mesh;
  private origins=new Float32Array(MAX_JETS*3);private axes=new Float32Array(MAX_JETS*3);private shapes=new Float32Array(MAX_JETS*3);
  private emissionCarry=new Map<string,number>();private clock=0;private viewport=new THREE.Vector2();private ambientMaterial:THREE.ShaderMaterial;

  constructor(){
    this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('color',new THREE.BufferAttribute(this.colors,3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('size',new THREE.BufferAttribute(this.sizes,1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('opacity',new THREE.BufferAttribute(this.opacity,1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('gas',new THREE.BufferAttribute(this.gas,1).setUsage(THREE.DynamicDrawUsage));
    this.material=new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,blending:THREE.NormalBlending,
      uniforms:{viewportHeight:{value:1},gasPass:{value:1}},
      vertexShader:/* glsl */`attribute vec3 color;attribute float size;attribute float opacity;attribute float gas;
        uniform float viewportHeight;varying vec3 vColor;varying float vOpacity;varying float vGas;
        void main(){vColor=color;vOpacity=opacity;vGas=gas;vec4 p=modelViewMatrix*vec4(position,1.0);
        gl_PointSize=clamp(size*viewportHeight*projectionMatrix[1][1]/max(0.1,-p.z),1.0,180.0);gl_Position=projectionMatrix*p;}`,
      fragmentShader:/* glsl */`uniform float gasPass;varying vec3 vColor;varying float vOpacity;varying float vGas;${noiseGLSL}
        void main(){if(abs(vGas-gasPass)>0.5)discard;vec2 p=gl_PointCoord*2.0-1.0;float r=length(p);
        float cloud=0.65+0.35*noise(p*4.0);float a=exp(-r*r*3.5)*(1.0-smoothstep(0.65,1.0,r))*vOpacity*cloud;
        if(a<0.003)discard;gl_FragColor=vec4(vColor,a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
    });
    this.points=new THREE.Points(this.geometry,this.material);this.points.frustumCulled=false;
    // Preserve additive sparks and suction feedback; cold mist scatters light instead.
    this.ambientMaterial=this.material.clone();this.ambientMaterial.blending=THREE.AdditiveBlending;this.ambientMaterial.uniforms.gasPass.value=0;
    const ambient=new THREE.Points(this.geometry,this.ambientMaterial);ambient.frustumCulled=false;
    this.points.onBeforeRender=ambient.onBeforeRender=renderer=>{renderer.getDrawingBufferSize(this.viewport);this.material.uniforms.viewportHeight.value=this.ambientMaterial.uniforms.viewportHeight.value=this.viewport.y*.5;};

    // A single instanced ribbon draw keeps the core attached to every outlet;
    // separate mist particles carry the nozzle's world-space momentum downstream.
    const ribbon=new THREE.PlaneGeometry(1,1,1,20);
    this.jetGeometry.index=ribbon.index;this.jetGeometry.attributes=ribbon.attributes;
    this.jetGeometry.setAttribute('origin',new THREE.InstancedBufferAttribute(this.origins,3).setUsage(THREE.DynamicDrawUsage));
    this.jetGeometry.setAttribute('axis',new THREE.InstancedBufferAttribute(this.axes,3).setUsage(THREE.DynamicDrawUsage));
    this.jetGeometry.setAttribute('shape',new THREE.InstancedBufferAttribute(this.shapes,3).setUsage(THREE.DynamicDrawUsage));
    this.jetGeometry.instanceCount=0;
    this.jetMaterial=new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.NormalBlending,
      uniforms:{time:{value:0}},
      vertexShader:/* glsl */`attribute vec3 origin;attribute vec3 axis;attribute vec3 shape;
        uniform float time;varying vec2 vUv;varying float vStrength;varying float vSeed;
        void main(){vUv=uv;vStrength=shape.z;vSeed=origin.z*19.0+origin.x;
        vec3 direction=normalize(mat3(modelViewMatrix)*axis);
        vec2 side=vec2(-direction.y,direction.x);side/=max(length(side),0.001);
        float u=uv.y;float radius=mix(shape.y*0.2,shape.y,pow(u,0.8));
        float flutter=sin(u*24.0-time*42.0+vSeed)*sin(u*11.0+time*19.0)*u*radius*0.16;
        vec4 p=modelViewMatrix*vec4(origin+axis*(u*shape.x),1.0);
        p.xy+=side*(position.x*2.0*radius+flutter);gl_Position=projectionMatrix*p;}`,
      fragmentShader:/* glsl */`uniform float time;varying vec2 vUv;varying float vStrength;varying float vSeed;${noiseGLSL}
        void main(){float u=vUv.y;float edge=abs(vUv.x*2.0-1.0);
        float n=noise(vec2(u*19.0-time*15.0+vSeed,vUv.x*5.0));
        float envelope=exp(-edge*edge*4.0)*(1.0-smoothstep(0.65,1.0,edge));
        float breakup=mix(1.0,0.35+0.65*n,smoothstep(0.15,0.9,u));
        float alpha=envelope*breakup*(1.0-smoothstep(0.35,1.0,u))*smoothstep(0.0,0.025,u)*vStrength;
        vec3 color=mix(vec3(0.71,0.79,0.82),vec3(0.94,0.97,0.98),exp(-edge*edge*9.0)*(1.0-u));
        gl_FragColor=vec4(color,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
    });
    this.jets=new THREE.Mesh(this.jetGeometry,this.jetMaterial);this.jets.name='Cold-gas-jet-cores';this.jets.frustumCulled=false;this.jets.visible=false;
    this.group.add(this.points,ambient,this.jets);this.clear();
  }

  emit(x:number,y:number,z:number,vx:number,vy:number,vz:number,color:THREE.Color,lifetime:number){
    const i=this.cursor++%COUNT;this.positions.set([x,y,z],i*3);this.vel.set([vx,vy,vz],i*3);this.colors.set([color.r,color.g,color.b],i*3);
    this.life[i]=lifetime;this.durations[i]=lifetime;this.sizes[i]=.55;this.opacity[i]=.7;this.gas[i]=0;
  }
  burst(s:GameSnapshot,color:string,n=30){const c=new THREE.Color(color);for(let i=0;i<n*this.density;i++)this.emit(s.x,s.y-.4,s.z+(Math.random()-.5)*2,(Math.random()-.5)*9,Math.random()*7,(Math.random()-.5)*5,c,.5+Math.random()*.7);}
  private batteryExplosion(s:GameSnapshot){
    for(let n=0;n<110*this.density;n++){
      const a=Math.random()*Math.PI*2,r=Math.random()*7;
      this.emit(s.x,s.y+.3,s.z+(Math.random()-.5)*1.8,Math.cos(a)*r,2+Math.sin(a)*r,(Math.random()-.5)*4,new THREE.Color(n%3?'#ff741c':'#ffe9a6'),.65+Math.random()*.5);
      this.sizes[(this.cursor-1)%COUNT]=2+Math.random()*3.5;
    }
  }

  private updateJets(s:GameSnapshot|null,dt:number){
    const active=s&&this.enabled&&!['crashed','finished'].includes(s.mode);
    const jets=active?[...(s.thrusting||s.boosting?exhaustJets(s):[]),...attitudeJets(s)]:[];
    this.jetGeometry.instanceCount=jets.length;this.jets.visible=jets.length>0;
    const keys=new Set<string>();
    jets.forEach((p,j)=>{
      const rx=p.x-s!.x,ry=p.y-s!.y;
      const dx=p.vx-s!.vx+s!.angularVelocity*ry,dy=p.vy-s!.vy-s!.angularVelocity*rx;
      const speed=Math.hypot(dx,dy),nx=dx/speed,ny=dy/speed;
      const strength=p.kind==='attitude'?Math.abs(s!.pitchInput):1;
      const length=(p.kind==='lift'?3.5:p.kind==='rear'?3.0:1.7)*(.45+.55*strength);
      this.origins.set([p.x,p.y,p.z],j*3);this.axes.set([nx,ny,0],j*3);
      this.shapes.set([length,p.kind==='attitude'?.22:.38,p.kind==='attitude'?.56:.82],j*3);
      // Carry fractional births across frames so low FPS cannot weaken the jet.
      const key=`${p.kind}:${j}`;keys.add(key);
      const rate=(p.kind==='lift'?180:120)*this.density*(p.kind==='attitude'?strength:1);
      const total=(this.emissionCarry.get(key)??0)+dt*rate,count=Math.floor(total+1e-6);
      this.emissionCarry.set(key,Math.max(0,total-count));
      for(let k=0;k<count;k++){
        const age=dt*(k+.5)/Math.max(1,count),spread=p.kind==='attitude'?.9:1.5;
        const vx=p.vx+(Math.random()-.5)*spread,vy=p.vy+(Math.random()-.5)*spread;
        this.emit(p.x+nx*speed*age,p.y+ny*speed*age,p.z,vx,vy,(Math.random()-.5)*spread,GAS_COLOR,p.kind==='attitude'?.22+Math.random()*.1:.3+Math.random()*.16);
        const i=(this.cursor-1)%COUNT;this.gas[i]=1;this.sizes[i]=p.kind==='attitude'?.18:.24;this.opacity[i]=.3;
      }
    });
    for(const key of this.emissionCarry.keys())if(!keys.has(key))this.emissionCarry.delete(key);
    for(const key of ['origin','axis','shape'])this.jetGeometry.attributes[key].needsUpdate=true;
    this.jetMaterial.uniforms.time.value=this.clock;
  }

  update(s:GameSnapshot|null,dt:number){
    dt=Math.max(0,Math.min(dt,.08));this.clock+=dt;this.updateJets(s,dt);
    if(s&&this.enabled){const cos=Math.cos(s.angle);
      if(s.grounded&&s.speed>35&&Math.random()<.75*this.density)this.emit(s.x-1.6*cos,s.y-.6,s.z+(Math.random()-.5)*1.9,s.vx*.3-3,1,0,new THREE.Color('#ad997d'),.5);
      if(s.braking&&s.grounded&&s.speed>25){const c=new THREE.Color('#c5c8c5');for(const p of s.contactPoints)if(Math.random()<.7*this.density)this.emit(p.x,p.y+.1,s.z+(Math.random()-.5)*1.9,s.vx*.18,1.6,0,c,.6);}
      if(s.suction&&s.mode==='adhered')for(let j=0;j<2*this.density;j++)this.emit(s.x+(Math.random()-.5)*3,s.y-.35*cos,s.z+(Math.random()-.5)*2,s.vx*.5,-2*cos,0,new THREE.Color('#64cee7'),.25);
      if(this.previous){if(s.damageEvents>this.previous.damageEvents)this.burst(s,'#eaa66f',35);if(s.mode==='crashed'&&this.previous.mode!=='crashed'){if(s.message.startsWith('BATTERY IMPACT'))this.batteryExplosion(s);else this.burst(s,'#ffb66b',70);}if(s.mode==='landing'&&this.previous.mode==='airborne')this.burst(s,'#9c8c78',35);if(s.checkpoint>this.previous.checkpoint)this.burst(s,'#64cee7',45);if(s.mode==='finished'&&this.previous.mode!=='finished')this.burst(s,'#e9ebe5',130);}
    }
    for(let i=0;i<COUNT;i++){
      const k=i*3;
      if(this.life[i]>0){
        this.life[i]=Math.max(0,this.life[i]-dt);const age=1-this.life[i]/this.durations[i];
        this.positions[k]+=this.vel[k]*dt;this.positions[k+1]+=this.vel[k+1]*dt;this.positions[k+2]+=this.vel[k+2]*dt;
        if(this.gas[i]){
          const drag=Math.exp(-dt*1.4);this.vel[k]*=drag;this.vel[k+1]*=drag;this.vel[k+2]*=drag;
          this.sizes[i]=.24+age*1.15;this.opacity[i]=.32*Math.pow(1-age,1.4);
        }else{this.vel[k+1]-=dt*1.2;this.opacity[i]=.7*Math.min(1,this.life[i]*4);}
      }else{this.positions[k+1]=-10000;this.opacity[i]=0;}
    }
    for(const key of ['position','color','size','opacity','gas'])this.geometry.attributes[key].needsUpdate=true;
    this.previous=s?{...s}:undefined;
  }
  clear(){
    this.life.fill(0);this.opacity.fill(0);for(let i=0;i<COUNT;i++)this.positions[i*3+1]=-10000;
    this.geometry.attributes.position.needsUpdate=true;this.geometry.attributes.opacity.needsUpdate=true;
    this.jetGeometry.instanceCount=0;this.jets.visible=false;this.emissionCarry.clear();this.previous=undefined;this.clock=0;
  }
  dispose(){this.geometry.dispose();this.material.dispose();this.ambientMaterial.dispose();this.jetGeometry.dispose();this.jetMaterial.dispose();}
}
