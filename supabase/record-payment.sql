-- =============================================================================
-- record-payment.sql
-- Fonction atomique d'enregistrement d'un versement sur une cotisation.
--
-- Appelée par les API serveur commercial ET client via supabaseAdmin.rpc().
-- Remplace les écritures directes cotisations/payments (bloquées par les RLS)
-- et centralise toute la logique métier du versement en une seule transaction.
--
-- Garanties :
--   - Idempotence : un même p_idempotency_key ne crée jamais deux paiements
--     (protège contre le double-clic / double-appel réseau).
--   - Anti-race : SELECT ... FOR UPDATE verrouille la cotisation le temps de
--     la transaction, éliminant la race condition sur amount_paid.
--   - Complétion : si le solde atteint 0, la cotisation passe à 'completed'
--     et un withdrawal_code à 6 chiffres UNIQUE est généré (boucle anti-collision).
--   - SECURITY DEFINER : s'exécute avec les droits du propriétaire, bypass RLS
--     proprement (les writes ne passent que par cette fonction contrôlée).
--
-- Retour (json) attendu par les API :
--   { idempotent, new_status, withdrawal_code, amount_paid, amount_remaining }
--
-- NB : le code de retrait n'est PAS un secret cryptographique — il est vérifié
-- physiquement en boutique. Le PRNG SQL + unicité garantie suffit. Ce qui compte
-- est l'unicité (pas d'ambiguïté au retrait), assurée par la boucle anti-collision.
--
-- Idempotent à l'exécution (CREATE OR REPLACE) : ce fichier peut être rejoué
-- sans risque, il redéfinit la fonction à l'identique.
-- =============================================================================

create or replace function record_payment(
  p_cotisation_id uuid,
  p_amount integer,
  p_recorded_by uuid,
  p_role text,
  p_idempotency_key text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cot record;
  v_new_paid integer;
  v_new_remaining integer;
  v_new_status text;
  v_code text;
  v_existing payments;
begin
  -- 1. Idempotence : si un paiement avec cette clé existe déjà, renvoyer l'état actuel
  select * into v_existing from payments where transaction_ref = p_idempotency_key limit 1;
  if found then
    select * into v_cot from cotisations where id = p_cotisation_id;
    return json_build_object(
      'idempotent', true,
      'new_status', v_cot.status,
      'withdrawal_code', v_cot.withdrawal_code,
      'amount_paid', v_cot.amount_paid,
      'amount_remaining', v_cot.amount_remaining
    );
  end if;

  -- 2. Verrou de ligne : élimine la race condition sur amount_paid
  select * into v_cot from cotisations where id = p_cotisation_id for update;
  if not found then
    raise exception 'COTISATION_INTROUVABLE';
  end if;

  -- 3. Validations
  if v_cot.status <> 'active' then
    raise exception 'COTISATION_NON_ACTIVE';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'MONTANT_INVALIDE';
  end if;
  if p_amount > v_cot.amount_remaining then
    raise exception 'MONTANT_DEPASSE_RESTE';
  end if;

  -- 4. Calcul des nouveaux montants
  v_new_paid := v_cot.amount_paid + p_amount;
  v_new_remaining := v_cot.total_price - v_new_paid;

  -- 5. Complétion + code de retrait unique si soldé
  if v_new_remaining <= 0 then
    v_new_status := 'completed';
    v_new_remaining := 0;
    loop
      v_code := lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');
      exit when not exists (select 1 from cotisations where withdrawal_code = v_code);
    end loop;
  else
    v_new_status := 'active';
    v_code := v_cot.withdrawal_code; -- reste inchangé (null tant qu'active)
  end if;

  -- 6. Insert du paiement
  insert into payments (cotisation_id, user_id, amount, status, payment_method, transaction_ref, paid_at)
  values (p_cotisation_id, v_cot.user_id, p_amount, 'success', 'cash', p_idempotency_key, now());

  -- 7. Mise à jour de la cotisation
  update cotisations
  set amount_paid = v_new_paid,
      amount_remaining = v_new_remaining,
      status = v_new_status,
      withdrawal_code = v_code
  where id = p_cotisation_id;

  -- 8. Retour attendu par les API
  return json_build_object(
    'idempotent', false,
    'new_status', v_new_status,
    'withdrawal_code', v_code,
    'amount_paid', v_new_paid,
    'amount_remaining', v_new_remaining
  );
end;
$$;