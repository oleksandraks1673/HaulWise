import {db,stripeClient,config,validatedConfig} from '../_shared/billing-runtime.ts';
import {SITE,checkoutParams,blockingStatuses} from '../_shared/billing-logic.mjs';
const origins=new Set([SITE,'https://haulwise-quote-noble.vercel.app']);
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origins.has(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'}:{})};
 const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origins.has(origin))return json({error:'Origin not allowed.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return json({error:'Use POST.'},405);
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');if(!token)return json({error:'Sign in to manage your plan.'},401);
 const identity=await db.auth.getUser(token);if(identity.error||!identity.data.user)return json({error:'Please sign in again.'},401);const user=identity.data.user;
 try{
  const body=await req.json();const c=await config();
  if(body.action==='status'){
   const r=await db.from('haulwise_billing_subscriptions').select('status,has_access,period_end,cancel_at_period_end').eq('user_id',user.id);if(r.error)throw r.error;
   const active=r.data.find(s=>s.has_access&&s.period_end&&Date.parse(s.period_end)>Date.now());
   return json({checkoutEnabled:c.checkout_enabled,betaAccess:c.beta_access,pro:!!active,subscription:active||r.data[0]||null});
  }
  if(!['checkout','portal'].includes(body.action))return json({error:'Unknown billing action.'},400);
  if(body.action==='checkout'&&!c.checkout_enabled)return json({error:'Paid subscriptions are not open yet. Your beta access continues.'},503);
  const stripe=stripeClient();await validatedConfig(stripe);
  const saved=await db.from('haulwise_billing_customers').select('stripe_customer_id').eq('user_id',user.id).maybeSingle();if(saved.error)throw saved.error;let customer=saved.data?.stripe_customer_id;
  if(body.action==='portal'){
   if(!customer)return json({error:'There is no billing account to manage yet.'},404);
   if(!c.portal_configuration_id)return json({error:'Billing management is being configured.'},503);
   const session=await stripe.billingPortal.sessions.create({customer,configuration:c.portal_configuration_id,return_url:SITE+'/?billing=manage'});return json({url:session.url});
  }
  if(!customer){const created=await stripe.customers.create({email:user.email},{idempotencyKey:'haulwise_customer_'+user.id});const insert=await db.from('haulwise_billing_customers').upsert({user_id:user.id,stripe_customer_id:created.id},{onConflict:'user_id',ignoreDuplicates:true});if(insert.error)throw insert.error;const again=await db.from('haulwise_billing_customers').select('stripe_customer_id').eq('user_id',user.id).single();if(again.error)throw again.error;customer=again.data.stripe_customer_id;}
  const subscriptions=await stripe.subscriptions.list({customer,status:'all',limit:100});if(subscriptions.has_more||subscriptions.data.some(s=>blockingStatuses.has(s.status)))return json({error:'You already have a subscription or pending payment. Use Manage billing to avoid a duplicate subscription.',manageBilling:true},409);
  const reservation=await db.rpc('haulwise_reserve_checkout',{p_user:user.id});if(reservation.error)throw reservation.error;
  const r=reservation.data;const session=await stripe.checkout.sessions.create(checkoutParams(customer,user.id,c,r.expires_at),{idempotencyKey:'haulwise_checkout_'+user.id+'_'+r.generation});
  if(session.status!=='open'||!session.url)return json({error:'This checkout has finished. Refresh your plan status before trying again.'},409);
  return json({url:session.url});
 }catch(e){console.error('HaulWise billing request failed',e?.code||e?.name||'error');return json({error:'Billing is temporarily unavailable. You have not been charged by this request. Please try again later.'},503);}
});
