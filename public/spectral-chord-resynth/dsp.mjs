// Browser implementation of core/resonator.hpp. Native golden-vector tests
// validate the numerical port; chord data is exported directly from C++.
export const CEILING = 0.89125094;
export const OCTAVE_GAIN = 0.70794578;
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(x, hi));
export const wrap = (x,n) => (x % n + n) % n;
export const frequency = n => 440 * 2 ** ((n-69)/12);
export const chordCount = () => 8;
export function makeLegacyVoicing(data, bank, rotation, root, octave) {
  bank=wrap(bank,15); let offsets, originalCount=4;
  if(bank<2) {
    offsets=[...(bank===0?data.hex[wrap(rotation,5)]:data.cvChord[wrap(rotation,9)]),12,19];
  } else {
    root+=wrap(rotation,12);
    const row=data.chordery[bank-2][wrap(root,12)];
    originalCount=row.length; offsets=[...row];
    if(row.length<4) {
      const order=[0,...row.slice(1).map((_,i)=>i+1)];
      const fifth=order.slice(1).find(i=>row[i]%12===7);
      if(fifth!==undefined) order.splice(1,order.length-1,fifth,...order.slice(1).filter(i=>i!==fifth));
      for(let i=row.length;i<6;i++) {const n=i-row.length;offsets[i]=row[order[n%row.length]]+12*(1+Math.floor(n/row.length));}
    } else offsets.push(12,19);
  }
  return {notes:offsets.map(x=>root+12*octave+x),gains:offsets.map((_,i)=>i<originalCount?1:OCTAVE_GAIN)};
}
class Band {
  constructor(){this.s1=0;this.s2=0;}
  tune(hz,q){const g=Math.tan(Math.PI*clamp(hz,10,16000)/48000),k=1/clamp(q,2,250);this.a1=1/(1+g*(g+k));this.a2=g*this.a1;this.a3=g*this.a2;}
  process(x){const v3=x-this.s2,v1=this.a1*this.s1+this.a2*v3,v2=this.s2+this.a2*this.s1+this.a3*v3;this.s1=2*v1-this.s1;this.s2=2*v2-this.s2;return v1;}
}
export class Resonator {
  constructor(data){
    const initial=makeLegacyVoicing(data,0,0,36,0);
    this.current=[...initial.notes];this.target=[...initial.notes];this.weights=[...initial.gains];this.step=Array(6).fill(0);
    this.bands=Array.from({length:6},()=>[new Band(),new Band()]);this.lastBands=Array(6).fill(0);this.channels=Array.from({length:6},()=>[0,0]);
    this.slewLeft=0;this.phase=0;this.q=2;this.targetQ=2;this.feed=1;this.frozen=false;this.left=0;this.right=0;this.controlTick();
  }
  set(voicing,q,freeze){
    if(freeze&&!this.frozen){this.target=[...this.current];this.slewLeft=0;}
    this.frozen=freeze;
    if(!freeze){
      this.weights=[...voicing.gains];
      if(voicing.notes.some((x,i)=>x!==this.target[i])){
        this.target=[...voicing.notes];this.slewLeft=15;this.step=this.target.map((x,i)=>(x-this.current[i])/15);
      }
    }
    this.targetQ=freeze?250:clamp(q,2,250);
  }
  controlTick(){
    if(this.slewLeft>0){for(let i=0;i<6;i++)this.current[i]+=this.step[i];if(--this.slewLeft===0)this.current=[...this.target];}
    this.q+=(this.targetQ-this.q)*0.064493015;this.gain=.25/Math.sqrt(this.q);
    for(let i=0;i<6;i++){const hz=frequency(this.current[i]);this.bands[i][0].tune(hz,this.q);this.bands[i][1].tune(hz,this.q);}
  }
  // Write outputs to fields to avoid allocating objects in the audio callback.
  processRaw(left,right){
    if(this.phase++===0)this.controlTick();if(this.phase===32)this.phase=0;
    this.feed+=clamp((this.frozen?0:1)-this.feed,-1/240,1/240);
    const mono=.5*(left+right)*this.feed*this.gain;let l=0,r=0;
    for(let i=0;i<6;i++){
      const a=this.bands[i][0].process(mono*this.weights[i]),b=this.bands[i][1].process(mono*this.weights[i]);
      this.lastBands[i]=a;this.channels[i][0]=a;this.channels[i][1]=b;if(i%2===0)l+=a;else r+=b;
    }
    this.rawLeft=l;this.rawRight=r;
  }
  process(left,right){
    this.processRaw(left,right);
    this.left=CEILING*Math.tanh(this.rawLeft/CEILING);this.right=CEILING*Math.tanh(this.rawRight/CEILING);
  }
}

// Numerical browser port of core/spectral.hpp; golden-vector tests use C++.
export class SpectralResynth extends Resonator {
  constructor(data){
    super(data);this.active=Array(6).fill(1);this.activeTarget=Array(6).fill(1);this.envelopes=Array.from({length:6},()=>[0,0]);this.oscPhases=Array.from({length:6},()=>[0,0]);
    this.sine=Float32Array.from({length:2049},(_,i)=>Math.sin(i*2*Math.PI/2048));this.sine[2048]=0;
    this.attack=1-Math.exp(-1/(.002*48000));this.release=1-Math.exp(-1/(.03*48000));
  }
  set(voicing,q,freeze,releasePosition=-1){
    super.set(voicing,q,freeze);
    if(!freeze)this.activeTarget=voicing.gains.map(g=>g>0?1:0);
    const position=releasePosition<0?Math.log(clamp(q,2,250)/2)/Math.log(125):clamp(releasePosition,0,1);
    const tau=.03*(4/.03)**position;
    this.release=1-Math.exp(-1/(tau*48000));
  }
  process(left,right,outputGain=1){
    this.processRaw(Number.isFinite(left)?left:0,Number.isFinite(right)?right:0);
    let l=0,r=0;
    if(!this.frozen)for(let i=0;i<6;i++)this.active[i]+=clamp(this.activeTarget[i]-this.active[i],-1/240,1/240);
    for(let i=0;i<6;i++)for(let ch=0;ch<2;ch++){
      const rectified=Math.abs(this.channels[i][ch]);let env=this.envelopes[i][ch];
      if(!this.frozen)env+=(rectified-env)*(rectified>env?this.attack:this.release);
      this.envelopes[i][ch]=env;
      const index=this.oscPhases[i][ch]*2048,cell=Math.floor(index);
      const wave=this.sine[cell]+(this.sine[cell+1]-this.sine[cell])*(index-cell);
      let phase=Math.fround(this.oscPhases[i][ch]+Math.fround(Math.fround(frequency(Math.fround(this.current[i])))/48000));
      if(phase>=1)phase=Math.fround(phase-1);this.oscPhases[i][ch]=phase;
      if(ch===0&&i%2===0)l+=wave*env*this.active[i];if(ch===1&&i%2===1)r+=wave*env*this.active[i];
    }
    this.left=CEILING*Math.tanh(l*outputGain/CEILING);
    this.right=CEILING*Math.tanh(r*outputGain/CEILING);
  }
}

export function makeVoicing(data,chord,variation,root,octave) {
 const notes=data.reel[wrap(chord,6)].notes,count=notes.length;
 return {notes:Array.from({length:6},(_,v)=>v<count?69+12*Math.log2(notes[v]/440)+root-60+12*(octave+Number([false,v===0,v<2,v<3,v%2===1,v===count-1,v>=count-2,v===count-2][wrap(variation,8)])):root),gains:Array.from({length:6},(_,v)=>v<count?1:0)};
}
