-- 24/09/2026 — Lot P1b : création de cotisation par un agent, atomique et idempotente.
-- Exécuté dans le SQL Editor le 24/09/2026.
-- Rejeu enrichi (amount_paid, new_status) : create or replace appliqué le 24/09/2026.
begin;

alter table public.cotisations add column if not exists creation_key text;
create unique index if not exists cotisations_creation_key_key
  on public.cotisations (creation_key) where creation_key is not null;

create function public.create_cotisation_with_payment(
  p_user_id uuid, p_product_id uuid, p_months integer, p_first_payment integer,
  p_created_by uuid, p_idempotency_key text
) returns json
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_product products%rowtype;
  v_cot_id uuid;
  v_paid integer;
  v_status text;
  v_pay json;
begin
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then
    raise exception 'CLE_IDEMPOTENCE_INVALIDE';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_idempotency_key));

  -- Rejeu : renvoyer l'état réel (montant déjà encaissé, statut) pour éviter un double encaissement
  select id, amount_paid, status into v_cot_id, v_paid, v_status
    from cotisations where creation_key = p_idempotency_key;
  if found then
    return json_build_object('idempotent', true, 'cotisation_id', v_cot_id,
                             'amount_paid', v_paid, 'new_status', v_status);
  end if;

  select * into v_product from products where id = p_product_id;
  if not found then raise exception 'PRODUIT_INTROUVABLE'; end if;
  if not v_product.is_active then raise exception 'PRODUIT_INDISPONIBLE'; end if;
  if p_months is null or p_months < coalesce(v_product.min_tranches, 1)
     or p_months > v_product.max_tranches then
    raise exception 'DUREE_INVALIDE';
  end if;
  if p_first_payment is null or p_first_payment < 0 then raise exception 'MONTANT_INVALIDE'; end if;
  if p_first_payment > v_product.price then raise exception 'MONTANT_DEPASSE_RESTE'; end if;

  insert into cotisations (user_id, product_id, total_price, amount_paid, amount_remaining,
                           nb_tranches, tranche_amount, status, deadline, created_by, creation_key)
  values (p_user_id, p_product_id, v_product.price, 0, v_product.price,
          0, ceil(v_product.price::numeric / p_months)::int, 'active',
          now() + make_interval(months => p_months), p_created_by, p_idempotency_key)
  returning id into v_cot_id;

  if p_first_payment > 0 then
    v_pay := public.record_payment(v_cot_id, p_first_payment, p_created_by,
                                   p_idempotency_key || ':premier');
  end if;

  return json_build_object('idempotent', false, 'cotisation_id', v_cot_id, 'payment', v_pay);
end;
$$;

revoke execute on function public.create_cotisation_with_payment(uuid, uuid, integer, integer, uuid, text)
  from public, anon, authenticated;
grant execute on function public.create_cotisation_with_payment(uuid, uuid, integer, integer, uuid, text)
  to service_role;

commit;
