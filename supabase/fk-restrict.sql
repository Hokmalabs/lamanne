-- 2026-09-22 — Empêcher la suppression en cascade de l'historique financier.
-- Appliqué en prod le 22/09/2026 (SQL editor).
-- Un produit déjà vendu ne peut plus être supprimé : le désactiver (is_active = false).

alter table public.cotisations
  drop constraint cotisations_product_id_fkey,
  add constraint cotisations_product_id_fkey
    foreign key (product_id) references public.products(id) on delete restrict;

-- Un compte ayant des cotisations ou versements ne peut plus être supprimé
-- (auparavant : suppression en cascade de tout l'historique financier). Le suspendre.
alter table public.cotisations
  drop constraint cotisations_user_id_fkey,
  add constraint cotisations_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete restrict;

alter table public.payments
  drop constraint payments_user_id_fkey,
  add constraint payments_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete restrict;
