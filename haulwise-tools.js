/* HaulWise load management: user-owned records use existing Supabase RLS. */
const WorkMath = {
  number(value){const n=Number(value);return Number.isFinite(n)&&n>=0?n:0;},
  kmToMiles(km){return Number(km)/1.609344;},
  milesToKm(miles){return Number(miles)*1.609344;},
  summary(trips,expenses){const revenue=trips.filter(t=>t.status!=='cancelled').reduce((s,t)=>s+this.number(t.gross_revenue),0);const costs=expenses.reduce((s,e)=>s+this.number(e.amount),0);return {revenue,costs,remaining:revenue-costs};},
  csv(rows){return '\uFEFF'+rows.map(row=>row.map(value=>{let s=String(value??'');if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');}
};
let workTrips=[],workExpenses=[],workLoadedUser=null,workError='',workEpoch=0,workBusy=false;
const workStatuses={planned:'Planned',booked:'Booked',picked_up:'Picked up',in_transit:'In transit',delivered:'Delivered',completed:'Completed',paid:'Paid',cancelled:'Cancelled'};
const workToday=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
const workErrorText=e=>e?.message||'Unable to save right now. Please try again.';
async function loadWork(){
 if(!user)return;const uid=user.id,epoch=++workEpoch;workError='';
 const [a,b]=await Promise.all([api.from('trips').select('*').eq('user_id',uid).order('pickup_date',{ascending:false,nullsFirst:false}).limit(1000),api.from('expenses').select('*').eq('user_id',uid).order('expense_date',{ascending:false}).limit(5000)]);
 if(user?.id!==uid||epoch!==workEpoch)return;
 if(a.error||b.error){workError=workErrorText(a.error||b.error);workLoadedUser=null;workTrips=[];workExpenses=[];}else{workTrips=a.data||[];workExpenses=b.data||[];workLoadedUser=uid;}
 renderWork();renderExpenses();renderWorkReport();
}
function resetWork(){++workEpoch;workTrips=[];workExpenses=[];workLoadedUser=null;workError='';workBusy=false;for(const id of ['tripEditor','expenseEditor']){const form=$(id);if(form){form.reset();form.hidden=true;}}renderWork();renderExpenses();renderWorkReport();}
function workMonth(list,key){const month=$('reportMonth')?.value;return month?list.filter(row=>String(row[key]||'').startsWith(month)):list;}
function workSummaryMarkup(s){return '<div class="work-summary"><article><span class="muted">Load revenue</span><strong>'+cad(s.revenue)+'</strong></article><article><span class="muted">Recorded expenses</span><strong>'+cad(s.costs)+'</strong></article><article><span class="muted">Revenue less expenses</span><strong class="'+(s.remaining<0?'work-delta negative':'')+'">'+cad(s.remaining)+'</strong></article></div>';}
function renderWork(){
 const list=$('tripList');if(!list)return;
 if(!user){list.innerHTML='';return;}
 if(workError){list.innerHTML='<div class="notice work-error">'+esc(workError)+'</div>';return;}
 const query=$('tripSearch').value.trim().toLowerCase(),status=$('tripStatusFilter').value;
 const trips=workTrips.filter(t=>(!status||t.status===status)&&(!query||[t.load_reference,t.origin,t.destination,t.notes].join(' ').toLowerCase().includes(query)));
 $('tripSummary').innerHTML=workSummaryMarkup(WorkMath.summary(workTrips,workExpenses));
 list.innerHTML=trips.length?trips.map(t=>{const costs=workExpenses.filter(e=>e.trip_id===t.id).reduce((s,e)=>s+Number(e.amount),0);return '<article class="work-card"><div class="row"><h3>'+esc(t.load_reference||'Untitled trip')+'</h3><span class="pill">'+esc(workStatuses[t.status]||t.status)+'</span></div><p>'+esc(t.origin||'Pickup not set')+' → '+esc(t.destination||'Destination not set')+'</p><div class="row"><small>'+esc(t.pickup_date||'Date not set')+' · '+WorkMath.milesToKm(Number(t.distance_miles)||0).toLocaleString('en-CA',{maximumFractionDigits:1})+' km</small><strong>'+cad(t.gross_revenue)+'</strong></div><p class="work-note">Recorded expenses: '+cad(costs)+' · Revenue less recorded expenses: '+cad(Number(t.gross_revenue)-costs)+'</p>'+(t.notes?'<p>'+esc(t.notes)+'</p>':'')+'<div class="actions"><button type="button" data-work="edit" data-id="'+esc(t.id)+'" class="secondary">Edit load</button><button type="button" data-work="expense" data-id="'+esc(t.id)+'" class="secondary">Add expense</button><button type="button" data-work="status" data-id="'+esc(t.id)+'" class="secondary">Update status</button><button type="button" data-work-document="'+esc(t.id)+'" class="secondary">Documents</button><button type="button" data-work-backhaul="'+esc(t.id)+'" class="secondary">Find return load</button></div><div id="status-'+esc(t.id)+'" class="hidden"><label>Load status<select aria-label="Status for '+esc(t.load_reference||'load')+'" data-work-status="'+esc(t.id)+'">'+Object.entries(workStatuses).map(([key,label])=>'<option value="'+key+'"'+(t.status===key?' selected':'')+'>'+label+'</option>').join('')+'</select></label></div></article>';}).join(''):'<div class="empty">'+(workTrips.length?'No loads match these filters.':'Your load log starts here. Add a load or save one from the marketplace.')+'</div>';
 $('tripRecordCount').textContent=workTrips.length>=1000?'Showing your latest 1,000 saved loads.':workTrips.length+' saved load'+(workTrips.length===1?'':'s');
}
function showTripEditor(id,preset={}){
 if(!user){showAuth();return;}
 const t=id?workTrips.find(t=>t.id===id):preset;if(!t)return;
 const f=$('tripEditor');f.reset();f.elements.id.value=id||'';
 for(const key of ['load_reference','origin','destination','pickup_date','delivery_date','notes','proof_of_delivery_reference'])if(f.elements[key])f.elements[key].value=t[key]||'';
 f.elements.status.value=t.status||'planned';f.elements.gross_revenue.value=t.gross_revenue??'';f.elements.distance_km.value=t.distance_miles!=null?Number(WorkMath.milesToKm(t.distance_miles).toFixed(2)):t.distance_km??'';
 $('tripEditorTitle').textContent=id?'Edit trip':'Add a trip';$('tripSaveMsg').textContent='';f.hidden=false;f.scrollIntoView({behavior:'smooth',block:'start'});
}
async function saveWorkTrip(event){
 event.preventDefault();if(!user||workBusy)return;const uid=user.id,f=event.currentTarget,data=new FormData(f),id=String(data.get('id')||'');
 if(!f.reportValidity())return;
 if(data.get('delivery_date')&&data.get('pickup_date')&&data.get('delivery_date')<data.get('pickup_date')){$('tripSaveMsg').textContent='Delivery date must be on or after pickup.';return;}
 const item={user_id:uid,load_reference:String(data.get('load_reference')).trim(),origin:String(data.get('origin')).trim(),destination:String(data.get('destination')).trim(),status:String(data.get('status')),pickup_date:data.get('pickup_date')||null,delivery_date:data.get('delivery_date')||null,gross_revenue:Number(data.get('gross_revenue')),distance_miles:WorkMath.kmToMiles(Number(data.get('distance_km'))),notes:String(data.get('notes')).trim(),proof_of_delivery_reference:String(data.get('proof_of_delivery_reference')||'').trim()||null,updated_at:new Date().toISOString()};
 workBusy=true;f.querySelector('[type=submit]').disabled=true;$('tripSaveMsg').textContent='Saving load…';
 try{let q=id?api.from('trips').update(item).eq('id',id).eq('user_id',uid):api.from('trips').insert(item);const {data:saved,error}=await q.select('id').single();if(error||!saved)throw error||new Error('Load was not saved.');if(user?.id!==uid)return;f.hidden=true;await loadWork();$('workMsg').textContent='Load saved to your account.';}catch(e){if(user?.id===uid)$('tripSaveMsg').textContent=workErrorText(e);}finally{workBusy=false;f.querySelector('[type=submit]').disabled=false;}
}
async function updateWorkStatus(id,status){if(!user||!workStatuses[status])return;const uid=user.id;const prior=workTrips.find(t=>t.id===id);if(!prior)return;if(prior.status==='paid'&&status!=='paid'){const ok=window.confirm('This load was marked paid. Changing its status will not remove recorded invoice payments. Continue?');if(!ok){renderWork();return;}}const {data,error}=await api.from('trips').update({status,payment_received_at:status==='paid'?new Date().toISOString():(workTrips.find(t=>t.id===id)?.payment_received_at||null),updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',uid).select('id').single();if(user?.id!==uid)return;if(error||!data){$('workMsg').textContent=workErrorText(error);renderWork();return;}await loadWork();$('workMsg').textContent='Load status updated.';}
function showExpenseEditor(tripId,id){
 if(!user){showAuth();return;}const f=$('expenseEditor');f.reset();f.elements.id.value=id||'';const e=id?workExpenses.find(e=>e.id===id):null;
 f.elements.trip_id.innerHTML='<option value="">General business expense</option>'+workTrips.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.load_reference||'Untitled load')+'</option>').join('');
 f.elements.trip_id.value=e?.trip_id||tripId||'';f.elements.category.value=e?.category||'Fuel';f.elements.amount.value=e?.amount??'';f.elements.expense_date.value=e?.expense_date||workToday();f.elements.notes.value=e?.notes||'';
 $('expenseSaveMsg').textContent='';$('expenseEditorTitle').textContent=id?'Edit expense':'Add an expense';f.hidden=false;f.scrollIntoView({behavior:'smooth',block:'start'});
}
async function saveWorkExpense(event){
 event.preventDefault();if(!user||workBusy)return;const f=event.currentTarget;if(!f.reportValidity())return;const uid=user.id,d=new FormData(f),id=String(d.get('id')||'');
 const item={user_id:uid,trip_id:d.get('trip_id')||null,category:String(d.get('category')),amount:Number(d.get('amount')),expense_date:String(d.get('expense_date')),notes:String(d.get('notes')).trim()};
 workBusy=true;f.querySelector('[type=submit]').disabled=true;$('expenseSaveMsg').textContent='Saving expense…';
 try{const q=id?api.from('expenses').update(item).eq('id',id).eq('user_id',uid):api.from('expenses').insert(item);const {data,error}=await q.select('id').single();if(error||!data)throw error||new Error('Expense was not saved.');if(user?.id!==uid)return;f.hidden=true;await loadWork();$('expenseMsg').textContent='Expense saved to your account.';}catch(e){if(user?.id===uid)$('expenseSaveMsg').textContent=workErrorText(e);}finally{workBusy=false;f.querySelector('[type=submit]').disabled=false;}
}
function renderExpenses(){
 const list=$('expenseList');if(!list)return;if(!user){list.innerHTML='';return;}if(workError){list.innerHTML='<div class="notice work-error">'+esc(workError)+'</div>';return;}
 const month=$('expenseMonth').value;const rows=month?workExpenses.filter(e=>e.expense_date.startsWith(month)):workExpenses;
 $('expenseTotal').textContent=cad(rows.reduce((s,e)=>s+Number(e.amount),0));
 list.innerHTML=rows.length?rows.map(e=>{const t=workTrips.find(t=>t.id===e.trip_id);return '<article class="work-card"><div class="row"><h3>'+esc(e.category)+'</h3><strong>'+cad(e.amount)+'</strong></div><p class="muted">'+esc(e.expense_date)+' · '+esc(t?.load_reference||'General business expense')+'</p>'+(e.notes?'<p>'+esc(e.notes)+'</p>':'')+'<button class="secondary" type="button" data-expense-edit="'+esc(e.id)+'">Edit expense</button></article>';}).join(''):'<div class="empty">No recorded expenses'+(month?' for this month':' yet')+'. Add fuel, tolls and other business costs here.</div>';
}
function renderWorkReport(){
 const el=$('workReport');if(!el)return;if(!user){el.innerHTML='';return;}if(workError){el.innerHTML='<div class="notice work-error">'+esc(workError)+'</div>';return;}
 const trips=workMonth(workTrips,'pickup_date'),expenses=workMonth(workExpenses,'expense_date');const s=WorkMath.summary(trips,expenses);const categories={};for(const e of expenses)categories[e.category]=(categories[e.category]||0)+Number(e.amount);
 el.innerHTML=workSummaryMarkup(s)+'<p class="work-note">All amounts in CAD. Revenue uses pickup dates and excludes cancelled loads. Expenses use their expense dates, including general business expenses. Revenue less recorded expenses is not net profit; unrecorded costs, tax and overhead are excluded.</p><div class="report-scroll"><table class="report-table"><thead><tr><th scope="col">Expense category</th><th scope="col">Amount</th></tr></thead><tbody>'+Object.entries(categories).map(([key,value])=>'<tr><td>'+esc(key)+'</td><td>'+cad(value)+'</td></tr>').join('')+'</tbody></table></div>'+(!expenses.length?'<p>No expenses recorded for this period.</p>':'')+'<p class="work-note">Reports cover up to the latest 1,000 loads and 5,000 expenses saved to your account.</p>';
}
function downloadWorkReport(){
 if(!user||workLoadedUser!==user.id||workError){$('reportMsg').textContent='Load your saved records before exporting.';return;}
 const month=$('reportMonth').value||'all-dates',trips=workMonth(workTrips,'pickup_date'),expenses=workMonth(workExpenses,'expense_date');
 const rows=[['Record type','Date','Load reference','Origin','Destination','Status / category','Revenue (CAD)','Expense (CAD)','Distance (km)','Notes']];
 for(const t of trips)rows.push(['Load',t.pickup_date,t.load_reference,t.origin,t.destination,workStatuses[t.status],t.gross_revenue,'',WorkMath.milesToKm(t.distance_miles).toFixed(2),t.notes]);
 for(const e of expenses)rows.push(['Expense',e.expense_date,workTrips.find(t=>t.id===e.trip_id)?.load_reference||'General business expense','','',e.category,'',e.amount,'',e.notes]);
 const url=URL.createObjectURL(new Blob([WorkMath.csv(rows)],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='MileForge-report-'+month+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('reportMsg').textContent='Report exported.';
}
function marketplaceToCalculator(id){const l=loads.find(l=>l.id===id);if(!l)return;tab('profit');$('calcRate').value=l.pay_cad;$('calcLoaded').value=l.distance_km;$('calcDeadhead').value=0;$('calcKm').value=equip?.running_cost_per_km??0.85;$('calcExtras').value=0;computeProfit();$('calcLoadNote').textContent='Loaded from '+l.title+'. Add your empty distance and other costs before deciding.';}
function marketplaceToLog(id){const l=loads.find(l=>l.id===id);if(!l)return;tab('log');showTripEditor(null,{load_reference:l.title,origin:l.pickup_city+', '+l.pickup_region,destination:l.dropoff_city+', '+l.dropoff_region,pickup_date:l.pickup_date,gross_revenue:l.pay_cad,distance_km:l.distance_km,notes:'Saved from marketplace. This is a private planning record; it does not book or accept the load.'});}
function saveCalculatorToLog(){const preset={gross_revenue:Number($('calcRate').value),distance_km:Number($('calcLoaded').value)+Number($('calcDeadhead').value)};tab('log');showTripEditor(null,preset);}
const beforeWorkTab=tab;tab=function(name){if(['log','expenses','reports','plans'].includes(name)&&user){for(const section of document.querySelectorAll('#appWorkspace > section'))section.classList.add('hidden');for(const t of ['log','expenses','reports','plans'])$(t).classList.toggle('hidden',t!==name);$('cinemaHero').classList.add('hidden');$('homeNav').classList.add('hidden');$('sectionBack').classList.remove('hidden');document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));if(name!=='plans')loadWork();window.scrollTo({top:0,behavior:'smooth'});return;}for(const t of ['log','expenses','reports','plans'])$(t).classList.add('hidden');beforeWorkTab(name);};
const beforeWorkRefresh=refreshAuth;refreshAuth=async function(){const previous=user?.id;await beforeWorkRefresh();if(user?.id!==previous){resetWork();if(user&&['log','expenses','reports'].some(id=>!$(id).classList.contains('hidden')))loadWork();}};
document.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.work){if(b.dataset.work==='edit')showTripEditor(b.dataset.id);if(b.dataset.work==='expense'){tab('expenses');showExpenseEditor(b.dataset.id);}if(b.dataset.work==='status')$('status-'+b.dataset.id).classList.toggle('hidden');}if(b.dataset.expenseEdit)showExpenseEditor(null,b.dataset.expenseEdit);});
document.addEventListener('change',event=>{if(event.target.dataset.workStatus)updateWorkStatus(event.target.dataset.workStatus,event.target.value);});
$('tripEditor').addEventListener('submit',saveWorkTrip);$('expenseEditor').addEventListener('submit',saveWorkExpense);
$('tripSearch').addEventListener('input',renderWork);$('tripStatusFilter').addEventListener('change',renderWork);$('expenseMonth').addEventListener('change',renderExpenses);$('reportMonth').addEventListener('change',renderWorkReport);
if(typeof module!=='undefined')module.exports=WorkMath;
