/* SmartMatch v1: matches only actual member-posted marketplace loads; no fabricated listings. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function init(){
const find=$('find'),post=$('post');if(!find||!post||$('mfSmartMatch'))return;
const css=document.createElement('style');css.textContent=`
#mfSmartMatch,#mfShipperMatch{background:#102f40;border:1px solid #246a80;border-radius:16px;padding:16px;margin:16px 0}
.mf-sm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.mf-sm-grid label{display:block;font-size:12px;color:#bdd4dd}.mf-sm-grid input{width:100%}
.mf-sm-match{padding:12px;border-radius:10px;background:#092634;margin-top:10px;border:1px solid #2a5160}
.mf-sm-match strong{display:block}.mf-sm-match small{color:#b9d2dc}.mf-sm-match button{margin-top:9px}
@media(max-width:450px){.mf-sm-grid{grid-template-columns:1fr}}
`;document.head.appendChild(css);
const box=document.createElement('section');box.id='mfSmartMatch';box.innerHTML='<h2>SmartMatch · Find a suitable load</h2><p class="muted">Match real MileForge Community loads to your trailer and preferred pickup area.</p><div class="mf-sm-grid"><div><label for="mfMatchPickup">Pickup city (optional)</label><input id="mfMatchPickup" placeholder="e.g. Toronto" autocomplete="off"></div><div><label for="mfMatchDestination">Destination city (optional)</label><input id="mfMatchDestination" placeholder="e.g. Ottawa" autocomplete="off"></div></div><div class="actions"><button type="button" id="mfMatchSearch">Find matches</button><button type="button" class="secondary" id="mfMatchClear">Clear</button></div><div id="mfMatchResults" aria-live="polite"></div>';
const tabs=find.querySelector('.load-source-tabs');tabs?.insertAdjacentElement('beforebegin',box);
const norm=x=>String(x||'').trim().toLocaleLowerCase();
function match(){
const out=$('mfMatchResults');if(typeof user==='undefined'||!user){out.textContent='Sign in to search member-posted loads.';return}
const pickup=norm($('mfMatchPickup').value),dest=norm($('mfMatchDestination').value),items=typeof loads!=='undefined'&&Array.isArray(loads)?loads:[];
const scored=items.map(l=>{const equipment=typeof equip!=='undefined'?equip:null;const trailerOk=!equipment||l.trailer_type===equipment.trailer_type;const weightOk=!equipment||Number(l.cargo_kg)<=Number(equipment.cargo_capacity_kg);const pickupOk=!pickup||norm(l.pickup_city).includes(pickup);const destOk=!dest||norm(l.dropoff_city).includes(dest);return {l,trailerOk,weightOk,pickupOk,destOk};}).filter(x=>x.trailerOk&&x.weightOk&&x.pickupOk&&x.destOk);
out.innerHTML='<p class="muted">'+scored.length+' matching community load(s). '+(typeof equip!=='undefined'&&equip?'Checked against your saved equipment profile.':'Save your equipment profile to filter by trailer and capacity.')+'</p>'+(scored.length?scored.slice(0,15).map(({l})=>'<div class="mf-sm-match"><strong>'+escape(l.title)+'</strong><small>'+escape(l.pickup_city)+' → '+escape(l.dropoff_city)+' · '+escape(l.trailer_type)+' · '+escape(l.cargo_kg)+' kg · CAD '+Number(l.pay_cad||0).toLocaleString('en-CA')+'</small><button type="button" class="secondary" data-mf-match-id="'+escape(l.id)+'">Calculate profit</button></div>').join(''):'<p class="muted">No matching community loads yet. This does not search external load boards.</p>');
}
$('mfMatchSearch').onclick=()=>{if(typeof haulwiseShowLoadSource==='function')haulwiseShowLoadSource('community');match();};
$('mfMatchClear').onclick=()=>{$('mfMatchPickup').value='';$('mfMatchDestination').value='';$('mfMatchResults').textContent='';};
box.addEventListener('click',e=>{const btn=e.target.closest('[data-mf-match-id]');if(btn&&typeof marketplaceToCalculator==='function')marketplaceToCalculator(btn.dataset.mfMatchId);});
const ship=document.createElement('section');ship.id='mfShipperMatch';ship.innerHTML='<h2>SmartMatch · Equipment requirements</h2><p class="muted">Enter equipment type, cargo weight and dimensions when posting. MileForge uses these details to show your load to compatible drivers searching Community listings. Driver availability and route matching are not verified yet.</p>';
post.querySelector('form')?.insertAdjacentElement('beforebegin',ship);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();