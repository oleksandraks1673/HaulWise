/* MileForge growth: draft import, estimate history, community trust, referrals. */
(function(){
'use strict';
const el=id=>document.getElementById(id), money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(Number(n)||0);
const panel=(id,html,place,mode='afterbegin')=>{let x=el(id);if(!x){x=document.createElement('section');x.id=id;x.className='mf-growth-panel panel';x.innerHTML=html;place.insertAdjacentElement(mode,x)}return x};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function logged(){return typeof user!=='undefined'&&user?.id}
let epoch=0;
function setup(){
 const log=el('log'),profit=el('profit'),plan=el('plans'),post=el('post');
 if(log)panel('mfSmartImport',`<h2>Smart Load Import</h2><p>Paste your own rate confirmation or load details. Review everything before saving. No automatic booking.</p><label for="mfPaste">Load details</label><textarea id="mfPaste" rows="4" maxlength="8000" placeholder="Load #: 4408&#10;Pickup: Toronto, ON&#10;Delivery: Ottawa, ON&#10;Rate: $850 CAD&#10;Distance: 450 km"></textarea><label for="mfFile">Or read your own text file (TXT/CSV)</label><input id="mfFile" type="file" accept=".txt,.csv,text/plain,text/csv"><div class="actions"><button id="mfParse" type="button">Preview load</button></div><p id="mfImportMsg" role="status"></p><div id="mfPreview" hidden></div>`,log,'afterbegin');
 if(profit)panel('mfProfitHistory',`<h2>Profit History</h2><p>Keep estimates to compare offers. They are not actual earnings.</p><label for="mfEstimateName">Load reference (optional)</label><input id="mfEstimateName" maxlength="120" placeholder="e.g. Toronto to Ottawa"><div class="actions"><button type="button" id="mfSaveEstimate">Save current estimate</button><button type="button" class="secondary" id="mfRefreshEstimates">Refresh history</button></div><p id="mfProfitMessage" role="status"></p><div id="mfEstimateList"></div>`,profit,'beforeend');
 if(plan)panel('mfReferralStats',`<h2>Invite drivers</h2><p>Share MileForge with another driver. Referral tracking is free; rewards and commissions are not currently offered.</p><div class="actions"><button type="button" id="mfCopyReferral">Copy my referral link</button></div><p id="mfReferralMsg" role="status"></p><p id="mfReferralCount">Confirmed referrals: —</p>`,plan,'beforeend');
 if(post)panel('mfPostingSafety',`<h2>Direct marketplace · member-posted loads</h2><p>Only post freight you own or are authorized to offer. Loads are not independently verified by MileForge. Drivers should confirm shipper identity, insurance, rate, equipment fit and transport authority before accepting.</p>`,post,'afterbegin');
}
function extract(text){
 const raw=String(text).slice(0,8000), rows=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const pick=(pattern)=>{let found=rows.find(l=>pattern.test(l));return found?found.replace(pattern,'').replace(/^\s*[:#=\-]\s*/,'').trim():''};
 const ref=pick(/^(load\s*(?:number|no\.?|#|id)|reference|ref)\s*[:#=\-]?/i);
 const origin=pick(/^(pickup|origin|from)\s*[:#=\-]?/i);
 const destination=pick(/^(delivery|dropoff|destination|to)\s*[:#=\-]?/i);
 const cash=pick(/^(rate|pay|payment|offered\s*rate|total\s*pay)\s*[:#=\-]?/i);
 const km=pick(/^(distance|loaded\s*(?:km|distance)|mileage)\s*[:#=\-]?/i);
 const date=pick(/^(pickup\s*date)\s*[:#=\-]?/i);
 const amount=str=>{let m=str.replace(/,/g,'').match(/(?:CAD|USD|\$)?\s*(\d+(?:\.\d{1,2})?)/i);return m?Number(m[1]):null};
 return {ref:ref.slice(0,120),origin:origin.slice(0,160),destination:destination.slice(0,160),rate:amount(cash),distance:amount(km),date:/^\d{4}-\d\d-\d\d$/.test(date)?date:''};
}
function preview(){
 const data=extract(el('mfPaste').value);el('mfImportMsg').textContent='Draft only. Check the load details against the original document before saving.';
 const x=el('mfPreview');x.hidden=false;x.replaceChildren();
 x.innerHTML='<div class="mf-preview-grid">'+[['Load reference','ref'],['Pickup','origin'],['Delivery','destination'],['Rate CAD','rate'],['Loaded distance (km)','distance'],['Pickup date','date']].map(([label,key])=>'<label>'+label+'<input data-import="'+key+'" '+(['rate','distance'].includes(key)?'type="number" min="0" step=".01"':'type="text"')+' value="'+safe(data[key]??'')+'"></label>').join('')+'</div><div class="actions"><button id="mfUseProfit" type="button">Use in calculator</button><button id="mfSaveLoadDraft" type="button">Review in My Loads</button></div><p class="work-note">No load is saved until you press Save in My Loads. Load tracking may require Pro.</p>';
}
function draft(){const p=el('mfPreview');if(!p||p.hidden)return null;const obj={};p.querySelectorAll('[data-import]').forEach(x=>obj[x.dataset.import]=x.value.trim());return obj}
function useCalc(){const a=draft();if(!a)return;tab('profit');if(a.rate)el('calcRate').value=a.rate;if(a.distance)el('calcLoaded').value=a.distance;el('calcSourceNotice').textContent='Draft imported from your text. Verify all numbers and enter empty miles and costs.';computeProfit();}
function useLog(){const a=draft();if(!a)return;tab('log');showTripEditor(null,{load_reference:a.ref||'Imported load',origin:a.origin,destination:a.destination,pickup_date:a.date,gross_revenue:a.rate||'',distance_km:a.distance||'',notes:'Imported draft. Validate against original document. Booking is not confirmed.'});}
async function saveEstimate(){
 if(!logged())return;const uid=user.id,r=typeof currentProfitEstimate!=='undefined'?currentProfitEstimate:null;
 if(!r?.valid||!Number.isFinite(r.remaining)||!Number.isFinite(r.totalCost)){el('mfProfitMessage').textContent='Calculate a complete, valid estimate first.';return;}
 const b=el('mfSaveEstimate');b.disabled=true;
 const input=r.inputs||{};
 const amount=Number(input.payment??el('calcRate').value),loaded=Number(input.loadedKm??el('calcLoaded').value),empty=Number(input.emptyKm??el('calcDeadhead').value);
 if(![amount,loaded,empty,r.totalCost,r.remaining].every(Number.isFinite)){b.disabled=false;return;}
 const value={user_id:uid,reference:el('mfEstimateName').value.trim(),offered_cad:amount,loaded_km:loaded,empty_km:empty,estimated_cost_cad:r.totalCost,estimated_remaining_cad:r.remaining,margin_percent:Number.isFinite(r.marginPercent)?r.marginPercent:null};
 const {error}=await api.from('mileforge_profit_estimates').insert(value);
 b.disabled=false;if(user?.id!==uid)return;
 el('mfProfitMessage').textContent=error?'Could not save: '+error.message:'Estimate saved to your account.';
 if(!error)refreshEstimates();
}
async function refreshEstimates(){
 if(!logged())return;const uid=user.id,n=++epoch;const node=el('mfEstimateList');
 node.textContent='Loading saved estimates…';
 const {data,error}=await api.from('mileforge_profit_estimates').select('id,reference,offered_cad,estimated_cost_cad,estimated_remaining_cad,loaded_km,empty_km,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(30);
 if(user?.id!==uid||n!==epoch)return;
 if(error){node.textContent='History unavailable: '+error.message;return;}
 node.replaceChildren();
 if(!data?.length){node.textContent='No saved estimates yet.';return}
 for(const e of data){let card=document.createElement('article');card.className='mf-estimate-row';
 const heading=document.createElement('strong');heading.textContent=e.reference||'Untitled load';
 const details=document.createElement('p');details.textContent='Offered '+money(e.offered_cad)+' · Estimated costs '+money(e.estimated_cost_cad)+' · Estimated remaining '+money(e.estimated_remaining_cad);
 const sub=document.createElement('small');sub.textContent=new Date(e.created_at).toLocaleDateString('en-CA')+' · '+e.loaded_km+' loaded km · '+e.empty_km+' empty km';
 const btn=document.createElement('button');btn.type='button';btn.className='secondary';btn.textContent='Delete estimate';btn.onclick=async()=>{if(!confirm('Delete this saved estimate?'))return;btn.disabled=true;const r=await api.from('mileforge_profit_estimates').delete().eq('id',e.id).eq('user_id',uid);if(r.error){el('mfProfitMessage').textContent=r.error.message;btn.disabled=false}else refreshEstimates()};
 card.append(heading,details,sub,btn);node.append(card);}
}
function referrer(){try{const x=new URLSearchParams(location.search).get('ref');return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(x||'')?x:null}catch{return null}}
async function recordReferral(){
 if(!logged())return;const uid=user.id,ref=referrer();if(!ref||ref===uid)return;
 const {data,error}=await api.from('mileforge_referrals').insert({referred_id:uid,referrer_id:ref}).select('referred_id').maybeSingle();
 if(error&&error.code!=='23505')return;
 if(data)history.replaceState(null,'',location.pathname+location.search.replace(/([?&])ref=[^&]*&?/,'$1').replace(/[?&]$/,'')+location.hash);
}
async function refreshReferral(){
 if(!logged())return;const uid=user.id,elCount=el('mfReferralCount');if(!elCount)return;
 const {count,error}=await api.from('mileforge_referrals').select('referred_id',{count:'exact',head:true}).eq('referrer_id',uid);
 if(user?.id===uid)elCount.textContent=error?'Referral count unavailable':('Confirmed referrals: '+count+' (no rewards are currently offered)');
}
function copyReferral(){if(!logged())return;const url=location.origin+'/?signup=1&ref='+encodeURIComponent(user.id);const msg=el('mfReferralMsg');if(navigator.clipboard?.writeText)navigator.clipboard.writeText(url).then(()=>msg.textContent='Your referral link is copied.').catch(()=>msg.textContent=url);else msg.textContent=url}
function visible(){if(!logged())return;const p=el('profit');if(p&&!p.classList.contains('hidden'))refreshEstimates();if(el('plans')&&!el('plans').classList.contains('hidden'))refreshReferral();}
function boot(){
 setup();
 el('mfParse')?.addEventListener('click',preview);
 el('mfUseProfit')?.addEventListener('click',useCalc);
 el('mfPreview')?.addEventListener('click',e=>{if(e.target.id==='mfUseProfit')useCalc();if(e.target.id==='mfSaveLoadDraft')useLog()});
 el('mfFile')?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>1024*1024){el('mfImportMsg').textContent='Maximum file size is 1 MB.';return}if(!/\.(txt|csv)$/i.test(file.name)){el('mfImportMsg').textContent='Use a TXT or CSV file. PDF and images are not supported in this version.';return}el('mfPaste').value=(await file.text()).slice(0,8000);preview()});
 el('mfSaveEstimate')?.addEventListener('click',saveEstimate);el('mfRefreshEstimates')?.addEventListener('click',refreshEstimates);
 el('mfCopyReferral')?.addEventListener('click',copyReferral);
 const oldTab=tab;tab=function(name){const result=oldTab.apply(this,arguments);visible();return result};
 api.auth.onAuthStateChange(()=>setTimeout(()=>{if(logged()){recordReferral();visible()}else{++epoch;el('mfEstimateList').replaceChildren();el('mfReferralCount').textContent='Confirmed referrals: —'}},1000));
 if(logged()){recordReferral();visible()}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();