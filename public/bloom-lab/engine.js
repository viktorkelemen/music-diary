export const CHORDS = [
 {name:'Csus2sus4 · close',notes:[261.63,293.66,349.23,392],harmonics:true,gain:.26710335},
 {name:'Quartal · G C F',notes:[196,261.63,349.23],harmonics:false,gain:.24440797},
 {name:'Dm7 · no fifth',notes:[146.83,174.61,261.63],harmonics:false,gain:.24419815},
 {name:'Gm · shell',notes:[98,146.83,261.63,349.23],harmonics:true,gain:.26539464},
 {name:'Csus2sus4 · wide',notes:[98,146.83,174.61,261.63,523.25],harmonics:true,gain:.27806023},
 {name:'Fsus2 · wide',notes:[174.61,261.63,392,523.25],harmonics:true,gain:.24610728},
];
export const WAVEFORMS = ['Original reel', 'Sine', 'Triangle', 'Saw', 'Square'];
export const PARAMS = {
 transpose:{label:'Transpose',min:-24,max:24,step:1,value:0,unit:'st'},
 fine:{label:'Fine tune',min:-50,max:50,step:1,value:0,unit:'ct'},
 tuning:{label:'Just intonation blend',min:0,max:1,step:.01,value:0,unit:'%'},
 tone:{label:'Original overtones',min:0,max:2,step:.01,value:1,unit:'%'},
 bloom:{label:'Bloom amount',min:0,max:2,step:.01,value:1,unit:'%'},
 bloomRate:{label:'Bloom speed',min:.1,max:4,step:.01,value:1,unit:'×'},
 partials:{label:'Harmonic count',min:2,max:24,step:1,value:12,unit:''},
 rolloff:{label:'Harmonic roll-off',min:.3,max:2,step:.01,value:.85,unit:''},
 bloomSpread:{label:'Bloom independence',min:0,max:2,step:.01,value:1,unit:'×'},
 width:{label:'Movement depth',min:0,max:1,step:.01,value:.8,unit:'%'},
 spatialRate:{label:'Movement speed',min:.1,max:4,step:.01,value:1,unit:'×'},
 spatialSpread:{label:'Voice independence',min:0,max:2,step:.01,value:1,unit:'×'},
 staticWidth:{label:'Static spread',min:0,max:1,step:.01,value:0,unit:'%'},
 pan:{label:'Stereo balance',min:-1,max:1,step:.01,value:0,unit:'pan'},
 detune:{label:'Detune depth',min:0,max:20,step:.1,value:6,unit:'ct'},
 detuneMix:{label:'Detuned copies',min:0,max:.5,step:.01,value:0,unit:'%'},
 life:{label:'Voice breathing',min:0,max:.6,step:.01,value:0,unit:'%'},
 drift:{label:'Pitch drift',min:0,max:6,step:.1,value:0,unit:'ct'},
 lifeRate:{label:'Breathing speed',min:.1,max:4,step:.01,value:1,unit:'×'},
};
export const DEFAULTS = {...Object.fromEntries(Object.entries(PARAMS).map(([k,v])=>[k,v.value])),chord:4,variation:0,octave:0,waveform:0,levels:[1,1,1,1,1],muted:[false,false,false,false,false],solo:[false,false,false,false,false]};
const TAU = Math.PI*2, SIZE=4096, H=24;
const TABLE=Float64Array.from({length:SIZE+1},(_,i)=>Math.sin(TAU*i/SIZE));
function sine(p){const x=(p-Math.floor(p))*SIZE;const i=x|0;return TABLE[i]+(TABLE[i+1]-TABLE[i])*(x-i)}
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function validatePatch(patch){
 if(!patch || typeof patch!=='object' || Array.isArray(patch))throw Error('A parameter object is required');
 const result={};
 for(const [key,value] of Object.entries(patch)){
  if(PARAMS[key]){const d=PARAMS[key];if(typeof value!=='number'||!Number.isFinite(value)||value<d.min||value>d.max||(d.step===1&&!Number.isInteger(value)))throw Error(`Invalid ${key}`);result[key]=value}
  else if(['chord','variation','octave','waveform'].includes(key)){const bounds={chord:[0,5],variation:[0,7],octave:[-1,1],waveform:[0,WAVEFORMS.length-1]}[key];if(!Number.isInteger(value)||value<bounds[0]||value>bounds[1])throw Error(`Invalid ${key}`);result[key]=value}
  else if(['levels','muted','solo'].includes(key)){if(!Array.isArray(value)||value.length!==5||!value.every(v=>key==='levels'?typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1.5:typeof v==='boolean'))throw Error(`Invalid ${key}`);result[key]=[...value]}
  else throw Error(`Unknown parameter: ${key}`);
 }
 return result;
}
export function variationOctave(variation,v,count){return [false,v===0,v<2,v<3,v%2===1,v===count-1,v>=count-2,v===count-2][variation]?1:0}
export function voiceFrequency(p,v){
 const chord=CHORDS[p.chord];if(v>=chord.notes.length)return 0;
 const hz=chord.notes[v];const midi=Math.round(69+12*Math.log2(hz/440));
 const pc=((midi%12)+12)%12;const ratios={0:1,2:9/8,5:4/3,7:3/2};
 const just=261.63*Math.pow(2,Math.floor(midi/12)-5)*ratios[pc];
 return hz*Math.pow(just/hz,p.tuning)*Math.pow(2,(p.transpose+12*p.octave+12*variationOctave(p.variation,v,chord.notes.length)+p.fine/100)/12);
}
export class BloomEngine {
 constructor(sampleRate=48000){this.sr=sampleRate;this.p=JSON.parse(JSON.stringify(DEFAULTS));this.time=0;this.bloomClock=0;this.spatialClock=0;this.lifeClock=0;this.positions=Array(5).fill(0);this.voices=Array.from({length:5},()=>({ph:new Float64Array(3),inc:new Float64Array(3),gain:new Float64Array(H),pan:0,amp:0,wet:0}));}
 update(patch){Object.assign(this.p,validatePatch(patch))}
 render(left,right){
  const p=this.p,n=left.length,sr=this.sr,chord=CHORDS[p.chord],anySolo=p.solo.some(Boolean);
  left.fill(0);right.fill(0);
  for(let v=0;v<5;v++){
   const voice=this.voices[v],active=v<chord.notes.length;
   let hz=voiceFrequency(p,v);
   const lifePhase=TAU*this.lifeClock/(7.5+1.8*v)+1.3*v;
   hz*=Math.pow(2,p.drift*(.7*Math.sin(TAU*this.lifeClock/(11+2.7*v)+v)+.3*Math.sin(TAU*this.lifeClock/(6.3+v)+.7*v))/1200);
   const targetAmp=active&&!p.muted[v]&&(!anySolo||p.solo[v])?chord.gain/chord.notes.length*p.levels[v]*(1+p.life*Math.sin(lifePhase)):0;
   const targetPan=clamp(p.pan+p.staticWidth*(v-(chord.notes.length-1)/2)/Math.max(1,(chord.notes.length-1)/2)+p.width*Math.sin(TAU*this.spatialClock/(12+2.1*v*p.spatialSpread)+v*1.25*p.spatialSpread),-1,1);
   this.positions[v]=targetPan;
   const offsets=[0,p.detune*(.6+.1*v),-p.detune*(.6+.1*v)];
   const increments=offsets.map(c=>hz*Math.pow(2,c/1200)/sr);
   const gains=new Float64Array(H);
   for(let h=1;h<=H;h++){
    // Equal fundamental levels. All base waveforms share the existing
    // anti-alias taper and sample-wise coefficient transition below.
    let reference;
    switch(p.waveform){
     case 1:reference=h===1?1:0;break;
     case 2:reference=h%2?((h%4===1?1:-1)/(h*h)):0;break;
     case 3:reference=1/h;break;
     case 4:reference=h%2?1/h:0;break;
     default:reference=h===1?1:chord.harmonics&&h<=3?(h===2?.3:.15)*p.tone:0;
    }
    const motion=Math.pow(.5+.5*Math.sin(TAU*this.bloomClock/(13+.8*h+v*p.bloomSpread)+.7*h+v*p.bloomSpread),2);
    const bloom=h>=2&&h<=p.partials?p.bloom*motion*.85/Math.pow(h,p.rolloff):0;
    const band=clamp((.45*sr-hz*Math.pow(2,p.detune/1200)*h)/(.05*sr),0,1);
    gains[h-1]=(reference+bloom)*band;
   }
   for(let i=0;i<n;i++){
    const blend=(i+1)/n;
    const amp=voice.amp+(targetAmp-voice.amp)*blend;
    const pan=voice.pan+(targetPan-voice.pan)*blend;
    const wet=voice.wet+(p.detuneMix-voice.wet)*blend;
    let center=0,sharp=0,flat=0;
    if(amp!==0)for(let h=1;h<=H;h++){
     const g=voice.gain[h-1]+(gains[h-1]-voice.gain[h-1])*blend;
     if(g===0)continue;
     center+=g*sine(voice.ph[0]*h);
     if(wet>0){sharp+=g*sine(voice.ph[1]*h);flat+=g*sine(voice.ph[2]*h)}
    }
    left[i]+=amp*((1-wet)*center+wet*sharp)*(1-pan);
    right[i]+=amp*((1-wet)*center+wet*flat)*(1+pan);
    for(let lane=0;lane<3;lane++){voice.ph[lane]+=voice.inc[lane]+(increments[lane]-voice.inc[lane])*blend;voice.ph[lane]-=Math.floor(voice.ph[lane])}
   }
   voice.inc.set(increments);voice.gain.set(gains);voice.amp=targetAmp;voice.pan=targetPan;voice.wet=p.detuneMix;
  }
  this.time+=n/sr;this.bloomClock+=n/sr*p.bloomRate;this.spatialClock+=n/sr*p.spatialRate;this.lifeClock+=n/sr*p.lifeRate;
 }
}
