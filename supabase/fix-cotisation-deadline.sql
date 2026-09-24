-- 24/09/2026 — Lot P0 : le trigger on_cotisation_created écrasait deadline avec
-- products.created_at + max_tranches (date du PRODUIT, pas de la cotisation), ignorant
-- la durée choisie. Désormais : ne remplit deadline que si la route ne l'a pas fourni.
create or replace function public.set_cotisation_deadline()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.deadline is null then
    select now() + make_interval(months => p.max_tranches)
      into new.deadline
      from public.products p
     where p.id = new.product_id;
  end if;
  return new;
end;
$$;
