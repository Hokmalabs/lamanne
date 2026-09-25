-- 25/09/2026 — Lot P1c : traçabilité des retraits (qui, comment, quelle preuve).
-- Exécuté dans le SQL Editor le 25/09/2026.
begin;

alter table public.cotisations
  add column if not exists withdrawn_by uuid references auth.users(id) on delete restrict,
  add column if not exists withdrawal_method text,
  add column if not exists withdrawal_proof text;

alter table public.cotisations add constraint cotisations_withdrawal_method_check
  check (withdrawal_method is null or withdrawal_method in ('code', 'identite'));
alter table public.cotisations add constraint cotisations_withdrawal_proof_check
  check (withdrawal_proof is null or withdrawal_proof in ('carnet', 'piece_identite'));
alter table public.cotisations add constraint cotisations_withdrawal_identite_check
  check (withdrawal_method is distinct from 'identite' or withdrawal_proof is not null);

commit;
