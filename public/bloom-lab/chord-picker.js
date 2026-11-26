import {CHORDS,CHORD_GROUPS} from './engine.js';

export function noteName(hz){
 if(!hz)return '—';
 const midi=Math.round(69+12*Math.log2(hz/440));
 return ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][((midi%12)+12)%12]+(Math.floor(midi/12)-1);
}
const normalize=text=>text.toLowerCase().replaceAll('♭','b').replaceAll('♯','#').replaceAll('–',' ').replaceAll('·',' ').replace(/\s+/g,' ').trim();
const groupFor=index=>CHORD_GROUPS.find(group=>group.chords.includes(index));
const notesFor=index=>CHORDS[index].notes.map(noteName).join(' · ');

export function createChordPicker(trigger,onSelect){
 let selected=4,filter='all';
 const dialog=document.createElement('dialog');
 dialog.id='chord-dialog';dialog.className='chord-dialog';
 dialog.setAttribute('aria-labelledby','chord-dialog-title');
 dialog.setAttribute('aria-describedby','chord-dialog-description');
 dialog.innerHTML=`<div class="chord-dialog-heading"><div><p class="eyebrow">HARMONIC PALETTE</p><h2 id="chord-dialog-title">Choose a chord</h2></div><button type="button" id="chord-close" aria-label="Close chord picker">Close</button></div>
 <p id="chord-dialog-description">Browse voicings and compare their notes. Selecting a chord updates the sound if you’re playing.</p>
 <div class="chord-search-row"><label class="sr-only" for="chord-search">Search chords or notes</label><input id="chord-search" type="search" placeholder="Search chords or notes…" autocomplete="off"><span id="chord-result-count" role="status" aria-live="polite"></span></div>
 <div id="chord-filters" class="chord-filters" role="group" aria-label="Chord families"></div>
 <div id="chord-results" class="chord-results"></div>
 <p class="chord-picker-footer">Notes shown in the base register. Transpose, octave variation, and your voice edits apply after selection.</p>`;
 document.body.append(dialog);
 const search=dialog.querySelector('#chord-search'),results=dialog.querySelector('#chord-results'),filters=dialog.querySelector('#chord-filters');
 const threeNoteChords=CHORDS.flatMap((chord,index)=>chord.notes.length===3?[index]:[]);
 const filterChoices=[{id:'all',name:'All',chords:CHORDS},{id:'three-notes',name:'3 notes',chords:threeNoteChords},...CHORD_GROUPS];
 for(const group of filterChoices){
  const button=document.createElement('button');button.type='button';button.dataset.family=group.id;
  button.textContent=`${group.name} · ${group.chords.length}`;
  button.onclick=()=>{filter=group.id;render()};filters.append(button);
 }
 function render(){
  const tokens=normalize(search.value).split(' ').filter(Boolean);
  let count=0;
  results.replaceChildren();
  for(const group of CHORD_GROUPS){
   if(filter!=='all'&&filter!=='three-notes'&&filter!==group.id)continue;
   const matching=group.chords.filter(index=>{
    if(filter==='three-notes'&&!threeNoteChords.includes(index))return false;
    const chord=CHORDS[index];
    // Include both register-free note spellings and names for searches like C F Bb.
    const notes=chord.notes.map(hz=>noteName(hz).replace(/\d+$/,'')).join(' ');
    const text=normalize(`${chord.name} ${notes} ${group.name} ${group.description} ${chord.description??''}`);
    return tokens.every(token=>text.includes(token));
   });
   if(!matching.length)continue;
   const section=document.createElement('section');section.className='chord-family';
   const heading=document.createElement('h3');heading.textContent=group.name;
   const description=document.createElement('p');description.textContent=group.description;
   const grid=document.createElement('div');grid.className='chord-card-grid';
   section.append(heading,description,grid);
   for(const index of matching){
    const chord=CHORDS[index],card=document.createElement('button');card.type='button';card.className='chord-card';card.dataset.chord=index;
    card.setAttribute('aria-pressed',String(index===selected));
    card.innerHTML=`<span class="chord-card-top"><span class="chord-card-count">${chord.notes.length} voices</span><span class="chord-card-selected">${index===selected?'Selected':'Choose'}</span></span><strong>${chord.name}</strong><span class="chord-card-notes">${notesFor(index)}</span>${chord.description?`<span class="chord-card-description">${chord.description}</span>`:''}`;
    card.onclick=()=>{onSelect(index);dialog.close()};grid.append(card);count++;
   }
   results.append(section);
  }
  if(!count){const empty=document.createElement('p');empty.className='chord-empty';empty.textContent='No matching chords. Try fewer notes or choose All.';results.append(empty)}
  dialog.querySelector('#chord-result-count').textContent=`${count} ${count===1?'chord':'chords'}`;
  for(const button of filters.children)button.setAttribute('aria-pressed',String(button.dataset.family===filter));
 }
 trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls',dialog.id);trigger.setAttribute('aria-expanded','false');
 trigger.onclick=()=>{filter='all';search.value='';render();dialog.showModal();document.body.classList.add('dialog-open');trigger.setAttribute('aria-expanded','true');search.focus()};
 search.addEventListener('input',render);
 dialog.querySelector('#chord-close').onclick=()=>dialog.close();
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}});
 dialog.addEventListener('close',()=>{document.body.classList.remove('dialog-open');trigger.setAttribute('aria-expanded','false');trigger.focus()});
 // Arrow keys move between cards; Enter and Space use native button selection.
 results.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
  const cards=[...results.querySelectorAll('.chord-card')],at=cards.indexOf(document.activeElement);if(at<0)return;
  const columns=getComputedStyle(cards[at].parentElement).gridTemplateColumns.split(' ').length;
  const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-columns,ArrowDown:columns}[event.key];
  const next=event.key==='Home'?0:event.key==='End'?cards.length-1:Math.max(0,Math.min(cards.length-1,at+delta));
  event.preventDefault();cards[next].focus();
 });
 return {update(index){selected=index;trigger.querySelector('.chord-trigger-name').textContent=CHORDS[index].name;trigger.querySelector('.chord-trigger-notes').textContent=notesFor(index);trigger.setAttribute('aria-label',`Choose chord. Current: ${CHORDS[index].name}`);if(dialog.open)render()},description(index){const chord=CHORDS[index];return chord.description??groupFor(index).description}};
}
