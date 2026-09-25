-- 25/09/2026 — Lot P2a : paiement en ligne GeniusPay (intentions, journal webhook, crédit atomique).
-- Exécuté dans le SQL Editor le 25/09/2026.
begin;

create table public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  merchant_ref text not null unique,
  provider_ref text unique,
  cotisation_id uuid not null references public.cotisations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  initiated_by uuid not null references auth.users(id) on delete restrict,
  amount_credit integer not null check (amount_credit >= 200),
  service_fee integer not null check (service_fee >= 0),
  amount_charged integer not null,
  currency text not null default 'XOF' check (currency = 'XOF'),
  status text not null default 'pending'
    check (status in ('pending', 'success', 'failed', 'expired')),
  payment_url text,
  gateway text,
  fees integer,
  net_amount integer,
  failure_reason text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  constraint payment_intents_charged_check check (amount_charged = amount_credit + service_fee)
);
create index payment_intents_cotisation_idx on public.payment_intents (cotisation_id, created_at desc);
create index payment_intents_user_idx on public.payment_intents (user_id, created_at desc);
create index payment_intents_pending_idx on public.payment_intents (created_at) where status = 'pending';

-- Journal d'audit : une ligne par livraison authentique (retentatives comprises), sans données du payeur
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'geniuspay',
  event_id text,
  event_type text,
  merchant_ref text,
  provider_ref text,
  outcome text not null,
  detail text,
  payload jsonb,
  received_at timestamptz not null default now()
);
create index webhook_events_merchant_ref_idx on public.webhook_events (merchant_ref);
create index webhook_events_received_idx on public.webhook_events (received_at desc);

alter table public.payments
  add column if not exists intent_id uuid unique references public.payment_intents(id) on delete restrict;

-- Aucune policy : accès exclusivement serveur (service_role). Grants explicites (échéance 30/10/2026).
alter table public.payment_intents enable row level security;
alter table public.webhook_events enable row level security;
revoke all on public.payment_intents from anon, authenticated;
revoke all on public.webhook_events from anon, authenticated;
grant all on public.payment_intents to service_role;
grant all on public.webhook_events to service_role;

create function public.generate_withdrawal_code() returns text
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_code text;
begin
  loop
    v_code := (100000 + (('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 7))::bit(28)::int % 900000))::text;
    exit when not exists (select 1 from cotisations where withdrawal_code = v_code);
  end loop;
  return v_code;
end;
$$;

-- Crédit d'un paiement en ligne confirmé. Idempotent : une intention déjà 'success' → 'duplicate'.
-- Un paiement reçu est TOUJOURS crédité (même tardif, trop-perçu ou cotisation non active) et signalé.
create function public.confirm_online_payment(
  p_merchant_ref text, p_provider_ref text, p_amount_charged integer,
  p_fees integer, p_net_amount integer, p_gateway text
) returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_intent payment_intents%rowtype;
  v_cot cotisations%rowtype;
  v_new_paid integer;
  v_remaining integer;
  v_status text;
  v_code text;
  v_just_completed boolean := false;
begin
  select * into v_intent from payment_intents where merchant_ref = p_merchant_ref for update;
  if not found then
    return json_build_object('outcome', 'unknown_ref');
  end if;
  if v_intent.status = 'success' then
    return json_build_object('outcome', 'duplicate', 'cotisation_id', v_intent.cotisation_id);
  end if;
  if v_intent.provider_ref is not null and p_provider_ref is distinct from v_intent.provider_ref then
    return json_build_object('outcome', 'ref_mismatch');
  end if;
  if p_amount_charged is distinct from v_intent.amount_charged then
    update payment_intents set failure_reason = 'amount_mismatch' where id = v_intent.id;
    return json_build_object('outcome', 'amount_mismatch',
      'expected', v_intent.amount_charged, 'received', p_amount_charged);
  end if;

  select * into v_cot from cotisations where id = v_intent.cotisation_id for update;

  v_new_paid := v_cot.amount_paid + v_intent.amount_credit;
  v_remaining := greatest(v_cot.total_price - v_new_paid, 0);
  v_status := v_cot.status;
  v_code := v_cot.withdrawal_code;
  if v_cot.status = 'active' and v_remaining = 0 then
    v_status := 'completed';
    v_just_completed := true;
    if v_code is null then
      v_code := public.generate_withdrawal_code();
    end if;
  end if;

  insert into payments (cotisation_id, user_id, amount, status, payment_method,
                        transaction_ref, paid_at, intent_id)
  values (v_cot.id, v_cot.user_id, v_intent.amount_credit, 'success', 'online',
          coalesce(p_provider_ref, v_intent.merchant_ref), now(), v_intent.id);

  update cotisations
     set amount_paid = v_new_paid,
         amount_remaining = v_remaining,
         nb_tranches = coalesce(nb_tranches, 0) + 1,
         status = v_status,
         withdrawal_code = v_code
   where id = v_cot.id;

  update payment_intents
     set status = 'success', confirmed_at = now(),
         provider_ref = coalesce(provider_ref, p_provider_ref),
         fees = p_fees, net_amount = p_net_amount, gateway = p_gateway, failure_reason = null
   where id = v_intent.id;

  return json_build_object(
    'outcome', 'credited',
    'cotisation_id', v_cot.id,
    'user_id', v_cot.user_id,
    'amount_credit', v_intent.amount_credit,
    'amount_paid', v_new_paid,
    'amount_remaining', v_remaining,
    'just_completed', v_just_completed,
    'withdrawal_code', case when v_just_completed then v_code end,
    'overpaid', v_new_paid > v_cot.total_price,
    'cotisation_status_before', v_cot.status,
    'refund_status', v_cot.refund_status);
end;
$$;

revoke execute on function public.generate_withdrawal_code() from public, anon, authenticated;
grant execute on function public.generate_withdrawal_code() to service_role;
revoke execute on function public.confirm_online_payment(text, text, integer, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.confirm_online_payment(text, text, integer, integer, integer, text)
  to service_role;

commit;
