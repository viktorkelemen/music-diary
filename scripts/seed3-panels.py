#!/usr/bin/env python3
"""Draw firmware control maps in the Seed 3 Eurorack Dev Kit's physical layout.
Layout reference: https://docs.daisy.audio/product/Seed3-Euro-Dev-Kit/
Firmware mappings: multiband-resonator/core/seed3_controls.hpp and
spectral-chord-resynth/docs/INSTRUMENT_CONTROLS.md. This is not a drill template.
"""
from pathlib import Path
from html import escape
OUT=Path(__file__).resolve().parents[1]/'public/diagrams'
X=[455,565,675,785]

def draw(version):
    res=version=='resonator'
    accent='#63d8b1' if res else '#f29aa5'
    knobs=[('Root','C1–C6'),('Resonance','Q 2–250'),('Band 1','excitation'),('Band 2','excitation'),('Band 3','excitation'),('Band 4','excitation'),('Band 5','excitation'),('Band 6','excitation')] if res else [('Root','C2–C6'),('Brightness','dark ↔ bright'),('Attack','2–500 ms'),('Detail','1–12 partials'),('Dry / wet','input ↔ synth'),('Level','noon = unity'),('Morph','sine → square'),('Release','25 ms–4 s')]
    switches=[('Next bank','button'),('Next chord','button'),('Octave','−1 / 0 / +1'),('Freeze','off / on')] if res else [('Next chord','button'),('Next voicing','button'),('Unused','toggle'),('Freeze','off / on')]
    title='Resonant prototype' if res else 'Spectral resynth'
    desc='Seed 3 Eurorack Dev Kit, front view. '+'. '.join(f'VR{i+1}: {a}, {b}' for i,(a,b) in enumerate(knobs))+'. '+'. '.join(f'SW{i+1}: {a}' for i,(a,b) in enumerate(switches))+'. Gate 1: freeze. '+('Gate 2: noise ping. CV 1: chord rotation. CV 2: resonance. CV outputs held at zero.' if res else 'Gate 2 and all CV connections unused.')+' MIDI and SD unused. Stereo audio inputs and outputs at lower right.'
    svg=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 870 820" role="img" aria-labelledby="title desc"><title id="title">{title} — Daisy Seed 3 control map</title><desc id="desc">{escape(desc)}</desc>',
    '<style>text{font-family:Arial,Helvetica,sans-serif;fill:#f4f4f4;text-anchor:middle}.id{font:12px monospace;fill:#adb7bb;letter-spacing:1px}.name{font-size:17px;font-weight:600}.sub{font-size:12px;fill:#adb7bb}.muted text{fill:#97a1a7}.muted{opacity:.78}</style>',
    '<rect x="5" y="5" width="860" height="810" rx="18" fill="#1d2027" stroke="#51565d" stroke-width="2"/>']
    def text(x,y,t,cls='name',anchor=None,fill=None):
        svg.append(f'<text x="{x}" y="{y}" class="{cls}"'+(f' style="text-anchor:{anchor}"' if anchor else '')+(f' fill="{fill}"' if fill else '')+f'>{escape(t)}</text>')
    for x in [34,836]:
        for y in [27,793]:svg.append(f'<rect x="{x-13}" y="{y-5}" width="26" height="10" rx="5" fill="#f4f4f4"/>')
    text(435,34,'DAISY SEED 3 · EURORACK DEV KIT','id')
    svg.append(f'<path d="M32 74h232" stroke="{accent}" stroke-width="3"/>')
    text(32,109,'01 / RESONANT' if res else '02 / SPECTRAL','id','start')
    text(32,140,'Prototype' if res else 'Resynth','name','start')
    text(32,168,'Six tuned filters' if res else 'Up to 12 voices','sub','start')
    text(32,192,'Band excitation controls' if res else 'Global sound controls','sub','start')
    def jack(x,y,label,fun,active=True):
        svg.append('<g'+(' class="muted"' if not active else '')+'>')
        text(x,y-38,label,'id')
        svg.append(f'<rect x="{x-23}" y="{y-25}" width="46" height="50" rx="4" fill="#30363e" stroke="#6c757e"/><circle cx="{x}" cy="{y}" r="18" fill="#adb7bb"/><circle cx="{x}" cy="{y}" r="12" fill="#101317"/>')
        text(x,y+47,fun,'sub');svg.append('</g>')
    for i,(name,detail) in enumerate(knobs):
        x=X[i%4];y=120+135*(i//4)
        text(x,y-41,f'VR{i+1}','id')
        svg.append(f'<circle cx="{x}" cy="{y}" r="28" fill="#30363e" stroke="#7c878f" stroke-width="2"/><path d="M{x} {y-20}v14" stroke="{accent}" stroke-width="4" stroke-linecap="round"/>')
        text(x,y+53,name);text(x,y+73,detail,'sub')
    for y,name in [(120,'MIDI IN'),(255,'MIDI THRU'),(390,'MIDI OUT')]:jack(345,y,name,'unused',False)
    for i,x in enumerate(X):jack(x,390,f'CV IN {i+1}',(['Chord rotate','Resonance','unused','unused'] if res else ['unused']*4)[i],res and i<2)
    jack(455,520,'CV OUT 1','zero' if res else 'unused',False)
    jack(565,520,'CV OUT 2','zero' if res else 'unused',False)
    jack(675,520,'AUDIO IN L','input')
    jack(785,520,'AUDIO OUT L','output')
    jack(455,650,'GATE 1','Freeze')
    jack(565,650,'GATE 2','Noise ping' if res else 'unused',res)
    jack(675,650,'AUDIO IN R','input')
    jack(785,650,'AUDIO OUT R','output')
    # Seed, SD, indicator LEDs and switches retain their positions left of I/O.
    svg.append('<rect x="32" y="484" width="245" height="95" rx="6" fill="#293238" stroke="#6c757e"/><rect x="32" y="514" width="28" height="29" rx="3" fill="#adb7bb"/>')
    text(161,526,'DAISY SEED 3','id');text(161,551,'USB','sub')
    svg.append('<rect x="32" y="600" width="66" height="70" rx="4" fill="#30363e" stroke="#6c757e"/>');text(65,629,'SD','id');text(65,650,'unused','sub')
    for x,label,fun,active in [(235,'LED 1','Bank / octave' if res else 'unused',res),(345,'LED 2','Freeze',True)]:
        svg.append(f'<circle cx="{x}" cy="650" r="12" fill="{("#f29aa5" if label=="LED 2" else accent) if active else "#30363e"}" stroke="#6c757e"/>')
        text(x,622,label,'id');text(x,682,fun,'sub')
    for i,(name,detail) in enumerate(switches):
        x=[235,345,455,565][i];y=749
        text(x,y-37,f'SW{i+1}','id')
        svg.append(f'<rect x="{x-22}" y="{y-20}" width="44" height="38" rx="5" fill="#30363e" stroke="#6c757e"/>')
        if i<2:svg.append(f'<circle cx="{x}" cy="{y-1}" r="12" fill="{accent}"/>')
        else:svg.append(f'<circle cx="{x}" cy="{y-1}" r="12" fill="#adb7bb"/><path d="M{x} {y}l7 -20" stroke="#f4f4f4" stroke-width="6" stroke-linecap="round"/>')
        text(x,y+40,name,'sub')
    text(32,743,'FRONT VIEW','id','start');text(32,766,'Control positions','sub','start');text(32,786,'match the kit.','sub','start')
    svg.append('</svg>')
    (OUT/f'seed3-{version}.svg').write_text('\n'.join(svg)+'\n')

OUT.mkdir(parents=True,exist_ok=True)
for version in ['resonator','resynth']:draw(version)
