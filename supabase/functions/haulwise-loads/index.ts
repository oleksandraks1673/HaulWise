import { createClient } from 'npm:@supabase/supabase-js@2.57.0';

// HaulWise external-load read API. No provider credentials or scraping in this function.
// Provider ingestion must be separately authorized and implemented against official docs.
const allowedOrigins = new Set([
  'https://haulwise-murex.vercel.app',
  'https://haulwise-quote-noble.vercel.app'
]);
const url = Deno.env.get('SUPABASE_URL') ?? '';
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || secretKeys.default || '';
const admin = url && key ? createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false }
}) : null;

function respond(origin: string, value: unknown, status = 200) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    ...(allowedOrigins.has(origin) ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    } : {})
  };
  return new Response(JSON.stringify(value), { status, headers });
}

function inputText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[%_(),]/g, '').slice(0, 60);
}

const equipment = new Set(['flatbed','enclosed','gooseneck','dryvan','reefer','semiflat','van']);

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  if (origin && !allowedOrigins.has(origin)) return respond(origin, { error: 'Origin not allowed.' }, 403);
  if (req.method === 'OPTIONS') return respond(origin, {}, 204);
  if (req.method !== 'POST') return respond(origin, { error: 'Use POST.' }, 405);

  const bearer = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return respond(origin, { error: 'Sign in to search load partners.' }, 401);
  if (!admin) return respond(origin, { error: 'Load API is not configured.' }, 503);

  try {
    // Validate the user's token server-side; a client-supplied user ID is never trusted.
    const identity = await admin.auth.getUser(bearer);
    if (identity.error || !identity.data.user) return respond(origin, { error: 'Please sign in again.' }, 401);

    const raw = await req.text();
    if (raw.length > 4096) return respond(origin, { error: 'Request is too large.' }, 413);
    const body = raw ? JSON.parse(raw) : {};
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return respond(origin, { error: 'Invalid search request.' }, 400);
    }
    if (body.action && body.action !== 'search' && body.action !== 'status') {
      return respond(origin, { error: 'Unknown action.' }, 400);
    }

    // Always gate both status and results on the provider's explicit approval.
    const provider = await admin.from('haulwise_load_providers')
      .select('provider_id,provider_name,approval_status,display_permitted,feed_enabled,approved_at')
      .eq('provider_id','123loadboard').single();
    if (provider.error || !provider.data) return respond(origin, { error: 'Provider unavailable.' }, 503);

    const p = provider.data;
    const authorized = p.approval_status === 'approved' &&
      p.display_permitted === true && p.feed_enabled === true && !!p.approved_at;
    const base = { provider: p.provider_name, providerId: p.provider_id,
      status: authorized ? 'connected' : p.approval_status === 'suspended' ? 'suspended' : 'pending_authorization',
      enabled: authorized, listings: [] as unknown[], count: 0,
      message: authorized ? 'Provider-authorized listings.' :
        '123Loadboard API approval is pending. Open 123Loadboard to search live loads in the meantime.' };

    if (!authorized || body.action === 'status') return respond(origin, base);

    const filters = body.filters && typeof body.filters === 'object' && !Array.isArray(body.filters)
      ? body.filters : {};
    const limit = Math.max(1, Math.min(30, Number.isFinite(Number(filters.limit)) ? Math.floor(Number(filters.limit)) : 20));
    const from = inputText(filters.pickupCity);
    const to = inputText(filters.dropoffCity);
    const trailer = inputText(filters.trailerType);
    if (trailer && !equipment.has(trailer)) return respond(origin, { error: 'Invalid trailer type.' }, 400);

    const staleCutoff = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    let query = admin.from('haulwise_external_loads')
      .select('provider_load_id,title,pickup_city,pickup_region,dropoff_city,dropoff_region,trailer_type,cargo_weight_kg,distance_km,offered_amount,offered_currency,pickup_date,source_url,listed_at,last_seen_at,expires_at')
      .eq('provider_id',p.provider_id).eq('status','open')
      .gte('last_seen_at',staleCutoff).or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('last_seen_at',{ascending:false}).limit(limit);
    if (from) query = query.ilike('pickup_city', '%' + from + '%');
    if (to) query = query.ilike('dropoff_city', '%' + to + '%');
    if (trailer) query = query.eq('trailer_type', trailer);
    const found = await query;
    if (found.error) throw found.error;

    return respond(origin, { ...base, listings: found.data || [],
      count: (found.data || []).length,
      message: found.data?.length ?
        'Provider-authorized loads. Confirm all details with the posting broker before accepting.' :
        'No recent partner loads match these filters. Try another route or search on 123Loadboard.' });
  } catch (error) {
    const message = error instanceof SyntaxError ? 'Invalid JSON request.' : 'Load feed temporarily unavailable.';
    return respond(origin, { error: message }, error instanceof SyntaxError ? 400 : 503);
  }
});
