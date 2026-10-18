import {makeVoicing,frequency,chordCount,wrap} from './dsp.mjs';
const $=id=>document.getElementById(id);
const bankNames=['HEX','cvChord','14 · Oct Stack','15 · 4th Stack','16 · 5th Stack',...Array.from({length:10},(_,i)=>`${i+17} · Utility`)];
const chordNames=[['S2','P5','7S','m7','M7'],['maj','min','maj7','min7','dom7','sus4','sus2','dim','aug']];
const pitches=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const noteName=n=>pitches[wrap(Math.round(n),12)]+(Math.floor(Math.round(n)/12)-1);
const state={bank:0,root:36,rotation:0,octave:0,resonance:.73,freeze:false,source:'ping',mode:0,release:.73,coupleRelease:false};
try{const saved=JSON.parse(localStorage.getItem('spectral-chord-resynth-selection'));if(saved&&Number.isInteger(saved.bank)&&saved.bank>=0&&saved.bank<15&&[-1,0,1].includes(saved.octave)){state.bank=saved.bank;state.octave=saved.octave;if([0,1,2].includes(saved.mode))state.mode=saved.mode;}}catch{}
let data,context,node,gain,buffer,sourceNode,loading=false,cvStep=0,notes=[],levels=Array(6).fill(0),visibleLevels=Array(6).fill(0);
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
function save(){try{localStorage.setItem('spectral-chord-resynth-selection',JSON.stringify({bank:state.bank,octave:state.octave,mode:state.mode}));}catch{}}
function updateNotes(){
  document.querySelectorAll('.band-label').forEach((el,i)=>{el.querySelector('.band-note-name').textContent=noteName(notes[i]);el.querySelector('.band-hz').textContent=frequency(notes[i]).toFixed(1)+' Hz';});
}
function render(){
  $('mode').value=state.mode;
  $('release').value=state.release;
  $('couple-release').checked=state.coupleRelease;
  $('release').disabled=state.coupleRelease;
  $('release-value').textContent=(.03*(4/.03)**(state.coupleRelease?state.resonance:state.release)).toFixed(3)+' s';
  $('bank').value=state.bank;$('bank-number').textContent=String(state.bank+1).padStart(2,'0')+' / 15';
  $('root-value').innerHTML=pitches[state.root%12]+'<span>'+(Math.floor(state.root/12)-1)+'</span>';
  $('root-hz').textContent=frequency(state.root).toFixed(2)+' Hz';
  $('q-value').innerHTML=(state.freeze?'250':(2*125**state.resonance).toFixed(0))+'<span>Q</span>';
  const chord=state.bank<2?chordNames[state.bank][state.rotation]:noteName(state.root+state.rotation)+' key';
  $('rotation-info').textContent=`${chord} · ${state.bank<2?'chord':'key'} ${state.rotation+1} of ${chordCount(state.bank)}`;
  $('voicing-label').textContent=bankNames[state.bank]+' / '+chord;
  $('freeze').setAttribute('aria-pressed',state.freeze);$('freeze-indicator').textContent=state.freeze?'FROZEN':'LIVE';$('freeze-indicator').classList.toggle('held',state.freeze);
  document.querySelectorAll('[data-octave]').forEach(el=>el.setAttribute('aria-pressed',Number(el.dataset.octave)===state.octave));
  document.querySelectorAll('[data-source]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.source===state.source));
  $('file-controls').hidden=state.source!=='file';$('ping').hidden=state.source==='file';
  if(!context||context.state!=='running'){notes=makeVoicing(data,state.bank,state.rotation,state.root,state.octave).notes;updateNotes();}
  node?.port.postMessage({type:'controls',...state});
}
function audioStatus(){
  const active=context?.state==='running';$('status').textContent=active?'48 kHz · stereo':'Audio off';$('status-dot').classList.toggle('active',active);$('power').innerHTML=active?'Pause audio <span>Ⅱ</span>':'Start audio <span>↗</span>';
}
async function startAudio(){
  if(!data)throw new Error('Chord data is still loading.');
  if(!context){
    context=new AudioContext({sampleRate:48000,latencyHint:'interactive'});
    if(context.sampleRate!==48000){await context.close();context=null;throw new Error('This browser cannot create a 48 kHz audio context. Please try Chrome or Firefox.');}
    try{
      await context.audioWorklet.addModule('./worklet.mjs');
      node=new AudioWorkletNode(context,'spectral-chord-resynth',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit',processorOptions:{data}});
      gain=context.createGain();gain.gain.value=Number($('volume').value);node.connect(gain).connect(context.destination);
      node.onprocessorerror=()=>{message('The audio processor stopped. Reload the page to restart.',true);context.suspend();};
      node.port.onmessage=({data:p})=>{if(p.type==='meters'){levels=p.levels;notes=p.notes;updateNotes();}};
      context.onstatechange=audioStatus;render();
    }catch(error){await context.close();context=null;node=null;throw error;}
  }
  await context.resume();audioStatus();
}
async function withAudio(action){if(loading)return;loading=true;$('power').disabled=true;try{await startAudio();await action();}catch(error){message(error.message,true);}finally{loading=false;$('power').disabled=false;}}
function stopFile(){if(sourceNode){sourceNode.stop();sourceNode.disconnect();sourceNode=null;}$('file-play').textContent='Play loop';}
function setBank(bank){state.bank=wrap(bank,15);state.rotation=0;save();render();}
function rotate(){state.rotation=wrap(state.rotation+1,chordCount(state.bank));render();}
function freeze(){state.freeze=!state.freeze;render();message(state.freeze?'Frozen: input closes over 5 ms. Sine amplitudes hold exactly; the raw tail rings out.':'Live: input is open and tuning follows the controls.');}
$('power').onclick=()=>{if(context?.state==='running'){context.suspend().then(audioStatus);return;}withAudio(()=>{message('Audio running. P to ping, R to rotate, Space to freeze.');if(state.source==='ping')node.port.postMessage({type:'ping'});});};
$('ping').onclick=()=>withAudio(()=>{node.port.postMessage({type:'ping'});message(state.freeze?'Input is frozen. Release Freeze to excite the bands.':'12 ms noise burst sent into the resonator.');});
$('bank-prev').onclick=()=>setBank(state.bank-1);$('bank-next').onclick=()=>setBank(state.bank+1);$('bank').onchange=e=>setBank(Number(e.target.value));$('rotate').onclick=rotate;$('freeze').onclick=freeze;
$('root').oninput=e=>{state.root=Number(e.target.value);state.rotation=0;render();};
$('release').oninput=e=>{state.release=Number(e.target.value);render();};
$('couple-release').onchange=e=>{state.coupleRelease=e.target.checked;render();};
$('mode').onchange=e=>{state.mode=Number(e.target.value);save();render();};
$('resonance').oninput=e=>{state.resonance=Number(e.target.value);render();};
$('volume').oninput=e=>{const volume=Number(e.target.value);$('volume-value').textContent=Math.round(volume*100)+'%';if(gain)gain.gain.setTargetAtTime(volume,context.currentTime,.01);};
for(const el of document.querySelectorAll('[data-octave]'))el.onclick=()=>{state.octave=Number(el.dataset.octave);save();render();};
for(const el of document.querySelectorAll('[data-source]'))el.onclick=()=>{state.source=el.dataset.source;if(state.source!=='file')stopFile();render();message(state.source==='noise'?(context?.state==='running'?'Noise is feeding the resonator continuously.':'Noise exciter selected. Start audio to hear the resonator.'):state.source==='file'?'Choose an audio file, then play it through the resonator. Files stay on this device.':'Send short noise bursts with the ping button or P.');};
$('cv').oninput=e=>{
  const volts=Number(e.target.value);$('cv-value').textContent=volts.toFixed(2)+' V';let next=cvStep;
  while(volts>=(next+1)*.42+.02)next++;
  while(next>0&&volts<next*.42-.02)next--;
  if(next>cvStep)state.rotation=wrap(state.rotation+next-cvStep,chordCount(state.bank));
  cvStep=next;render();
};
$('audio-file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  await withAudio(async()=>{
    const decoded=await context.decodeAudioData(await file.arrayBuffer());stopFile();buffer=decoded;
    $('file-name').textContent=file.name;$('file-play').disabled=false;message(`${file.name} loaded · ${decoded.duration.toFixed(1)} s. Press Play loop.`);
  });
};
$('file-play').onclick=()=>withAudio(()=>{
  if(sourceNode){stopFile();return;}
  if(!buffer)return;sourceNode=context.createBufferSource();sourceNode.buffer=buffer;sourceNode.loop=true;sourceNode.connect(node);sourceNode.start();$('file-play').textContent='Stop loop';message('Audio file looping through the six bands.');
});
document.addEventListener('keydown',e=>{
  if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName))return;
  if(e.code==='Space'){e.preventDefault();freeze();}
  if(e.code==='KeyP')$('ping').click();if(e.code==='KeyR')rotate();
});
const canvas=$('field'),ctx=canvas.getContext('2d');let width=0,height=0;
new ResizeObserver(()=>{const box=canvas.getBoundingClientRect();width=box.width;height=box.height;const dpr=window.devicePixelRatio||1;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}).observe(canvas);
function draw(){
  ctx.clearRect(0,0,width,height);const bottom=height-14,lane=width/6;
  ctx.strokeStyle='#30372a';ctx.lineWidth=.5;
  for(let y=35;y<height;y+=45){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
  for(let b=0;b<6;b++){
    const level=(context?.state==='running'?levels[b]:0);visibleLevels[b]+=(level-visibleLevels[b])*.12;
    const x=lane*(b+.5),color=b%2===0?'#e9b97b':'#a9c9b4';
    ctx.setLineDash([2,5]);ctx.strokeStyle='#424936';ctx.beginPath();ctx.moveTo(x,25);ctx.lineTo(x,bottom);ctx.stroke();ctx.setLineDash([]);
    const q=state.freeze?250:2*125**state.resonance,spread=lane/(4+Math.log2(q));
    const peak=height*.66+Math.min(visibleLevels[b]*250,height*.18);
    ctx.beginPath();ctx.moveTo(x-lane*.48,bottom);
    for(let i=0;i<=100;i++){const dx=(i/100-.5)*lane*.96;const y=bottom-peak/(1+(dx/spread)**2);ctx.lineTo(x+dx,y);}
    ctx.lineTo(x+lane*.48,bottom);ctx.strokeStyle=color;ctx.globalAlpha=.7;ctx.lineWidth=1.1;ctx.stroke();
    ctx.lineTo(x-lane*.48,bottom);ctx.fillStyle=color;ctx.globalAlpha=.035+Math.min(visibleLevels[b],.15);ctx.fill();ctx.globalAlpha=1;
    ctx.fillStyle=color;ctx.fillRect(x-2,bottom-peak-3,4,4);
    const meter=Math.min(visibleLevels[b]*200,40);ctx.globalAlpha=.75;ctx.fillRect(x-lane*.24,bottom+6,lane*.48*meter/40,2);ctx.globalAlpha=1;
  }
  requestAnimationFrame(draw);
}
try{
  const response=await fetch('./chords.json');if(!response.ok)throw new Error('Could not load chord data. Run make web-data.');data=await response.json();
  bankNames.forEach((name,i)=>{const option=document.createElement('option');option.value=i;option.textContent=name;$('bank').append(option);});
  for(let i=0;i<6;i++){const el=document.createElement('div');el.className='band-label';el.innerHTML=`<div class="band-note"><span class="band-index">0${i+1}</span><span class="band-note-name"></span></div><div class="band-hz"></div>`;$('bands').append(el);}
  render();draw();
}catch(error){message(error.message,true);$('power').disabled=true;}
