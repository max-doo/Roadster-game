import RAPIER from '@dimforge/rapier2d-compat';
import { PHYSICS as P } from './config';
import type { GameSnapshot, InputState, Level, Vec, VehicleMode } from './types';
import { windAt } from './wind';
import { motionAt } from './motion';
import { RoadEvents, type EventSave } from './roadEvents';

let ready:Promise<void>|undefined;
export function initPhysics():Promise<void> { return ready??=RAPIER.init(); }
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const wrap=(v:number)=>Math.atan2(Math.sin(v),Math.cos(v));
type Segment={a:Vec;b:Vec;baseA:Vec;baseB:Vec;t:Vec;n:Vec;length:number;s:number;index:number;trackIndex:number;suction:boolean;az:number;bz:number;width:number;recovery:boolean;optional:boolean;moving:boolean;vx:number;vy:number};
type Contact={segment:Segment;point:Vec;distance:number;along:number};

/** A genuine Rapier dynamic body with two force-based suspension probes.
 * Track geometry is shared with the renderer; no path-following position writes occur. */
export class GameCore {
  readonly level:Level;
  input:InputState={accelerate:false,brake:false,thrust:false,pitch:0,suction:false};
  readonly world:RAPIER.World;
  readonly body:RAPIER.RigidBody;
  private segments:Segment[]=[];
  private route=0;
  private trackIndex=0;
  private totalRoute=0;
  private trackColliders:{segment:Segment;collider:RAPIER.Collider}[]=[];
  private checkpoint=-1;
  private events:RoadEvents;
  private checkpointEvents:EventSave=[];
  private gateTimes=new Map<number,number>();
  private checkpointGates=new Map<number,number>();
  private collapseTimes=new Map<number,number>();
  private checkpointCollapse=new Map<number,number>();
  private windForce:Vec={x:0,y:0};
  private isCollapsed(index:number){const at=this.collapseTimes.get(index);return at!==undefined&&this.worldTime-at>=(this.level.tracks[index].stability?.delay??Infinity);}
  private hazardColliders:{collider:RAPIER.Collider;body?:RAPIER.RigidBody;z:number;depth:number}[]=[];
  private eventColliders=new Map<string,{collider:RAPIER.Collider;body:RAPIER.RigidBody}>();
  private movingTracks:{trackIndex:number;body:RAPIER.RigidBody}[]=[];
  private worldTime=0;
  private checkpointTime=0;
  private checkpointPressure=100;
  private collectedStars=new Set<string>();
  private consumed=new Set<string>();
  private checkpointConsumed=new Set<string>();
  private pickup='';
  private pickupUntil=0;
  private pickupEvent=0;
  private pressure=100;
  private health=100;
  private damageEvents=0;
  private lastDamage=0;
  private lane=0;
  private bodyCollider:RAPIER.Collider;
  private touchedHazards=new Set<number>();
  private elapsed=0;
  private mode:VehicleMode='airborne';
  private crashes=0;
  private airtime=0;
  private maxSpeed=0;
  private flips=0;
  private rotationTravel=0;
  private lastAngle=0;
  private landing=0;
  private contacts:Contact[]=[];
  private suspension:[number,number]=[0,0];
  private force:Vec={x:0,y:0};
  private suctionForce:Vec={x:0,y:0};
  private thrustForce:Vec={x:0,y:0};
  private thrusting=false;
  private boosting=false;
  private message='';
  private messageUntil=0;
  private impactCooldown=0;
  private fallenTime=0;
  private recoveryAnchor?:{x:number;y:number;angle:number};
  private adhesionWarningUntil=0;
  private respawnProtected=false;

  private suctionActive(){return !this.input.thrust&&(this.input.suction||this.respawnProtected);}

  constructor(level:Level) {
    this.events=new RoadEvents(level.roadEvents??[]);
    this.level=level;this.lane=level.start.z??0;
    this.world=new RAPIER.World({x:0,y:-P.gravity});
    this.world.timestep=P.fixedStep;
    let distance=0,index=0;
    for(const [trackIndex,track] of level.tracks.entries()) {
      const offset=motionAt(track.motion,0);
      const movingBody=track.motion?this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(offset.x,offset.y)):undefined;
      if(movingBody)this.movingTracks.push({trackIndex,body:movingBody});
      for(let i=1;i<track.points.length;i++) {
        const a=track.points[i-1],b=track.points[i],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
        if(length<.001)continue;
        const t={x:dx/length,y:dy/length},n={x:-t.y,y:t.x};
        const segment:Segment={a:{x:a.x+offset.x,y:a.y+offset.y},b:{x:b.x+offset.x,y:b.y+offset.y},baseA:a,baseB:b,t,n,length,s:distance,index:index++,trackIndex,suction:track.suction,az:a.z??0,bz:b.z??0,width:track.width??7,recovery:!!track.recovery,optional:!!track.optional,moving:!!track.motion,vx:offset.vx,vy:offset.vy};
        this.segments.push(segment);
        // The rendered line is the drivable face; the solid deck lies underneath it.
        const halfDepth=track.kind&&track.kind!=='slab'?1.2:.22;
        const collider=this.world.createCollider(RAPIER.ColliderDesc.cuboid(length/2+.035,halfDepth)
          .setTranslation((a.x+b.x)/2-n.x*halfDepth,(a.y+b.y)/2-n.y*halfDepth)
          .setRotation(Math.atan2(dy,dx)).setFriction(.15).setRestitution(.02),movingBody);
        this.trackColliders.push({segment,collider});
        if(!track.recovery&&!track.optional)distance+=length;
      }
      if(!track.recovery&&!track.optional)distance+=4; // Disconnected spans remain distinct without invisible bridging colliders.
    }
    this.totalRoute=distance;
    for(const h of level.hazards){const offset=motionAt(h.motion,0);const body=h.motion||h.lampActivated?this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(offset.x,offset.y)):undefined;const collider=this.world.createCollider(RAPIER.ColliderDesc.cuboid(h.w/2,h.h/2).setTranslation(h.x,h.y),body);this.hazardColliders.push({collider,body,z:h.z??0,depth:h.depth??6});}
    this.body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(level.start.x,level.start.y).setCcdEnabled(true)
      .setAdditionalMassProperties(P.mass,{x:0,y:0},P.inertia)
      .setLinearDamping(.02).setAngularDamping(.08));
    this.bodyCollider=this.world.createCollider(RAPIER.ColliderDesc.roundCuboid(2.15,.31,.10)
      .setTranslation(0,.16).setDensity(0).setFriction(.18).setRestitution(.05),this.body);
  }

  private gateOffset(index:number,time:number){const h=this.level.hazards[index];if(!h.lampActivated)return motionAt(h.motion,time);const at=this.gateTimes.get(index);return {x:0,y:at===undefined?0:8*clamp((time-at-.8)/1.2,0,1)};}

  private updateEventColliders(time:number,dt:number,reset=false){
    const current=this.events.actors(time),next=this.events.actors(time+dt);
    const active=new Set(current.filter(a=>a.kind==='car').map(a=>a.id));
    for(const [id,item] of this.eventColliders)if(!active.has(id)){this.world.removeRigidBody(item.body);this.eventColliders.delete(id);}
    for(const actor of current){
      if(actor.kind!=='car')continue;
      let item=this.eventColliders.get(actor.id);
      if(!item){
        const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(actor.x,actor.y));
        const collider=this.world.createCollider(RAPIER.ColliderDesc.cuboid(actor.w/2,actor.h/2).setFriction(.2).setRestitution(.02),body);
        item={body,collider};this.eventColliders.set(actor.id,item);
      }
      // A recorded hit disables repeat damage, never the physical vehicle.
      item.collider.setEnabled(Math.abs(this.lane-actor.z)<2.1);
      if(reset)item.body.setTranslation({x:actor.x,y:actor.y},true);
      const target=next.find(a=>a.id===actor.id)??actor;
      item.body.setNextKinematicTranslation({x:target.x,y:target.y});
    }
  }

  private updateMoving(time:number,dt=0,reset=false) {
    for(const {trackIndex,body} of this.movingTracks){
      const offset=motionAt(this.level.tracks[trackIndex].motion,time),next=motionAt(this.level.tracks[trackIndex].motion,time+dt);
      for(const segment of this.segments)if(segment.trackIndex===trackIndex){
        segment.a={x:segment.baseA.x+offset.x,y:segment.baseA.y+offset.y};segment.b={x:segment.baseB.x+offset.x,y:segment.baseB.y+offset.y};segment.vx=offset.vx;segment.vy=offset.vy;
      }
      if(reset)body.setTranslation(offset,true);
      body.setNextKinematicTranslation(next);
    }
    this.hazardColliders.forEach((h,i)=>{if(h.body){const offset=this.gateOffset(i,time+dt);if(reset)h.body.setTranslation(offset,true);h.body.setNextKinematicTranslation(offset);}});
  }

  private nearest(point:Vec, up:Vec, maxDistance:number, continuity=true):Contact|undefined {
    let best:Contact|undefined,score=Infinity;
    for(const segment of this.segments) {
      if(this.isCollapsed(segment.trackIndex))continue;
      const laneDistance=Math.abs(this.lane-(segment.az+segment.bz)/2);
      if(laneDistance>segment.width/2-.6)continue;
      if(up.x*segment.n.x+up.y*segment.n.y<.18)continue;
      const along=clamp((point.x-segment.a.x)*segment.t.x+(point.y-segment.a.y)*segment.t.y,0,segment.length);
      const q={x:segment.a.x+segment.t.x*along,y:segment.a.y+segment.t.y*along};
      const nx=point.x-q.x,ny=point.y-q.y;
      const d=nx*segment.n.x+ny*segment.n.y;
      if(d<-.26||d>maxDistance||Math.hypot(nx,ny)>maxDistance+.15)continue;
      // At a loop crossing, stay on the continuous driven branch rather than jumping to its exit.
      const routeDiff=Math.abs(segment.s+along-this.route);
      const cost=Math.hypot(nx,ny)+(continuity&&!segment.recovery?Math.min(12,routeDiff)*.025:0);
      if(cost<score){score=cost;best={segment,point:q,distance:d,along};}
    }
    return best;
  }

  step(dt=P.fixedStep):void {
    if(this.mode==='crashed'||this.mode==='finished')return;
    if(this.input.accelerate||this.input.brake||this.input.thrust||this.input.boost||this.input.suction||Math.abs(this.input.pitch)>.05)this.respawnProtected=false;
    const suction=this.suctionActive();
    dt=clamp(dt,1/300,1/30);this.world.timestep=dt;
    this.elapsed+=dt;this.landing=Math.max(0,this.landing-dt);this.impactCooldown=Math.max(0,this.impactCooldown-dt);
    for(const [i,h] of this.level.hazards.entries())if(h.lampActivated&&!this.gateTimes.has(i)){const p=this.body.translation();if(h.x-p.x>0&&h.x-p.x<25&&Math.abs(h.y-p.y)<6&&Math.cos(this.body.rotation())>.5)this.gateTimes.set(i,this.worldTime);}
    this.updateMoving(this.worldTime,dt);
    const pos=this.body.translation(),velocity=this.body.linvel(),angle=this.body.rotation();
    this.events.begin(this.worldTime,pos,this.lane,velocity.x,this.level.tracks[this.trackIndex]?.id??'');
    this.updateEventColliders(this.worldTime,dt);
    const forward={x:Math.cos(angle),y:Math.sin(angle)},up={x:-forward.y,y:forward.x};
    // All visible roads in this lane remain solid, including previously passed roads.
    // Helical loop entry/exit are genuinely separated in render depth; only other lanes are filtered.
    for(const {segment,collider} of this.trackColliders)collider.setEnabled(!this.isCollapsed(segment.trackIndex)&&Math.abs(this.lane-(segment.az+segment.bz)/2)<segment.width/2-.6);
    for(const h of this.hazardColliders)h.collider.setEnabled(Math.abs(this.lane-h.z)<h.depth/2+1);
    this.body.resetForces(true);this.body.resetTorques(true);this.force={x:0,y:0};this.suctionForce={x:0,y:0};this.thrustForce={x:0,y:0};this.contacts=[];
    const apply=(force:Vec,point?:Vec)=>{this.force.x+=force.x;this.force.y+=force.y; if(point)this.body.addForceAtPoint(force,point,true);else this.body.addForce(force,true);};
    let normal={x:0,y:0},trackSpeed=0;
    for(let i=0;i<2;i++) {
      const side=(i===0?-1:1)*P.wheelBase/2;
      const wheel={x:pos.x+forward.x*side+up.x*P.axleY,y:pos.y+forward.y*side+up.y*P.axleY};
      const contact=this.nearest(wheel,up,suction?P.suctionReach:P.suspensionReach);
      this.suspension[i]=0;
      if(!contact)continue;
      const n=contact.segment.n;
      const pointVelocity=this.body.velocityAtPoint(wheel);
      const vn=(pointVelocity.x-contact.segment.vx)*n.x+(pointVelocity.y-contact.segment.vy)*n.y;
      const near=contact.distance<P.suspensionRest+.19;
      const adhering=suction&&contact.segment.suction;
      if(!near&&!adhering)continue;
      this.contacts.push(contact);normal.x+=n.x;normal.y+=n.y;
      this.suspension[i]=clamp((P.suspensionRest-contact.distance)/.2,-.5,1);
      const spring=clamp((P.suspensionRest-contact.distance)*P.spring-vn*P.damping,0,1200);
      apply({x:n.x*spring,y:n.y*spring},wheel);
      if(adhering){const pull={x:-n.x*P.suctionAcceleration/2,y:-n.y*P.suctionAcceleration/2};this.suctionForce.x+=pull.x;this.suctionForce.y+=pull.y;apply(pull,wheel);}
      trackSpeed+=(velocity.x-contact.segment.vx)*contact.segment.t.x+(velocity.y-contact.segment.vy)*contact.segment.t.y;
    }
    for(const c of this.contacts)if(this.level.tracks[c.segment.trackIndex].stability&&!this.collapseTimes.has(c.segment.trackIndex))this.collapseTimes.set(c.segment.trackIndex,this.worldTime);
    const grounded=this.contacts.length>0;
    this.boosting=grounded&&!!this.input.boost&&!this.input.thrust&&!this.input.brake&&this.pressure>.01;
    let chassisContact=false;this.world.contactPairsWith(this.bodyCollider,()=>{chassisContact=true;});
    const oldMode=this.mode;
    if(grounded) {
      const len=Math.hypot(normal.x,normal.y)||1;normal.x/=len;normal.y/=len;
      trackSpeed/=this.contacts.length;
      const tangent={x:normal.y,y:-normal.x};
      const contact=this.contacts.reduce((a,b)=>Math.abs(a.segment.s+a.along-this.route)<Math.abs(b.segment.s+b.along-this.route)?a:b);
      if(!contact.segment.recovery&&!contact.segment.optional)this.route=contact.segment.s+contact.along;
      const targetLane=contact.segment.az+(contact.segment.bz-contact.segment.az)*contact.along/contact.segment.length;
      if(contact.segment.recovery)this.lane+=clamp(targetLane-this.lane,-dt*3,dt*3);else if(contact.segment.width<=7)this.lane=targetLane;
      this.trackIndex=contact.segment.trackIndex;
      const adhered=suction&&this.contacts.some(c=>c.segment.suction);
      let drive=this.input.accelerate?P.acceleration*(1-clamp(trackSpeed/P.maxSpeed,0,1)**4):0;
      // Reverse mirrors the forward drive curve, so backing up reaches the same top
      // speed; braking out of forward motion still uses the stiffer P.brake first.
      const reverseDrive=-P.acceleration*(1-clamp(-trackSpeed/P.maxSpeed,0,1)**4);
      if(this.input.brake)drive=contact.segment.moving?(trackSpeed>1?-P.brake:-trackSpeed*18):trackSpeed>1?-P.brake:reverseDrive;
      if(contact.segment.moving&&!this.input.accelerate&&!this.input.brake)drive-=trackSpeed*12;
      drive-=trackSpeed*P.rollingDrag;
      apply({x:tangent.x*drive,y:tangent.y*drive});
      if(this.boosting){
        const ratio=Math.min(1,this.pressure/(P.boostPressureUse*dt));
        // Rear jets accelerate along the contacted road; no lift jets or upward impulse.
        this.thrustForce={x:tangent.x*P.boostAcceleration*ratio,y:tangent.y*P.boostAcceleration*ratio};
        apply(this.thrustForce);apply({x:-normal.x*P.boostGrip,y:-normal.y*P.boostGrip});
        this.pressure=Math.max(0,this.pressure-P.boostPressureUse*dt);
      }
      const targetAngle=Math.atan2(tangent.y,tangent.x);
      // Limited chassis torque assists suspension tracking; position and gravity are untouched.
      this.body.addTorque(wrap(targetAngle-angle)*34-this.body.angvel()*5,true);
      if(oldMode==='airborne'&&this.elapsed>.25) {
        const normalSpeed=-((velocity.x-contact.segment.vx)*normal.x+(velocity.y-contact.segment.vy)*normal.y);
        const landingError=Math.abs(wrap(angle-targetAngle));
        if(normalSpeed>9)this.takeDamage(Math.min(75,(normalSpeed-9)*2.7+Math.max(0,landingError-.5)*12),'HARD LANDING');
        if(this.health<=0)return;
        this.landing=.32;
      }
      this.mode=adhered?'adhered':this.landing>0?'landing':'grounded';
    } else {
      this.mode='airborne';if(!chassisContact)this.airtime+=dt;
      if(oldMode==='adhered'&&suction)this.adhesionWarningUntil=this.elapsed+.8;
      // Assistance damps rotation only in open air; the player must choose the landing angle.
      const recovering=chassisContact&&up.y<.5&&Math.hypot(velocity.x,velocity.y)<4;
      this.body.addTorque(clamp(this.input.pitch,-1,1)*(recovering?P.recoveryTorque:P.pitchTorque)-this.body.angvel()*P.airDamping,true);
      const under=this.nearest({x:pos.x,y:pos.y}, {x:0,y:1},3.3,false);
      if(under&&under.distance<2.3&&Math.abs(this.input.pitch)<.05) {
        this.body.addTorque(wrap(Math.atan2(under.segment.t.y,under.segment.t.x)-angle)*P.landingAssist,true);
      }
    }
    this.thrusting=this.input.thrust&&this.pressure>.01;
    if(this.thrusting) {
      const ratio=Math.min(1,this.pressure/(P.pressureUse*dt));
      this.thrustForce={x:(forward.x*P.thrustForward+up.x*P.thrustLift)*ratio,y:(forward.y*P.thrustForward+up.y*P.thrustLift)*ratio};apply(this.thrustForce);
      this.pressure=Math.max(0,this.pressure-P.pressureUse*dt);
    }
    this.windForce=windAt(this.level.windZones??[],pos,this.worldTime);apply(this.windForce);
    const speed=Math.hypot(velocity.x,velocity.y);
    apply({x:-velocity.x*speed*P.airDrag,y:-velocity.y*speed*P.airDrag});
    this.world.step();
    this.worldTime+=dt;
    const next=this.body.translation(),nv=this.body.linvel();
    let eventHit=this.events.collision(pos,next,this.lane,angle,this.worldTime-dt,dt);
    if(!eventHit)for(const actor of this.events.actors(this.worldTime)){
      const item=this.eventColliders.get(actor.id);if(!item||!actor.dangerous)continue;
      this.world.contactPair(this.bodyCollider,item.collider,m=>{if(m.numSolverContacts()>0&&this.events.hitCar(actor.eventId))eventHit='car';});
      if(eventHit)break;
    }
    if(eventHit==='battery'){this.health=0;this.damageEvents++;this.lastDamage=100;this.crash('BATTERY IMPACT · VEHICLE DESTROYED');return;}
    if(eventHit==='car'){this.takeDamage(70,'RUNAWAY VEHICLE IMPACT');if(this.health<=0)return;const rear=this.events.warning(this.worldTime)?.direction==='rear';this.body.applyImpulse({x:rear?4:-3,y:1.5},true);}
    this.events.finish(next,this.lane);
    this.maxSpeed=Math.max(this.maxSpeed,Math.hypot(nv.x,nv.y)*3.6);
    const rotation=wrap(this.body.rotation()-this.lastAngle);this.lastAngle=this.body.rotation();
    if(!grounded&&!chassisContact){this.rotationTravel+=rotation;this.flips=Math.floor(Math.abs(this.rotationTravel)/(Math.PI*2));}
    for(let i=this.checkpoint+1;i<this.level.checkpoints.length;i++) {
      const c=this.level.checkpoints[i];
      if(i!==this.checkpoint+1)break;
      if(Math.hypot(next.x-c.x,next.y-c.y)<5.2&&Math.abs(this.lane-(c.z??0))<3) {this.checkpoint=i;this.checkpointPressure=this.pressure;this.health=Math.min(100,this.health+25);this.checkpointTime=this.worldTime;this.checkpointEvents=this.events.save();this.checkpointCollapse=new Map(this.collapseTimes);this.checkpointGates=new Map(this.gateTimes);this.checkpointConsumed=new Set(this.consumed);this.message='CHECKPOINT';this.messageUntil=this.elapsed+2.4;}
    }
    let bodyContact=false;this.world.contactPairsWith(this.bodyCollider,()=>{bodyContact=true;});
    const collisionImpulse=Math.hypot(nv.x-velocity.x-this.force.x*dt,nv.y-velocity.y-(this.force.y-P.gravity)*dt);
    if(bodyContact&&collisionImpulse>4)this.takeDamage(Math.min(85,(collisionImpulse-4)*2.5),'STRUCTURAL IMPACT');
    const touching=new Set<number>();
    this.hazardColliders.forEach((h,i)=>{let contact=false;this.world.contactPair(this.bodyCollider,h.collider,manifold=>{if(manifold.numSolverContacts()>0)contact=true;});if(contact){touching.add(i);if(!this.touchedHazards.has(i))this.takeDamage(18+Math.min(35,speed*1.1),'OBSTACLE IMPACT');}});this.touchedHazards=touching;
    for(const item of this.level.collectibles??[]){
      if(this.collectedStars.has(item.id)||this.consumed.has(item.id))continue;
      const track=item.trackId?this.level.tracks.find(t=>t.id===item.trackId):undefined,offset=motionAt(track?.motion,this.worldTime);
      if(Math.abs(this.lane-(item.z??0))>2.5||Math.hypot(next.x-item.x-offset.x,next.y-item.y-offset.y)>2.15)continue;
      if(item.kind==='star'){this.collectedStars.add(item.id);this.pickup='CHALLENGE STAR COLLECTED';}
      else{this.consumed.add(item.id);this.pressure+=item.amount??25;this.pickup='PRESSURE REPLENISHED';}
      this.pickupUntil=this.elapsed+1.8;this.pickupEvent++;
    }
    if(this.health<=0)return;
    if(next.y<this.level.killY||next.x<-28){this.crash('TRACK LOST · Retry from your checkpoint.');return;}
    // Chassis-supported is distinct from free flight and valid inverted wheel adhesion.
    if(bodyContact&&!grounded&&Math.cos(this.body.rotation())<.5&&Math.hypot(nv.x,nv.y)<4){
      this.mode='overturned';
      const a=this.recoveryAnchor;
      if(!a||Math.hypot(next.x-a.x,next.y-a.y)>1.5||Math.abs(wrap(this.body.rotation()-a.angle))>.65){
        this.recoveryAnchor={x:next.x,y:next.y,angle:this.body.rotation()};this.fallenTime=0;
      }else this.fallenTime+=dt;
      if(this.fallenTime>.5)this.message=`VEHICLE OVERTURNED · Use pitch controls to right the car, or retry with R. · RECOVERY WINDOW ${Math.ceil(P.stuckTimeout-this.fallenTime)}s`;
      if(this.fallenTime>=P.stuckTimeout){this.crash('VEHICLE STUCK · Retry from your checkpoint.');return;}
    }else{
      this.recoveryAnchor=undefined;this.fallenTime=0;
      if(this.message.startsWith('VEHICLE OVERTURNED'))this.message='';
    }
    const f=this.level.finish;
    if(this.checkpoint===this.level.checkpoints.length-1&&next.x>=f.x&&Math.abs(next.y-f.y)<4&&grounded) {
      this.mode='finished';this.message='RUN COMPLETE';this.thrusting=false;
    }
  }

  private takeDamage(amount:number,reason:string):void {
    if(this.impactCooldown>0||amount<1||this.health<=0)return;
    this.lastDamage=Math.round(amount);this.health=Math.max(0,this.health-this.lastDamage);this.damageEvents++;this.impactCooldown=.7;
    this.message=`${reason} · -${this.lastDamage} HP`;this.messageUntil=this.elapsed+2.4;if(this.health<=0)this.crash('VEHICLE DESTROYED · Retry from your checkpoint.');
  }

  private crash(message:string):void { if(this.mode==='crashed')return;this.mode='crashed';this.crashes++;this.message=message;this.thrusting=false; }

  retry():void {
    this.events.restore(this.checkpointEvents);
    this.gateTimes=new Map(this.checkpointGates);this.collapseTimes=new Map(this.checkpointCollapse);this.windForce={x:0,y:0};
    this.worldTime=this.checkpointTime;this.updateMoving(this.worldTime,0,true);this.consumed=new Set(this.checkpointConsumed);this.pickup='';
    const cp=this.level.checkpoints[this.checkpoint],spawn=cp??this.level.start;
    let chosen:Segment|undefined,point={x:spawn.x,y:spawn.y},score=Infinity;
    const expected=cp?.angle;this.lane=cp?.z??0;
    for(const segment of this.segments){
      if(cp?.trackId&&this.level.tracks[segment.trackIndex].id!==cp.trackId)continue;
      if(segment.recovery||segment.optional||segment.moving||(expected!==undefined&&Math.abs(wrap(Math.atan2(segment.t.y,segment.t.x)-expected))>.7))continue;
      const along=clamp((spawn.x-segment.a.x)*segment.t.x+(spawn.y-segment.a.y)*segment.t.y,0,segment.length);
      const q={x:segment.a.x+segment.t.x*along,y:segment.a.y+segment.t.y*along};
      const cost=Math.hypot(q.x-spawn.x,q.y-spawn.y);
      if(cost<score){score=cost;chosen=segment;point={x:q.x+segment.n.x*.84,y:q.y+segment.n.y*.84};this.route=segment.s+along;this.trackIndex=segment.trackIndex;this.lane=segment.az+(segment.bz-segment.az)*along/segment.length;}
    }
    const angle=chosen?Math.atan2(chosen.t.y,chosen.t.x):(expected??0);
    this.updateEventColliders(this.worldTime,0,true);
    this.body.setTranslation(point,true);this.body.setRotation(angle,true);
    this.body.setLinvel({x:0,y:0},true);this.body.setAngvel(0,true);this.body.resetForces(true);this.body.resetTorques(true);
    this.health=100;this.pressure=this.checkpointPressure;this.mode='airborne';this.landing=0;this.contacts=[];this.thrusting=false;this.boosting=false;this.message='';this.fallenTime=0;this.recoveryAnchor=undefined;
    this.impactCooldown=1;this.touchedHazards.clear();this.lastDamage=0;
    this.respawnProtected=!!chosen?.suction;
    this.lastAngle=angle;this.input={accelerate:false,brake:false,thrust:false,pitch:0,suction:false};
    this.force={x:0,y:0};this.suctionForce={x:0,y:0};this.thrustForce={x:0,y:0};this.adhesionWarningUntil=0;
  }

  snapshot():GameSnapshot {
    const p=this.body.translation(),v=this.body.linvel(),speed=Math.hypot(v.x,v.y)*3.6;
    const normal=this.contacts.length?this.contacts[0].segment.n:{x:0,y:1};
    const movingContact=this.contacts.find(c=>c.segment.moving);
    return {roadActors:this.events.actors(this.worldTime),roadEvents:this.events.views(this.worldTime),roadWarning:this.events.warning(this.worldTime),eventsCleared:this.events.views(this.worldTime).filter(e=>e.phase==='clear').map(e=>e.id),collapseAges:Object.fromEntries([...this.collapseTimes].map(([i,at])=>[this.level.tracks[i].id,Math.max(0,this.worldTime-at-(this.level.tracks[i].stability?.delay??0))])),gateOffsets:this.level.hazards.map((_,i)=>this.gateOffset(i,this.worldTime)),windForce:{...this.windForce},collapsedTracks:this.level.tracks.filter((_,i)=>this.isCollapsed(i)).map(t=>t.id),collapseWarnings:[...this.collapseTimes].filter(([i])=>!this.isCollapsed(i)).map(([i,at])=>({id:this.level.tracks[i].id,remaining:Math.max(0,(this.level.tracks[i].stability?.delay??0)-(this.worldTime-at))})),x:p.x,y:p.y,z:this.lane,health:this.health,damageEvents:this.damageEvents,lastDamage:this.lastDamage,angle:this.body.rotation(),vx:v.x,vy:v.y,angularVelocity:this.body.angvel(),speed,pressure:this.pressure,mode:this.mode,suction:this.suctionActive(),respawnProtected:this.respawnProtected,thrusting:this.thrusting,boosting:this.boosting,grounded:this.contacts.length>0,time:this.elapsed,worldTime:this.worldTime,progress:this.mode==='finished'?1:clamp(this.route/this.totalRoute,0,1),checkpoint:this.checkpoint,trackIndex:this.trackIndex,crashes:this.crashes,airtime:this.airtime,flips:this.flips,maxSpeed:this.maxSpeed,stars:this.mode==='finished'?1+(this.elapsed<this.level.stars[1]?1:0)+(this.elapsed<this.level.stars[0]&&this.crashes===0&&this.health>=50?1:0):0,collectedStars:[...this.collectedStars],collectedItems:[...this.collectedStars,...this.consumed],pickup:this.elapsed<this.pickupUntil?this.pickup:'',pickupEvent:this.pickupEvent,platform:movingContact?this.level.tracks[movingContact.segment.trackIndex].id:null,message:(this.mode==='crashed'||this.mode==='finished'||this.mode==='overturned'||this.elapsed<this.messageUntil)?this.message:'',suspension:[...this.suspension],contactNormal:{...normal},contactPoints:this.contacts.map(c=>({...c.point})),force:{...this.force},suctionForce:{...this.suctionForce},thrustForce:{...this.thrustForce},braking:this.input.brake,adhesionWarning:this.elapsed<this.adhesionWarningUntil,pitchInput:this.input.pitch};
  }
  dispose():void {this.world.free();}
}
