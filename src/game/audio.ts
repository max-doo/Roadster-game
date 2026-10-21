import type { GameSnapshot } from './types';
import type { Settings } from './save';
const MUSIC = {
  menu:'night-club-chill', 1:'jumping-cyborg', 2:'new-factory', 3:'system-overload',
  4:'jumping-cyborg',5:'system-overload',6:'new-factory',7:'night-club-chill',8:'jumping-cyborg',9:'new-factory',10:'system-overload',
} as const;
type AudioScreen='loading'|'menu'|'levels'|'settings'|'garage'|'playing'|'paused'|'failed'|'complete';

export class GameAudio {
  context?:AudioContext; master?:GainNode; sfx?:GainNode; music?:GainNode;
  motor?:OscillatorNode; motorGain?:GainNode; wind?:GainNode; windFilter?:BiquadFilterNode; fan?:OscillatorNode; fanGain?:GainNode; jet?:GainNode; road?:GainNode; brake?:GainNode; brakeFilter?:BiquadFilterNode;
  settings?:Settings; previous?:GameSnapshot; active=false;
  private musicElement?:HTMLAudioElement;
  private musicSource?:MediaElementAudioSourceNode;
  private musicEnvelope?:GainNode;
  private musicTrack='';
  private musicScreen:AudioScreen='loading';
  private musicLevel=1;
  private musicHidden=false;
  private musicError='';
  private disposed=false;
  private playPending=false;
  async unlock(settings:Settings){
    if(this.disposed)return;
    this.settings=settings;
    try{
      if(!this.context){
        const ctx=new AudioContext();this.context=ctx;this.master=ctx.createGain();this.master.connect(ctx.destination);this.sfx=ctx.createGain();this.sfx.connect(this.master);this.music=ctx.createGain();this.music.connect(this.master);
        this.motor=ctx.createOscillator();this.motor.type='triangle';this.motorGain=ctx.createGain();this.motor.connect(this.motorGain);this.motorGain.connect(this.sfx);this.motor.start();
        this.fan=ctx.createOscillator();this.fan.type='sawtooth';this.fan.frequency.value=80;this.fanGain=ctx.createGain();const low=ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=220;this.fan.connect(low);low.connect(this.fanGain);this.fanGain.connect(this.sfx);this.fan.start();
        const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.5;
        const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;this.windFilter=ctx.createBiquadFilter();this.windFilter.type='bandpass';this.windFilter.frequency.value=600;this.wind=ctx.createGain();noise.connect(this.windFilter);this.windFilter.connect(this.wind);this.wind.connect(this.sfx);this.jet=ctx.createGain();const jetFilter=ctx.createBiquadFilter();jetFilter.type='highpass';jetFilter.frequency.value=1300;noise.connect(jetFilter);jetFilter.connect(this.jet);this.jet.connect(this.sfx);noise.start();
        const roadFilter=ctx.createBiquadFilter();roadFilter.type='lowpass';roadFilter.frequency.value=380;this.road=ctx.createGain();noise.connect(roadFilter);roadFilter.connect(this.road);this.road.connect(this.sfx);
        this.brakeFilter=ctx.createBiquadFilter();this.brakeFilter.type='bandpass';this.brakeFilter.Q.value=4;this.brake=ctx.createGain();noise.connect(this.brakeFilter);this.brakeFilter.connect(this.brake);this.brake.connect(this.sfx);
        // Gain defaults are audible; keep every continuous layer silent before the first update.
        for(const gain of [this.motorGain,this.fanGain,this.wind,this.jet,this.road,this.brake])gain.gain.value=0;
        const element=new Audio();element.loop=true;element.preload='none';
        this.musicElement=element;this.musicSource=ctx.createMediaElementSource(element);
        this.musicEnvelope=ctx.createGain();this.musicEnvelope.gain.value=0;
        this.musicSource.connect(this.musicEnvelope);this.musicEnvelope.connect(this.music);
        element.addEventListener('error',()=>{this.musicError='Unable to load background music';});
      }
      this.configure(settings);void this.context.resume();this.syncMusic();
    }catch{/* Sound remains optional when browser audio is unavailable. */}
  }
  setScene(screen:AudioScreen,level:number,hidden=false){
    if(screen===this.musicScreen&&level===this.musicLevel&&hidden===this.musicHidden)return;
    this.musicScreen=screen;this.musicLevel=level;this.musicHidden=hidden;this.syncMusic();
  }
  private syncMusic(){
    const element=this.musicElement,ctx=this.context,envelope=this.musicEnvelope;
    if(!element||!ctx||!envelope||this.disposed)return;
    // Settings opened from a run keep that run's track and playback position.
    const run=['playing','paused','failed','complete'].includes(this.musicScreen);
    const track=this.musicScreen==='settings'&&this.musicTrack?this.musicTrack:
      run?(MUSIC[this.musicLevel as keyof typeof MUSIC]??MUSIC[3]):MUSIC.menu;
    if(track!==this.musicTrack){
      element.pause();this.musicTrack=track;this.musicError='';
      element.src=`${import.meta.env.BASE_URL}audio/music/${track}.mp3`;
      envelope.gain.cancelScheduledValues(ctx.currentTime);envelope.gain.setValueAtTime(0,ctx.currentTime);
    }
    const stopped=this.musicHidden||['loading','paused','settings'].includes(this.musicScreen)||!!this.settings?.muted||this.settings?.music===0||this.settings?.master===0;
    if(stopped){element.pause();return;}
    envelope.gain.setTargetAtTime(['failed','complete'].includes(this.musicScreen)?.3:.65,ctx.currentTime,.25);
    if(element.paused&&!this.playPending){
      this.playPending=true;const requestedTrack=this.musicTrack;
      void element.play().then(()=>{
        this.musicError='';
        if(this.disposed||this.musicHidden||['loading','paused','settings'].includes(this.musicScreen)||this.settings?.muted||this.settings?.music===0||this.settings?.master===0)element.pause();
      }).catch(()=>{if(requestedTrack===this.musicTrack)this.musicError='Playback waiting for interaction or unavailable';}).finally(()=>{this.playPending=false;if(requestedTrack!==this.musicTrack)this.syncMusic();});
    }
  }
  configure(s:Settings){this.settings=s;if(this.context&&this.master&&this.sfx&&this.music){this.master.gain.setTargetAtTime(s.muted?0:s.master,this.context.currentTime,.05);this.sfx.gain.value=s.sfx;this.music.gain.value=s.music;}this.syncMusic();}
  tone(freq:number,duration=.1,volume=.06,delay=0){if(!this.context||!this.sfx)return;const c=this.context;const o=c.createOscillator();const g=c.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0,c.currentTime+delay);g.gain.linearRampToValueAtTime(volume,c.currentTime+delay+.01);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+delay+duration);o.connect(g);g.connect(this.sfx);o.start(c.currentTime+delay);o.stop(c.currentTime+delay+duration+.02);}
  click(){this.tone(850,.06,.035);}
  levels(){return {musicTrack:this.musicTrack,musicTime:this.musicElement?.currentTime??0,musicPaused:this.musicElement?.paused??true,musicReady:this.musicElement?.readyState??0,musicError:this.musicError,musicVolume:this.music?.gain.value??0,master:this.master?.gain.value??0,road:this.road?.gain.value??0,brake:this.brake?.gain.value??0,wind:this.wind?.gain.value??0,fan:this.fanGain?.gain.value??0,jet:this.jet?.gain.value??0};}
  update(s:GameSnapshot|null,running:boolean){
    if(!this.context||!this.motor||!this.motorGain||!this.wind||!this.fanGain||!this.jet)return;
    const t=this.context.currentTime;const speed=running&&s?s.speed:0;
    this.motor.frequency.setTargetAtTime(65+speed*2.1,t,.08);this.motorGain.gain.setTargetAtTime(running?.012+Math.min(speed/300,.045):0,t,.05);
    this.wind.gain.setTargetAtTime(running?Math.min(speed/(s?.grounded?1700:1100),.15):0,t,.1);this.windFilter?.frequency.setTargetAtTime(400+speed*6,t,.1);
    this.road?.gain.setTargetAtTime(running&&s?.grounded?Math.min(speed/1100,.09):0,t,.06);
    this.brake?.gain.setTargetAtTime(running&&s?.grounded&&s.braking&&speed>8?Math.min(speed/850,.09):0,t,.035);this.brakeFilter?.frequency.setTargetAtTime(900+speed*9,t,.06);
    const attitude=s&&['airborne','overturned'].includes(s.mode)&&!s.grounded&&Math.abs(s.pitchInput)>.05?Math.abs(s.pitchInput)*.045:0;
    this.fanGain.gain.setTargetAtTime(running&&s?.suction?.025:0,t,.06);this.jet.gain.setTargetAtTime(running?(s?.thrusting?.13:s?.boosting?.11:attitude):0,t,.03);
    if(s?.mode==='crashed'&&this.previous&&this.previous.mode!=='crashed'){this.tone(38,.5,.18);this.tone(70,.4,.08);}
    if(s&&this.previous&&running){
      const p=this.previous;

      if(s.roadActors?.some(a=>a.kind==='battery'&&!p.roadActors?.some(b=>a.id===b.id))){this.tone(145,.16,.1);this.tone(290,.1,.05,.06);}
      if(s.damageEvents>p.damageEvents){this.tone(65,.2,.1);this.tone(115,.1,.045,.05);}
      if(s.checkpoint>p.checkpoint){this.tone(660,.18);this.tone(990,.24,.06,.12);}
      if(s.mode==='adhered'&&p.mode!=='adhered')this.tone(340,.14);
      if(p.mode==='adhered'&&s.mode==='airborne'&&s.suction){this.tone(740,.09,.045);this.tone(440,.14,.045,.10);}
      if(s.mode==='landing'&&p.mode==='airborne')this.tone(55,.23,.15);
      if(s.mode==='finished'&&p.mode!=='finished')for(const [i,f]of [440,554,659,880].entries())this.tone(f,.5,.08,i*.14);
      if(s.pressure<1&&p.pressure>=1)this.tone(190,.2);
      if(s.pickupEvent>p.pickupEvent){this.tone(s.pickup==='CHALLENGE STAR COLLECTED'?880:620,.16,.06);this.tone(1108,.22,.04,.1);}
    }
    this.previous=s?{...s}:undefined;
  }
  dispose(){this.disposed=true;this.musicElement?.pause();this.musicElement?.removeAttribute('src');this.musicElement?.load();this.musicSource?.disconnect();void this.context?.close();}
}
