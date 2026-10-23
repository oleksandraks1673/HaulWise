import Stripe from 'npm:stripe@22.6.0';
import {createClient} from 'npm:@supabase/supabase-js@2.57.0';
import {API_VERSION,validatePrice} from './billing-logic.mjs';
export {Stripe};
export const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
export function stripeClient(){const key=Deno.env.get('HAULWISE_STRIPE_RESTRICTED_KEY');if(!key||!key.startsWith('rk_live_'))throw Error('BILLING_NOT_CONFIGURED');return new Stripe(key,{apiVersion:API_VERSION as any,httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2});}
export async function config(){const r=await db.from('haulwise_billing_config').select('*').eq('id',true).single();if(r.error)throw r.error;return r.data;}
export async function validatedConfig(stripe:any){const c=await config();validatePrice(await stripe.prices.retrieve(c.price_id),c);return c;}
