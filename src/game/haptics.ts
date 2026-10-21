import type {GameSnapshot} from './types';

/** Short, event-driven pulses; held controls never start a vibration loop. */
export class GameHaptics {
  private enabled=true;
  private previous:GameSnapshot|undefined;
  private busyUntil=0;

  get supported(){return typeof navigator.vibrate==='function';}

  configure(enabled:boolean){this.enabled=enabled;if(!enabled)this.stop();}

  tap(){this.pulse(8);}

  private pulse(pattern:number|number[],interrupt=false){
    if(!this.enabled||!this.supported||document.hidden||!window.matchMedia('(pointer: coarse)').matches||navigator.userActivation?.hasBeenActive===false)return;
    const now=performance.now();
    if(!interrupt&&now<this.busyUntil)return;
    try{
      if(navigator.vibrate(pattern))this.busyUntil=now+Math.max(100,typeof pattern==='number'?pattern:pattern.reduce((sum,ms)=>sum+ms,0));
    }catch{/* Feedback is optional when the browser or device blocks vibration. */}
  }

  stop(){
    if(this.busyUntil>performance.now()&&this.supported){try{navigator.vibrate(0);}catch{}}
    this.busyUntil=0;
  }

  reset(snapshot?:GameSnapshot){this.stop();this.previous=snapshot;}

  update(s:GameSnapshot){
    const p=this.previous;this.previous=s;
    if(!p)return;
    // Impacts take priority over lighter control and reward feedback.
    if(s.mode==='crashed'&&p.mode!=='crashed')this.pulse([65,45,110],true);
    else if(s.mode==='finished'&&p.mode!=='finished')this.pulse([20,55,35,55,55],true);
    else if(s.damageEvents>p.damageEvents)this.pulse(s.lastDamage>=30?[45,30,65]:30,true);
    else if(!p.grounded&&s.grounded&&p.vy< -2)this.pulse(Math.min(45,12+Math.abs(p.vy)*2));
    else if(s.pickupEvent>p.pickupEvent)this.pulse(s.pickup==='CHALLENGE STAR COLLECTED'?[10,35,18]:12);
    else if(s.checkpoint>p.checkpoint&&p.checkpoint>=0)this.pulse([12,45,12]);
    else if(s.mode==='adhered'&&p.mode!=='adhered')this.pulse(12);
    else if((s.thrusting&&!p.thrusting)||(s.boosting&&!p.boosting))this.pulse(18);
  }
}
