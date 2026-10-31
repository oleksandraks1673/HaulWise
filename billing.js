/* Checkout is enabled by server configuration only after launch verification. */
let billingAvailability=null,billingAccount=null,billingOwner=null,billingBusy=false,billingEpoch=0;
function billingAllowed(){return !!billingAvailability?.beta_access||!!billingAccount?.pro;}
function billingMessage(text){let el=document.getElementById('billingMessage');if(!el){el=document.createElement('p');el.id='billingMessage';el.className='notice';el.setAttribute('role','status');el.setAttribute('aria-live','polite');$('memberPlans').prepend(el);}el.textContent=text;}
async function loadBillingState(){const uid=user?.id,epoch=++billingEpoch;try{const r=await api.from('haulwise_billing_config').select('checkout_enabled,beta_access').eq('id',true).single();if(r.error)throw r.error;if(epoch!==billingEpoch||user?.id!==uid)return;billingAvailability=r.data;if(uid){const result=await api.functions.invoke('haulwise-billing',{body:{action:'status'}});if(result.error||result.data?.error)throw result.error||Error(result.data.error);if(epoch!==billingEpoch||user?.id!==uid)return;billingOwner=uid;billingAccount=result.data;}else{billingOwner=null;billingAccount=null;}renderBillingPlans();}catch{if(epoch===billingEpoch&&user?.id===uid){billingAccount=null;billingOwner=null;if(uid)billingMessage('We could not verify your subscription status. Refresh your plan status before starting checkout.');document.querySelectorAll('[data-pro-checkout]').forEach(b=>b.disabled=true);}}}
function renderBillingPlans(){
 const enabled=!!billingAvailability?.checkout_enabled,beta=!!billingAvailability?.beta_access,pro=!!billingAccount?.pro;
 document.querySelectorAll('.plan-card.pro').forEach(card=>{const badge=card.querySelector('.pill'),price=card.querySelector('.plan-price small'),button=card.querySelector('button'),note=card.querySelector('.work-pending');if(badge)badge.textContent=pro?(billingAccount?.complimentary?'Complimentary Pro · active':'Your current plan'):beta?'Pro · beta access':'MileForge Pro monthly';if(price)price.textContent='CAD / month';if(button){button.dataset.proCheckout='true';button.disabled=!enabled||pro||billingBusy||!!user&&billingOwner!==user.id;button.textContent=pro?(billingAccount?.complimentary?'Complimentary Pro active':'MileForge Pro active'):enabled?user?'Get MileForge Pro · $14.99/month':'Create account to join MileForge Pro':'Pro checkout opens after beta';button.onclick=startProCheckout;}if(note)note.textContent=enabled?'Billed monthly. Cancel future renewals through Manage billing.':'You will not be charged during beta. A subscription will require a separate checkout.';});
 document.querySelectorAll('.plan-free-note').forEach(el=>{el.textContent=beta?'Free beta access: load tracking, expenses and reports remain included. You will not be charged automatically.':'Free includes load tracking, expenses, invoices and reports. Pro adds Find Loads and marketplace tools.';});
 if(!user)return;let controls=$('billingControls');if(!controls){controls=document.createElement('div');controls.id='billingControls';controls.className='actions';$('memberPlans').prepend(controls);const refresh=document.createElement('button');refresh.type='button';refresh.className='secondary';refresh.textContent='Refresh plan status';refresh.onclick=loadBillingState;controls.append(refresh);const manage=document.createElement('button');manage.id='manageHaulwiseBilling';manage.type='button';manage.className='secondary';manage.textContent='Manage billing';manage.onclick=()=>billingAction('portal');controls.append(manage);}
 $('manageHaulwiseBilling').hidden=!billingAccount?.subscription;
 if(pro){if(billingAccount?.complimentary){billingMessage('Complimentary MileForge Pro is active. No payment or subscription is required.');}else{const s=billingAccount.subscription,date=s?.period_end?new Date(s.period_end).toLocaleDateString('en-CA'):'';billingMessage(s?.cancel_at_period_end?'Pro remains active until '+date+'. Renewal is cancelled.':'MileForge Pro is active'+(date?' through '+date:'')+'.');}}
 else if(billingAccount?.subscription)billingMessage('Subscription status: '+String(billingAccount.subscription.status).replaceAll('_',' ')+'. Use Manage billing to review payment details.');
 else if(new URLSearchParams(location.search).get('billing')==='success')billingMessage('Checkout finished. We are waiting for Stripe to verify your payment. Refresh plan status shortly; this page alone does not activate Pro.');
 else if(new URLSearchParams(location.search).get('billing')==='cancelled')billingMessage('Checkout was cancelled. Your plan has not changed.');
 else billingMessage(beta?'Your beta access continues. No subscription has been started.':'You are on the Free plan.');
}
async function startProCheckout(){if(!user){queuedSection='plans';setAuthMode('signup');showAuth();return;}await billingAction('checkout');}
async function billingAction(action){if(!user||billingBusy)return;const uid=user.id;billingBusy=true;renderBillingPlans();billingMessage(action==='checkout'?'Opening secure Stripe checkout…':'Opening billing management…');try{const r=await api.functions.invoke('haulwise-billing',{body:{action}});if(user?.id!==uid)return;if(r.error||r.data?.error){let message=r.data?.error;if(!message&&r.error?.context)try{message=(await r.error.context.json()).error;}catch{}throw Error(message||'Billing is temporarily unavailable. Please try again later.');}const url=new URL(r.data.url);if(url.protocol!=='https:'||!['checkout.stripe.com','billing.stripe.com'].includes(url.hostname))throw Error('Unexpected checkout address. Please try again later.');location.assign(url.href);}catch(e){if(user?.id===uid)billingMessage(e.message);}finally{billingBusy=false;if(user?.id===uid){document.querySelectorAll('[data-pro-checkout]').forEach(b=>b.disabled=!billingAvailability?.checkout_enabled||!!billingAccount?.pro);}}}
const beforeBillingTab=tab;tab=function(name){beforeBillingTab(name);if(user&&name==='plans')loadBillingState();};
const beforeBillingReset=resetWork;resetWork=function(){++billingEpoch;billingOwner=null;billingAccount=null;billingBusy=false;const c=$('billingControls');if(c)c.remove();const m=$('billingMessage');if(m)m.remove();beforeBillingReset();renderBillingPlans();};
const beforeBillingTripEditor=showTripEditor;showTripEditor=function(...args){if(billingAvailability&&!billingAllowed()){tab('plans');billingMessage('Upgrade to Pro to add or update saved loads. Your existing records remain available.');return;}beforeBillingTripEditor(...args);};
const beforeBillingExpenseEditor=showExpenseEditor;showExpenseEditor=function(...args){if(billingAvailability&&!billingAllowed()){tab('plans');billingMessage('Upgrade to Pro to add or update expense records.');return;}beforeBillingExpenseEditor(...args);};
// Refresh verified entitlements after every sign-in and session restoration.
// This wraps the auth flow already enhanced by workflow-enhancements.js.
const beforeBillingRefreshAuth=refreshAuth;
refreshAuth=async function(...args){
 await beforeBillingRefreshAuth(...args);
 await loadBillingState();
};
// Stripe's signed webhook can arrive moments after Checkout redirects.
// Retry verification briefly; returning to the success URL never grants Pro by itself.
const billingReturn=new URLSearchParams(location.search).get('billing');
if(billingReturn==='success'){
 let tries=0;
 const verifyReturn=async()=>{
  if(!user||tries>=6)return;
  await loadBillingState();
  if(!billingAccount?.pro&&++tries<6)setTimeout(verifyReturn,2500);
 };
 const beforeBillingReturnRefresh=refreshAuth;
 refreshAuth=async function(...args){await beforeBillingReturnRefresh(...args);verifyReturn();};
}
loadBillingState();
if(new URLSearchParams(location.search).has('billing')){if(user)tab('plans');else queuedSection='plans';}
