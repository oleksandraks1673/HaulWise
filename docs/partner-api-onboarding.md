# MileForge — partner API onboarding (October 27, 2026)

## Status and guardrails
No third-party freight inventory is licensed or connected until the provider issues credentials and explicitly permits our user-facing display. Do not invent loads, scrape pages, or ship secrets in browser JS.
Existing Supabase Edge Function: `haulwise-loads` (JWT verification enabled). Its current 123Loadboard status is independent of the new partner applications.
Incoming requests via Outlook were submitted to FreightLink, CoyoteGO and Parade on October 27. Outlook accepted the sends; receipt and approval are unconfirmed.

## Provider pipeline
| Provider | Intended use | Stage | Requirements |
| --- | --- | --- | --- |
| FreightLink | Authorized carrier load discovery / Model 3 | Request sent | Confirm actual partner contact, sandbox, licensing, booking eligibility, country/equipment coverage, display rights |
| CoyoteGO | Carrier load search and possibly booking | Request sent | Existing customer/approved partner policy, sandbox credentials, attribution, rates, display rights |
| Parade | Marketplace load syndication | Request sent | Certification and broker/shipper authority, API docs, rights and scope |
| 123Loadboard | Partner load search | Awaiting licensing | Search Loads API agreement and keys; affiliate/referral alone is insufficient |
| Truckstop | Third-party load access | Inquiry acknowledged (case 45028887) | Specialist response, permitted usage and credentials |

## Normalized load contract (internal)
Use only provider-licensed fields, preserving provenance:
`{provider, provider_load_id, origin_city, origin_region, destination_city, destination_region, pickup_date, equipment_type, weight_kg, distance_km, offered_rate, rate_currency, original_booking_url, observed_at, expires_at}`
Missing fields must remain null, never estimated as facts.
Prevent duplicate listings using `(provider,provider_load_id)`. Keep marketplace user-posted loads separate.

## Architecture after authorization
- Supabase Edge Function with JWT authentication, per-user rate limiting, scoped partner secrets stored server-side and no service role in client code.
- Provider-specific fetch/transform/validate adapter with an allowlist of provider hosts and explicit license flags.
- Show source attribution, last fetched time, verified booking link and filters, and remove expired inventory.
- Use the existing community load board when partners are unavailable. No background polling of unlicensed feeds.
- Test via sandbox first; ensure permission to cache, redistribute or publicly display before production activation.

## Acceptance checklist
1. Written license and sandbox access.
2. Provider-specific mapping and schema validation test.
3. RLS/privacy and secret-handling review.
4. Accurate statuses and graceful outage fallback.
5. Explicit user-facing provider attribution.
6. End-to-end testing with authorized accounts before production release.
