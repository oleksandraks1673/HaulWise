/* Match reference: live recent-loads only, never mock entries. */
(function(){
const q=id=>document.getElementById(id);
const nav=q('cinemaHeaderMenu'), menu=q('cinemaMoreMenu'), bottom=q('cinemaBottomNav');
if(nav&&menu){nav.addEventListener('click',()=>{if(document.body.classList.contains('guest'))return;menu.hidden=!menu.hidden;});}
const block=document.createElement('section');block.className='cinema-recent-block';block.id='cinemaRecentBlock';
block.innerHTML='<div class="cinema-recent-head"><h2>Recent Loads</h2><button type="button" id="cinemaRecentViewAll">View all →</button></div><div class="cinema-recent-list" id="cinemaRecentList" aria-live="polite"><p class="muted">Loading your saved loads…</p></div>';
const overview=q('overview');if(!overview)return;
overview.parentNode.insertBefore(block,overview);
q('cinemaRecentViewAll').addEventListener('click',()=>{if(typeof tab==='function')tab('log')});
function update(){
const home=!document.body.classList.contains('guest')&&!q('cinemaHero').classList.contains('hidden');
block.hidden=!home;if(!home)return;
const list=q('cinemaRecentList');const data=typeof workTrips!=='undefined'&&Array.isArray(workTrips)?workTrips:[];
const ready=typeof workLoadedUser!=='undefined'&&typeof user!=='undefined'&&!!user&&workLoadedUser===user.id;
if(!ready){list.innerHTML='<p class="muted">Loading your saved loads…</p>';return}
if(!data.length){list.innerHTML='<p class="muted">No recorded loads yet. Add a load to start tracking your hauls.</p>';return}
const safe=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(Number(n)||0);
list.innerHTML=data.slice(0,3).map(t=>'<button type="button" class="cinema-recent-card" data-open-load="1"><span class="cinema-recent-route"><strong>'+safe(t.origin||t.load_reference||'Load')+' → '+safe(t.destination||'Destination pending')+'</strong><small>'+safe(t.status||'Planned')+' · '+safe(t.pickup_date||'No pickup date')+'</small></span><strong class="cinema-recent-revenue">'+money(t.gross_revenue)+'</strong></button>').join('');
list.querySelectorAll('[data-open-load]').forEach(x=>x.addEventListener('click',()=>{if(typeof tab==='function')tab('log')}));
}
const original=typeof loadWork==='function'?loadWork:null;if(original){loadWork=async function(){const x=await original.apply(this,arguments);update();return x;};}
const observer=new MutationObserver(update);observer.observe(document.body,{attributes:true,attributeFilter:['class']});observer.observe(q('cinemaHero'),{attributes:true,attributeFilter:['class']});update();
})();