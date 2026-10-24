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
// Avoid duplicating the existing truck, calculator, and load navigation on the homepage.
// The functional setup screens and referral/signup attribution stay available.
// Invitation links are source attribution only, never payment/reward entitlement.
const info=el('mfInviteDisclosure');
if(info)info.textContent='Invitations help drivers find MileForge. No referral commissions, credits or payouts are offered at this time.';
})();
