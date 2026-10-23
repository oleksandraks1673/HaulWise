-- HaulWise billing only. New tables contain no card details.
create table public.haulwise_billing_config (
 id boolean primary key default true check(id),
 price_id text not null, livemode boolean not null,
 portal_configuration_id text,
 checkout_enabled boolean not null default false,
 beta_access boolean not null default true,
 automatic_tax boolean not null default false
);
alter table public.haulwise_billing_config enable row level security;
create policy "Read billing availability" on public.haulwise_billing_config for select to anon, authenticated using (true);
revoke all on public.haulwise_billing_config from anon, authenticated;
grant select on public.haulwise_billing_config to anon, authenticated;
grant all on public.haulwise_billing_config to service_role;

create table public.haulwise_billing_customers (
 user_id uuid primary key references auth.users(id) on delete restrict,
 stripe_customer_id text unique not null,
 checkout_generation bigint not null default 0,
 checkout_expires_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.haulwise_billing_customers enable row level security;
create policy "Read own billing customer" on public.haulwise_billing_customers for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.haulwise_billing_customers from anon, authenticated;
grant select on public.haulwise_billing_customers to authenticated;
grant all on public.haulwise_billing_customers to service_role;

create table public.haulwise_billing_subscriptions (
 stripe_subscription_id text primary key,
 stripe_customer_id text not null references public.haulwise_billing_customers(stripe_customer_id),
 user_id uuid not null references auth.users(id) on delete restrict,
 status text not null,
 price_id text not null,
 period_end timestamptz,
 cancel_at_period_end boolean not null default false,
 has_access boolean not null default false,
 version bigint not null default 1,
 updated_at timestamptz not null default now()
);
create index haulwise_billing_user_index on public.haulwise_billing_subscriptions(user_id);
alter table public.haulwise_billing_subscriptions enable row level security;
create policy "Read own subscription" on public.haulwise_billing_subscriptions for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.haulwise_billing_subscriptions from anon, authenticated;
grant select on public.haulwise_billing_subscriptions to authenticated;
grant all on public.haulwise_billing_subscriptions to service_role;

create table public.haulwise_billing_events(id text primary key, processed_at timestamptz not null default now());
alter table public.haulwise_billing_events enable row level security;
revoke all on public.haulwise_billing_events from public, anon, authenticated;
grant all on public.haulwise_billing_events to service_role;

-- Service-only RPC: the app cannot set its own plan or replay Stripe events.
create function public.haulwise_apply_billing_snapshot(p_event text,p_expected bigint,p_snapshot jsonb)
returns text language plpgsql security invoker set search_path='' as $$
declare v_id text:=p_snapshot->>'stripe_subscription_id'; v_version bigint; v_user uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(v_id,0));
 if exists(select 1 from public.haulwise_billing_events where id=p_event) then return 'duplicate'; end if;
 select user_id into v_user from public.haulwise_billing_customers where stripe_customer_id=p_snapshot->>'stripe_customer_id';
 if v_user is null then raise exception 'Unmapped billing customer'; end if;
 select version into v_version from public.haulwise_billing_subscriptions where stripe_subscription_id=v_id;
 if coalesce(v_version,0)<>p_expected then return 'conflict'; end if;
 insert into public.haulwise_billing_subscriptions(stripe_subscription_id,stripe_customer_id,user_id,status,price_id,period_end,cancel_at_period_end,has_access,version)
 values(v_id,p_snapshot->>'stripe_customer_id',v_user,p_snapshot->>'status',p_snapshot->>'price_id',(p_snapshot->>'period_end')::timestamptz,(p_snapshot->>'cancel_at_period_end')::boolean,(p_snapshot->>'has_access')::boolean,1)
 on conflict(stripe_subscription_id) do update set status=excluded.status,price_id=excluded.price_id,period_end=excluded.period_end,cancel_at_period_end=excluded.cancel_at_period_end,has_access=excluded.has_access,version=public.haulwise_billing_subscriptions.version+1,updated_at=now();
 insert into public.haulwise_billing_events(id) values(p_event);
 return 'saved';
end $$;
revoke all on function public.haulwise_apply_billing_snapshot(text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.haulwise_apply_billing_snapshot(text,bigint,jsonb) to service_role;

create function public.haulwise_reserve_checkout(p_user uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_row public.haulwise_billing_customers;
begin
 select * into v_row from public.haulwise_billing_customers where user_id=p_user for update;
 if not found then raise exception 'Missing billing customer'; end if;
 if v_row.checkout_expires_at is null or v_row.checkout_expires_at<=now() then
  update public.haulwise_billing_customers set checkout_generation=checkout_generation+1,checkout_expires_at=date_trunc('second',now()+interval '32 minutes') where user_id=p_user returning * into v_row;
 end if;
 return jsonb_build_object('generation',v_row.checkout_generation,'expires_at',extract(epoch from v_row.checkout_expires_at)::bigint);
end $$;
revoke all on function public.haulwise_reserve_checkout(uuid) from public,anon,authenticated;
grant execute on function public.haulwise_reserve_checkout(uuid) to service_role;

-- Keep the signing secret encrypted in Vault, available only to server code.
grant usage on schema vault to service_role;
grant select on vault.decrypted_secrets to service_role;
create function public.haulwise_webhook_secret() returns text language sql security invoker set search_path='' as $$
 select decrypted_secret from vault.decrypted_secrets where name='haulwise_stripe_webhook_live' limit 1
$$;
revoke all on function public.haulwise_webhook_secret() from public,anon,authenticated;
grant execute on function public.haulwise_webhook_secret() to service_role;

create function public.haulwise_has_pro() returns boolean language sql stable security invoker set search_path='' as $$
 select coalesce((select beta_access from public.haulwise_billing_config where id),false) or exists(select 1 from public.haulwise_billing_subscriptions where user_id=(select auth.uid()) and has_access and period_end>now())
$$;
revoke all on function public.haulwise_has_pro() from public,anon;
grant execute on function public.haulwise_has_pro() to authenticated,service_role;
-- Existing ownership policies stay in effect. Beta access remains on until launch.
create policy "Pro required to insert trips" on public.trips as restrictive for insert to authenticated with check ((select public.haulwise_has_pro()));
create policy "Pro required to update trips" on public.trips as restrictive for update to authenticated using ((select public.haulwise_has_pro())) with check ((select public.haulwise_has_pro()));
create policy "Pro required to insert expenses" on public.expenses as restrictive for insert to authenticated with check ((select public.haulwise_has_pro()));
create policy "Pro required to update expenses" on public.expenses as restrictive for update to authenticated using ((select public.haulwise_has_pro())) with check ((select public.haulwise_has_pro()));
