/* MileForge ad-matched My Loads: presentation of real user-owned data, not demo figures. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const cash=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:2}).format(Number(n)||0);
const statusNames={planned:'Planned',booked:'Booked',picked_up:'Picked up',in_transit:'In transit',delivered:'Delivered',completed:'Completed',paid:'Paid',cancelled:'Cancelled'};
let allVisible=false;
function dateLabel(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return '';
 const [y,m,d]=value.split('-').map(Number);
 const day=new Date(y,m-1,d);
 return day.toLocaleDateString('en-CA',{month:'short',day:'numeric',year:'numeric'});
}
function node(tag,cls,value){
 const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;
}
function setupHeading(){
 const box=$('growthOnboarding');const p=box?.querySelector(':scope > p');
 if(p&&p.textContent.startsWith('Your setup'))p.textContent=p.textContent.replace(/^Your setup/,'Ready to go');
}
function summaryLabels(){
 const cards=$('tripSummary')?.querySelectorAll('.work-summary article');
 if(cards?.length===3){
  const labels=['Load Revenue','Expenses','After logged expenses'];
  cards.forEach((card,i)=>{
   const label=card.querySelector('.muted');if(label)label.textContent=labels[i];
   card.classList.add('mf-ad-summary-tile');card.dataset.stat=['revenue','expenses','remaining'][i];
  });
 }
}
function header(){
 const h=$('mfRecentLoadsHeading');if(!h)return null;
 let wrap=$('mfAdRecentTop');
 if(!wrap){
  wrap=node('div','mf-ad-recent-top');wrap.id='mfAdRecentTop';
  h.parentNode.insertBefore(wrap,h);wrap.appendChild(h);
  const btn=node('button','mf-ad-view-all','View all →');
  btn.id='mfAdViewAll';btn.type='button';btn.addEventListener('click',()=>{
   allVisible=!allVisible;paint();
   if(!allVisible)h.scrollIntoView({behavior:'smooth',block:'start'});
  });
  wrap.appendChild(btn);
 }
 return wrap;
}
function addAdCard(card,trip){
 const edit=card.querySelector('[data-work="edit"]');if(!edit)return;
 const actions=card.querySelector(':scope > .actions');
 const status=card.querySelector('[id^="status-"]');
 if(!actions||!status)return;
 const r=node('div','mf-ad-card-main');
 const icon=node('div','mf-ad-truck');
 const image=document.createElement('img');
 image.src='/icons/mileforge-header-truck-v11.svg';image.alt='';image.loading='lazy';icon.appendChild(image);
 const middle=node('div','mf-ad-route-area');
 const origin=(trip.origin||'Pickup not set').trim();
 const destination=(trip.destination||'Destination not set').trim();
 const title=node('h3','mf-ad-route',origin+' → '+destination);
 const ref=node('p','mf-ad-reference',trip.load_reference||'Untitled load');
 const badges=node('div','mf-load-badges');
 const st=node('span','mf-ad-status mf-status-'+String(trip.status||'planned').replace(/[^a-z_]/g,''),statusNames[trip.status]||'Planned');
 badges.append(st);middle.append(title,ref,badges);
 const price=node('div','mf-ad-price');
 price.append(node('small','mf-ad-price-label','Load revenue'),node('strong','',cash(trip.gross_revenue)));
 r.append(icon,middle,price);
 const dated=node('p','mf-ad-dates');
 const start=dateLabel(trip.pickup_date),end=dateLabel(trip.delivery_date);
 dated.textContent=start?(start+(end?' – '+end:'')):'Pickup date not set';
 const details=document.createElement('details');details.className='mf-ad-load-details';
 const open=node('summary','','Manage load');details.append(open);
 const content=node('div','mf-ad-detail-content');
 const linkedExpenses=workExpenses.filter(e=>e.trip_id===trip.id).reduce((sum,e)=>sum+(Number(e.amount)||0),0);
 const costs=node('p','mf-ad-costs','Recorded costs: '+cash(linkedExpenses)+' · After those costs: '+cash(Number(trip.gross_revenue)-linkedExpenses));
 content.append(costs);
 if(trip.notes)content.append(node('p','mf-ad-load-notes',trip.notes));
 content.append(actions,status);
 details.append(content);
 card.dataset.mfTripId=trip.id;
 card.classList.add('mf-ad-load-card');
 card.replaceChildren(r,dated,details);
}
function paint(){
 const list=$('tripList'),h=header();
 if(!list||!h)return;
 const cards=[...list.querySelectorAll(':scope > article.work-card')];
 for(const card of cards){
  const id=card.querySelector('[data-work="edit"]')?.dataset.id;
  const trip=id?workTrips.find(t=>t.id===id):null;
  if(trip)addAdCard(card,trip);
 }
 setupHeading();summaryLabels();
 const query=($('tripSearch')?.value||'').trim();
 const filter=$('tripStatusFilter')?.value||'';
 const searching=!!(query||filter);
 const showAll=searching||allVisible;
 const visibleCount=showAll?cards.length:Math.min(cards.length,3);
 for(let i=0;i<cards.length;i++)cards[i].hidden=i>=visibleCount;
 const btn=$('mfAdViewAll');const heading=$('mfRecentLoadsHeading');
 if(btn){
  btn.hidden=searching||cards.length<=3;
  btn.textContent=allVisible?'Show recent ↑':'View all ('+cards.length+') →';
 }
 if(heading)heading.textContent=searching?'Matching loads':'Recent Loads';
 if(list.children.length===1&&list.firstElementChild?.classList.contains('empty'))heading.textContent=searching?'Matching loads':'Recent Loads';
 const caption=$('tripRecordCount');if(caption)caption.classList.add('mf-ad-record-count');
}
function init(){
 if(!$('log')||typeof renderWork!=='function')return;
 const original=renderWork;
 renderWork=function(){const result=original.apply(this,arguments);paint();return result};
 paint();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();