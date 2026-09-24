-- 24/09/2026 — Lot P1a : record_payment v2 (verrou avant idempotence, code de retrait
-- cryptographique, recorded_by, blocage si remboursement), CHECK payment_method, index
-- unique transaction_ref. Exécuté dans le SQL Editor le 24/09/2026.
begin;

alter table public.payments
  add column if not exists recorded_by uuid references auth.users(id) on delete restrict;

alter table public.payments alter column payment_method drop default;
alter table public.payments
  add constraint payments_payment_method_check check (payment_method in ('cash', 'online'));

create unique index if not exists payments_transaction_ref_key
  on public.payments (transaction_ref) where transaction_ref is not null;

drop function if exists public.record_payment(uuid, integer, uuid, text, text);

create function public.record_payment(
  p_cotisation_id uuid, p_amount integer, p_recorded_by uuid, p_idempotency_key text
) returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cot cotisations%rowtype;
  v_existing payments%rowtype;
  v_new_paid integer;
  v_new_remaining integer;
  v_new_status text;
  v_code text;
  v_just_completed boolean := false;
begin
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then
    raise exception 'CLE_IDEMPOTENCE_INVALIDE';
  end if;

  select * into v_cot from cotisations where id = p_cotisation_id for update;
  if not found then raise exception 'COTISATION_INTROUVABLE'; end if;

  select * into v_existing from payments where transaction_ref = p_idempotency_key;
  if found then
    if v_existing.cotisation_id <> p_cotisation_id or v_existing.amount <> p_amount then
      raise exception 'CLE_IDEMPOTENCE_REUTILISEE';
    end if;
    return json_build_object('idempotent', true, 'new_status', v_cot.status,
      'withdrawal_code', v_cot.withdrawal_code, 'amount_paid', v_cot.amount_paid,
      'amount_remaining', v_cot.total_price - v_cot.amount_paid, 'just_completed', false);
  end if;

  if v_cot.status <> 'active' then raise exception 'COTISATION_NON_ACTIVE'; end if;
  if coalesce(v_cot.refund_status, 'none') in ('requested', 'approved') then
    raise exception 'REMBOURSEMENT_EN_COURS';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'MONTANT_INVALIDE'; end if;
  if p_amount > v_cot.total_price - v_cot.amount_paid then
    raise exception 'MONTANT_DEPASSE_RESTE';
  end if;

  v_new_paid := v_cot.amount_paid + p_amount;
  v_new_remaining := v_cot.total_price - v_new_paid;
  if v_new_remaining <= 0 then
    v_new_status := 'completed';
    v_new_remaining := 0;
    v_just_completed := true;
    loop
      v_code := (100000 + (('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 7))::bit(28)::int % 900000))::text;
      exit when not exists (select 1 from cotisations where withdrawal_code = v_code);
    end loop;
  else
    v_new_status := 'active';
    v_code := v_cot.withdrawal_code;
  end if;

  insert into payments (cotisation_id, user_id, amount, status, payment_method,
                        transaction_ref, paid_at, recorded_by)
  values (p_cotisation_id, v_cot.user_id, p_amount, 'success', 'cash',
          p_idempotency_key, now(), p_recorded_by);

  update cotisations
     set amount_paid = v_new_paid,
         amount_remaining = v_new_remaining,
         nb_tranches = coalesce(nb_tranches, 0) + 1,
         status = v_new_status,
         withdrawal_code = v_code
   where id = p_cotisation_id;

  return json_build_object('idempotent', false, 'new_status', v_new_status,
    'withdrawal_code', v_code, 'amount_paid', v_new_paid,
    'amount_remaining', v_new_remaining, 'just_completed', v_just_completed);
end;
$$;

revoke execute on function public.record_payment(uuid, integer, uuid, text) from public, anon, authenticated;
grant  execute on function public.record_payment(uuid, integer, uuid, text) to service_role;

commit;
