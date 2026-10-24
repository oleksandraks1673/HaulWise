/* HaulWise seven-feature upgrade: private documents, backhauls, onboarding, trip economics. */
(function(){
'use strict';
const $g=id=>document.getElementById(id), fmt=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n);
const extras=['calcTolls','calcParking','calcDispatch'];
const baseRead=readProfitValues;
readProfitValues=function(){
 const r=baseRead(),numbers=extras.map(id=>{const v=$g(id)?.value??'';return v===''?0:Number(v);});
 const other=r.extras===''?0:Number(r.extras);
 r.extras=numbers.some(n=>!Number.isFinite(n)||n<0||n>1000000)||!Number.isFinite(other)?NaN:other+numbers.reduce((a,b)=>a+b,0);
 return r;
};
const baseCompute=computeProfit;
computeProfit=function(){
 const r=baseCompute();
 const note=$g('growthProfitRecommendation');
 if(note){
  note.dataset.level=!r?.valid?'pending':r.status==='loss'?'loss':r.status==='below'?'caution':'positive';
  note.textContent=!r?.valid?'Enter all relevant costs, including empty miles. These are estimates, not actual net income.':
   (r.status==='loss'?'Potential loss. ':r.status==='below'?'Below your target. ':'Meets your entered target. ')+
   'Estimated remaining before tax '+fmt(r.remaining)+'. Empty driving costs '+fmt(r.emptyDrivingCost)+'. Verify every cost before accepting.';
 }
 if($g('growthCostPerKm'))$g('growthCostPerKm').textContent=r?.valid?fmt(r.totalCost/r.totalKm):'—';
 if($g('growthRevenuePerKm'))$g('growthRevenuePerKm').textContent=r?.valid?fmt(r.inputs.payment/r.totalKm):'—';
 return r;
};
const baseClear=clearProfitCalculation;
clearProfitCalculation=function(){extras.forEach(id=>{if($g(id))$g(id).value='0';});return baseClear();};
const baseExample=tryProfitExample;
tryProfitExample=function(){extras.forEach(id=>{if($g(id))$g(id).value='0';});return baseExample();};

function setupProgress(){
 const box=$g('growthOnboarding');if(!box||!user)return;
 const ready=workLoadedUser===user.id;
 const steps=[
  {done:!!equip,text:'Save your truck and trailer',tab:'equipment'},
  {done:ready&&workTrips.length>0,text:'Add your first trip',tab:'log'},
  {done:ready&&workExpenses.length>0,text:'Record fuel or expenses',tab:'expenses'},
  {done:ready&&workTrips.some(t=>['delivered','completed','paid'].includes(t.status)),text:'Complete your first trip',tab:'log'}
 ];
 box.replaceChildren();
 const p=document.createElement('p');p.textContent='Your setup · '+steps.filter(x=>x.done).length+' of 4 complete';box.append(p);
 for(const step of steps){const b=document.createElement('button');b.type='button';b.className='growth-check'+(step.done?' is-done':'');b.textContent=(step.done?'✓ ':'○ ')+step.text;b.onclick=()=>tab(step.tab);box.append(b);}
}
const originalRender=renderWork;renderWork=function(){originalRender();setupProgress();};
const originalSaveEquipment=saveEquipment;
saveEquipment=async function(){await originalSaveEquipment();setupProgress();};

function backhaul(id){
 const trip=workTrips.find(t=>t.id===id),panel=$g('growthBackhaul');if(!trip||!panel||!user)return;
 panel.hidden=false;$g('growthDocuments').hidden=true;
 const city=String(trip.destination||'').split(',')[0].trim();
 $g('growthBackhaulText').textContent='Find a return pickup near '+(city||'your delivery destination')+'. Confirm availability and total empty miles independently.';
 const matches=loads.filter(l=>String(l.pickup_city||'').toLowerCase().includes(city.toLowerCase())&&l.posted_by!==user.id&&
 (window.MileForgeFit.evaluate(l,equip).status!=='blocked')).slice(0,8);
 const list=$g('growthBackhaulMatches');list.replaceChildren();
 if(!matches.length){const note=document.createElement('p');note.textContent='No matching community return loads at this time. Try the official external load boards.';list.append(note);}
 for(const l of matches){
  const item=document.createElement('article');item.className='growth-match';
  const title=document.createElement('strong');title.textContent=l.pickup_city+' → '+l.dropoff_city;
  const details=document.createElement('p');const fit=window.MileForgeFit.evaluate(l,equip);details.textContent=l.title+' · '+fmt(Number(l.pay_cad))+' offered, before costs. · '+fit.label+'. '+fit.reason;
  item.append(title,details);list.append(item);
 }
 panel.scrollIntoView({behavior:'smooth',block:'start'});
}
$g('growthBackhaulCommunity')?.addEventListener('click',()=>{tab('find');haulwiseShowLoadSource('community');});
$g('growthBackhaulExternal')?.addEventListener('click',()=>{tab('find');haulwiseShowLoadSource('external');});
$g('growthCloseBackhaul')?.addEventListener('click',()=>{$g('growthBackhaul').hidden=true;});

let selectedTrip=null,requestId=0;
function docsMessage(s){$g('growthDocumentsMessage').textContent=s;}
async function refreshDocuments(){
 const uid=user?.id,trip=selectedTrip,version=++requestId;if(!uid||!trip)return;
 const q=await api.from('haulwise_trip_documents').select('file_name,document_type,storage_path').eq('user_id',uid).eq('trip_id',trip).order('created_at',{ascending:false}).limit(50);
 if(uid!==user?.id||selectedTrip!==trip||version!==requestId)return;
 const target=$g('growthDocumentsList');target.replaceChildren();
 if(q.error){docsMessage('Unable to load documents: '+q.error.message);return;}
 docsMessage((q.data||[]).length+' private document(s) saved.');
 for(const doc of q.data||[]){
  const row=document.createElement('div');row.className='growth-document-row';
  const name=document.createElement('span');name.textContent=doc.document_type.replaceAll('_',' ')+' · '+doc.file_name;
  const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='View securely';
  button.onclick=async()=>{
   if(user?.id!==uid)return;
   const result=await api.storage.from('haulwise-documents').createSignedUrl(doc.storage_path,60);
   if(result.error||!result.data?.signedUrl){docsMessage('Unable to open file.');return;}
   const url=new URL(result.data.signedUrl);
   if(url.protocol==='https:'&&url.hostname==='dwtnfrjwnweviunxdams.supabase.co')window.open(url.href,'_blank','noopener,noreferrer');
  };
  row.append(name,button);target.append(row);
 }
}
async function openDocuments(id){
 const trip=workTrips.find(t=>t.id===id);if(!trip||!user)return;
 if(!billingAllowed()){const note=$g('workMsg');note.textContent='Pro access required to upload and view saved trip documents.';return;}
 selectedTrip=id;$g('growthBackhaul').hidden=true;$g('growthDocuments').hidden=false;
 $g('growthDocumentTitle').textContent='Trip documents · '+trip.load_reference;
 docsMessage('Loading your documents…');await refreshDocuments();$g('growthDocuments').scrollIntoView({behavior:'smooth',block:'start'});
}
$g('growthCloseDocuments')?.addEventListener('click',()=>{$g('growthDocuments').hidden=true;selectedTrip=null;++requestId;});
$g('growthDocumentForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const uid=user?.id,trip=selectedTrip,file=$g('growthDocumentFile').files?.[0];
 if(!uid||!trip||!billingAllowed()){docsMessage('Pro access required.');return;}
 if(!file||file.size===0||file.size>10485760||!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)){docsMessage('Choose PDF, JPG, PNG or WEBP up to 10 MB.');return;}
 const b=e.currentTarget.querySelector('[type=submit]');b.disabled=true;
 const safe=file.name.replace(/[^A-Za-z0-9._-]/g,'_').slice(-100),path=uid+'/'+trip+'/'+crypto.randomUUID()+'-'+safe;
 docsMessage('Uploading privately…');
 try{
  const uploaded=await api.storage.from('haulwise-documents').upload(path,file,{contentType:file.type,upsert:false});
  if(uploaded.error)throw uploaded.error;
  const saved=await api.from('haulwise_trip_documents').insert({user_id:uid,trip_id:trip,document_type:$g('growthDocumentKind').value,file_name:file.name.slice(0,180),mime_type:file.type,storage_path:path});
  if(saved.error){await api.storage.from('haulwise-documents').remove([path]);throw saved.error;}
  if(uid!==user?.id||selectedTrip!==trip)return;
  e.currentTarget.reset();await refreshDocuments();
 }catch(err){if(uid===user?.id)docsMessage('Upload failed: '+(err.message||'Try again.'));}
 finally{b.disabled=false;}
});
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.workDocument)openDocuments(b.dataset.workDocument);
 if(b.dataset.workBackhaul)backhaul(b.dataset.workBackhaul);
});
const originalRefresh=refreshAuth;
refreshAuth=async function(){await originalRefresh();if(user?.id)setupProgress();else{selectedTrip=null;$g('growthDocuments').hidden=true;$g('growthBackhaul').hidden=true;}};
$g('growthInviteButton')?.addEventListener('click',async()=>{
 const invitation='Drivers: try MileForge for trip profit calculations, trip tracking, and freight-board links. Built for hotshots, pickup trailers and semis. Early-stage platform: https://haulwise-murex.vercel.app/';
 try{await navigator.clipboard.writeText(invitation);$g('growthInviteMessage').textContent='Invitation copied. Share with drivers who would like to test MileForge.';}
 catch{$g('growthInviteMessage').textContent='Use https://haulwise-murex.vercel.app/ to invite drivers.';}
});
})();
