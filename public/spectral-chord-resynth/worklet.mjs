import {SpectralResynth,makeVoicing} from './dsp.mjs';
class LegioProcessor extends AudioWorkletProcessor {
  constructor(options){
    super();this.data=options.processorOptions.data;this.engine=new SpectralResynth(this.data);
    this.noise=false;this.ping=0;this.rng=0x938ad2;this.frames=0;this.levels=Array(6).fill(0);
    this.port.onmessage=({data:p})=>{
      if(p.type==='ping'){this.ping=576;return;}
      if(p.type==='controls'){
        this.noise=p.source==='noise';
        this.engine.setMode(p.mode??0);
        this.engine.set(makeVoicing(this.data,p.bank,p.rotation,p.root,p.octave),2*125**p.resonance,p.freeze,p.coupleRelease===false?p.release:-1);
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
      this.engine.process((input[0]?.[i]??0)+excitation,(input[1]?.[i]??input[0]?.[i]??0)+excitation);
      out[0][i]=this.engine.left;out[1][i]=this.engine.right;
      for(let b=0;b<6;b++)this.levels[b]=Math.max(this.levels[b],Math.abs(this.engine.lastBands[b]));
    }
    this.frames+=out[0].length;
    if(this.frames>=1600){
      this.port.postMessage({type:'meters',levels:this.levels,notes:this.engine.current,q:this.engine.q});
      this.levels=Array(6).fill(0);this.frames=0;
    }
    return true;
  }
}
registerProcessor('spectral-chord-resynth',LegioProcessor);
