import {BloomEngine} from './engine.js';
class BloomProcessor extends AudioWorkletProcessor {
 constructor(){super();this.engine=new BloomEngine(sampleRate);this.frames=0;this.port.onmessage=e=>{try{this.engine.update(e.data)}catch(error){this.port.postMessage({error:error.message})}}}
 process(inputs,outputs){const out=outputs[0];if(!out||out.length<2)return true;this.engine.render(out[0],out[1]);this.frames+=out[0].length;if(this.frames>sampleRate/20){this.frames=0;this.port.postMessage({positions:this.engine.positions,time:this.engine.time})}return true}
}
registerProcessor('legio-bloom',BloomProcessor);
