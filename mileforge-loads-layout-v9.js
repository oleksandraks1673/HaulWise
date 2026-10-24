/* Loads v9: no mock data, no changes to load forms or calculation logic */
(function(){
 'use strict';
 function init(){
   const log=document.getElementById('log');
   const source=document.getElementById('mfSmartImport');
   const firstRow=log?.querySelector(':scope > .row');
   if(!log||!firstRow)return;
   if(source&&!document.getElementById('mfImportDisclosure')){
     const disclosure=document.createElement('details');
     disclosure.id='mfImportDisclosure';
     const summary=document.createElement('summary');
     const icon=document.createElement('span');
     icon.className='mf-import-icon';icon.setAttribute('aria-hidden','true');icon.textContent='↧';
     const labels=document.createElement('span');labels.className='mf-import-label';
     const title=document.createElement('strong');title.textContent='Import load details';
     const subtitle=document.createElement('small');subtitle.textContent='Paste a confirmation or upload a TXT / CSV file';
     labels.append(title,subtitle);summary.append(icon,labels);
     disclosure.append(summary,source);
     firstRow.insertAdjacentElement('afterend',disclosure);
   }
   function sync(){document.body.classList.toggle('mf-myloads-view',!log.classList.contains('hidden'))}
   const prior=tab;
   tab=function(name){
     const result=prior.apply(this,arguments);
     sync();
     return result;
   };
   sync();
 }
 if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init,{once:true})}
 else init();
})();
