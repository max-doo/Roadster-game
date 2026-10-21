import {localize} from './localize';
import { useEffect, useRef, useState } from 'react';

import type { PointerEvent as ReactPointerEvent } from 'react';

import { initPhysics, GameCore } from '../game/core';

import { LEVELS } from '../game/levels';

import type { GameSnapshot, InputState } from '../game/types';

import { InputManager } from '../game/input';

import { GameAudio } from '../game/audio';
import { GameHaptics } from '../game/haptics';

import { loadSave, persist, completeLevel } from '../game/save';

import type { SaveData, Settings } from '../game/save';

import { GameRenderer } from '../render/engine';

import type { VehicleView } from '../render/engine';

import { Icon } from './Icon';
import { Joystick } from './Joystick';



type Screen='loading'|'menu'|'levels'|'settings'|'garage'|'playing'|'paused'|'failed'|'complete';

const timeLabel=(n:number)=>`${Math.floor(n/60).toString().padStart(2,'0')}:${(n%60).toFixed(2).padStart(5,'0')}`;

export function App(){

  const host=useRef<HTMLDivElement>(null);const orbitPad=useRef<HTMLDivElement>(null);const orbitDrag=useRef<{id:number;x:number;y:number}|null>(null);const [orbitYaw,setOrbitYaw]=useState(0);const renderer=useRef<GameRenderer|null>(null);const core=useRef<GameCore|null>(null);const input=useRef<InputManager|null>(null);const audio=useRef(new GameAudio());const haptics=useRef(new GameHaptics());

  const [screen,setScreen]=useState<Screen>('loading');const screenRef=useRef<Screen>('loading');const [error,setError]=useState('');const [save,setSave]=useState<SaveData>(()=>loadSave());const saveRef=useRef(save);

  const [snap,setSnap]=useState<GameSnapshot|null>(null);const [levelId,setLevelId]=useState(1);const levelRef=useRef(1);const [best,setBest]=useState(false);const [view,setView]=useState<VehicleView>('hero');const [tutorial,setTutorial]=useState('');const tutorialRef=useRef('');const [portraitDismissed,setPortraitDismissed]=useState(false);const [debug,setDebug]=useState(false);const [activeControls,setActiveControls]=useState<InputState>({accelerate:false,brake:false,thrust:false,pitch:0,suction:false});

  const [controlSession,setControlSession]=useState(0);
  const [damageFlash,setDamageFlash]=useState(0);
  const backFromSettings=useRef<Screen>('menu');const qaManual=useRef(false);const finishHandled=useRef(false);const startup=useRef(performance.now());const readyMs=useRef(0);const [stored,setStored]=useState(true);

  function navigate(s:Screen){screenRef.current=s;setScreen(s);audio.current.setScene(s,levelRef.current,document.hidden);if(s!=='playing'){input.current?.release();setDamageFlash(0);}if(!['playing','failed','complete'].includes(s))haptics.current.stop();}

  function soundClick(){void audio.current.unlock(saveRef.current.settings);audio.current.click();}

  function updateSave(value:SaveData){saveRef.current=value;setSave({...value});setStored(persist(value));}

  function settingsChange(partial:Partial<Settings>){const next={...saveRef.current,settings:{...saveRef.current.settings,...partial}};updateSave(next);audio.current.configure(next.settings);haptics.current.configure(next.settings.vibration);if(partial.vibration)haptics.current.tap();if(partial.quality)renderer.current?.setQuality(partial.quality);if(partial.language)renderer.current?.setLanguage(partial.language);if(input.current)input.current.sensitivity=next.settings.sensitivity;}

  function start(id:number){
    setControlSession(value=>value+1);
    setDamageFlash(0);

    soundClick();core.current?.dispose();core.current=new GameCore(LEVELS[id-1]);haptics.current.reset(core.current.snapshot());levelRef.current=id;setLevelId(id);input.current?.reset();finishHandled.current=false;qaManual.current=false;renderer.current?.setLevel(LEVELS[id-1]);setSnap(core.current.snapshot());setTutorial('');navigate('playing');

  }

  function retry(){setControlSession(value=>value+1);setDamageFlash(0);soundClick();core.current?.retry();haptics.current.reset(core.current?.snapshot());input.current?.release();finishHandled.current=false;setTutorial('');setSnap(core.current?.snapshot()||null);navigate('playing');}

  function restart(){start(levelRef.current);}

  function menu(){setOrbitYaw(0);soundClick();core.current?.dispose();core.current=null;renderer.current?.setLevel(null);if(renderer.current)renderer.current.view='hero';setView('hero');setSnap(null);navigate('menu');}

  function pause(){if(screenRef.current==='playing'){soundClick();navigate('paused');}else if(screenRef.current==='paused'){soundClick();navigate('playing');}}

  function openSettings(){soundClick();backFromSettings.current=screenRef.current;navigate('settings');}

  function inspect(v:VehicleView){soundClick();setView(v);setOrbitYaw(0);if(renderer.current){renderer.current.view=v;renderer.current.menuYaw=0;renderer.current.menuPitch=0;}}

  function gameInput(){return core.current!.input;}

  function afterStep(){

    const game=core.current;if(!game)return;const s=game.snapshot();haptics.current.update(s);

    if(s.mode==='crashed'&&screenRef.current==='playing')navigate('failed');

    if(s.mode==='finished'&&!finishHandled.current){finishHandled.current=true;const current={...saveRef.current,records:{...saveRef.current.records}};setBest(completeLevel(current,levelRef.current,s));updateSave(current);navigate('complete');}

    return s;

  }

  useEffect(()=>{

    let alive=true;let raf=0;let previous=performance.now(),accumulator=0,ui=0;let inp:InputManager|undefined;let render:GameRenderer|undefined;

    async function boot(){try{

      await initPhysics();if(!alive)return;haptics.current.configure(saveRef.current.settings.vibration);inp=new InputManager();input.current=inp;inp.sensitivity=saveRef.current.settings.sensitivity;inp.onPause=pause;inp.onRestart=()=>{if(['playing','failed','paused'].includes(screenRef.current))retry();};

      render=new GameRenderer(host.current!);renderer.current=render;render.setQuality(saveRef.current.settings.quality);render.setLanguage(saveRef.current.settings.language);render.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();navigate('paused');setError('The graphics context was lost. Reload to restore the scene; saved records are retained.');});readyMs.current=performance.now()-startup.current;navigate('menu');

      if(import.meta.env.DEV){

        (window as unknown as Record<string,unknown>).__ROADSTER__={

          start:(id:number)=>start(Math.max(1,Math.min(LEVELS.length,id))),snapshot:()=>core.current?.snapshot(),

          input:(i:Partial<InputState>)=>{if(core.current)Object.assign(core.current.input,i);},

          manual:(value:boolean)=>{qaManual.current=value;},

          step:(frames=1,draw=true)=>{qaManual.current=true;for(let i=0;i<frames&&core.current;i++){core.current.step(1/120);afterStep();}const s=core.current?.snapshot();if(s){setSnap(s);if(draw)renderer.current?.render(s,1/60,performance.now()/1000,saveRef.current.settings.reducedMotion);}return s;},

          retry, pause, menu, view:(v:VehicleView)=>inspect(v),budget:()=>renderer.current?.budget(),stats:()=>({...renderer.current?.stats(),loadMs:readyMs.current,audioContext:audio.current.context?.state||'locked',audio:audio.current.levels()}),

          state:()=>({screen:screenRef.current,save:saveRef.current}),debug:(v:boolean)=>{if(renderer.current)renderer.current.debug=v;setDebug(v);}

        };

      }

      const loop=(now:number)=>{if(!alive)return;const dt=Math.min((now-previous)/1000,.08);previous=now;const playing=screenRef.current==='playing';

        if(playing&&core.current&&!qaManual.current){core.current.input=inp!.read();accumulator=Math.min(accumulator+dt*(tutorialRef.current?.55:1),.1);while(accumulator>=1/120){core.current.step(1/120);accumulator-=1/120;if(core.current.snapshot().mode==='crashed'||core.current.snapshot().mode==='finished')break;}afterStep();}else accumulator=0;

        const s=core.current?.snapshot()||null;render!.render(s,dt,now/1000,saveRef.current.settings.reducedMotion);audio.current.setScene(screenRef.current,levelRef.current,document.hidden);audio.current.update(s,playing);

        ui+=dt;if(ui>.05){ui=0;if(s)setSnap(s);setActiveControls(qaManual.current&&core.current?core.current.input:inp!.read());

          if(s&&playing){const level=LEVELS[levelRef.current-1];const upcoming=level.tutorials.filter(a=>s.x>=a.x&&(!a.condition||(s.mode==='airborne'&&(a.condition==='inverted-flight'?Math.cos(s.angle)<.5:Math.cos(s.angle)>=.5)))&&!saveRef.current.tutorials.includes(`${level.id}:${a.action}`)).at(-1);if(upcoming){const controls=qaManual.current?gameInput():inp!.read();const acted=upcoming.action==='accelerate'?controls.accelerate:upcoming.action==='brake'?controls.brake:upcoming.action==='thrust'?controls.thrust:upcoming.action==='suction'?controls.suction:upcoming.action==='release'?!controls.suction:Math.abs(controls.pitch)>.15;if(acted){saveRef.current.tutorials.push(`${level.id}:${upcoming.action}`);persist(saveRef.current);tutorialRef.current='';setTutorial('');}else {tutorialRef.current=upcoming.text;setTutorial(upcoming.text);}}else {tutorialRef.current='';setTutorial('');}}

        }

        raf=requestAnimationFrame(loop);

      };raf=requestAnimationFrame(loop);

    }catch(e){console.error('Roadster initialization failed',e);setError('Unable to start the 3D scene. Please reload the game.');}}

    void boot();const visibility=()=>{input.current?.release();if(document.hidden)haptics.current.stop();if(document.hidden&&screenRef.current==='playing')navigate('paused');audio.current.setScene(screenRef.current,levelRef.current,document.hidden);};const blur=()=>{haptics.current.stop();if(screenRef.current==='playing')navigate('paused');};document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',blur);

    return()=>{alive=false;cancelAnimationFrame(raf);core.current?.dispose();inp?.dispose();render?.dispose();audio.current.dispose();haptics.current.stop();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',blur);};

  },[]);

  useEffect(()=>{
    const pads=[orbitPad.current].filter((pad):pad is HTMLDivElement=>!!pad);if(!pads.length)return;
    // Consume only this custom swipe. React's delegated touch listeners are passive;
    // leaving the native gesture unconsumed can suppress the next button click.
    const consumeSwipe=(event:TouchEvent)=>{if(event.cancelable)event.preventDefault();};
    for(const pad of pads)pad.addEventListener('touchmove',consumeSwipe,{passive:false});
    return()=>{for(const pad of pads)pad.removeEventListener('touchmove',consumeSwipe);};
  },[screen]);
  useEffect(()=>{document.documentElement.lang=save.settings.language==='zh'?'zh-CN':'en';},[save.settings.language]);
  useEffect(()=>{
    const event=snap?.damageEvents??0;
    if(!event){setDamageFlash(0);return;}
    setDamageFlash(event);
    // Wall time bounds the feedback even when physics is stopped or CSS motion is disabled.
    const timeout=window.setTimeout(()=>setDamageFlash(0),450);
    return()=>window.clearTimeout(timeout);
  },[snap?.damageEvents,levelId]);
  const level=LEVELS[levelId-1];const inMission=['playing','paused','failed','complete'].includes(screen)||(screen==='settings'&&backFromSettings.current==='paused');

  function pointerDown(e:ReactPointerEvent<HTMLButtonElement>,action:string){e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);input.current?.press(e.pointerId,action);if(e.pointerType==='touch')haptics.current.tap();setActiveControls(input.current!.read());}

  function pointerUp(e:ReactPointerEvent<HTMLElement>){input.current?.lift(e.pointerId);if(input.current)setActiveControls(input.current.read());}

  const control=(action:string,label:string,icon:string,key:string,disabled=false)=>{
    const held=!!activeControls[action as keyof InputState];
    return (
      <div className="control-pod">
        <button
          aria-label={label}
          disabled={disabled||screen!=='playing'}
          className={`drive-control ${action} ${held?'held':''}`}
          onPointerDown={e=>pointerDown(e,action)}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          onLostPointerCapture={pointerUp}
        >
          <b className="control-core">
            <Icon name={icon} size={26}/>
          </b>
        </button>
        <span
          className="control-label"
          onPointerDown={e=>{const btn=e.currentTarget.parentElement?.querySelector('button');if(btn&&!btn.disabled)pointerDown(e as any,action);}}
          onPointerUp={pointerUp}
        >
          {label}
        </span>
        <kbd>{key}</kbd>
      </div>
    );
  };

  return localize(<main className={`app lang-${save.settings.language} screen-${screen}${inMission?' mission-shell':''}`}>

    <div className="scene" ref={host}/>

    <div className="vignette" aria-hidden="true"/>

    {error?<section className="loading-screen"><h1>Rendering interrupted</h1><p>{error}</p><p>WebGL 2 is required. Try reopening in a current Chrome, Edge or Safari browser.</p><button className="primary" onClick={()=>location.reload()}>Reload game</button></section>:screen==='loading'?<section className="loading-screen" role="status"><div className="load-emblem"/><h1>ROADSTER</h1><p>Preparing the proving ground</p><div className="loading-line"/></section>:null}

    {screen==='menu'&&<div ref={orbitPad} className="vehicle-orbit" role="slider" aria-label="Rotate vehicle" aria-valuemin={0} aria-valuemax={360} aria-valuenow={Math.round(((orbitYaw%(Math.PI*2))+Math.PI*2)%(Math.PI*2)*180/Math.PI)} tabIndex={0}
      onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);orbitDrag.current={id:e.pointerId,x:e.clientX,y:e.clientY};}}
      onPointerMove={e=>{const drag=orbitDrag.current;if(!drag||drag.id!==e.pointerId)return;renderer.current?.orbit((e.clientX-drag.x)*.009,(e.clientY-drag.y)*.006);setOrbitYaw(renderer.current?.menuYaw??0);drag.x=e.clientX;drag.y=e.clientY;}}
      onPointerUp={()=>{orbitDrag.current=null;}} onPointerCancel={()=>{orbitDrag.current=null;}} onLostPointerCapture={()=>{orbitDrag.current=null;}}
      onKeyDown={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();renderer.current?.orbit(e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0,e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0);setOrbitYaw(renderer.current?.menuYaw??0);}}}/>} 
    {!inMission&&screen!=='loading'&&<header className="brand-header"><button className="wordmark" onClick={menu} aria-label="Roadster home"><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span>R / GB</button><span className="header-caption">AUTOMOTIVE FLIGHT EXPERIMENT</span><div className="header-actions"><button className="icon-button" aria-label={save.settings.muted?'Unmute sound':'Mute sound'} onClick={()=>{soundClick();settingsChange({muted:!save.settings.muted});}}><Icon name={save.settings.muted?'mute':'sound'}/></button><button className="icon-button" aria-label="Fullscreen" onClick={()=>{soundClick();if(document.fullscreenElement)void document.exitFullscreen();else if(document.documentElement.requestFullscreen)void document.documentElement.requestFullscreen().catch(()=>{});}}><Icon name="expand"/></button></div></header>}

    {screen==='menu'&&<>

      <section className="menu-copy"><h1>ROADSTER<span>GRAVITY BREAKER</span></h1><p className="menu-description">Built for the road.<br/>Engineered to leave it.</p><div className="main-actions"><button className="primary start" onClick={()=>start(Math.min(save.unlocked,LEVELS.length))}>START <Icon name="arrow"/></button><button className="menu-link" onClick={()=>{soundClick();navigate('levels');}}>LEVEL SELECT <span>10 MISSIONS</span></button><button className="menu-link" onClick={openSettings}>SETTINGS <Icon name="settings" size={18}/></button></div></section>

      <div className="vehicle-caption"><strong>ROADSTER / 2026</strong><span className="orbit-hint">DRAG TO ROTATE</span><button onClick={()=>{soundClick();navigate('garage');}}>INSPECT VEHICLE <Icon name="eye" size={18}/></button></div>

      <footer className="menu-footer"><span>AN INDEPENDENT FAN-MADE GAME · NOT AFFILIATED WITH TESLA</span><span>ACCELERATE. ADHERE. ASCEND.</span></footer>

    </>}

    {screen==='garage'&&<><section className="garage-title"><button className="text-button" onClick={()=>{inspect('hero');navigate('menu');}}><Icon name="back"/>BACK</button><h1>ENGINEERED<br/>TO BREAK GRAVITY.</h1><p>Original 3D interpretation of the October 2026 prototype.<br/>Mechanical details are adapted for gameplay.</p></section><nav className="view-selector" aria-label="Vehicle views">{(['front','side','rear','top','bottom'] as VehicleView[]).map(v=><button key={v} aria-pressed={view===v} onClick={()=>inspect(v)}>{v==='front'?'FRONT ¾':v==='rear'?'REAR ¾':v.toUpperCase()}</button>)}</nav></>}

    {screen==='levels'&&<section className="missions-panel"><button className="text-button" onClick={menu}><Icon name="back"/>BACK</button><h1>MISSION ARCHIVE</h1><p>Ten missions. Two chapters. One machine.</p><div className="mission-list">{LEVELS.map((l,i)=>{const locked=l.id>save.unlocked;const record=save.records[l.id];return <button key={l.id} className={`mission-row ${locked?'locked':''}`} disabled={locked} onClick={()=>start(l.id)}><span className="mission-index">{String(l.id).padStart(2,'0')}</span><div><span className="mission-theme">{l.chapter==='faultline'?'FAULTLINE':'PROVING GROUNDS'} / {l.subtitle}</span><h2>{l.name}</h2><p>{l.description}</p></div><div className="mission-status">{locked?<><Icon name="lock"/><span>{`COMPLETE ${String(i).padStart(2,'0')} TO UNLOCK`}</span></>:record?<><div className="mini-stars">{[1,2,3].map(s=><span className={s<=record.stars?'earned':''} key={s}><Icon name="medal" size={15}/></span>)}</div><span>{timeLabel(record.time)} · {record.collectedStars?.length??0}/{(l.collectibles??[]).filter(c=>c.kind==='star').length}</span><Icon name="arrow"/></>:<><span>READY FOR LAUNCH</span><Icon name="arrow"/></>}</div></button>;})}</div></section>}

    {screen==='settings'&&<section className="settings-panel panel"><button className="text-button" onClick={()=>{soundClick();navigate(backFromSettings.current);}}><Icon name="back"/>BACK</button><h1>SETTINGS</h1><div className="settings-content"><div><h2>DISPLAY & CONTROLS</h2><label className="setting-row"><span>Language</span><select aria-label="Language" value={save.settings.language} onChange={e=>settingsChange({language:e.target.value as Settings['language']})}><option value="zh">中文</option><option value="en">English</option></select></label><label className="setting-row"><span>Graphics quality</span><select aria-label="Graphics quality" value={save.settings.quality} onChange={e=>settingsChange({quality:e.target.value as Settings['quality']})}>{['auto','high','medium','low'].map(q=><option value={q} key={q}>{q.toUpperCase()}</option>)}</select></label><label className="setting-row range"><span>Pitch sensitivity</span><input aria-label="Pitch sensitivity" type="range" min="0.5" max="1.6" step=".1" value={save.settings.sensitivity} onChange={e=>settingsChange({sensitivity:+e.target.value})}/></label><label className="setting-row"><span>Reduced camera motion</span><input aria-label="Reduced camera motion" type="checkbox" checked={save.settings.reducedMotion} onChange={e=>settingsChange({reducedMotion:e.target.checked})}/></label><label className="setting-row"><span>Vibration feedback</span><input aria-label="Vibration feedback" aria-describedby="vibration-help" type="checkbox" disabled={!haptics.current.supported} checked={haptics.current.supported&&save.settings.vibration} onChange={e=>settingsChange({vibration:e.target.checked})}/></label><p className="setting-help" id="vibration-help">{haptics.current.supported?'Short pulses for controls, landings and impacts. Enable vibration in your device settings.':'This browser does not support vibration feedback.'}</p><p className="setting-help">Keyboard: D accelerate · A brake · Space thrust · Shift boost<br/>Hold E for suction · W / S pitch · Esc pause · R retry<br/>Thrust pauses suction. Keep holding suction to resume.</p></div><div><h2>AUDIO</h2>{(['master','music','sfx'] as const).map(k=><label className="setting-row range" key={k}><span>{k==='sfx'?'SFX':k==='master'?'Master volume':'Music volume'}</span><input aria-label={k+' volume'} type="range" min="0" max="1" step=".05" value={save.settings[k]} onChange={e=>settingsChange({[k]:+e.target.value})}/></label>)}<label className="setting-row"><span>Mute all audio</span><input aria-label="Mute all audio" type="checkbox" checked={save.settings.muted} onChange={e=>settingsChange({muted:e.target.checked})}/></label><p className="setting-help">Music: Alexander Ehlers · CC0.<br/>Original synthesized vehicle effects.</p></div></div><p className="save-notice">{stored?'Settings and best runs are saved on this device.':'Device storage is unavailable. Records will last for this session.'}</p></section>}

    {inMission&&snap&&screen!=='settings'&&<>

      <header className="hud"><div className="hud-level"><div className={`health ${snap.health<=30?'critical':''}`} role="meter" aria-label="VEHICLE INTEGRITY" aria-valuemin={0} aria-valuemax={100} aria-valuenow={snap.health}><div><span>VEHICLE INTEGRITY</span><strong>{snap.health}%</strong></div><i><b style={{transform:`scaleX(${snap.health/100})`}}/></i></div></div><div className="hud-center"><div className="speed"><strong>{Math.round(snap.speed).toString().padStart(3,'0')}</strong><span>KM/H</span></div><div className={`pressure ${snap.pressure<15?'critical':''}`}><div><Icon name="thrust" size={15}/><span>GAS RESERVE</span><strong>{Math.max(0,Math.round(snap.pressure))} <small>units</small></strong></div><span className="pressure-help">{snap.boosting?'GROUND BOOST':snap.thrusting?'DISCHARGING':snap.pressure<1?'EMPTY · COLLECT GAS':'COLLECT CANS TO STOCKPILE'}</span></div></div><div className="hud-right"><div className="hud-run"><span className="run-time">{timeLabel(snap.time)}</span><span className="collection-caption" aria-label="Challenge stars collected"><Icon name="star" size={14}/><strong>{snap.collectedStars.length} / {(level.collectibles??[]).filter(c=>c.kind==='star').length}</strong><span>COLLECTED</span></span><span className="checkpoint-caption" title="CHECKPOINTS SAVE YOUR GAS"><Icon name="flag" size={13}/><span>CHECKPOINT</span><strong>{snap.checkpoint+1} / {level.checkpoints.length}</strong></span></div><button className="icon-button" aria-label="Pause game" onClick={pause}><Icon name="pause"/></button></div></header>

      <div className="level-progress"><i style={{transform:`scaleX(${snap.progress})`}}/>{level.checkpoints.map((c,i)=><span key={i} className={i<=snap.checkpoint?'passed':''} style={{left:`${(i+1)/(level.checkpoints.length+1)*100}%`}}/>)}</div>

      {screen==='playing'&&<>


        {snap.pickup&&<div className="pickup-feedback" key={`pickup-${snap.pickupEvent}`} role="status"><Icon name={snap.pickup==='CHALLENGE STAR COLLECTED'?'star':'thrust'} size={18}/>{snap.pickup}</div>}

        {damageFlash>0&&<div key={`damage-${damageFlash}`} className="damage-flash" aria-hidden="true"/>}


        {tutorial&&snap.mode!=='overturned'&&<div className="tutorial" role="status"><p>{tutorial}</p></div>}

        {(!tutorial||snap.mode==='overturned')&&snap.message&&snap.message!=='CHECKPOINT'&&<div className="mission-message" role="status">{snap.message}</div>}

        <Joystick key={controlSession} input={input.current!} language={save.settings.language} onEngage={()=>haptics.current.tap()}/>

        <div className="right-controls">{control('suction','Hold suction','fan','E · HOLD')}{control('boost','Ground boost','boost','SHIFT',snap.pressure<=0)}{control('thrust','THRUST','thrust','SPACE',snap.pressure<=0)}</div>

      </>}
      {screen==='paused'&&<div className="overlay"><section className="pause-panel"><h1>PAUSED</h1><p>Your next move can defy gravity.</p><button className="primary" onClick={pause}>RESUME <Icon name="play"/></button><button className="outline" onClick={restart}>RESTART MISSION <Icon name="reset"/></button><button className="outline" onClick={retry}>RETRY CHECKPOINT <Icon name="flag"/></button><div className="secondary-actions"><button onClick={openSettings}>SETTINGS</button><button onClick={menu}>MAIN MENU</button></div></section></div>}
      {screen==='failed'&&<div className={`overlay failed-overlay${snap.message.startsWith('BATTERY IMPACT')?' battery-failure':''}${save.settings.reducedMotion?' quiet':''}`}><section className="result-panel"><h1>RUN INTERRUPTED</h1><p>{snap.message||'The vehicle could not recover from the impact.'}</p><div className="failure-detail"><span>CHECKPOINT {snap.checkpoint+1}</span><span>GAS RETURNS TO CHECKPOINT RESERVE</span></div><button className="primary" onClick={retry}>RETRY CHECKPOINT <Icon name="reset"/></button><button className="text-button" onClick={menu}>RETURN TO HANGAR <Icon name="arrow"/></button></section></div>}
      {screen==='complete'&&<div className="overlay complete-overlay"><section className="result-panel"><h1>{level.id===LEVELS.length?'PROGRAM COMPLETE':level.name+' COMPLETE'}</h1><div className="stars medals" aria-label={`${snap.stars} of 3 medals`}>{[1,2,3].map(s=><span key={s} className={s<=snap.stars?'earned':''}><Icon name="medal" size={38}/></span>)}</div><p className="medal-label">{snap.stars===3?'GOLD MEDAL':snap.stars===2?'SILVER MEDAL':'FINISHER MEDAL'}</p><div className="result-collection" title="Collected across completed runs"><span>CHALLENGE STARS</span><div>{(level.collectibles??[]).filter(c=>c.kind==='star').map(c=><span key={c.id} className={save.records[level.id]?.collectedStars?.includes(c.id)?'earned':''}><Icon name="star" size={20}/></span>)}</div><strong>{save.records[level.id]?.collectedStars?.length??snap.collectedStars.length} / {(level.collectibles??[]).filter(c=>c.kind==='star').length}</strong></div><div className="result-stats"><div><span>RUN TIME</span><strong>{timeLabel(snap.time)}</strong></div><div><span>VEHICLE INTEGRITY</span><strong>{snap.health}%</strong></div><div><span>AIR TIME / FLIPS</span><strong>{snap.airtime.toFixed(1)}s / {snap.flips}</strong></div></div><p className="best-label">{best?'NEW PERSONAL BEST':'BEST '+timeLabel(save.records[level.id]?.time||snap.time)} · TOP SPEED {Math.round(snap.maxSpeed)} KM/H</p><p className="collection-help">Stars are optional. Collect them across runs.</p><p className="star-rule">Gold: finish under {level.stars[0]}s without failing and with at least 50 HP. Silver: under {level.stars[1]}s.</p><button className="primary" onClick={()=>level.id<LEVELS.length?start(level.id+1):menu()}>{level.id<LEVELS.length?'NEXT MISSION':'RETURN TO HANGAR'} <Icon name="arrow"/></button><div className="secondary-actions"><button onClick={()=>start(level.id)}>REPLAY MISSION</button><button onClick={()=>{menu();navigate('levels');}}>LEVEL SELECT</button></div></section></div>}
      {import.meta.env.DEV&&debug&&<pre className="debug-panel">{JSON.stringify({...renderer.current?.stats(),state:snap.mode,x:snap.x.toFixed(2),y:snap.y.toFixed(2),angle:snap.angle.toFixed(2),vx:snap.vx.toFixed(2),vy:snap.vy.toFixed(2),angularVelocity:snap.angularVelocity.toFixed(2),legend:"WHITE bounds / GREEN contacts / CYAN suction / ORANGE thrust / YELLOW checkpoints"},null,2)}</pre>}

    </>}

    {!portraitDismissed&&<div className="orientation-guide"><Icon name="rotate" size={42}/><h2>TURN YOUR WORLD.</h2><p>Rotate your device for the full driving experience.</p><button className="outline" onClick={()=>setPortraitDismissed(true)}>CONTINUE IN PORTRAIT</button></div>}

  </main>,save.settings.language);

}

