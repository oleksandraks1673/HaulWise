/* MileForge cinematic navigation: only visual/navigation changes, no sample business data. */
(function(){
const el=(id)=>document.getElementById(id);
const bottom=el('cinemaBottomNav'),menu=el('cinemaMoreMenu');
if(!bottom||!menu)return;
const known=new Set(['overview','log','find','profit','equipment','post','mine','expenses','reports','plans']);
function sync(){
 const signed=!!document.querySelector('body:not(.guest)');
 bottom.hidden=!signed;if(!signed){menu.hidden=true;return}
 const visible=[...known].find(id=>{const v=el(id);return v&&!v.classList.contains('hidden')})||'overview';
 const current=['overview','log','profit','expenses'].includes(visible)?visible:'more';
 for(const b of bottom.querySelectorAll('[data-cinema-tab]')){
  const selected=b.dataset.cinemaTab===current;b.classList.toggle('active',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 }
}
function go(id){if(!known.has(id))return;menu.hidden=true;if(typeof tab==='function')tab(id);sync();}
bottom.addEventListener('click',ev=>{const b=ev.target.closest('[data-cinema-tab]');if(!b)return;const id=b.dataset.cinemaTab;if(id==='more'){menu.hidden=!menu.hidden;return}go(id)});
menu.addEventListener('click',ev=>{const b=ev.target.closest('[data-cinema-target]');if(b)go(b.dataset.cinemaTarget)});
document.addEventListener('click',ev=>{if(!bottom.contains(ev.target)&&!menu.contains(ev.target))menu.hidden=true});
document.addEventListener('keydown',ev=>{if(ev.key==='Escape')menu.hidden=true});
const observer=new MutationObserver(sync);
observer.observe(document.body,{attributes:true,attributeFilter:['class']});
for(const id of known){const node=el(id);if(node)observer.observe(node,{attributes:true,attributeFilter:['class']})}
sync();
})();