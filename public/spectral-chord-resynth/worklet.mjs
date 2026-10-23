import {createEngine} from './engine.mjs?v=010-web1';
const demoNotes=new Float64Array([261.625565,293.664768,349.228231,391.995436]);
class SpectralProcessor extends AudioWorkletProcessor {
  constructor(options){
    super();this.engine=createEngine(options.processorOptions.module,options.processorOptions.controls);
    this.source='demo';this.frames=0;this.sample=0;this.phases=new Float64Array(4);this.meterFrames=0;
    this.port.onmessage=({data})=>{
      if(data.type==='controls'&&Array.isArray(data.values)&&data.values.length===11)this.engine.controls.set(data.values);
      if(data.type==='source')this.source=data.source;
    };
    this.port.postMessage({type:'ready'});
  }
  process(inputs,outputs){
    const out=outputs[0];if(!out?.[0])return true;
    if(out[0].length!==128){this.port.postMessage({type:'error',message:'This browser’s audio block size is unsupported.'});return false;}
    const input=inputs[0]??[],e=this.engine;
    for(let i=0;i<128;i++){
      let left=0,right=0;
      if(this.source==='demo'){
        const t=this.sample/48000,step=Math.floor(t/2)%4;
        const envelope=.25+.75*Math.exp(-((t%2)*2));
        for(let j=0;j<4;j++){
          const hz=demoNotes[j]*(j===step?2:1);this.phases[j]=(this.phases[j]+hz/48000)%1;
          const phase=this.phases[j]*Math.PI*2;
          const value=(Math.sin(phase)+.28*Math.sin(phase*2)+.12*Math.sin(phase*3))*.045*envelope;
          left+=value;right+=value;
        }
      }else{
        left=input[0]?.[i]??0;
        // Keep dry mono on its input channel, as on Seed 3. Wet feeds both sides.
        right=input[1]?.[i]??0;
      }
      e.input[i]=left;e.input[128+i]=right;this.sample++;
    }
    e.api.resynth_process();out[0].set(e.left);if(out[1])out[1].set(e.right);
    this.meterFrames+=128;
    if(this.meterFrames>=2560){
      e.api.resynth_snapshot();this.port.postMessage({type:'meters',values:Array.from(e.meters),scope:Array.from(e.left)});this.meterFrames=0;
    }
    return true;
  }
}
registerProcessor('spectral-resynth-v010',SpectralProcessor);
