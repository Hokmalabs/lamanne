-- Appliquée manuellement dans le SQL Editor le 23 septembre 2026 (branche
-- feat/auth-pin). Ne pas réexécuter : fichier de référence.

begin;

create table public.auth_pins (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  pin_hash        text        not null,              -- scrypt$N$r$p$sel$hash (base64)
  must_change     boolean     not null default false,
  temp_expires_at timestamptz,
  failed_attempts integer     not null default 0,
  locked_until    timestamptz,
  updated_at      timestamptz not null default now(),
  constraint auth_pins_temp_chk check (must_change = (temp_expires_at is not null))
);

alter table public.auth_pins enable row level security;   -- aucune policy : invisible hors service_role
revoke all on public.auth_pins from public, anon, authenticated;
grant select, insert, update, delete on public.auth_pins to service_role;

-- Réserve un essai AVANT vérification (à l'épreuve des requêtes parallèles).
-- Renvoie NULL si l'essai est autorisé, sinon la date de fin de blocage.
create or replace function public.pin_attempt_begin(p_user_id uuid)
returns timestamptz
language plpgsql security definer set search_path = public
as $$
declare
  v_locked timestamptz;
begin
  select locked_until into v_locked
  from auth_pins where user_id = p_user_id
  for update;

  if not found then
    return 'infinity'::timestamptz;   -- pas de PIN : jamais autorisé
  end if;

  if v_locked is not null and v_locked > now() then
    return v_locked;
  end if;

  update auth_pins set
    failed_attempts = failed_attempts + 1,
    locked_until = case
      when failed_attempts + 1 >= 15 then now() + interval '24 hours'
      when failed_attempts + 1 >= 10 then now() + interval '1 hour'
      when failed_attempts + 1 >= 5  then now() + interval '15 minutes'
      else null end,
    updated_at = now()
  where user_id = p_user_id;

  return null;
end $$;

-- Succès : remise à zéro du compteur et du blocage.
create or replace function public.pin_attempt_success(p_user_id uuid)
returns void
language sql security definer set search_path = public
as $$
  update auth_pins set failed_attempts = 0, locked_until = null, updated_at = now()
  where user_id = p_user_id;
$$;

revoke execute on function public.pin_attempt_begin(uuid)   from public, anon, authenticated;
revoke execute on function public.pin_attempt_success(uuid) from public, anon, authenticated;
grant  execute on function public.pin_attempt_begin(uuid)   to service_role;
grant  execute on function public.pin_attempt_success(uuid) to service_role;

create unique index profiles_phone_unique on public.profiles (phone) where phone <> '';

commit;
