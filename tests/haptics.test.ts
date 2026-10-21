import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {GameHaptics} from '../src/game/haptics';
import type {GameSnapshot} from '../src/game/types';

const snapshot=(partial:Partial<GameSnapshot>={}):GameSnapshot=>({mode:'grounded',grounded:true,vy:0,checkpoint:0,damageEvents:0,lastDamage:0,pickupEvent:0,thrusting:false,boosting:false,...partial} as GameSnapshot);
let now=0;
const vibrate=vi.fn(()=>true);
beforeEach(()=>{
  now=0;vibrate.mockReset().mockReturnValue(true);
  vi.stubGlobal('navigator',{vibrate,userActivation:{hasBeenActive:true}});
  vi.stubGlobal('document',{hidden:false});
  vi.stubGlobal('window',{matchMedia:()=>({matches:true})});
  vi.spyOn(performance,'now').mockImplementation(()=>now);
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('mobile vibration feedback',()=>{
  it('pulses once for a held jet and lets a collision interrupt control feedback',()=>{
    const h=new GameHaptics();h.reset(snapshot());
    h.update(snapshot({boosting:true}));
    for(let i=0;i<100;i++)h.update(snapshot({boosting:true}));
    expect(vibrate.mock.calls).toEqual([[18]]);
    h.update(snapshot({boosting:true,damageEvents:1,lastDamage:70}));
    expect(vibrate).toHaveBeenLastCalledWith([45,30,65]);
    h.update(snapshot({mode:'crashed',damageEvents:2,lastDamage:100}));
    expect(vibrate).toHaveBeenLastCalledWith([65,45,110]);
  });

  it('distinguishes hard landings, pickups, checkpoints and finishing without buzzing on spawn',()=>{
    const h=new GameHaptics();h.reset(snapshot({mode:'airborne',grounded:false,checkpoint:-1}));
    h.update(snapshot());expect(vibrate).not.toHaveBeenCalled();
    h.update(snapshot({mode:'airborne',grounded:false,vy:-10}));h.update(snapshot());
    expect(vibrate).toHaveBeenLastCalledWith(32);
    now+=200;h.update(snapshot({pickupEvent:1,pickup:'CHALLENGE STAR COLLECTED'}));
    expect(vibrate).toHaveBeenLastCalledWith([10,35,18]);
    now+=200;h.update(snapshot({pickupEvent:1,checkpoint:1}));
    expect(vibrate).toHaveBeenLastCalledWith([12,45,12]);
    h.update(snapshot({pickupEvent:1,checkpoint:1,mode:'finished'}));
    expect(vibrate).toHaveBeenLastCalledWith([20,55,35,55,55]);
  });

  it('cancels immediately when disabled and does not replay old hits after a retry',()=>{
    const h=new GameHaptics();h.reset(snapshot());h.tap();h.configure(false);
    expect(vibrate).toHaveBeenLastCalledWith(0);
    vibrate.mockClear();h.update(snapshot({damageEvents:1}));h.tap();expect(vibrate).not.toHaveBeenCalled();
    h.configure(true);h.reset(snapshot({damageEvents:1}));h.update(snapshot({damageEvents:1}));
    expect(vibrate).not.toHaveBeenCalled();
    now+=200;h.update(snapshot({damageEvents:2,lastDamage:12}));expect(vibrate).toHaveBeenLastCalledWith(30);
  });

  it('safely skips unsupported, background, mouse-only and unactivated contexts',()=>{
    const h=new GameHaptics();
    vi.stubGlobal('navigator',{});expect(h.supported).toBe(false);expect(()=>h.tap()).not.toThrow();
    vi.stubGlobal('navigator',{vibrate,userActivation:{hasBeenActive:false}});h.tap();
    vi.stubGlobal('navigator',{vibrate});vi.stubGlobal('document',{hidden:true});h.tap();
    vi.stubGlobal('document',{hidden:false});vi.stubGlobal('window',{matchMedia:()=>({matches:false})});h.tap();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('tolerates browser refusal or exceptions without interrupting the game',()=>{
    const h=new GameHaptics();vibrate.mockReturnValue(false);h.tap();
    vibrate.mockImplementation(()=>{throw new Error('Blocked by browser');});
    expect(()=>{h.tap();h.stop();}).not.toThrow();
  });
});
