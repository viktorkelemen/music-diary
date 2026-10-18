// Browser implementation of core/resonator.hpp. Native golden-vector tests
// validate the numerical port; chord data is exported directly from C++.
export const CEILING = 0.89125094;
export const OCTAVE_GAIN = 0.70794578;
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(x, hi));
export const wrap = (x,n) => (x % n + n) % n;
export const frequency = n => 440 * 2 ** ((n-69)/12);
export const chordCount = bank => bank===0?5:bank===1?9:12;
export function makeVoicing(data, bank, rotation, root, octave) {
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
    const initial=makeVoicing(data,0,0,36,0);
    this.current=[...initial.notes];this.target=[...initial.notes];this.weights=[...initial.gains];this.step=Array(6).fill(0);
    this.bands=Array.from({length:6},()=>[new Band(),new Band()]);this.lastBands=Array(6).fill(0);
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
    this.q+=(this.targetQ-this.q)*0.064493015;this.gain=1/Math.sqrt(this.q);
    for(let i=0;i<6;i++){const hz=frequency(this.current[i]);this.bands[i][0].tune(hz,this.q);this.bands[i][1].tune(hz,this.q);}
  }
  // Write outputs to fields to avoid allocating objects in the audio callback.
  process(left,right){
    if(this.phase++===0)this.controlTick();if(this.phase===32)this.phase=0;
    this.feed+=clamp((this.frozen?0:1)-this.feed,-1/240,1/240);
    const mono=.5*(left+right)*this.feed*this.gain;let l=0,r=0;
    for(let i=0;i<6;i++){
      const a=this.bands[i][0].process(mono*this.weights[i]),b=this.bands[i][1].process(mono*this.weights[i]);
      this.lastBands[i]=a;if(i%2===0)l+=a;else r+=b;
    }
    this.left=CEILING*Math.tanh(l/CEILING);this.right=CEILING*Math.tanh(r/CEILING);
  }
}
