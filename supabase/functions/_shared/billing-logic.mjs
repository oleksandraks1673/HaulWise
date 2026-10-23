export const SITE='https://haulwise-murex.vercel.app';
export const API_VERSION='2026-08-26.dahlia';
export function validatePrice(p,c){if(p.id!==c.price_id||p.livemode!==c.livemode||!p.active||p.currency!=='cad'||p.unit_amount!==1499||p.recurring?.interval!=='month'||p.recurring?.interval_count!==1)throw Error('Billing price configuration is invalid.');}
export function subscriptionId(event){const o=event.data.object;if(event.type.startsWith('customer.subscription.'))return o.id;if(event.type.startsWith('checkout.session.'))return typeof o.subscription==='string'?o.subscription:o.subscription?.id;if(event.type.startsWith('invoice.'))return o.parent?.subscription_details?.subscription||o.subscription||null;return null;}
export function snapshot(sub,config,now=Date.now()){
 if(sub.livemode!==config.livemode)throw Error('Wrong billing mode.');
 const item=sub.items?.data?.find(i=>i.price?.id===config.price_id);
 const end=Number(item?.current_period_end||sub.current_period_end||0);
 const invoice=sub.latest_invoice;
 const paid=!!invoice&&typeof invoice==='object'&&(invoice.status==='paid'||invoice.paid===true);
 return {stripe_subscription_id:sub.id,stripe_customer_id:typeof sub.customer==='string'?sub.customer:sub.customer.id,status:sub.status,price_id:item?.price?.id||'unrecognized',period_end:end?new Date(end*1000).toISOString():null,cancel_at_period_end:!!sub.cancel_at_period_end,has_access:!!item&&item.quantity===1&&sub.status==='active'&&paid&&!sub.pause_collection&&end*1000>now};
}
export function checkoutParams(customer,uid,config,expires){return {mode:'subscription',customer,line_items:[{price:config.price_id,quantity:1}],client_reference_id:uid,subscription_data:{billing_mode:{type:'flexible'}},success_url:SITE+'/?billing=success',cancel_url:SITE+'/?billing=cancelled',expires_at:expires,integration_identifier:'haulwise_pro_hqksnrtv',...(config.automatic_tax?{automatic_tax:{enabled:true}}:{})};}
export const blockingStatuses=new Set(['active','trialing','past_due','unpaid','incomplete','paused']);
export async function synchronize(db,stripe,id,eventId,config){
 for(let attempt=0;attempt<4;attempt++){
  const prior=await db.from('haulwise_billing_subscriptions').select('version').eq('stripe_subscription_id',id).maybeSingle();if(prior.error)throw prior.error;
  const sub=await stripe.subscriptions.retrieve(id,{expand:['latest_invoice']});
  const customer=typeof sub.customer==='string'?sub.customer:sub.customer.id;
  const owner=await db.from('haulwise_billing_customers').select('user_id').eq('stripe_customer_id',customer).maybeSingle();if(owner.error)throw owner.error;if(!owner.data)return 'unmapped';
  const r=await db.rpc('haulwise_apply_billing_snapshot',{p_event:eventId,p_expected:prior.data?.version||0,p_snapshot:snapshot(sub,config)});if(r.error)throw r.error;if(r.data!=='conflict')return r.data;
 }
 throw Error('Concurrent billing update. Retry delivery.');
}
