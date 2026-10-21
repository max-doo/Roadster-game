import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {InputManager} from '../src/game/input';

describe('combined driving joystick',()=>{
  let input:InputManager;
  let events:EventTarget;
  beforeEach(()=>{events=new EventTarget();vi.stubGlobal('window',events);input=new InputManager();});
  afterEach(()=>{input.dispose();vi.unstubAllGlobals();});
  it('maps horizontal drive and vertical pitch independently, including diagonals',()=>{
    input.moveJoystick(1,1,0);expect(input.read()).toMatchObject({accelerate:true,brake:false,pitch:0});
    input.moveJoystick(1,-1,0);expect(input.read()).toMatchObject({accelerate:false,brake:true,pitch:0});
    input.moveJoystick(1,0,1);expect(input.read()).toMatchObject({accelerate:false,brake:false,pitch:1});
    input.moveJoystick(1,1,-1);expect(input.read()).toMatchObject({accelerate:true,brake:false});expect(input.read().pitch).toBeLessThan(-.5);
    expect(Math.hypot(input.joystick!.x,input.joystick!.y)).toBeCloseTo(1);
  });
  it('ignores center jitter and applies pitch sensitivity',()=>{
    input.moveJoystick(1,.12,-.12);expect(input.read()).toMatchObject({accelerate:false,brake:false,pitch:0});
    input.sensitivity=.5;input.moveJoystick(1,0,1);expect(input.read().pitch).toBeCloseTo(.5);
  });
  it('keeps the joystick owner while other fingers hold suction or thrust',()=>{
    input.moveJoystick(1,1,1);input.moveJoystick(2,-1,-1);input.press(2,'suction');
    expect(input.read()).toMatchObject({accelerate:true,brake:false,suction:true});
    input.press(3,'thrust');expect(input.read()).toMatchObject({thrust:true,suction:false});
    input.lift(3);expect(input.read().suction).toBe(true);
    input.lift(1);expect(input.read()).toMatchObject({accelerate:false,brake:false,pitch:0,suction:true});
  });
  it('clears on pointer cancellation, blur and reset while retaining keyboard support',()=>{
    input.moveJoystick(1,1,1);
    const cancel=new Event('pointercancel');Object.defineProperty(cancel,'pointerId',{value:1});events.dispatchEvent(cancel);
    expect(input.read()).toMatchObject({accelerate:false,pitch:0});
    input.keys.add('KeyD');input.keys.add('KeyS');expect(input.read()).toMatchObject({accelerate:true,pitch:-1});
    events.dispatchEvent(new Event('blur'));expect(input.read()).toMatchObject({accelerate:false,pitch:0});
    input.moveJoystick(1,-1,1);input.reset();expect(input.read()).toMatchObject({brake:false,pitch:0});
  });
  it('supports keyboard and touch ground boost, with flight thrust taking priority',()=>{
    input.keys.add('ShiftLeft');expect(input.read()).toMatchObject({boost:true,thrust:false});
    input.keys.add('Space');expect(input.read()).toMatchObject({boost:false,thrust:true});
    input.reset();input.press(4,'boost');input.moveJoystick(1,1,0);expect(input.read()).toMatchObject({boost:true,accelerate:true});
    input.lift(4);expect(input.read().boost).toBe(false);
  });
});
