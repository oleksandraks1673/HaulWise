/* MileForge Loads UX v11: progressive disclosure, no data-model changes. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
function init(){
 const log=$('log');if(!log||$('mfSimpleLoadsIntro'))return;
 const style=document.createElement('style');
 style.textContent=`
 #log .mf-simple-intro{background:linear-gradient(145deg,#0d3447,#071d2b);border:1px solid #2c6475;border-radius:18px;padding:18px;margin:12px 0 16px}
 #log .mf-simple-intro h2{font-size:20px;margin:0 0 6px}
 #log .mf-simple-intro p{margin:0 0 14px;color:#bad3de}
 #log .mf-simple-start{display:block;width:100%;min-height:54px;font-size:17px;border-radius:13px}
 #log .mf-simple-import{margin:12px 0 14px;border:1px solid #28566a;border-radius:14px;background:#0b2838}
 #log .mf-simple-import>summary{cursor:pointer;list-style:none;padding:15px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-weight:750}
 #log .mf-simple-import>summary::-webkit-details-marker{display:none}
 #log .mf-simple-import>summary small{display:block;font-size:12px;font-weight:400;color:#a9c6d2;margin-top:4px}
 #log .mf-simple-import>summary:after{content:'⌄';color:#00d4ec;font-size:20px}
 #log .mf-simple-import[open]>summary:after{content:'⌃'}
 #log .mf-simple-import #mfSmartImport{margin:0 12px 12px}
 #log .mf-simple-setup{margin:10px 0;border:1px solid #234b5d;border-radius:12px;padding:0 12px}
 #log .mf-simple-setup>summary{padding:13px 0;cursor:pointer;font-weight:650}
 #log .mf-simple-setup #growthOnboarding{margin:0 0 12px}
 #log .mf-simple-extra{border:1px solid #28566a;border-radius:12px;padding:0 12px;margin:12px 0}
 #log .mf-simple-extra>summary{padding:13px 0;cursor:pointer;font-weight:700}
 #log .mf-simple-extra .grid{padding-bottom:12px}
 #log .mf-simple-hide{display:none!important}
 #log .mf-simple-filter{margin-top:12px}
 #log #tripEditor{scroll-margin-top:110px}
 @media(max-width:600px){#log .mf-simple-intro{padding:15px}#log .mf-simple-start{font-size:17px}}
 `;
 document.head.appendChild(style);
 const header=log.querySelector(':scope > .row');
 const oldButton=header?.querySelector('button[onclick*="showTripEditor"]');
 if(oldButton)oldButton.classList.add('mf-simple-hide');
 const intro=document.createElement('section');intro.id='mfSimpleLoadsIntro';intro.className='mf-simple-intro';
 const title=document.createElement('h2');title.textContent='Your loads, all in one place';
 const desc=document.createElement('p');desc.textContent='Save a load, track its progress, and see what you earn.';
 const start=document.createElement('button');start.type='button';start.className='mf-simple-start';start.textContent='+ Add New Load';
 start.addEventListener('click',()=>{if(typeof showTripEditor==='function')showTripEditor();$('tripEditor')?.scrollIntoView({behavior:'smooth',block:'start'});});
 intro.append(title,desc,start);
 header?.insertAdjacentElement('afterend',intro);
 const importBox=$('mfImportDisclosure');
 if(importBox){
   const compact=document.createElement('details');compact.className='mf-simple-import';
   const summary=document.createElement('summary');summary.innerHTML='<span>Import a load<small>Optional · Paste a confirmation or upload a file</small></span>';
   compact.append(summary);
   const source=$('mfSmartImport');if(source)compact.append(source);
   importBox.replaceWith(compact);
 }
 const onboarding=$('growthOnboarding');
 if(onboarding){
   const wrapper=document.createElement('details');wrapper.className='mf-simple-setup';
   const summary=document.createElement('summary');summary.textContent='Getting started · Optional checklist';
   onboarding.parentNode.insertBefore(wrapper,onboarding);wrapper.append(summary,onboarding);
 }
 const form=$('tripEditor');
 if(form){
   const reference=$('workReference');if(reference){reference.placeholder='e.g. Load #4408';const label=form.querySelector('label[for="workReference"]');if(label)label.textContent='Load number or reference';}
   const pickup=$('workPickup');if(pickup){const label=form.querySelector('label[for="workPickup"]');if(label)label.textContent='Pickup date';}
   const distance=$('workDistance');if(distance){const label=form.querySelector('label[for="workDistance"]');if(label)label.textContent='Distance (km)';}
   const optionalStart=$('workStatus')?.parentElement;
   const pod=$('workPOD')?.closest('.grid');
   const notes=$('workNotes');const notesLabel=form.querySelector('label[for="workNotes"]');
   if(optionalStart){
     const extra=document.createElement('details');extra.className='mf-simple-extra';
     const sum=document.createElement('summary');sum.textContent='More details (optional)';
     optionalStart.parentNode.insertAdjacentElement('afterend',extra);extra.append(sum,optionalStart);
     if(pod)extra.append(pod);
     if(notesLabel)extra.append(notesLabel);
     if(notes)extra.append(notes);
   }
   const heading=$('tripEditorTitle');if(heading)heading.textContent='Add New Load';
   const save=form.querySelector('button[type="submit"]');if(save)save.textContent='Save Load';
 }
 const filter=log.querySelector(':scope > .work-filter');if(filter)filter.classList.add('mf-simple-filter');
 const note=log.querySelector(':scope > .work-note');if(note)note.textContent='Profit is an estimate until all expenses are recorded.';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();