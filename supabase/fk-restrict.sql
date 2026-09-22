-- 2026-09-22 — Empêcher la suppression en cascade de l'historique financier.
-- Appliqué en prod le 22/09/2026 (SQL editor).
-- Un produit déjà vendu ne peut plus être supprimé : le désactiver (is_active = false).

alter table public.cotisations
  drop constraint cotisations_product_id_fkey,
  add constraint cotisations_product_id_fkey
    foreign key (product_id) references public.products(id) on delete restrict;
