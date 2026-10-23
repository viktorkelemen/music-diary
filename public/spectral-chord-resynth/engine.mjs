export function createEngine(module,initial){
  const instance=new WebAssembly.Instance(module,{}),api=instance.exports;
  api._initialize();
  const controls=new Float32Array(api.memory.buffer,api.resynth_controls(),11);
  if(initial)controls.set(initial);
  api.resynth_init();
  const output=new Float32Array(api.memory.buffer,api.resynth_output(),256);
  return {api,controls,left:output.subarray(0,128),right:output.subarray(128),input:new Float32Array(api.memory.buffer,api.resynth_input(),256),output,meters:new Float32Array(api.memory.buffer,api.resynth_meters(),40)};
}
