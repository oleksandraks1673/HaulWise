/* MileForge My Loads refresh v8: non-destructive enhancements to existing UI. */
(function(){
'use strict';
const root=document.getElementById('log');
if(!root)return;
const setup=document.getElementById('growthOnboarding');
const list=document.getElementById('tripList');
function decorate(){
 const note=root.querySelector(':scope > .work-note');
 if(note){
  note.classList.add('mf-short-note');
  const original='Revenue less recorded expenses excludes costs you have not entered.';
  if(note.textContent.includes(original))
   note.textContent='Net revenue includes only recorded expenses. Use Trip Profit before accepting a load.';
 }
 const filter=root.querySelector(':scope > .work-filter');
 if(filter && !document.getElementById('mfRecentLoadsHeading')){
  const title=document.createElement('h2');title.id='mfRecentLoadsHeading';
  title.className='mf-recent-heading';title.textContent='Recent Loads';
  filter.parentNode.insertBefore(title,filter);
 }
}
function progress(){
 if(!setup)return;
 const label=setup.querySelector(':scope > p');
 if(!label)return;
 const match=label.textContent.match(/(\d+)\s+of\s+(\d+)\s+complete/i);
 if(!match)return;
 const done=Number(match[1]),total=Number(match[2]);
 let bar=setup.querySelector('.mf-setup-progress');
 if(!bar){
  bar=document.createElement('div');
  bar.className='mf-setup-progress';bar.setAttribute('role','progressbar');
  bar.setAttribute('aria-label','Setup completed');
  bar.append(document.createElement('span'));
  label.insertAdjacentElement('afterend',bar);
 }
 bar.setAttribute('aria-valuemin','0');
 bar.setAttribute('aria-valuemax',String(total));
 bar.setAttribute('aria-valuenow',String(done));
 const expected=(total?Math.round(done/total*100):0)+'%';
 if(bar.firstElementChild.style.width!==expected)bar.firstElementChild.style.width=expected;
}
decorate();progress();
if(setup){
 let scheduled=false;
 new MutationObserver(()=>{
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;progress()});
 }).observe(setup,{childList:true,subtree:false});
}
if(list){
 let updateScheduled=false;
 const count=document.getElementById('tripRecordCount');
 const refresh=()=>{
  updateScheduled=false;
  const heading=document.getElementById('mfRecentLoadsHeading');
  if(heading&&count){
   const countText=(count.textContent||'').trim();
   heading.textContent='Recent Loads';
   heading.setAttribute('aria-label',countText?'Recent loads. '+countText:'Recent loads');
  }
 };
 new MutationObserver(()=>{if(updateScheduled)return;updateScheduled=true;requestAnimationFrame(refresh)}).observe(list,{childList:true});
}
})();
