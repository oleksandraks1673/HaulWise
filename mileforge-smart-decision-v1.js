/* MileForge Smart Load Decision: explain existing verified calculator estimates. */
(function(){
'use strict';
function init(){
 const panel=document.getElementById('profit');if(!panel||document.getElementById('mfDecision'))return;
 const style=document.createElement('style');style.textContent=`
 #mfDecision{border:1px solid #24657a;background:linear-gradient(135deg,#10374a,#092432);border-radius:18px;padding:18px;margin:14px 0}
 #mfDecision h2{font-size:21px;margin:0 0 7px}
 #mfDecision .mf-decision-lead{color:#b8d4df;margin:0 0 12px}
 #mfDecision .mf-decision-state{font-size:18px;font-weight:850;margin-bottom:8px}
 #mfDecision .mf-decision-numbers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}
 #mfDecision .mf-decision-numbers>div{background:#092635;border-radius:11px;padding:12px}
 #mfDecision .mf-decision-numbers small{display:block;color:#a8c6d3;font-size:12px}
 #mfDecision .mf-decision-numbers strong{display:block;font-size:19px;margin-top:5px}
 #mfDecision .mf-decision-note{color:#c0d6df;font-size:13px;line-height:1.5}
 #mfDecision .mf-decision-cta{width:100%;margin-top:12px}
 @media(max-width:390px){#mfDecision .mf-decision-numbers{grid-template-columns:1fr}}
 `;document.head.appendChild(style);
 const card=document.createElement('section');card.id='mfDecision';card.setAttribute('aria-live','polite');
 card.innerHTML='<h2>Is this load worth it?</h2><p class="mf-decision-lead">See your estimated earnings before you accept a load.</p><div class="mf-decision-state" id="mfDecisionState">Enter your load details above</div><div class="mf-decision-numbers"><div><small>Estimated remaining</small><strong id="mfDecisionRemaining">—</strong></div><div><small>Break-even payment</small><strong id="mfDecisionBreakEven">—</strong></div><div><small>Ask for at least</small><strong id="mfDecisionAsk">—</strong></div><div><small>Estimated remaining / km</small><strong id="mfDecisionPerKm">—</strong></div></div><p class="mf-decision-note" id="mfDecisionNote">Include empty driving, return distance, fuel, maintenance and fees for a useful estimate.</p><button type="button" class="mf-decision-cta" id="mfDecisionSave">Save to My Loads</button>';
 const results=document.getElementById('profitResults');results?.parentNode.insertBefore(card,results);
 document.getElementById('mfDecisionSave').addEventListener('click',()=>{if(typeof saveCalculatorToLog==='function')saveCalculatorToLog();});
 const money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(n);
 function update(r){
  const state=document.getElementById('mfDecisionState'),note=document.getElementById('mfDecisionNote'),save=document.getElementById('mfDecisionSave');
  if(!r||!r.valid){state.textContent='Enter your load details above';state.style.color='#c3d9e4';for(const id of ['mfDecisionRemaining','mfDecisionBreakEven','mfDecisionAsk','mfDecisionPerKm'])document.getElementById(id).textContent='—';note.textContent='Include empty driving, return distance, fuel, maintenance and fees for a useful estimate.';save.disabled=true;return;}
  const label=r.status==='loss'?'Below break-even':r.status==='below'?'Below your profit target':'Meets your profit target';
  state.textContent=label;state.style.color=r.status==='meets'?'#60ffd4':'#ffd49a';
  document.getElementById('mfDecisionRemaining').textContent=money(r.remaining);
  document.getElementById('mfDecisionBreakEven').textContent=money(r.breakEven);
  document.getElementById('mfDecisionAsk').textContent=money(r.minimumPayment);
  document.getElementById('mfDecisionPerKm').textContent=money(r.remainingPerTotalKm);
  note.textContent=(r.status==='below'?'To reach your target, negotiate at least '+money(Math.max(0,r.targetGap))+' more. ':'')+'Estimates use only the costs you enter. A positive result does not guarantee profit; include your unpaid return miles and all operating costs.';
  save.disabled=false;
 }
 const prior=computeProfit;computeProfit=function(){const r=prior.apply(this,arguments);update(r);return r;};
 update(currentProfitEstimate);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();