import {CHORDS,WAVEFORMS,PARAMS,DEFAULTS,validatePatch,voiceFrequency} from './engine.js';
let state=structuredClone(DEFAULTS),ctx,node,master,analyser,splitter,leftAnalyser,rightAnalyser,outputRouter,outputRouted=false,playing=false,positions=[0,0,0,0,0],volume=.65,outputDeviceId='',outputPair=0;
const $=id=>document.getElementById(id);
const groups=[
 ['Pitch & voicing','Six reel chords plus four exploration families, each with four voicings.', ['chord','variation','octave','transpose','fine','tuning','tone']],
 ['Harmonic bloom','Choose a base wave, then let harmonics bloom.', ['waveform','bloom','bloomRate','partials','rolloff','bloomSpread']],
 ['Spatial movement','Give each note its own place and pace.', ['width','spatialRate','spatialSpread','staticWidth','pan']],
 ['Drift & breathing','Introduce small changes within the chord.', ['detune','detuneMix','life','drift','lifeRate']],
];
const choices={waveform:WAVEFORMS.map((name,i)=>[i,name]),chord:CHORDS.map((c,i)=>[i,`${i+1} · ${c.name}`]),variation:['Original','First note up','First two up','First three up','Alternating up','Last note up','Last two up','Penultimate up'].map((s,i)=>[i,`V${i+1} · ${s}`]),octave:[[-1,'−1 octave'],[0,'Original register'],[1,'+1 octave']]};
const optionMarkup=key=>key==='chord'
 ? `<optgroup label="Reel chords">${choices.chord.slice(0,6).map(([value,name])=>`<option value="${value}">${name}</option>`).join('')}</optgroup>${['G A C D','C D F G A','G B♭ C D F','C D E G'].map((label,i)=>`<optgroup label="New · ${label}">${choices.chord.slice(6+i*4,10+i*4).map(([value,name])=>`<option value="${value}">${name}</option>`).join('')}</optgroup>`).join('')}`
 : choices[key].map(([value,name])=>`<option value="${value}">${name}</option>`).join('');
function formatted(k,v){const d=PARAMS[k];if(d.unit==='%')return `${Math.round(v*100)}%`;if(d.unit==='pan')return v===0?'Center':`${Math.round(Math.abs(v)*100)}% ${v<0?'L':'R'}`;return `${Number(v.toFixed(2))}${d.unit?' '+d.unit:''}`}
function fill(el){el.style.setProperty('--fill',`${(el.value-el.min)/(el.max-el.min)*100}%`)}
function updateUI(){
 for(const [k,d]of Object.entries(PARAMS)){const input=$(k);input.value=state[k];$(`${k}-value`).textContent=formatted(k,state[k]);fill(input)}
 for(const k of Object.keys(choices))$(k).value=state[k];
 const reelTone=state.waveform===0&&state.chord<6;
 $('tone').disabled=!reelTone;
 $('tone').closest('.control').style.opacity=reelTone?'1':'.45';
 $('tone').title=state.chord>=6?'New chords use a sine base in Original reel mode':state.waveform===0?'Adjust the original reel overtones':'Available with the Original reel waveform';
 $('chord-note').textContent=state.chord>=6?'New chords use a sine base in Original reel mode. Bloom adds moving harmonics.':'';
 for(let v=0;v<5;v++){
  const hz=voiceFrequency(state,v),card=$(`voice-${v}`);card.classList.toggle('inactive',!hz);
  const midi=hz?Math.round(69+12*Math.log2(hz/440)):0;
  $(`note-${v}`).textContent=hz?['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][((midi%12)+12)%12]+(Math.floor(midi/12)-1):'—';
  $(`freq-${v}`).textContent=hz?`${hz.toFixed(1)} Hz`:'Inactive';
  $(`gain-${v}`).value=state.levels[v];$(`gain-${v}`).disabled=!hz;fill($(`gain-${v}`));$(`gain-value-${v}`).textContent=`${Math.round(state.levels[v]*100)}%`;
  for(const action of ['muted','solo']){const b=$(`${action}-${v}`);b.classList.toggle('selected',state[action][v]);b.setAttribute('aria-pressed',String(state[action][v]));b.disabled=!hz}
 }
}
function applyPatch(patch,custom=true){const clean=validatePatch(patch);Object.assign(state,clean);node?.port.postMessage(clean);updateUI();if(custom){$('patch-state').textContent='Custom sound';document.querySelectorAll('[data-preset]').forEach(b=>b.classList.remove('selected'))}return structuredClone(state)}
for(const [index,[title,description,keys]]of groups.entries()){
 const section=document.createElement('section');section.className='panel';section.innerHTML=`<div class="panel-heading"><span class="panel-index">0${index+1}</span><h3>${title}</h3></div><p>${description}</p>`;
 for(const key of keys){const div=document.createElement('div');div.className='control';if(choices[key]){const label={chord:'Chord',variation:'Octave variation',octave:'Register',waveform:'Base waveform'}[key];div.innerHTML=`<label for="${key}">${label}</label><select id="${key}">${optionMarkup(key)}</select>${key==='chord'?'<small id="chord-note" class="control-note" aria-live="polite"></small>':''}`}
  else{const d=PARAMS[key];div.innerHTML=`<label for="${key}">${d.label}<output id="${key}-value" for="${key}"></output></label><input type="range" id="${key}" min="${d.min}" max="${d.max}" step="${d.step}" value="${d.value}">`}
  section.append(div);
 }
 $('rack').append(section);
 for(const key of keys){$(key).addEventListener('input',e=>applyPatch({[key]:Number(e.target.value)}));$(key).addEventListener('dblclick',()=>applyPatch({[key]:DEFAULTS[key]}))}
}
for(let v=0;v<5;v++){
 const card=document.createElement('div');card.className='voice';card.id=`voice-${v}`;card.innerHTML=`<div class="voice-top"><strong id="note-${v}"></strong><span id="freq-${v}"></span></div><label for="gain-${v}">Voice ${v+1} <output id="gain-value-${v}"></output></label><input id="gain-${v}" type="range" min="0" max="1.5" step=".01" value="1"><div class="voice-actions"><button id="muted-${v}" aria-label="Mute voice ${v+1}" aria-pressed="false">Mute</button><button id="solo-${v}" aria-label="Solo voice ${v+1}" aria-pressed="false">Solo</button></div>`;$('voice-controls').append(card);
 $(`gain-${v}`).addEventListener('input',e=>{const levels=[...state.levels];levels[v]=Number(e.target.value);applyPatch({levels})});
 $(`gain-${v}`).addEventListener('dblclick',()=>{const levels=[...state.levels];levels[v]=1;applyPatch({levels})});
 for(const action of ['muted','solo'])$(`${action}-${v}`).onclick=()=>{const value=[...state[action]];value[v]=!value[v];applyPatch({[action]:value})};
}
const presets={reference:{bloom:0,width:0},bloom:{width:0},combined:{},slow:{bloom:.85,bloomRate:.35,spatialRate:.3,width:.9,detuneMix:.15,life:.12},bright:{bloom:1.5,partials:18,rolloff:.7,bloomRate:1.4,width:.7,spatialRate:.7}};
function preset(name){if(!Object.hasOwn(presets,name))throw Error('Unknown preset');state=structuredClone(DEFAULTS);applyPatch({...state,...presets[name]},false);document.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('selected',b.dataset.preset===name));$('patch-state').textContent=document.querySelector(`[data-preset="${name}"]`).textContent}
document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>preset(b.dataset.preset));
$('reset').onclick=()=>preset('combined');
$('volume').oninput=e=>{volume=Number(e.target.value);$('volume-value').textContent=`${Math.round(volume*100)}%`;fill(e.target);if(master)master.gain.setTargetAtTime(playing?volume:0,ctx.currentTime,.03)};
const outputNote=message=>{$('output-note').textContent=message};
function addOutputOption(device){
 if(!device.deviceId||device.deviceId==='default')return;
 let option=[...$('audio-output').options].find(o=>o.value===device.deviceId);
 if(!option){option=new Option(device.label||'Audio output',device.deviceId);$('audio-output').add(option)}
 else if(device.label)option.textContent=device.label;
}
function refreshOutputPairs(){
 const max=ctx?Math.min(8,ctx.destination.maxChannelCount):2;
 const menu=$('output-pair');menu.replaceChildren();
 for(let first=0;first+1<max;first+=2)menu.add(new Option(`${first+1} + ${first+2}`,String(first)));
 if(outputPair+1>=max)outputPair=0;
 menu.value=String(outputPair);
 menu.disabled=max<4;
 if(ctx&&outputDeviceId&&max<4)outputNote('This browser exposes only outputs 1 + 2. Set the ES-8 as the system output if device selection fails.');
}
function routeOutput(){
 if(!ctx||!master||!splitter)return;
 if(outputRouted)master.disconnect(ctx.destination);
 if(outputRouter){splitter.disconnect(outputRouter);outputRouter.disconnect();outputRouter=null}
 outputRouted=false;
 if(outputPair===0){ctx.destination.channelCount=2;master.connect(ctx.destination);outputRouted=true;return}
 const channels=outputPair+2;
 ctx.destination.channelCount=channels;
 ctx.destination.channelInterpretation='discrete';
 outputRouter=ctx.createChannelMerger(channels);
 outputRouter.channelInterpretation='discrete';
 splitter.connect(outputRouter,0,outputPair);
 splitter.connect(outputRouter,1,outputPair+1);
 outputRouter.connect(ctx.destination);
}
async function setOutputDevice(id){
 if(ctx){
  if(typeof ctx.setSinkId!=='function'&&id)throw Error('This browser cannot select an audio device. Set the ES-8 as your system output.');
  if(typeof ctx.setSinkId==='function')await ctx.setSinkId(id);
 }
 outputDeviceId=id;
 refreshOutputPairs();
 routeOutput();
 if(!ctx)outputNote(id?'Selected. Press Play to check available output pairs.':'Using the system default output.');
 else if(ctx.destination.maxChannelCount>=4)outputNote('Start low and patch the chosen ES-8 outputs to your mixer.');
}
$('find-outputs').onclick=async()=>{
 const button=$('find-outputs');button.disabled=true;
 try{
  if(!('setSinkId' in AudioContext.prototype))throw Error('This browser cannot select an audio device. Set the ES-8 as your system output.');
  if(!navigator.mediaDevices)throw Error('Audio device selection requires a secure browser page.');
  if(navigator.mediaDevices.selectAudioOutput){
   const device=await navigator.mediaDevices.selectAudioOutput();
   addOutputOption(device);$('audio-output').value=device.deviceId;
   await setOutputDevice(device.deviceId);
  }else{
   // Some browsers expose named outputs only after a brief device permission grant.
   let devices=await navigator.mediaDevices.enumerateDevices();
   if(!devices.some(d=>d.kind==='audiooutput'&&d.deviceId!=='default'&&d.label)){
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    stream.getTracks().forEach(track=>track.stop());
    devices=await navigator.mediaDevices.enumerateDevices();
   }
   for(const device of devices.filter(d=>d.kind==='audiooutput'))addOutputOption(device);
   outputNote($('audio-output').options.length>1?'Choose the ES-8 above. Any temporary input stream was stopped.':'No separate output was found. Connect the ES-8, then try again.');
  }
 }catch(error){outputNote(error.name==='NotAllowedError'?'Device access was declined. You can set the ES-8 as the system output.':error.message)}
 finally{button.disabled=false}
};
$('audio-output').onchange=async e=>{
 const previous=outputDeviceId;
 try{await setOutputDevice(e.target.value)}catch(error){e.target.value=previous;outputNote(error.message)}
};
$('output-pair').onchange=e=>{
 const previous=outputPair;
 try{outputPair=Number(e.target.value);routeOutput();outputNote(`Stereo routed to outputs ${outputPair+1} + ${outputPair+2}. Start low.`)}
 catch(error){outputPair=previous;e.target.value=String(previous);routeOutput();outputNote(`Could not use that output pair: ${error.message}`)}
};
async function start(){
 if(!ctx){
  ctx=new AudioContext({latencyHint:'interactive'});
  if(outputDeviceId)await ctx.setSinkId(outputDeviceId);
  refreshOutputPairs();
  await ctx.audioWorklet.addModule(new URL('./processor.js',import.meta.url));
  node=new AudioWorkletNode(ctx,'legio-bloom',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
  const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-9;compressor.knee.value=9;compressor.ratio.value=8;compressor.attack.value=.004;compressor.release.value=.15;
  master=ctx.createGain();master.gain.value=0;analyser=ctx.createAnalyser();analyser.fftSize=2048;
  splitter=ctx.createChannelSplitter(2);leftAnalyser=ctx.createAnalyser();rightAnalyser=ctx.createAnalyser();leftAnalyser.fftSize=2048;rightAnalyser.fftSize=2048;
  node.connect(compressor).connect(master);master.connect(analyser);master.connect(splitter);splitter.connect(leftAnalyser,0);splitter.connect(rightAnalyser,1);routeOutput();
  node.port.onmessage=e=>{if(e.data.positions)positions=e.data.positions;if(e.data.error)$('status').textContent=e.data.error};
  node.onprocessorerror=()=>{$('status').textContent='Audio stopped. Reload to restart.';master.gain.value=0;playing=false;$('play').textContent='Reload required';$('play').disabled=true};
  node.port.postMessage(state);
 }
 await ctx.resume();playing=true;master.gain.setTargetAtTime(volume,ctx.currentTime,.07);$('play').textContent='■ Stop';$('play').setAttribute('aria-pressed','true');$('status').textContent='Playing';
}
async function stop(){if(!ctx)return;playing=false;master.gain.setTargetAtTime(0,ctx.currentTime,.025);await new Promise(r=>setTimeout(r,160));await ctx.suspend();$('play').textContent='▶ Play';$('play').setAttribute('aria-pressed','false');$('status').textContent='Stopped'}
$('play').onclick=async()=>{const b=$('play');b.disabled=true;try{await(playing?stop():start())}catch(error){$('status').textContent=`Audio unavailable: ${error.message}`;if(ctx){await ctx.close().catch(()=>{});ctx=null;node=null;master=null;outputRouter=null;outputRouted=false}playing=false;b.textContent='▶ Try again'}finally{b.disabled=false}};
const waveData=[new Float32Array(2048),new Float32Array(2048)];
function canvasContext(id){const canvas=$(id),r=canvas.getBoundingClientRect(),dpr=devicePixelRatio||1;const w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,r.width,r.height);return[c,r.width,r.height]}
function draw(){
 const[c,w,h]=canvasContext('wave');c.strokeStyle='#2b353e';c.lineWidth=1;c.beginPath();c.moveTo(0,h/2);c.lineTo(w,h/2);c.stroke();
 let peak=0;
 for(let ch=0;ch<2;ch++){if(playing)(ch?rightAnalyser:leftAnalyser)?.getFloatTimeDomainData(waveData[ch]);else waveData[ch].fill(0);c.strokeStyle=ch?'#76c4d0aa':'#dfb56bcc';c.lineWidth=1.3;c.beginPath();for(let i=0;i<1024;i++){const sample=waveData[ch][i];peak=Math.max(peak,Math.abs(sample));const x=i/1023*w,y=h/2-sample*h*1.4;i?c.lineTo(x,y):c.moveTo(x,y)}c.stroke()}
 $('level').textContent=peak>1e-5?`${(20*Math.log10(peak)).toFixed(1)} dB`:'−∞ dB';
 const[p,pw,ph]=canvasContext('positions');p.strokeStyle='#33414a';p.beginPath();p.moveTo(pw/2,6);p.lineTo(pw/2,ph-8);p.stroke();
 for(let v=0;v<CHORDS[state.chord].notes.length;v++){const y=14+v*(ph-25)/5;const x=14+(positions[v]+1)/2*(pw-28);p.strokeStyle='#27343c';p.beginPath();p.moveTo(14,y);p.lineTo(pw-14,y);p.stroke();p.fillStyle=state.muted[v]||(state.solo.some(Boolean)&&!state.solo[v])?'#55616a':v%2?'#76c4d0':'#dfb56b';p.beginPath();p.arc(x,y,4,0,Math.PI*2);p.fill()}
 requestAnimationFrame(draw);
}
updateUI();fill($('volume'));refreshOutputPairs();draw();
// Feature-detected page tools configure the same live state as the controls.
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();const properties=Object.fromEntries(Object.entries(PARAMS).map(([k,d])=>[k,{type:d.step===1?'integer':'number',minimum:d.min,maximum:d.max}]));
 Object.assign(properties,{chord:{type:'integer',minimum:0,maximum:CHORDS.length-1},variation:{type:'integer',minimum:0,maximum:7},octave:{type:'integer',minimum:-1,maximum:1},waveform:{type:'integer',minimum:0,maximum:WAVEFORMS.length-1,description:'0 original reel, 1 sine, 2 triangle, 3 saw, 4 square'}});
 for(const tool of [
  {name:'read_synth_parameters',description:'Read the current drone parameters and playback state.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({parameters:structuredClone(state),playing,volume})},
  {name:'configure_synth_parameters',description:'Adjust drone sound parameters. Does not start audio. Use the visible Play button to listen.',inputSchema:{type:'object',properties,additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>({parameters:applyPatch(input)})},
 ]){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{})}catch{}}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
