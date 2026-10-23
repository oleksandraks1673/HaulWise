# HaulWise billing deployment

Production is the HAULWISE Stripe account, separate from Quote Noble.
Pro is CAD 14.99 monthly. No real purchases are used for testing.

Implemented: authenticated hosted Checkout, fixed server price, stable customer mapping, a checkout reservation to reuse pending sessions, customer portal, signature-verified lifecycle webhooks, optimistic concurrency retries, duplicate-event protection and database enforcement of Pro writes. Billing configuration starts with checkout disabled and beta access enabled. Existing load records stay readable.

## Required private credential

Set `HAULWISE_STRIPE_RESTRICTED_KEY` in HaulWise Supabase Edge Function secrets. Use a live restricted key from HAULWISE, never Quote Noble. Required permissions: Prices read, Customers read/write, Checkout Sessions read/write, Subscriptions read, Invoices read, Customer Portal sessions write. Never put the key in the frontend, source repository or chat.

The webhook signing secret is encrypted in Supabase Vault. The service-only RPC reads it for signature verification. The browser cannot read the secret or modify subscription records.

## Before enabling checkout

1. Confirm the private key is set and can retrieve the configured live price.
2. Test paid checkout, failed payment, duplicate delivery, cancellation at period end, and unrelated-user isolation in a separate sandbox. A success URL never grants access.
3. Confirm actual tax registrations before enabling `automatic_tax`; the current default is false. Tax setup has not been asserted complete.
4. Verify Stripe account activation and payment capabilities, portal and endpoint health.
5. Set `checkout_enabled=true, beta_access=false` only after these checks. Existing accounts are never charged automatically.

The paid access check requires the configured plan, an active subscription, a paid latest invoice and an unexpired paid period. Failed renewals and paused collection remove paid access. A scheduled cancellation retains access until the paid period ends. Server refreshes from Stripe resolve delayed/out-of-order event deliveries, using a database compare-and-swap to avoid stale writes.

Backend function imports pin Stripe 22.6.0 and Supabase JS 2.57.0. Webhook events use API 2026-08-26.dahlia. Edge Functions include their pinned dependencies directly, with no build dependency on the static Vercel site.
