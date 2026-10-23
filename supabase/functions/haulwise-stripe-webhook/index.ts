import {Stripe,db,stripeClient,config} from '../_shared/billing-runtime.ts';
import {API_VERSION,subscriptionId,synchronize} from '../_shared/billing-logic.mjs';
const verifier=new Stripe('verification-only',{apiVersion:API_VERSION as any,httpClient:Stripe.createFetchHttpClient()});
const cryptoProvider=Stripe.createSubtleCryptoProvider();
Deno.serve(async(req)=>{
 if(req.method!=='POST')return new Response('Use POST',{status:405});
 if(Number(req.headers.get('content-length')||0)>1048576)return new Response('Too large',{status:413});
 const signature=req.headers.get('stripe-signature');if(!signature)return new Response('Missing signature',{status:400});
 let event;try{const r=await db.rpc('haulwise_webhook_secret');if(r.error||!r.data)return new Response('Webhook unavailable',{status:503});const body=await req.text();if(body.length>1048576)return new Response('Too large',{status:413});event=await verifier.webhooks.constructEventAsync(body,signature,r.data,300,cryptoProvider);}catch{return new Response('Invalid signature',{status:400});}
 try{
  const c=await config();if(event.livemode!==c.livemode)return new Response('Wrong mode',{status:400});
  const prior=await db.from('haulwise_billing_events').select('id').eq('id',event.id).maybeSingle();if(prior.error)throw prior.error;if(prior.data)return Response.json({received:true,duplicate:true});
  const id=subscriptionId(event);if(!id)return Response.json({received:true,ignored:true});
  const outcome=await synchronize(db,stripeClient(),id,event.id,c);return Response.json({received:true,result:outcome});
 }catch(e){console.error('HaulWise Stripe delivery failed',event.id,e?.code||e?.name||'error');return new Response('Retry delivery',{status:503});}
});
