import {Resonator,makeVoicing,CEILING,clamp} from './dsp.mjs?v=ping1';
const slew=1-Math.exp(-1/(.01*48000));
class LegioProcessor extends AudioWorkletProcessor {
  constructor(options){
    super();this.data=options.processorOptions.data;this.engine=new Resonator(this.data);
    this.monitor=false;this.monitorMix=0;this.inputPeak=0;this.outputPeak=0;
    this.source='ping';this.ping=0;this.rng=0x938ad2;this.frames=0;this.levels=Array(6).fill(0);
    this.wet=this.targetWet=1;this.gain=this.targetGain=1;
    this.autoSample=0;
    this.port.onmessage=({data:p})=>{
      if(p.type==='ping'){this.ping=576;return;}
      if(p.type==='controls'){
        if(this.source!==p.source){this.ping=0;if(p.source==='auto')this.autoSample=0;}
        this.source=p.source;this.monitor=Boolean(p.monitor);
        this.targetWet=Number.isFinite(p.wet)?clamp(p.wet,0,1):1;
        this.targetGain=Number.isFinite(p.level)?4*clamp(p.level,0,1)**2:1;
        const voicing=makeVoicing(this.data,p.bank,p.rotation,p.root,p.octave);
        voicing.gains=voicing.gains.map((g,i)=>g*Math.max(0,Math.min(1,p.bandGains?.[i]??1)));
        this.engine.set(voicing,2*125**p.resonance,p.freeze);
      }
    };
  }
  random(){this.rng^=this.rng<<13;this.rng^=this.rng>>>17;this.rng^=this.rng<<5;return (this.rng>>>0)/2147483647.5-1;}
  process(inputs,outputs){
    const input=inputs[0]??[],out=outputs[0];
    for(let i=0;i<out[0].length;i++){
      let excitation=0;
      if(this.source==='noise')excitation=this.random();
      if(this.source==='auto'&&this.autoSample++%144000===0)this.ping=576;
      if(this.ping>0){excitation+=this.random()*(this.ping/576);this.ping--;}
      const left=(input[0]?.[i]??0)+excitation,right=(input[1]?.[i]??input[0]?.[i]??0)+excitation;
      this.inputPeak=Math.max(this.inputPeak,Math.abs(left),Math.abs(right));
      this.engine.process(left,right);
      this.monitorMix+=Math.max(-1/480,Math.min(1/480,(this.monitor?1:0)-this.monitorMix));
      this.wet+=(this.targetWet-this.wet)*slew;this.gain+=(this.targetGain-this.gain)*slew;
      if(Math.abs(this.wet-this.targetWet)<1e-6)this.wet=this.targetWet;
      if(Math.abs(this.gain-this.targetGain)<1e-6)this.gain=this.targetGain;
      const mixedLeft=left*(1-this.wet)+this.engine.preLeft*this.wet;
      const mixedRight=right*(1-this.wet)+this.engine.preRight*this.wet;
      out[0][i]=CEILING*Math.tanh((mixedLeft+(left-mixedLeft)*this.monitorMix)*this.gain/CEILING);
      out[1][i]=CEILING*Math.tanh((mixedRight+(right-mixedRight)*this.monitorMix)*this.gain/CEILING);
      this.outputPeak=Math.max(this.outputPeak,Math.abs(out[0][i]),Math.abs(out[1][i]));
      for(let b=0;b<6;b++)this.levels[b]=Math.max(this.levels[b],Math.abs(this.engine.lastBands[b]));
    }
    this.frames+=out[0].length;
    if(this.frames>=1600){
      this.port.postMessage({type:'meters',levels:this.levels,notes:this.engine.current,q:this.engine.q,inputPeak:this.inputPeak,outputPeak:this.outputPeak});
      this.levels=Array(6).fill(0);this.frames=0;this.inputPeak=this.outputPeak=0;
    }
    return true;
  }
}
registerProcessor('legio-resonator',LegioProcessor);
