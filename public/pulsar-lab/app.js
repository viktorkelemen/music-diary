const $=id=>document.getElementById(id);
const defaults={rate:110,formant:880,duration:3,fold:0,mask:0,spread:.35,waveform:'sine',window:'hann',target:'none',lfoRate:.3,lfoDepth:0};
const patches={vowel:{...defaults},dust:{...defaults,rate:7,duration:5,formant:2300,mask:.32,spread:.85,window:'exponential'},glass:{...defaults,rate:220,formant:2700,duration:2,fold:.25,spread:.65,target:'formant',lfoRate:.12,lfoDepth:.22},bass:{...defaults,rate:55,formant:110,duration:13,fold:.32,waveform:'triangle',spread:.1},orbit:{...defaults,rate:1.5,formant:430,duration:100,spread:1,target:'formant',lfoRate:.08,lfoDepth:.5}};
let state={...defaults},ctx,node,analyser,gain,running=false,drone=true;
let spectrumData,timeData,held=new Map(),pointerNotes=new Map();
const specs=[['rate','RATE / PITCH',.25,1000,'Hz','Repetition becomes rhythm, then pitch.','primary',true],['formant','FORMANT',40,8000,'Hz','The frequency inside each burst.','primary',true],['duration','DURATION',.1,200,'ms','Burst length, capped at one period.','primary',true],['fold','WAVE FOLD',0,1,'%','Bend the waveform into new harmonics.','secondary',false],['mask','BURST MASK',0,.95,'%','Chance of leaving a burst silent.','secondary',false],['spread','STEREO SPREAD',0,1,'%','Random placement, from center to wide.','secondary',false]];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const formatted=(v,pct)=>pct?Math.round(v*100):Number(v.toFixed(v<10?2:1));
function send(){node?.port.postMessage({...state,gate:running&&(drone||held.size||pointerNotes.size)?1:0});}
function setValue(key,value){
  const spec=specs.find(s=>s[0]===key); if(!Number.isFinite(value))return;
  const oldDuty=state.duration*state.rate/1000;
  state[key]=clamp(value,spec[2],spec[3]);
  if(key==='rate'&&$('lock').value==='duty')state.duration=clamp(oldDuty*1000/state.rate,.1,200);
  updateControls();send();
}
for(const [key,label,min,max,unit,description,group,log] of specs){
  const el=document.createElement('div');el.className='control';
  el.innerHTML=`<div class="control-top"><label class="control-name" for="${key}-number">${label}</label><span class="control-index">${String(specs.findIndex(s=>s[0]===key)+1).padStart(2,'0')}</span></div><div class="value-line"><input id="${key}-number" type="number" aria-label="${label}" min="${unit==='%'?min*100:min}" max="${unit==='%'?max*100:max}" step="${unit==='%'?1:.1}"><span class="unit">${unit}</span></div><input type="range" id="${key}" aria-label="${label} slider" min="0" max="1000" step="1"><p>${description}</p>`;
  $(group).append(el);
  $(key).addEventListener('input',e=>{const t=Number(e.target.value)/1000;setValue(key,log?min*(max/min)**t:min+t*(max-min));});
  $(key+'-number').addEventListener('change',e=>setValue(key,Number(e.target.value)/(unit==='%'?100:1)));
}
function updateControls(){
  for(const [key,,min,max,unit,,,log]of specs){const v=state[key];$(key).value=1000*(log?Math.log(v/min)/Math.log(max/min):(v-min)/(max-min));$(key+'-number').value=formatted(v,unit==='%');}
  for(const key of ['waveform','window','target','lfoRate','lfoDepth'])$(key).value=state[key];
  $('lfoRateValue').textContent=state.lfoRate.toFixed(2)+' Hz';$('lfoDepthValue').textContent=Math.round(state.lfoDepth*100)+'%';
  $('duty-label').textContent=Math.round(Math.min(1,state.duration*state.rate/1000)*100)+'% ACTIVE';
  $('period-label').textContent=(1000/state.rate).toFixed(2)+' ms / period';
}
async function initialize(){
  if(ctx){if(ctx.state==='suspended')await ctx.resume();return;}
  const AudioContext=window.AudioContext||window.webkitAudioContext;
  if(!AudioContext)throw new Error('This browser does not support Web Audio.');
  const candidate=new AudioContext({latencyHint:'interactive'});
  try {
    await candidate.audioWorklet.addModule('./processor.js');
    const processor=new AudioWorkletNode(candidate,'pulsar',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2]});
    const output=candidate.createGain();output.gain.value=Number($('volume').value);
    const meter=candidate.createAnalyser();meter.fftSize=4096;meter.smoothingTimeConstant=.82;
    const limiter=candidate.createDynamicsCompressor();limiter.threshold.value=-6;limiter.knee.value=6;limiter.ratio.value=12;limiter.attack.value=.003;limiter.release.value=.12;
    processor.connect(output).connect(limiter).connect(meter).connect(candidate.destination);
    await candidate.resume();ctx=candidate;node=processor;gain=output;analyser=meter;
    spectrumData=new Uint8Array(meter.frequencyBinCount);timeData=new Float32Array(meter.fftSize);
  }catch(error){await candidate.close();throw error;}
}
let starting=false;
$('power').addEventListener('click',async()=>{
  if(starting)return;starting=true;
  try{await initialize();running=!running;document.body.classList.toggle('running',running);$('power').classList.toggle('active',running);$('power').textContent=running?'■ Stop audio':'↗ Start audio';$('status').textContent=running?'ENGINE ONLINE · STEREO':'ENGINE PAUSED';send();}
  catch(e){$('status').textContent='AUDIO ERROR';alert(e.message);}finally{starting=false;}
});
function toggleDrone(){drone=!drone;$('hold').setAttribute('aria-pressed',String(drone));$('hold').textContent=drone?'● Drone on':'○ Keyboard only';send();}
$('hold').onclick=toggleDrone;
for(const key of ['waveform','window','target','lfoRate','lfoDepth'])$(key).addEventListener('input',()=>{state[key]=key.startsWith('lfo')?Number($(key).value):$(key).value;updateControls();send();});
$('volume').oninput=()=>{const v=Number($('volume').value);$('volumeValue').textContent=Math.round(v*100)+'%';if(gain)gain.gain.setTargetAtTime(v,ctx.currentTime,.02);};
function applyPatch(patch){
  const next={...defaults};
  for(const[key,,min,max]of specs)if(Number.isFinite(patch[key]))next[key]=clamp(patch[key],min,max);
  for(const[key,options]of Object.entries({waveform:['sine','triangle','saw','pulse'],window:['hann','gaussian','exponential'],target:['none','rate','formant','duration','pan']}))if(options.includes(patch[key]))next[key]=patch[key];
  if(Number.isFinite(patch.lfoRate))next.lfoRate=clamp(patch.lfoRate,.02,8);
  if(Number.isFinite(patch.lfoDepth))next.lfoDepth=clamp(patch.lfoDepth,0,1);
  state=next;updateControls();send();
}
const custom={};
try{const saved=JSON.parse(localStorage.getItem('pulsar-patches')||'{}');for(const[key,p]of Object.entries(saved)){if(p&&typeof p==='object'){custom[key]=p;addPresetOption(key);}}}catch{}
function addPresetOption(name){if([...$('preset').options].some(o=>o.value===name))return;const opt=document.createElement('option');opt.value=name;opt.textContent=name.replace(/^user:/,'');$('preset').append(opt);}
$('preset').onchange=()=>applyPatch(patches[$('preset').value]||custom[$('preset').value]||defaults);
$('save').onclick=()=>{const name=prompt('Name this patch');if(!name?.trim())return;const key='user:'+name.trim().slice(0,80);custom[key]={...state};try{localStorage.setItem('pulsar-patches',JSON.stringify(custom));addPresetOption(key);$('preset').value=key;}catch{alert('Browser storage is unavailable. Use Export to save your patch.');}};
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({instrument:'pulsar-lab',version:1,...state},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='pulsar-patch.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onclick=()=>$('file').click();$('file').onchange=async()=>{try{const f=$('file').files[0];if(!f)return;const p=JSON.parse(await f.text());if(!p||typeof p!=='object'||!Number.isFinite(p.rate))throw new Error('Choose a Pulsar patch JSON file.');applyPatch(p);}catch(e){alert(e.message);}finally{$('file').value='';}};
const keyMap=['a','w','s','e','d','f','t','g','y','h','u','j','k'];
const black=[1,3,6,8,10];let whiteIndex=0;
for(let n=0;n<13;n++){
  const b=document.createElement('button');b.textContent=keyMap[n].toUpperCase();b.dataset.note=n;b.setAttribute('aria-label','Play MIDI note '+(48+n));
  if(black.includes(n)){b.className='black';b.style.left=(whiteIndex*31-10)+'px';}else whiteIndex++;
  b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);pointerNotes.set(e.pointerId,n);playNote(n);refreshKeys();};
  b.onpointerup=b.onpointercancel=e=>{pointerNotes.delete(e.pointerId);refreshKeys();restoreNote();};
  $('keyboard').append(b);
}
function refreshKeys(){document.querySelectorAll('[data-note]').forEach(b=>b.classList.toggle('pressed',[...held.values(),...pointerNotes.values()].includes(Number(b.dataset.note))));}
function playNote(n){setValue('rate',440*2**((48+n-69)/12));send();}
function restoreNote(){const notes=[...held.values(),...pointerNotes.values()];if(notes.length)playNote(notes.at(-1));else send();}
function editing(e){return ['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName)||e.metaKey||e.ctrlKey||e.altKey;}
window.addEventListener('keydown',e=>{if(editing(e)||e.repeat)return;if(e.code==='Space'){e.preventDefault();toggleDrone();return;}const n=keyMap.indexOf(e.key.toLowerCase());if(n<0)return;held.set(e.key.toLowerCase(),n);playNote(n);refreshKeys();});
window.addEventListener('keyup',e=>{if(held.delete(e.key.toLowerCase())){refreshKeys();restoreNote();}});
window.addEventListener('blur',()=>{held.clear();pointerNotes.clear();refreshKeys();send();});
function canvasContext(id){const c=$(id),dpr=window.devicePixelRatio||1;const w=c.clientWidth,h=c.clientHeight;if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);}const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);return[g,w,h];}
function grid(g,w,h){g.strokeStyle='#2c362d';g.lineWidth=1;g.beginPath();for(let x=0;x<=w;x+=w/12){g.moveTo(x,0);g.lineTo(x,h);}for(let y=0;y<=h;y+=h/4){g.moveTo(0,y);g.lineTo(w,y);}g.stroke();}
function envelope(t){if(t>=1)return 0;if(state.window==='gaussian')return Math.max(0,(Math.exp(-.5*((t-.5)/.16)**2)-.0075757)/.9924243);if(state.window==='exponential')return Math.min(1,t/.025)*Math.exp(-6*t)*(1-t);return .5-.5*Math.cos(2*Math.PI*t);}
function wave(phase){const p=phase-Math.floor(phase);let v=state.waveform==='sine'?Math.sin(p*Math.PI*2):state.waveform==='triangle'?1-4*Math.abs(p-.5):state.waveform==='saw'?2*p-1:p<.5?1:-1;if(state.fold>.001)v=Math.sin(v*(1+state.fold*7));return v;}
function draw(){
  const[g,w,h]=canvasContext('wave');grid(g,w,h);
  const period=1/state.rate,dur=Math.min(period,state.duration/1000),cycles=3,amp=h*.39;
  g.strokeStyle='#73875b';g.setLineDash([3,4]);g.beginPath();for(let x=0;x<w;x++){const t=((x/w)*cycles%1)*period;const v=envelope(t/dur);const y=h/2-v*amp;x?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();g.setLineDash([]);
  g.strokeStyle='#cfef79';g.lineWidth=1.6;g.beginPath();for(let x=0;x<w;x++){const t=((x/w)*cycles%1)*period;const y=h/2-wave(t*state.formant)*envelope(t/dur)*amp;x?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();
  const[s,sw,sh]=canvasContext('spectrum');if(sw){grid(s,sw,sh);if(analyser){analyser.getByteFrequencyData(spectrumData);analyser.getFloatTimeDomainData(timeData);let max=0;for(const v of timeData)max=Math.max(max,Math.abs(v));$('peak').textContent=max>1e-5?(20*Math.log10(max)).toFixed(1)+' dB':'−∞ dB';s.beginPath();s.moveTo(0,sh);for(let x=0;x<sw;x++){const f=20*1000**(x/sw);const bin=Math.min(spectrumData.length-1,Math.round(f/(ctx.sampleRate/2)*spectrumData.length));s.lineTo(x,sh-spectrumData[bin]/255*sh*.94);}s.lineTo(sw,sh);s.closePath();const fill=s.createLinearGradient(0,0,0,sh);fill.addColorStop(0,'#cfef7970');fill.addColorStop(1,'#cfef7905');s.fillStyle=fill;s.fill();s.strokeStyle='#b9d981';s.lineWidth=1;s.stroke();}else{s.font='10px monospace';s.fillStyle='#6e8167';s.textAlign='center';s.fillText('START AUDIO TO EXPLORE THE SPECTRUM',sw/2,sh/2);}}
  requestAnimationFrame(draw);
}
updateControls();draw();
