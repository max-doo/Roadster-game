import {useRef, useState} from 'react';
import type {PointerEvent} from 'react';
import type {InputManager} from '../game/input';
import {translate} from '../game/i18n';
import type {Language} from '../game/i18n';

export function Joystick({input,language,onEngage}:{input:InputManager;language:Language;onEngage?:()=>void}){
  const pointer=useRef<number|null>(null);
  const [stick,setStick]=useState({x:0,y:0});
  const t=(text:string)=>translate(text,language);
  function move(e:PointerEvent<HTMLDivElement>){
    if(pointer.current!==e.pointerId)return;
    const bounds=e.currentTarget.getBoundingClientRect();
    const radius=bounds.width*.3;
    const x=(e.clientX-bounds.left-bounds.width/2)/radius;
    const y=(bounds.top+bounds.height/2-e.clientY)/radius;
    const length=Math.max(1,Math.hypot(x,y));
    input.moveJoystick(e.pointerId,x/length,y/length);
    setStick({x:x/length*radius,y:-y/length*radius});
  }
  function release(e:PointerEvent<HTMLDivElement>){
    if(pointer.current!==e.pointerId)return;
    input.lift(e.pointerId);pointer.current=null;setStick({x:0,y:0});
  }
  return <div className="joystick-control" role="group" aria-label={t('Drive and pitch joystick')}>
    <div className={`joystick ${pointer.current!==null?'held':''}`} title={t('Push right to accelerate, left to brake or reverse, up or down to pitch.')}
      onPointerDown={e=>{if(pointer.current!==null||e.button!==0)return;e.preventDefault();pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);if(e.pointerType==='touch')onEngage?.();move(e);}}
      onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>
      <svg className="joystick-dial" viewBox="0 0 160 160" fill="none" aria-hidden="true">
        <circle className="joystick-rim" cx="80" cy="80" r="76"/>
        <circle className="joystick-track" cx="80" cy="80" r="53"/>
        {[45,135,225,315].map(angle=><path key={angle} className="joystick-tick" d="M80 7v6" transform={`rotate(${angle} 80 80)`}/>)}
        <path className={`joystick-direction ${stick.y< -8?'engaged':''}`} d="m74 23 6-6 6 6"/>
        <path className={`joystick-direction ${stick.y>8?'engaged':''}`} d="m74 137 6 6 6-6"/>
        <path className={`joystick-direction ${stick.x< -8?'engaged':''}`} d="m23 74-6 6 6 6"/>
        <path className={`joystick-direction ${stick.x>8?'engaged':''}`} d="m137 74 6 6-6 6"/>
      </svg>
      <i className="joystick-thumb" aria-hidden="true" style={{transform:`translate(${stick.x}px,${stick.y}px)`}}><b/></i>
    </div>
    <kbd>A / D · W / S</kbd>
  </div>;
}
