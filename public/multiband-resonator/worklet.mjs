import {Resonator,makeVoicing,CEILING} from './dsp.mjs';
class LegioProcessor extends AudioWorkletProcessor {
  constructor(options){
    super();this.data=options.processorOptions.data;this.engine=new Resonator(this.data);
    this.monitor=false;this.monitorMix=0;this.inputPeak=0;this.noise=false;this.ping=0;this.rng=0x938ad2;this.frames=0;this.levels=Array(6).fill(0);
    this.port.onmessage=({data:p})=>{
      if(p.type==='ping'){this.ping=576;return;}
      if(p.type==='controls'){
        this.noise=p.source==='noise';this.monitor=Boolean(p.monitor);
        const voicing=makeVoicing(this.data,p.bank,p.rotation,p.root,p.octave);
        voicing.gains=voicing.gains.map((g,i)=>g*Math.max(0,Math.min(1,p.bandGains?.[i]??1)));
        this.engine.set(voicing,2*125**p.resonance,p.freeze);
      }
    };
  }
  random(){this.rng^=this.rng<<13;this.rng^=this.rng>>>17;this.rng^=this.rng<<5;return (this.rng>>>0)/2147483647.5-1;}
  process(inputs,outputs){
    const input=inputs[0],out=outputs[0];
    for(let i=0;i<out[0].length;i++){
      let excitation=0;
      if(this.noise)excitation=this.random();
      if(this.ping>0){excitation+=this.random()*(this.ping/576);this.ping--;}
      const left=input[0]?.[i]??0,right=input[1]?.[i]??left;
      this.inputPeak=Math.max(this.inputPeak,Math.abs(left),Math.abs(right));
      this.engine.process(left+excitation,right+excitation);
      this.monitorMix+=Math.max(-1/480,Math.min(1/480,(this.monitor?1:0)-this.monitorMix));
      const dryLeft=this.monitorMix?CEILING*Math.tanh(left/CEILING):0,dryRight=this.monitorMix?CEILING*Math.tanh(right/CEILING):0;
      out[0][i]=this.engine.left+(dryLeft-this.engine.left)*this.monitorMix;
      out[1][i]=this.engine.right+(dryRight-this.engine.right)*this.monitorMix;
      for(let b=0;b<6;b++)this.levels[b]=Math.max(this.levels[b],Math.abs(this.engine.lastBands[b]));
    }
    this.frames+=out[0].length;
    if(this.frames>=1600){
      this.port.postMessage({type:'meters',levels:this.levels,notes:this.engine.current,q:this.engine.q,inputPeak:this.inputPeak});
      this.levels=Array(6).fill(0);this.frames=0;this.inputPeak=0;
    }
    return true;
  }
}
registerProcessor('legio-resonator',LegioProcessor);
