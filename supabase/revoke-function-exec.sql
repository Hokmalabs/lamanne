-- 24/09/2026 — Lot P0 : aucune fonction du schéma public n'est exécutable via PostgREST.
-- record_payment : SECURITY DEFINER, était appelable avec la clé anon (crédit sans argent).
revoke execute on function public.record_payment(uuid, integer, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.record_payment(uuid, integer, uuid, text, text)
  to service_role;
-- Fonctions de trigger : non appelables via /rpc, révoquées par hygiène
-- (le droit EXECUTE n'est vérifié qu'à la création du trigger, pas au déclenchement).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_cotisation_deadline() from public, anon, authenticated;
