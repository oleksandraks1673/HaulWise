/* MileForge linked load -> invoice -> payment flow. Existing records are never replaced. */
(function(){
const $=id=>document.getElementById(id),safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
let invoices=[],payments=[],selected=null,busy=false;
const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(Number(n)||0);
const date=()=>new Date().toLocaleDateString('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'}).split('-').join('-');
const panel=document.createElement('section');panel.id='mfInvoicePanel';panel.className='panel mf-invoice-panel';panel.hidden=true;
panel.innerHTML='<div class="row"><div><h2 id="mfInvoiceTitle">Load invoice</h2><p id="mfInvoiceSubtitle" class="muted"></p></div><button type="button" class="secondary" id="mfInvoiceClose">Close</button></div><p id="mfInvoiceMessage" role="status" aria-live="polite"></p><div id="mfInvoiceContents"></div>';
const logs=$('log');if(!logs)return;logs.insertBefore(panel,$('tripList')); 
$('mfInvoiceClose').onclick=()=>{panel.hidden=true;selected=null};
const getInv=id=>invoices.find(x=>x.trip_id===id);
const getPaid=id=>payments.filter(x=>x.invoice_id===id).reduce((s,p)=>s+Number(p.amount),0);
async function reload(){
if(!user){invoices=[];payments=[];return}
const uid=user.id;
const a=await api.from('mileforge_invoices').select('*').eq('user_id',uid).order('created_at',{ascending:false});
if(a.error){$('mfInvoiceMessage').textContent=a.error.message;return}
if(user?.id!==uid)return;invoices=a.data||[];
const b=await api.from('mileforge_invoice_payments').select('*').eq('user_id',uid);
if(b.error){$('mfInvoiceMessage').textContent=b.error.message;return}
if(user?.id!==uid)return;payments=b.data||[];
drawButtons();
if(selected)drawSelected();
}
function drawButtons(){
const list=$('tripList');if(!list)return;
list.querySelectorAll('article.work-card').forEach(card=>{
 const id=card.querySelector('[data-work="edit"]')?.dataset.id;if(!id)return;
 card.querySelectorAll('.mf-flow-action').forEach(x=>x.remove());
 const trip=workTrips.find(t=>t.id===id);if(!trip)return;
 const actions=card.querySelector('.actions');if(!actions)return;
 const inv=getInv(id),button=document.createElement('button');button.type='button';button.className='secondary mf-flow-action';button.dataset.mfInvoice=id;
 button.textContent=inv?'Invoice · '+(getPaid(inv.id)>=Number(inv.amount)-.001?'Paid':money(Math.max(0,Number(inv.amount)-getPaid(inv.id)))+' due'):'Invoice & payment';
 actions.appendChild(button);
});
}
function drawSelected(){
const trip=workTrips.find(t=>t.id===selected);if(!trip){panel.hidden=true;return}
panel.hidden=false;panel.scrollIntoView({behavior:'smooth',block:'start'});
$('mfInvoiceTitle').textContent='Invoice & payment tracking';
$('mfInvoiceSubtitle').textContent=(trip.load_reference||'Load')+' · '+(trip.origin||'Pickup')+' → '+(trip.destination||'Destination');
const inv=getInv(selected),slot=$('mfInvoiceContents');
if(!inv){
 if(!['delivered','completed','paid'].includes(trip.status)){slot.innerHTML='<p class="notice">Mark this load Delivered before creating an invoice. You can add proof of delivery using Documents.</p>';return}
 slot.innerHTML='<form id="mfCreateInvoice"><div class="grid"><div><label for="mfCustomer">Customer / company</label><input id="mfCustomer" name="customer" required maxlength="160" minlength="2"></div><div><label for="mfCustomerEmail">Customer email (optional)</label><input id="mfCustomerEmail" type="email" name="email" maxlength="254"></div><div><label for="mfDue">Payment due date</label><input id="mfDue" name="due" type="date"></div><div><label for="mfAmount">Invoice amount (CAD)</label><input id="mfAmount" type="number" min=".01" max="1000000" step=".01" name="amount" required value="'+safe(Number(trip.gross_revenue)||0)+'"></div></div><label for="mfDescription">Description</label><input id="mfDescription" name="description" required maxlength="300" value="Hauling services"><button type="submit">Create invoice from this load</button></form>';
 $('mfCreateInvoice').onsubmit=async e=>{
 e.preventDefault();if(busy||!e.currentTarget.reportValidity())return;
 const v=new FormData(e.currentTarget);busy=true;$('mfInvoiceMessage').textContent='Saving invoice…';
 try{const {error}=await api.from('mileforge_invoices').insert({user_id:user.id,trip_id:selected,customer_name:String(v.get('customer')).trim(),customer_email:String(v.get('email')).trim()||null,description:String(v.get('description')).trim(),amount:Number(v.get('amount')),due_date:v.get('due')||null}).select('id').single();if(error)throw error;await reload();$('mfInvoiceMessage').textContent='Invoice saved.'}catch(ex){$('mfInvoiceMessage').textContent=ex.message}finally{busy=false}
 };return;
}
const paid=getPaid(inv.id),remaining=Math.max(0,Number(inv.amount)-paid),rows=payments.filter(p=>p.invoice_id===inv.id);
slot.innerHTML='<div class="mf-invoice-totals"><div><small>Invoice total</small><strong>'+money(inv.amount)+'</strong></div><div><small>Recorded payments</small><strong>'+money(paid)+'</strong></div><div><small>Outstanding</small><strong>'+money(remaining)+'</strong></div></div><p><strong>Invoice:</strong> MF-'+safe(inv.id.slice(0,8).toUpperCase())+' · <strong>Customer:</strong> '+safe(inv.customer_name)+' · <strong>Issued:</strong> '+safe(inv.issue_date)+(inv.due_date?' · <strong>Due:</strong> '+safe(inv.due_date):'')+'</p><button type="button" class="secondary" id="mfPrintInvoice">View / print invoice</button><h3>Payments</h3>'+(rows.length?rows.map(p=>'<p>'+safe(p.paid_on)+' · '+money(p.amount)+' · '+safe(p.method.replaceAll('_',' '))+'</p>').join(''):'<p class="muted">No payments recorded.</p>')+(remaining>0?'<form id="mfRecordPayment"><div class="grid"><div><label for="mfPaymentAmount">Received amount (CAD)</label><input id="mfPaymentAmount" type="number" min=".01" max="'+remaining.toFixed(2)+'" step=".01" name="amount" value="'+remaining.toFixed(2)+'" required></div><div><label for="mfPaymentDate">Date received</label><input id="mfPaymentDate" name="date" type="date" required value="'+new Date().toISOString().slice(0,10)+'"></div><div><label for="mfPaymentMethod">Method</label><select id="mfPaymentMethod" name="method"><option value="bank_transfer">Bank transfer</option><option value="e_transfer">E-transfer</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="other">Other</option></select></div><div><label for="mfPaymentRef">Reference (optional)</label><input id="mfPaymentRef" name="ref" maxlength="200"></div></div><button type="submit">Record received payment</button></form>':'<p class="pill">Fully paid</p>');
$('mfPrintInvoice').onclick=()=>{const w=window.open('','_blank');if(!w){$('mfInvoiceMessage').textContent='Allow pop-ups to view the printable invoice.';return}const clean=x=>safe(x);w.document.write('<!doctype html><title>Invoice MF-'+clean(inv.id.slice(0,8))+'</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px Arial;margin:40px;color:#122737}h1{color:#02779d}table{width:100%;border-collapse:collapse}td{padding:12px;border-bottom:1px solid #ccc}strong{font-weight:700}</style><h1>MileForge Invoice</h1><p>MF-'+clean(inv.id.slice(0,8).toUpperCase())+'</p><p>Bill to: '+clean(inv.customer_name)+'</p><p>Issue date: '+clean(inv.issue_date)+'</p><p>Due: '+clean(inv.due_date||'Upon receipt')+'</p><table><tr><td>'+clean(inv.description)+'</td><td>'+money(inv.amount)+'</td></tr></table><p>Load: '+clean(trip.load_reference)+'</p><p>Route: '+clean(trip.origin)+' → '+clean(trip.destination)+'</p><p>Paid: '+money(paid)+' | Balance due: '+money(remaining)+'</p><p>Payment instructions should be provided by the carrier directly.</p>');w.document.close();w.focus();};
const form=$('mfRecordPayment');if(form)form.onsubmit=async e=>{
 e.preventDefault();if(busy||!e.currentTarget.reportValidity())return;const v=new FormData(e.currentTarget);busy=true;$('mfInvoiceMessage').textContent='Recording payment…';
 try{const {error}=await api.from('mileforge_invoice_payments').insert({invoice_id:inv.id,user_id:user.id,amount:Number(v.get('amount')),paid_on:v.get('date'),method:v.get('method'),reference:String(v.get('ref')).trim()||null}).select('id').single();if(error)throw error;await reload();$('mfInvoiceMessage').textContent='Payment recorded. This does not transfer money.'}catch(ex){$('mfInvoiceMessage').textContent=ex.message}finally{busy=false}
};
}
$('tripList').addEventListener('click',e=>{const b=e.target.closest('[data-mf-invoice]');if(!b)return;selected=b.dataset.mfInvoice;$('mfInvoiceMessage').textContent='';drawSelected()});
const origRender=renderWork;renderWork=function(){origRender.apply(this,arguments);drawButtons()};
const origLoad=loadWork;loadWork=async function(){const r=await origLoad.apply(this,arguments);if(user)await reload();return r};
const origReset=resetWork;resetWork=function(){origReset.apply(this,arguments);invoices=[];payments=[];selected=null;panel.hidden=true};
})();
