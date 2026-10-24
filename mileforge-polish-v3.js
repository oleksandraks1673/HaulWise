/* MileForge usability polish; retains all existing data, authentication and routing. */
(function(){
'use strict';
const byId=id=>document.getElementById(id);
const password=byId('password');
if(password && password.parentNode && !byId('mfPasswordToggle')){
 const holder=document.createElement('div');
 holder.className='mf-password-wrap';
 password.parentNode.insertBefore(holder,password);
 holder.appendChild(password);
 const toggle=document.createElement('button');
 toggle.id='mfPasswordToggle';
 toggle.type='button';
 toggle.className='mf-password-toggle';
 toggle.textContent='Show';
 toggle.setAttribute('aria-label','Show password');
 toggle.setAttribute('aria-pressed','false');
 holder.appendChild(toggle);
 toggle.addEventListener('click',()=>{
  const reveal=password.type==='password';
  password.type=reveal?'text':'password';
  toggle.textContent=reveal?'Hide':'Show';
  toggle.setAttribute('aria-label',reveal?'Hide password':'Show password');
  toggle.setAttribute('aria-pressed',String(reveal));
  password.focus({preventScroll:true});
 });
 password.autocapitalize='none';
 password.spellcheck=false;
 const reset=()=>{if(!document.body.classList.contains('guest') && password.type==='text'){password.type='password';toggle.textContent='Show';toggle.setAttribute('aria-label','Show password');toggle.setAttribute('aria-pressed','false');}};
 new MutationObserver(reset).observe(document.body,{attributes:true,attributeFilter:['class']});
}
const email=byId('email');
if(email){email.autocapitalize='none';email.spellcheck=false;email.inputMode='email';}
const tabList=document.querySelector('.auth-switch[role="tablist"]');
if(tabList){
 tabList.addEventListener('keydown',ev=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(ev.key))return;
  const tabs=[byId('signinTab'),byId('signupTab')];
  if(!tabs.includes(document.activeElement))return;
  ev.preventDefault();
  const current=tabs.indexOf(document.activeElement);
  const index=ev.key==='Home'?0:ev.key==='End'?1:ev.key==='ArrowRight'?(current+1)%2:(current+1)%2;
  if(typeof setAuthMode==='function')setAuthMode(index===0?'signin':'signup');
  tabs[index].focus();
 });
}
const menu=byId('cinemaMoreMenu'),bottom=byId('cinemaBottomNav');
const more=bottom&&bottom.querySelector('[data-cinema-tab="more"]');
if(menu&&more){
 more.setAttribute('aria-controls','cinemaMoreMenu');
 more.setAttribute('aria-expanded',String(!menu.hidden));
 more.setAttribute('aria-haspopup','true');
 const syncMenu=()=>{
  const expanded=!menu.hidden;
  more.setAttribute('aria-expanded',String(expanded));
  if(!expanded&&menu.contains(document.activeElement))more.focus({preventScroll:true});
 };
 new MutationObserver(syncMenu).observe(menu,{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('keydown',ev=>{
  if(ev.key==='Escape'&&!menu.hidden){menu.hidden=true;more.focus({preventScroll:true});}
 });
 menu.querySelectorAll('button').forEach(b=>b.setAttribute('type','button'));
}
})();
