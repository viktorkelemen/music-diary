---
title: "Custom Firmware for Centrevillage's LilaC Repeater"
date: 2026-09-06T00:00:00
unlisted: true
tags:
  - eurorack
  - firmware
  - lilac-repeater
  - looper
  - code
---

Custom firmware for the centrevillage LilaC Repeater, built on the official 2.0 binary, `lr_v2_0.bin`. There is no source, so every change is a patch to the binary itself: locate the instruction or the bitmap, write new bytes, check the diff against the original. Byte-level differences against that file are verifiable. Its provenance beyond the file itself is not.

The current build is `2.0-EX6 Scope R2`.

## Download

<div class="fw-download">

**[lr_v2_0_EX6_SCOPE_R2_EXPERIMENTAL.bin](/firmware/lr_v2_0_EX6_SCOPE_R2_EXPERIMENTAL.bin)** — 387,600 bytes

SHA-256: `fb89a9a8d5664debbb51481a794ceb90f1c991239a05a49310948c0f0c3aa005`

Verify before flashing:

```sh
shasum -a 256 lr_v2_0_EX6_SCOPE_R2_EXPERIMENTAL.bin
```

An unofficial modification of centrevillage's LilaC Repeater v2.0 firmware, made by patching the official binary. Not a centrevillage release, not endorsed by them, and not tested on hardware. Flashing it may make a module unusable and may void your warranty.

</div>

<div id="lilac-ex6-controls" class="wide">
  <div class="viz-row"><h2>LilaC Repeater · EX6 Scope R2</h2><span class="text-small text-muted">Changes from supplied official v2.0 firmware</span></div>
  <div class="viz-controls" role="group" aria-label="Button held while moving a fader">
    <button class="btn" type="button" data-mode="normal" aria-pressed="true">No button held</button>
    <button class="btn" type="button" data-mode="func" aria-pressed="false">Hold FUNC</button>
    <button class="btn" type="button" data-mode="track" aria-pressed="false">Hold T1</button>
  </div>
  <div class="layout">
    <div class="panel-wrap">
      <svg class="module" viewBox="0 0 280 590" role="img" aria-labelledby="lc-title lc-desc">
        <title id="lc-title">LilaC Repeater front panel with numbered EX6 changes</title>
        <desc id="lc-desc">Physical layout follows the manufacturer's front-panel diagram. One: DRY. Two: FDBK. Three: SPEED. Four: track buttons. Five: OLED display. The annotations update with the selected held-button mode.</desc>
        <rect class="face" x="1" y="1" width="278" height="588" rx="9"/>
        <g class="hardware"><circle cx="24" cy="15" r="6"/><circle cx="256" cy="15" r="6"/><circle cx="24" cy="573" r="6"/><circle cx="256" cy="573" r="6"/></g>
        <text x="140" y="24" text-anchor="middle">LilaC Repeater</text>
        <g id="lc-jacks"></g>
        <rect class="screen" x="66" y="164" width="148" height="80" rx="4"/>
        <text id="lc-screen-title" x="78" y="184" class="text-small">T1 · PLAYBACK</text>
        <path class="wave" d="M78 210h8l3 -15 5 31 5 -29 4 15h12l4 -12 5 23 4 -16h13l3 -13 5 29 5 -22 4 11h14l4 -9 4 18 4 -14h13"/>
        <text id="lc-screen-value" x="78" y="236" class="text-small">START / LENGTH · LIVE</text>
        <g id="lc-faders"></g>
        <g id="lc-track-buttons"></g>
        <g id="lc-transport"></g>
        <g class="marker"><circle cx="49" cy="319" r="12"/><text x="49" y="324">1</text></g>
        <g class="marker"><circle cx="47" cy="170" r="12"/><text x="47" y="175">2</text></g>
        <g class="marker"><circle cx="234" cy="170" r="12"/><text x="234" y="175">3</text></g>
        <g class="marker"><circle cx="255" cy="474" r="12"/><text x="255" y="479">4</text></g>
        <g class="marker"><circle cx="201" cy="164" r="12"/><text x="201" y="169">5</text></g>
        <text x="140" y="574" text-anchor="middle" class="text-small">UNOFFICIAL · 2.0-EX6</text>
      </svg>
      <div class="text-small text-muted">Panel layout from the manual; display contents and fader positions are illustrative.</div>
    </div>
    <div class="annotations" aria-live="polite" aria-atomic="true">
      <section><h3><span class="index">1</span> DRY · monitor only</h3><div>Input recording stays at unity gain, even with DRY down. DRY still sets live input volume at the output.</div><div class="text-small text-muted">Original: DRY also attenuated recording. The IN meter now reads before DRY attenuation.</div></section>
      <section><h3><span class="index">2</span> <span id="lc-fdbk-heading">FDBK · playback start</span></h3><div id="lc-fdbk-detail">Bottom = beginning. Move up to start later in the selected sample.</div><div id="lc-fdbk-before" class="text-small text-muted">Original: global feedback / overdub amount.</div></section>
      <section><h3><span class="index">3</span> <span id="lc-speed-heading">SPEED · playback end</span></h3><div id="lc-speed-detail">Top = sample end. Move down to end earlier. Full range: FDBK down, SPEED up.</div><div id="lc-speed-before" class="text-small text-muted">Original: global tempo, 60–240 BPM.</div></section>
      <section><h3><span class="index">4</span> T1–T4 · hold for track speed</h3><div>Hold exactly one track button + SPEED: 0.5× at bottom, 1× at center, 2× at top.</div><div class="text-small text-muted">New continuous VARI control; 48–52% center detent. Temporary: reload / power cycle restores saved native speed.</div></section>
      <section><h3><span class="index">5</span> OLED · live detail + EX6 splash</h3><div>Trim and track-speed gestures open playback detail. Range fields and the speed multiplier update live.</div>
        <figure class="splash-preview">
          <img width="256" height="128" src="data:image/png;base64,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" alt="Actual EX6 Scope R2 startup framebuffer: an oscilloscope trace forming EX6, with the 2.0-EX6 version label underneath.">
          <figcaption class="text-small text-muted">Actual startup frame · 128 × 64 pixels<br>About 2 seconds still, then a 3-second particle dissolve.</figcaption>
        </figure>
      </section>
    </div>
  </div>
  <div class="range-illustration" id="lc-range" role="img" aria-label="Full sample playback: start at beginning, end at sample end">
    <div class="viz-row"><span>Full-sample playback</span><span class="text-small text-muted">FDBK ↓ · SPEED ↑ · no button held</span></div>
    <svg class="range-svg" width="100%" height="48" aria-hidden="true"><rect x="0" y="10" width="100%" height="18" class="range-fill"/><path d="M1 4v31" class="range-edge"/><path id="lc-range-end" class="range-edge"/><text x="0" y="47" class="text-small">Beginning</text><text x="100%" y="47" text-anchor="end" class="text-small">Sample end</text></svg>
  </div>
  <details><summary>Targeting, limits, and original behavior</summary>
    <ul>
      <li>Trims use the edit track, otherwise the recording target. They snap to musical steps, cannot cross, and retain at least one step.</li>
      <li>FUNC + SPEED controls global tempo and affects all tracks. The original external-sync restrictions still apply. FUNC takes precedence over a held track button.</li>
      <li>Continuous track speed is an absolute per-track multiplier relative to global / recorded tempo. It changes pitch and speed in VARI; it does not add STRETCH pitch control. Playback changes take effect at the next playback clock boundary.</li>
      <li>Native speed menu / MIDI edits, track reset / clear, and sample reload clear the temporary speed override. Empty, recording, and overdubbing tracks do not accept the new track-speed control.</li>
      <li>In playback detail, track-button menu taps act on release; standalone menu hold-repeat is disabled. Showing another edit track does not redirect REC.</li>
      <li>Modifier-transition filtering prevents residual slider movement from leaking into the next function. Startup / load notifications preserve existing settings.</li>
      <li>Track level faders, audio jacks, and transport retain their original roles. DRY down plus all track faders down allows silent input recording. Recording sources that mix tracks still follow their existing mix rules.</li>
      <li>Unity recording gain means no digital attenuation from DRY, not automatic normalization. Set input recording level upstream.</li>
    </ul>
  </details>
  <div class="sources text-small text-muted">Panel: <a href="https://centrevillage.net/manual/LilaCRepeater/LilaCRepeater_ver1_0_EN.html#sec-4" target="_blank" rel="noopener noreferrer">centrevillage v1 manual</a> · Firmware baseline: supplied v2.0 binary · Behavior: project EX6 / EX5 / Scope R2 notes · Unofficial experimental build</div>
</div>
<style>
  #lilac-ex6-controls .layout{display:grid;grid-template-columns:280px minmax(0,1fr);gap:28px;align-items:start;margin:20px 0}
  #lilac-ex6-controls .panel-wrap{width:280px;max-width:100%;justify-self:center}
  #lilac-ex6-controls .module{display:block;width:100%;height:auto}
  #lilac-ex6-controls .module text,#lilac-ex6-controls .range-svg text{fill:var(--foreground)}
  #lilac-ex6-controls .face{fill:var(--secondary);stroke:var(--border)}
  #lilac-ex6-controls .hardware{fill:var(--muted);stroke:var(--muted-foreground)}
  #lilac-ex6-controls .socket{fill:var(--background);stroke:var(--muted-foreground);stroke-width:2}
  #lilac-ex6-controls .slot{fill:var(--background);stroke:var(--border)}
  #lilac-ex6-controls .cap{fill:var(--muted-foreground)}
  #lilac-ex6-controls .changed{fill:var(--viz-series-1)}
  #lilac-ex6-controls .screen{fill:var(--background);stroke:var(--border)}
  #lilac-ex6-controls .wave{fill:none;stroke:var(--viz-series-1);stroke-width:1.5}
  #lilac-ex6-controls .marker circle{fill:var(--primary)}
  #lilac-ex6-controls .marker text{fill:var(--primary-foreground);text-anchor:middle}
  #lilac-ex6-controls .annotations{display:grid;gap:16px}
  #lilac-ex6-controls h3{margin:0 0 5px}
  #lilac-ex6-controls .annotations .text-small{margin-top:5px}
  #lilac-ex6-controls .index{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;margin-right:6px;border-radius:50%;background:var(--primary);color:var(--primary-foreground)}
  #lilac-ex6-controls .range-illustration{margin:22px 0}
  #lilac-ex6-controls .range-fill{fill:var(--viz-series-1);opacity:.2}
  #lilac-ex6-controls .range-edge{stroke:var(--viz-series-1);stroke-width:2}
  #lilac-ex6-controls details{margin:18px 0}
  #lilac-ex6-controls summary{cursor:pointer}
  #lilac-ex6-controls li{margin:8px 0}
  #lilac-ex6-controls .sources{margin-top:18px}
  #lilac-ex6-controls .splash-preview{margin:12px 0 0}
  #lilac-ex6-controls .splash-preview img{display:block;width:256px;max-width:100%;height:auto;image-rendering:pixelated}
  #lilac-ex6-controls .splash-preview figcaption{margin-top:6px}
  @media(max-width:600px){#lilac-ex6-controls .layout{grid-template-columns:minmax(0,1fr);gap:20px}}
</style>
<script>
(() => {
  const root=document.getElementById('lilac-ex6-controls');
  const get=id=>root.querySelector('#'+id);
  const ns='http://www.w3.org/2000/svg';
  function node(tag,attrs,parent,text){const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));if(text!==undefined)el.textContent=text;parent.appendChild(el);return el;}
  [[28,65,'L'],[84,65,'R'],[140,65,'CLK'],[196,65,'L'],[252,65,'R'],[84,119,'REC'],[140,119,'CLK'],[196,119,'RST']].forEach(([x,y,label])=>{node('circle',{cx:x,cy:y,r:15,class:'hardware'},get('lc-jacks'));node('circle',{cx:x,cy:y,r:8,class:'socket'},get('lc-jacks'));node('text',{x,y:y+30,'text-anchor':'middle',class:'text-small'},get('lc-jacks'),label);});
  function fader(x,top,bottom,name,value,changed,id){const g=node('g',{},get('lc-faders'));node('rect',{x:x-4,y:top,width:8,height:bottom-top,rx:4,class:'slot'},g);node('rect',{x:x-9,y:bottom-(bottom-top)*value-5,width:18,height:10,rx:2,class:changed?'changed':'cap',id},g);node('text',{x,y:bottom+23,'text-anchor':'middle',class:'text-small'},g,name);}
  fader(28,164,263,'FDBK',0,true,'lc-fdbk-cap');fader(252,164,263,'SPEED',1,true,'lc-speed-cap');
  [28,84,140,196,252].forEach((x,i)=>fader(x,313,424,['DRY','1','2','3','4'][i],i?0.55:0,i===0,'lc-level-'+i));
  [56,112,168,224].forEach((x,i)=>{node('circle',{cx:x,cy:478,r:18,class:'hardware',id:'lc-track-'+i},get('lc-track-buttons'));node('text',{x,y:483,'text-anchor':'middle',class:'text-small',id:'lc-track-label-'+i},get('lc-track-buttons'),'T'+(i+1));});
  ['FUNC','LOOP','CLEAR','REC','START'].forEach((name,i)=>{const x=28+i*56;node('circle',{cx:x,cy:529,r:16,class:'hardware',id:'lc-button-'+name},get('lc-transport'));node('text',{x,y:556,'text-anchor':'middle',class:'text-small'},get('lc-transport'),name);});
  const modes={
    normal:['FDBK · playback start','Bottom = beginning. Move up to start later in the selected sample.','Original: global feedback / overdub amount.','SPEED · playback end','Top = sample end. Move down to end earlier. Full range: FDBK down, SPEED up.','Original: global tempo, 60–240 BPM.','T1 · PLAYBACK','START / LENGTH · LIVE'],
    func:['FUNC + FDBK · feedback','Original global feedback / overdub amount. Hold FUNC while moving the fader.','Moved under FUNC; no automatic detail-view switch.','FUNC + SPEED · global tempo','60–240 BPM, affecting all tracks. Original external-sync restrictions apply.','Moved under FUNC; this is not per-track speed.','T1 · PLAYBACK','NO AUTO VIEW CHANGE'],
    track:['FDBK · playback start','A held track button is not a new FDBK modifier. The normal trim-target rule still applies.','Trim target: edit track first, otherwise recording target.','T1 + SPEED · T1 speed','Continuous 0.5×–2× VARI multiplier for T1 only; 1× around the center.','New gesture. Original menu / MIDI speed choices remain available.','T1 · VARI','x1.00 · LIVE']
  };
  const ids=['lc-fdbk-heading','lc-fdbk-detail','lc-fdbk-before','lc-speed-heading','lc-speed-detail','lc-speed-before','lc-screen-title','lc-screen-value'];
  root.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
    const mode=button.dataset.mode;root.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    ids.forEach((id,i)=>get(id).textContent=modes[mode][i]);
    get('lc-button-FUNC').style.fill=mode==='func'?'var(--viz-series-1)':'';
    get('lc-track-0').style.stroke=mode==='track'?'var(--viz-series-1)':'var(--muted-foreground)';get('lc-track-0').style.strokeWidth=mode==='track'?'4':'1';
    get('lc-speed-cap').setAttribute('y',mode==='normal'?'159':mode==='track'?'208.5':'192');
    get('lc-fdbk-cap').setAttribute('y',mode==='func'?'192':'258');
  }));
  const range=root.querySelector('.range-svg');new ResizeObserver(()=>{const w=range.getBoundingClientRect().width;get('lc-range-end').setAttribute('d',`M${Math.max(1,w-1)} 4v31`);}).observe(range);
})();
</script>

## Recording level

This is what started the project. On the stock firmware the DRY fader sets both the monitoring level and the level at which DRY material is recorded, so monitoring quietly gives you a quiet recording. In EX6 the recording is captured at full unscaled input level and DRY only controls what you hear. Set the level upstream instead.

## Faders

The two faders trim the loop with no modifier held:

- **FDBK** — playback start position.
- **SPEED** — playback end position. Fully up is the sample end; sliding down brings the end earlier.

Full range is FDBK down, SPEED up. Holding FUNC restores their original functions:

- **FUNC + FDBK** — global overdub feedback.
- **FUNC + SPEED** — global tempo, 60–240 BPM.

Most of the work went into the modifier transitions. An earlier build, EX2, had a smoothing tail on FUNC release that audibly slurred the parameter as you let go of the button.

## Per-track variable speed

Hold a single track button and move SPEED for that track's continuous VARI multiplier, 0.5× to 2×, with 1× around the center. The gesture opens the track's detail view and the multiplier updates live.

The setting is session-only. Saved sample metadata is untouched, and a native menu or MIDI edit, or any reset or load, clears the override. I'd rather not write an undocumented value into the on-disk format of a module I'm patching without source.

Menu taps inside the detail view act on release rather than press, so a tap can be told apart from the start of a speed gesture. Standalone menu hold-repeat is disabled for the same reason.

## Scope splash

R2 is a cosmetic revision. The startup screen replaces the original 123×56 logo with an oscilloscope trace drawing `EX6`, then hands off to the module's native particle dissolve and the `2.0-EX6` label.

<figure class="splash">
<img src="/moodboards/lilac-repeater-ex6-scope/splash.svg" alt="The EX6 startup screen: an oscilloscope trace forming the letters E X 6, with tick marks along the top and bottom edges" />
<figcaption>The 123×56 splash, decoded straight out of the binary at <code>0x3e028</code>. 1,011 lit pixels.</figcaption>
</figure>

The bitmap sits at `0x3e028`, SSD1306 page-major, one bit per pixel. Immediately after the seven pages of logo data the original linker placed a hardware table, referenced by a pointer at `0x2a16c`, so the builder writes the new artwork and leaves that table and its three bytes of padding where they were. 665 bytes change, all inside the bitmap range. No code differences between this and the plain EX6 build.

## Status

Trimming, playback, recording, effects, sync and the audio paths are stock EX6 behavior.

<style>
/* Bridge: the controls widget expects a host design system, so map its
   variables onto this site's palette and supply the few utility classes
   it borrows. Scoped to the widget so nothing leaks into the entry. */
#lilac-ex6-controls { --foreground:#1a1a1a; --background:#f5f3f0; --secondary:#ffffff; --border:#d4d0ca; --muted-foreground:#68645f; --primary:#0055cc; --primary-foreground:#f8f6f2; --viz-series-1:#0055cc; }
#lilac-ex6-controls .hardware { fill:#ebe8e3; }
#lilac-ex6-controls .viz-row { display:flex; flex-wrap:wrap; align-items:baseline; gap:10px; }
#lilac-ex6-controls .viz-row h2 { margin:0; }
#lilac-ex6-controls .viz-controls { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
#lilac-ex6-controls .btn { font:11px var(--mono); text-transform:uppercase; letter-spacing:.08em; padding:7px 12px; border:1px solid var(--border); background:transparent; color:var(--muted-foreground); cursor:pointer; }
#lilac-ex6-controls .btn:hover { color:var(--foreground); }
#lilac-ex6-controls .btn[aria-pressed="true"] { border-color:var(--primary); color:var(--primary); background:rgba(0,85,204,.07); }
#lilac-ex6-controls .btn:focus-visible { outline:2px solid var(--primary); outline-offset:2px; }
#lilac-ex6-controls .text-small { font-size:12px; }
#lilac-ex6-controls .text-muted { color:var(--muted-foreground); }
#lilac-ex6-controls .module .text-small { font-size:11px; font-family:var(--mono); }
.fw-download { border: 1px solid var(--border); border-left: 3px solid var(--accent); background: #fff; padding: 16px 18px; margin: 1.5rem 0; }
.fw-download > :first-child { margin-top: 0; }
.fw-download > :last-child { margin-bottom: 0; }
.fw-download a { font: 14px var(--mono); }
.splash { margin: 1.5rem 0; }
.splash img { display: block; width: 100%; image-rendering: pixelated; border: 1px solid var(--border); }
.splash figcaption { margin-top: 8px; color: var(--muted); font: 11px var(--mono); }
.fw-download p:last-of-type { color: var(--muted); font-size: 13px; }
</style>
