/* MileForge homepage v5. Read-only KPI from the current user's private invoices. */
(function(){
  'use strict';
  const overview=document.getElementById('overview');
  if(!overview)return;
  const currency=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:2}).format(Number(n)||0);
  let epoch=0,lastUid=null,lastFetched=0,lastAmount=null,loading=false;
  function currentUser(){return typeof user!=='undefined'&&user?user:null;}
  function card(){
    const grid=overview.querySelector('.daily-grid');
    if(!grid)return null;
    let node=grid.querySelector('#mfOutstandingCard');
    if(!node){
      node=document.createElement('article');
      node.className='daily-card mf-balance';
      node.id='mfOutstandingCard';
      node.setAttribute('aria-label','Outstanding invoices');
      const label=document.createElement('span');label.className='muted';label.textContent='Outstanding invoices';
      const value=document.createElement('strong');value.id='mfOutstandingValue';value.textContent='—';
      const note=document.createElement('small');note.id='mfOutstandingNote';note.textContent='Checking saved invoices';
      node.append(label,value,note);
      grid.appendChild(node);
    }
    return node;
  }
  function setValue(amount,note,error){
    const node=card();if(!node)return;
    node.classList.toggle('is-unavailable',!!error);
    const value=node.querySelector('#mfOutstandingValue'),detail=node.querySelector('#mfOutstandingNote');
    value.textContent=amount===null?'—':currency(amount);
    detail.textContent=note;
  }
  async function refreshOutstanding(force=false){
    const active=currentUser();
    if(!active || overview.classList.contains('hidden'))return;
    if(typeof workLoadedUser==='undefined'||workLoadedUser!==active.id){setValue(null,'Waiting for your saved loads');return;}
    const uid=active.id,now=Date.now();
    if(uid!==lastUid){++epoch;lastUid=uid;lastFetched=0;lastAmount=null;}
    if(loading)return;
    if(!force && lastFetched && now-lastFetched<20000){
      setValue(lastAmount,'Unpaid balance on saved invoices',lastAmount===null);
      return;
    }
    const token=++epoch;loading=true;
    setValue(lastAmount,lastAmount===null?'Checking saved invoices':'Updating invoice balance');
    try{
      const [a,b]=await Promise.all([
        api.from('mileforge_invoices').select('id,amount').eq('user_id',uid).limit(1000),
        api.from('mileforge_invoice_payments').select('invoice_id,amount').eq('user_id',uid).limit(1000)
      ]);
      if(a.error)throw a.error;
      if(b.error)throw b.error;
      if(token!==epoch||currentUser()?.id!==uid)return;
      const invoices=a.data||[],payments=b.data||[];
      const totals=new Map();
      for(const p of payments)totals.set(p.invoice_id,(totals.get(p.invoice_id)||0)+Number(p.amount||0));
      const outstanding=invoices.reduce((sum,i)=>sum+Math.max(0,Number(i.amount||0)-(totals.get(i.id)||0)),0);
      lastAmount=Math.round(outstanding*100)/100;
      lastFetched=Date.now();
      const partial=invoices.length===1000||payments.length===1000;
      setValue(partial?null:lastAmount,partial?'More records than this snapshot can show':'Recorded invoices, less payments',partial);
    }catch(e){
      if(token!==epoch||currentUser()?.id!==uid)return;
      lastAmount=null;lastFetched=Date.now();
      setValue(null,'Balance unavailable — try refreshing',true);
    }finally{
      if(token===epoch)loading=false;
    }
  }
  function update(){
    if(overview.classList.contains('hidden'))return;
    if(!card())return;
    refreshOutstanding(false);
  }
  const originalRender=renderDailyDashboard;
  renderDailyDashboard=function(){
    const result=originalRender.apply(this,arguments);
    update();
    return result;
  };
  const originalTab=tab;
  tab=function(){
    const result=originalTab.apply(this,arguments);
    if(arguments[0]==='overview')refreshOutstanding(true);
    return result;
  };
  const originalReset=resetWork;
  resetWork=function(){
    ++epoch;loading=false;lastUid=null;lastAmount=null;lastFetched=0;
    return originalReset.apply(this,arguments);
  };
  update();
})();
