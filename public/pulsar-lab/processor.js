/* The repetition clock and carrier are independent. Each pulse snapshots its
   parameters; UI updates are smoothed, and output is ramped when gated. */
class PulsarProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.p = {rate:110,formant:880,duration:3,fold:0,mask:0,spread:0.35,waveform:'sine',window:'hann',target:'none',lfoRate:0.3,lfoDepth:0,gate:0};
    this.s = {...this.p}; this.clock=1; this.lfo=0; this.pulse=null; this.amp=0;
    this.oldX=[0,0]; this.oldY=[0,0];
    this.port.onmessage=({data})=>Object.assign(this.p,data);
  }
  carrier(phase,shape) {
    const p=phase-Math.floor(phase);
    if(shape==='triangle') return 1-4*Math.abs(p-.5);
    // PolyBLEP reduces discontinuities for saw and pulse carriers.
    const dt=this.carrierStep;
    const blep=(t)=>t<dt?(t/=dt,t+t-t*t-1):t>1-dt?(t=(t-1)/dt,t*t+t+t+1):0;
    if(shape==='saw') return 2*p-1-blep(p);
    if(shape==='pulse') return (p<.5?1:-1)+blep(p)-blep((p+.5)%1);
    return Math.sin(2*Math.PI*p);
  }
  envelope(t,shape) {
    if(t<0||t>=1)return 0;
    if(shape==='gaussian')return Math.max(0,(Math.exp(-.5*((t-.5)/.16)**2)-Math.exp(-.5*(.5/.16)**2))/(1-Math.exp(-.5*(.5/.16)**2)));
    if(shape==='exponential')return Math.min(1,t/.025)*Math.exp(-6*t)*(1-t);
    return .5-.5*Math.cos(2*Math.PI*t);
  }
  process(inputs,outputs) {
    const channels=outputs[0]; if(!channels?.length)return true;
    const sr=sampleRate;
    for(let i=0;i<channels[0].length;i++) {
      for(const key of ['rate','formant','duration','fold','spread','mask','lfoRate','lfoDepth'])this.s[key]+=(this.p[key]-this.s[key])*.001;
      this.lfo=(this.lfo+this.s.lfoRate/sr)%1;
      const m=Math.sin(this.lfo*2*Math.PI)*this.s.lfoDepth;
      const rate=Math.max(.1,Math.min(2000,this.s.rate*(this.p.target==='rate'?2**(m*2):1)));
      this.clock+=rate/sr;
      if(this.clock>=1) {
        this.clock%=1;
        const frequency=Math.min(sr*.2,this.s.formant*(this.p.target==='formant'?2**(m*3):1));
        const duration=Math.min(1/rate,this.s.duration/1000*(this.p.target==='duration'?2**(m*2):1));
        const pan=Math.max(-1,Math.min(1,this.p.target==='pan'?m:(Math.random()*2-1)*this.s.spread));
        this.pulse={age:0,duration:Math.max(2/sr,duration),frequency,pan,skip:Math.random()<this.s.mask,waveform:this.p.waveform,window:this.p.window,fold:this.s.fold};
      }
      let v=0;
      const b=this.pulse;
      if(b && b.age<b.duration) {
        this.carrierStep=b.frequency/sr;
        if(!b.skip) {
          v=this.carrier(b.age*b.frequency,b.waveform);
          // Continuous sine folding; folded harmonics may alias at extremes.
          if(b.fold>.001)v=Math.sin(v*(1+b.fold*7));
          v*=this.envelope(b.age/b.duration,b.window);
        }
        b.age+=1/sr;
      }
      this.amp+=(this.p.gate-this.amp)*.003;
      for(let c=0;c<channels.length;c++) {
        const pan=b?.pan??0;
        const x=v*this.amp*(c===0?Math.cos((pan+1)*Math.PI/4):Math.sin((pan+1)*Math.PI/4));
        const y=x-this.oldX[c]+.995*this.oldY[c];this.oldX[c]=x;this.oldY[c]=y;
        channels[c][i]=y*.7;
      }
    }
    return true;
  }
}
registerProcessor('pulsar',PulsarProcessor);
