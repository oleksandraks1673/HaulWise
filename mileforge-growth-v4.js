/* MileForge conversion and onboarding v4. Brand, billing and stored work data unchanged. */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const query=new URLSearchParams(location.search);
const sources=new Set(['driver_invite','instagram','facebook','youtube','campaign','organic']);
const source=sources.has(query.get('src'))?query.get('src'):'organic';
const inviteURL='https://haulwise-murex.vercel.app/?signup=1&src=driver_invite';
let owner=null;
function signupSource(){return source;}
function updateAuth(){
 const signup=typeof authMode!=='undefined'&&authMode==='signup';
 const benefits=el('mfSignupBenefits');
 if(benefits)benefits.hidden=!signup;
 const referral=el('mfInviteGreeting');
 if(referral)referral.hidden=!(signup&&source==='driver_invite');
 const submit=el('submitAuth');
 if(submit&&!submit.disabled)submit.textContent=signup?'Create free account':'Sign in';
}
window.MileForgeGrowth=Object.freeze({signupSource,updateAuth,inviteURL});
const originalAuthMode=setAuthMode;
setAuthMode=function(mode){const result=originalAuthMode(mode);updateAuth();return result;};
if(query.get('signup')==='1'||source==='driver_invite')setAuthMode('signup');
else updateAuth();
const quickstart=document.createElement('section');
quickstart.id='mfQuickstart';
quickstart.className='mf-quickstart';
quickstart.setAttribute('aria-label','Getting started with MileForge');
quickstart.hidden=true;
const nav=el('homeNav');
if(nav)nav.insertAdjacentElement('afterend',quickstart);
function renderQuickstart(){
 if(!quickstart||!user||document.body.classList.contains('guest')){
   quickstart.hidden=true;owner=null;return;
 }
 const uid=user.id;
 if(owner!==uid){owner=uid;quickstart.hidden=true;}
 const ready=typeof workLoadedUser!=='undefined'&&workLoadedUser===uid;
 if(!ready){quickstart.hidden=true;return;}
 const hasEquipment=!!(typeof equip!=='undefined'&&equip);
 const saved=Array.isArray(workTrips)&&workTrips.length>0;
 if(hasEquipment&&saved){quickstart.hidden=true;return;}
 quickstart.hidden=false;
 const completed=Number(hasEquipment)+Number(saved);
 const access=typeof billingAllowed==='function'?billingAllowed():true;
 const steps=[
  {done:hasEquipment,text:'Save your truck & trailer',hint:'Match jobs to your actual cargo limits.',target:'equipment'},
  {done:false,text:'Check a load\'s profit',hint:'Estimate fuel, empty miles and expenses.',target:'profit'},
  {done:saved,text:'Save your first load',hint:access?'Keep the job and expenses together.':'Saved load tracking is part of Pro.',target:access?'log':'plans'}
 ];
 quickstart.replaceChildren();
 const heading=document.createElement('div');heading.className='mf-quickstart-heading';
 const title=document.createElement('div');const h=document.createElement('h2');
 h.textContent='Get ready for your first haul';
 const p=document.createElement('p');p.textContent='Your setup · '+completed+' of 2 essentials completed';
 title.append(h,p);heading.append(title);
 const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='secondary mf-quickstart-dismiss';dismiss.textContent='Hide for now';dismiss.setAttribute('aria-label','Hide setup tips this session');
 dismiss.onclick=()=>{quickstart.hidden=true;try{sessionStorage.setItem('mfQuickstartDismissed:'+uid,'1')}catch{}};
 heading.append(dismiss);quickstart.append(heading);
 try{if(sessionStorage.getItem('mfQuickstartDismissed:'+uid)==='1'){quickstart.hidden=true;return}}catch{}
 const grid=document.createElement('div');grid.className='mf-quickstart-steps';
 for(const step of steps){
  const b=document.createElement('button');b.type='button';b.className='mf-quickstart-step'+(step.done?' is-done':'');
  const main=document.createElement('strong');main.textContent=(step.done?'✓  ':'→  ')+step.text;
  const secondary=document.createElement('small');secondary.textContent=step.hint;
  b.append(main,secondary);
  b.onclick=()=>{if(typeof tab==='function')tab(step.target)};
  grid.append(b);
 }
 quickstart.append(grid);
}
const originalTab=tab;
tab=function(...args){const result=originalTab.apply(this,args);renderQuickstart();return result;};
const originalLoad=loadWork;
loadWork=async function(...args){const result=await originalLoad.apply(this,args);renderQuickstart();return result;};
const originalEquipment=saveEquipment;
saveEquipment=async function(...args){const result=await originalEquipment.apply(this,args);renderQuickstart();return result;};
const originalReset=resetWork;
resetWork=function(...args){owner=null;quickstart.hidden=true;return originalReset.apply(this,args);};
if(user)renderQuickstart();
// Invitation links are source attribution only, never payment/reward entitlement.
const info=el('mfInviteDisclosure');
if(info)info.textContent='Invitations help drivers find MileForge. No referral commissions, credits or payouts are offered at this time.';
})();
