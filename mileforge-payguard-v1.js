/* MileForge PayGuard v1: read-only receivables dashboard using existing invoice/payment records. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
function init(){
const log=$('log');if(!log||$('mfPayGuard'))return;
const css=document.createElement('style');css.textContent=`
#mfPayGuard{margin:16px 0;border:1px solid #267186;border-radius:17px;padding:16px;background:#102c3a}
#mfPayGuard h2{margin:0 0 4px}#mfPayGuard .mf-pg-muted{color:#a7c6d1;font-size:13px}
#mfPayGuard .mf-pg-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:13px 0}
#mfPayGuard .mf-pg-stats>div{border-radius:10px;background:#092532;padding:10px;min-width:0}
#mfPayGuard .mf-pg-stats small{display:block;color:#acc7d2;font-size:11px}#mfPayGuard .mf-pg-stats strong{display:block;font-size:17px;overflow-wrap:anywhere}
#mfPayGuard .mf-pg-item{border-top:1px solid #315361;padding:12px 0;display:flex;justify-content:space-between;gap:10px;align-items:center}
#mfPayGuard .mf-pg-item p{margin:4px 0;font-size:12px;color:#b7d1da}#mfPayGuard .mf-pg-item button{white-space:normal}
@media(max-width:420px){#mfPayGuard .mf-pg-stats{grid-template-columns:1fr 1fr}#mfPayGuard .mf-pg-item{align-items:flex-start;flex-direction:column}}
`;document.head.appendChild(css);
const panel=document.createElement('section');panel.id='mfPayGuard';panel.innerHTML='<div class="row"><div><h2>PayGuard · Payment tracker</h2><p class="mf-pg-muted">See which completed loads still need payment.</p></div><button type="button" class="secondary" id="mfPgRefresh">Refresh</button></div><div id="mfPgBody" role="status">Loading payment records…</div>';
const anchor=$('tripSummary');anchor?.insertAdjacentElement('afterend',panel);
$('mfPgRefresh').onclick=refresh;
panel.addEventListener('click',e=>{const b=e.target.closest('[data-pg-open]');if(!b)return;const card=[...document.querySelectorAll('#tripList [data-mf-invoice]')].find(x=>x.dataset.mfInvoice===b.dataset.pgOpen);if(card){card.click();}else{$('mfPgBody').insertAdjacentHTML('beforeend','<p class="mf-pg-muted">Open this load in My Loads to manage its invoice.</p>');}});
let request=0;
async function refresh(){
const uid=typeof user!=='undefined'&&user?.id;if(!uid){$('mfPgBody').textContent='Sign in to view your invoices.';return;}
const ticket=++request;$('mfPgBody').textContent='Checking invoices…';
try{
const [a,b]=await Promise.all([api.from('mileforge_invoices').select('id,trip_id,customer_name,amount,due_date,issue_date').eq('user_id',uid),api.from('mileforge_invoice_payments').select('invoice_id,amount').eq('user_id',uid)]);
if(ticket!==request||user?.id!==uid)return;if(a.error)throw a.error;if(b.error)throw b.error;
const paid=new Map();for(const p of b.data||[])paid.set(p.invoice_id,(paid.get(p.invoice_id)||0)+Number(p.amount||0));
const today=new Date();today.setHours(0,0,0,0);const entries=(a.data||[]).map(inv=>{const due=inv.due_date?new Date(inv.due_date+'T12:00:00'):null;const outstanding=Math.max(0,Number(inv.amount||0)-(paid.get(inv.id)||0));const overdue=outstanding>0&&due&&due<today;return {...inv,outstanding,overdue,days:overdue?Math.floor((today-due)/86400000):0};}).filter(x=>x.outstanding>0).sort((a,b)=>Number(b.overdue)-Number(a.overdue)||(a.due_date||'9999').localeCompare(b.due_date||'9999'));
const total=entries.reduce((s,x)=>s+x.outstanding,0),late=entries.filter(x=>x.overdue).reduce((s,x)=>s+x.outstanding,0);
$('mfPgBody').innerHTML='<div class="mf-pg-stats"><div><small>Outstanding</small><strong>'+money(total)+'</strong></div><div><small>Overdue</small><strong>'+money(late)+'</strong></div><div><small>Unpaid invoices</small><strong>'+entries.length+'</strong></div></div>'+(entries.length?entries.slice(0,20).map(x=>'<div class="mf-pg-item"><div><strong>'+esc(x.customer_name)+'</strong> · '+money(x.outstanding)+'<p>'+(x.overdue?x.days+' day(s) overdue':x.due_date?'Due '+esc(x.due_date):'No due date')+' · Invoice MF-'+esc(x.id.slice(0,8).toUpperCase())+'</p></div><button class="secondary" type="button" data-pg-open="'+esc(x.trip_id)+'">Open invoice</button></div>').join(''):'<p class="mf-pg-muted">No outstanding invoices recorded.</p>')+'<p class="mf-pg-muted">Based on payments recorded in MileForge. This does not verify bank deposits or send automatic reminders.</p>';
}catch(e){if(ticket===request)$('mfPgBody').textContent='Unable to load payments: '+(e.message||'Please try again.');}
}
const previous=tab;tab=function(name){const result=previous.apply(this,arguments);if(name==='log')refresh();return result;};
if(!log.classList.contains('hidden'))refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();