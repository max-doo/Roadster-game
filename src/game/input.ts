import type { InputState } from './types';
export class InputManager {
  keys=new Set<string>(); pointers=new Map<number,string>(); joystick:{id:number;x:number;y:number}|null=null; sensitivity=1;
  onPause=()=>{}; onRestart=()=>{};
  private down=(e:KeyboardEvent)=>{
    if((e.target as HTMLElement)?.matches('input,select,textarea')) return;
    const key=e.code;
    if(['Space','ShiftLeft','ShiftRight','ArrowRight','ArrowLeft','ArrowUp','ArrowDown','KeyW','KeyS','KeyD','KeyA','KeyE','Escape','KeyR'].includes(key))e.preventDefault();
    if(key==='Escape'&&!e.repeat)this.onPause();
    if(key==='KeyR'&&!e.repeat)this.onRestart();
    this.keys.add(key);
  };
  private up=(e:KeyboardEvent)=>{this.keys.delete(e.code);};
  private blur=()=>this.release();
  private pointerEnd=(e:PointerEvent)=>this.lift(e.pointerId);
  constructor(){window.addEventListener('keydown',this.down);window.addEventListener('keyup',this.up);window.addEventListener('blur',this.blur);window.addEventListener('pointerup',this.pointerEnd);window.addEventListener('pointercancel',this.pointerEnd);}
  press(id:number,action:string){this.pointers.set(id,action);}
  lift(id:number){this.pointers.delete(id);if(this.joystick?.id===id)this.joystick=null;}
  moveJoystick(id:number,x:number,y:number){
    if(this.joystick&&this.joystick.id!==id)return;
    const length=Math.max(1,Math.hypot(x,y));
    this.joystick={id,x:x/length,y:y/length};
  }
  read():InputState {
    const actions=new Set(this.pointers.values()); const key=(...names:string[])=>names.some(n=>this.keys.has(n));
    let pitch=(key('KeyW','ArrowUp')||actions.has('up')?1:0)-(key('KeyS','ArrowDown')||actions.has('down')?1:0);
    const axis=(value:number)=>Math.abs(value)<=.18?0:Math.sign(value)*(Math.abs(value)-.18)/.82;
    const drive=axis(this.joystick?.x??0);
    pitch+=axis(this.joystick?.y??0)*this.sensitivity;
    const thrust=key('Space')||actions.has('thrust');
    return {accelerate:key('KeyD','ArrowRight')||actions.has('accelerate')||drive>0,brake:key('KeyA','ArrowLeft')||actions.has('brake')||drive<0,thrust,boost:!thrust&&(key('ShiftLeft','ShiftRight')||actions.has('boost')),pitch:Math.max(-1,Math.min(1,pitch)),suction:!thrust&&(key('KeyE')||actions.has('suction'))};
  }
  release(){this.keys.clear();this.pointers.clear();this.joystick=null;}
  reset(){this.release();}
  dispose(){window.removeEventListener('keydown',this.down);window.removeEventListener('keyup',this.up);window.removeEventListener('blur',this.blur);window.removeEventListener('pointerup',this.pointerEnd);window.removeEventListener('pointercancel',this.pointerEnd);}
}
