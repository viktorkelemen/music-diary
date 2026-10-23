const $=id=>document.getElementById(id);
const noteNames=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const noteName=n=>noteNames[((Math.round(n)%12)+12)%12]+(Math.floor(Math.round(n)/12)-1);
const chords=[['S2',[0,2,5,7]],['P5',[0,7,12,19]],['7S',[0,2,7,10]],['Minor 7',[0,3,7,10]],['Major 7',[0,4,7,11]],['Major',[0,4,7,12]],['Minor',[0,3,7,12]],['Dominant 7',[0,4,7,10]],['Sus4',[0,5,7,12]],['Sus2',[0,2,7,12]],['Diminished',[0,3,6,12]],['Augmented',[0,4,8,12]]];
const voicings=['Original','First up','First two up','First three up','Alternating up','Last up','Last two up','Penultimate up'];
const masks=[0,1,3,7,10,8,12,4];
const defaults=[.5,.5,.1,1,1,.5,0,.4];
const state={pots:[...defaults],chord:0,voicing:0,freeze:false,source:'demo'};
const timeLabel=t=>t<1?Math.round(t*1000)+' ms':t.toFixed(2)+' s';
const morphLabel=x=>{const names=['Sine','Triangle','Saw','Square'];const p=x*3,i=Math.min(2,Math.floor(p)),f=p-i;if(f<.02)return names[i];if(f>.98)return names[i+1];return names[i]+' / '+names[i+1];};
const specs=[
 ['root','Root','C2','C6',x=>noteName(36+Math.round(48*x)),'Transpose the whole chord.'],
 ['brightness','Brightness','DARK','BRIGHT',x=>Math.abs(x-.5)<.01?'Neutral':Math.round(x*100)+'%','Balance low and high note voices.'],
 ['attack','Attack','2 ms','500 ms',x=>timeLabel(.002*250**x),'How quickly new notes appear.'],
 ['detail','Detail','1 PARTIAL','12 PARTIALS',x=>String(1+Math.round(11*x)),'Keep fewer or more input partials.'],
 ['wet','Dry/wet','DRY','WET',x=>Math.round(x*100)+'% wet','Blend the original with the resynth.'],
 ['level','Level','MUTE','+12 dB',x=>x<.002?'Mute':(Math.abs(x-.5)<.002?'0':(20*Math.log10(4*x*x)).toFixed(1))+' dB','Master level. Noon is unity.'],
 ['morph','Morph','SINE','SQUARE',morphLabel,'Sine → triangle → saw → square.'],
 ['release','Release','25 ms','4 s',x=>timeLabel(.025*160**x),'How long notes linger.']
];
let context,node,startPromise,modulePromise,stream,liveNode,fileBuffer,fileNode;
let connecting=false,mediaEpoch=0,fileEpoch=0,meters=new Array(40).fill(0),scope=[],running=false;
const controlsArray=()=>[...state.pots,state.chord,state.voicing,Number(state.freeze)];
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
function audioStatus(){running=context?.state==='running';$('power').textContent=running?'Pause audio Ⅱ':'Start audio ↗';$('power').classList.toggle('running',running);$('status').textContent=running?'48 kHz · v0.10 · audio running':'Audio off · start with the demo';if(!running){$('input-meter').value=0;$('output-meter').value=0;}draw();}
function render(){
 specs.forEach(([id,,,,format],i)=>{const x=state.pots[i],input=$(id);input.value=x;input.style.setProperty('--value',x*100+'%');input.setAttribute('aria-valuetext',format(x));$(id+'-value').textContent=format(x);$(id+'-dial').style.setProperty('--angle',(-135+270*x)+'deg');});
 $('chord').value=state.chord;$('voicing').value=state.voicing;
 $('freeze').setAttribute('aria-pressed',state.freeze);$('hold-status').textContent=state.freeze?'FROZEN':'LIVE';$('hold-status').classList.toggle('held',state.freeze);
 const root=36+Math.round(48*state.pots[0]);$('chord-notes').textContent=chords[state.chord][1].map((n,i)=>noteName(root+n+12*((masks[state.voicing]>>i)&1))).join(' · ');
 document.querySelectorAll('[data-source]').forEach(el=>el.setAttribute('aria-pressed',el.dataset.source===state.source));
 for(const source of ['demo','live','file'])$(source+'-panel').hidden=state.source!==source;
 node?.port.postMessage({type:'controls',values:controlsArray()});node?.port.postMessage({type:'source',source:state.source});
 draw();
}
async function getModule(){
 if(!modulePromise)modulePromise=fetch('./engine-v010.wasm?v=010-web1').then(async response=>{if(!response.ok)throw new Error('The audio engine could not be loaded. Please reload.');return WebAssembly.compile(await response.arrayBuffer());}).catch(error=>{modulePromise=null;throw error;});
 return modulePromise;
}
async function startAudio(){
 if(startPromise)return startPromise;
 if(context&&node){await context.resume();audioStatus();return;}
 const AudioContextClass=window.AudioContext||window.webkitAudioContext;
 if(!AudioContextClass)throw new Error('This browser does not support Web Audio.');
 context=new AudioContextClass({sampleRate:48000,latencyHint:'interactive'});
 const audio=context;const resume=audio.resume();
 startPromise=(async()=>{
  if(audio.sampleRate!==48000)throw new Error('A 48 kHz audio context is required. Try a current desktop browser.');
  if(!audio.audioWorklet)throw new Error('AudioWorklet is unavailable. Open this page over HTTPS in a current browser.');
  const module=await getModule();await audio.audioWorklet.addModule('./worklet.mjs?v=010-web1');
  node=new AudioWorkletNode(audio,'spectral-resynth-v010',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit',channelInterpretation:'discrete',processorOptions:{module,controls:controlsArray()}});
  node.onprocessorerror=()=>{message('The audio engine stopped. Reload to restart.',true);disconnectLive();audio.suspend().catch(()=>{});};
  node.port.onmessage=({data})=>{if(data.type==='error'){message(data.message,true);audio.suspend().catch(()=>{});}if(data.type==='meters'){meters=data.values;scope=data.scope;updateMeters();}};
  node.connect(audio.destination);audio.onstatechange=audioStatus;render();await resume;await audio.resume();audioStatus();
 })().catch(async error=>{disconnectLive();node?.disconnect();node=null;if(audio.state!=='closed')await audio.close();context=null;throw error;}).finally(()=>{startPromise=null;});
 return startPromise;
}
async function withAudio(action){$('power').disabled=true;try{message('Starting the audio engine…');await startAudio();await action();}catch(error){message(error.message||'Audio could not start.',true);}finally{$('power').disabled=false;audioStatus();}}
function stopFile(){if(fileNode){fileNode.onended=null;try{fileNode.stop();}catch{}fileNode.disconnect();fileNode=null;}$('file-play').textContent='Play loop';}
function disconnectLive(){mediaEpoch++;liveNode?.disconnect();liveNode=null;if(stream)stream.getTracks().forEach(track=>track.stop());stream=null;$('connect-input').textContent='Connect input';}
function changeSource(source){if(source===state.source)return;disconnectLive();stopFile();fileEpoch++;state.source=source;render();message(source==='demo'?'Demo selected. Start audio to hear it.':source==='live'?'Connect an input to feed the resynth.':'Choose an audio file, then press Play loop.');}
async function listDevices(){if(!navigator.mediaDevices?.enumerateDevices)return;const selected=$('input-device').value;const devices=await navigator.mediaDevices.enumerateDevices();$('input-device').replaceChildren(new Option('Default input',''));for(const device of devices.filter(d=>d.kind==='audioinput'))$('input-device').add(new Option(device.label||'Audio input',device.deviceId));if([...$('input-device').options].some(o=>o.value===selected))$('input-device').value=selected;}
async function connectInput(){
 if(stream){disconnectLive();message('Input disconnected.');return;}if(connecting)return;
 if(!navigator.mediaDevices?.getUserMedia){message('Live input requires HTTPS and microphone access in a supported browser.',true);return;}
 connecting=true;$('connect-input').disabled=true;const request=++mediaEpoch;
 try{await startAudio();if(request!==mediaEpoch||state.source!=='live')return;const device=$('input-device').value;
  const capture=await navigator.mediaDevices.getUserMedia({audio:{...(device?{deviceId:{exact:device}}:{}),echoCancellation:false,noiseSuppression:false,autoGainControl:false,channelCount:{ideal:2}},video:false});
  if(request!==mediaEpoch||state.source!=='live'){capture.getTracks().forEach(track=>track.stop());return;}
  stream=capture;liveNode=context.createMediaStreamSource(stream);liveNode.connect(node);$('connect-input').textContent='Disconnect input';
  for(const track of stream.getTracks())track.onended=()=>{disconnectLive();message('Input device disconnected. Connect it again to continue.',true);};
  try{await listDevices();}catch{}message('Live input connected. Turn Dry/wet left to hear the original signal.');
 }catch(error){message(error.name==='NotAllowedError'?'Input permission was denied. Allow microphone access in your browser, then try again.':error.name==='NotFoundError'?'No audio input device was found.':error.message,true);}finally{connecting=false;$('connect-input').disabled=false;audioStatus();}
}
function updateMeters(){if(!running)return;$('input-meter').value=Math.min(1,meters[0]);$('output-meter').value=Math.min(1,meters[1]);$('voice-count').textContent=Math.round(meters[3])+' / 12 VOICES';$('sounding-note').textContent=meters[4]>0?'TOP '+noteName(69+12*Math.log2(meters[4]/440))+' · '+Math.round(meters[4])+' Hz':'Listening for input';draw();}
const canvas=$('spectrum'),ctx=canvas.getContext('2d');let width=0,height=0;
function draw(){
 if(!width)return;ctx.clearRect(0,0,width,height);const left=24,right=width-24,bottom=height-34,top=22;
 ctx.strokeStyle='#344044';ctx.lineWidth=.5;
 for(let j=0;j<4;j++){const y=top+j*(bottom-top)/3;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();}
 const xFor=hz=>left+Math.max(0,Math.min(1,Math.log(hz/60)/Math.log(16000/60)))*(right-left);
 if(running&&scope.length){ctx.strokeStyle='#6a8990';ctx.globalAlpha=.22;ctx.beginPath();scope.forEach((y,i)=>{const x=left+i/(scope.length-1)*(right-left),py=height*.47-y*height*.7;i?ctx.lineTo(x,py):ctx.moveTo(x,py);});ctx.stroke();ctx.globalAlpha=1;}
 if(running)for(let i=0;i<12;i++){const hz=meters[16+i*2],amp=meters[17+i*2];if(hz<=0||amp<1e-6)continue;const x=xFor(hz),level=Math.max(0,Math.min(1,(20*Math.log10(amp)+65)/65)),y=bottom-level*(bottom-top);ctx.fillStyle=i%2?'#df6b78':'#57d7ad';ctx.globalAlpha=.14;ctx.fillRect(x-8,y,16,bottom-y);ctx.globalAlpha=.9;ctx.fillRect(x-1,y,2,bottom-y);ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
 const hasSignal=running&&meters[0]>.0001;$('display-empty').hidden=hasSignal;$('display-empty').textContent=!running?'Start audio to explore the demo':state.source==='live'&&!stream?'Connect your audio input':state.source==='file'&&!fileNode?'Choose a file and press Play loop':'Waiting for input signal';
}
new ResizeObserver(()=>{const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;const ratio=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);draw();}).observe(canvas);
for(const [i,[id,label,min,max,format,hint]] of specs.entries()){
 const section=document.createElement('section');section.className='control';section.innerHTML=`<div class="control-head"><label for="${id}">${label}</label><span>VR${i+1}</span></div><div class="control-value"><output id="${id}-value" for="${id}"></output><span id="${id}-dial" class="dial" aria-hidden="true"></span></div><input id="${id}" type="range" min="0" max="1" step="${i===0?1/48:.001}" value="${defaults[i]}"><div class="range-labels"><span>${min}</span><span>${max}</span></div><p class="hint">${hint}</p>`;$('controls').append(section);$(id).oninput=event=>{state.pots[i]=Number(event.target.value);render();};
}
chords.forEach(([name],i)=>$('chord').add(new Option(String(i+1).padStart(2,'0')+' · '+name,i)));
voicings.forEach((name,i)=>$('voicing').add(new Option(name,i)));
$('chord').onchange=e=>{state.chord=Number(e.target.value);render();};$('voicing').onchange=e=>{state.voicing=Number(e.target.value);render();};
$('next-chord').onclick=()=>{state.chord=(state.chord+1)%12;render();};$('next-voicing').onclick=()=>{state.voicing=(state.voicing+1)%8;render();};
$('freeze').onclick=()=>{state.freeze=!state.freeze;render();message(state.freeze?'Frozen. Brightness, Morph, Dry/wet, and Level remain live.':'Freeze released. The resynth follows the input again.');};
$('power').onclick=()=>{if(running){disconnectLive();context.suspend().then(()=>{audioStatus();message('Audio paused.');});}else withAudio(()=>message(state.source==='demo'?'Demo playing. Try a chord, then turn Morph.':state.source==='live'?'Audio ready. Connect an input.':'Audio ready. Choose a file or start the loop.'));};
for(const button of document.querySelectorAll('[data-source]'))button.onclick=()=>changeSource(button.dataset.source);
$('connect-input').onclick=connectInput;$('input-device').onchange=()=>{disconnectLive();message('Input changed. Press Connect input.');};
$('audio-file').onchange=async event=>{const file=event.target.files[0];if(!file)return;const request=++fileEpoch;await withAudio(async()=>{const decoded=await context.decodeAudioData(await file.arrayBuffer());if(request!==fileEpoch||state.source!=='file')return;stopFile();fileBuffer=decoded;$('file-name').textContent=file.name;$('file-play').disabled=false;message(file.name+' loaded · '+decoded.duration.toFixed(1)+' s. Press Play loop.');});};
$('file-play').onclick=()=>withAudio(()=>{if(fileNode){stopFile();message('File playback stopped.');return;}if(!fileBuffer)return;fileNode=context.createBufferSource();fileNode.buffer=fileBuffer;fileNode.loop=true;fileNode.connect(node);fileNode.start();$('file-play').textContent='Stop loop';message('Looping '+$('file-name').textContent+'.');});
$('reset').onclick=()=>{state.pots=[...defaults];state.chord=state.voicing=0;state.freeze=false;render();message('Controls reset.');};
document.addEventListener('keydown',event=>{if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||['INPUT','SELECT','TEXTAREA','BUTTON'].includes(event.target.tagName))return;if(event.code==='Space'){event.preventDefault();$('freeze').click();}});
window.addEventListener('pagehide',()=>{disconnectLive();stopFile();context?.suspend().catch(()=>{});});
render();listDevices().catch(()=>{});
