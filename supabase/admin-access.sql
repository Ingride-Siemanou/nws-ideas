-- NWS Ideas — espace administrateur sécurisé
-- Exécuter ce script une seule fois dans Supabase > SQL Editor, après schema.sql.
-- Les comptes étudiants ne peuvent pas s'attribuer eux-mêmes le rôle admin.
-- Les adresses ajoutées à public.admin_email_allowlist peuvent s'inscrire via le formulaire "Espace admin".

create table if not exists public.admin_email_allowlist (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

alter table public.admin_email_allowlist enable row level security;
revoke all on table public.admin_email_allowlist from public, anon, authenticated;

-- Ajouter ici une fonction admin synchronise le rôle d'un profil existant.
create or replace function public.sync_admin_allowlist_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.profiles set role = 'student' where lower(email) = old.email;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.email is distinct from new.email then
    update public.profiles set role = 'student' where lower(email) = old.email;
  end if;

  update public.profiles set role = 'admin' where lower(email) = new.email;
  return new;
end;
$$;

revoke all on function public.sync_admin_allowlist_profile() from public, anon, authenticated;
drop trigger if exists admin_allowlist_sync_insert_update on public.admin_email_allowlist;
create trigger admin_allowlist_sync_insert_update
after insert or update on public.admin_email_allowlist
for each row execute function public.sync_admin_allowlist_profile();
drop trigger if exists admin_allowlist_sync_delete on public.admin_email_allowlist;
create trigger admin_allowlist_sync_delete
after delete on public.admin_email_allowlist
for each row execute function public.sync_admin_allowlist_profile();

-- Le formulaire transmet requested_role='admin'. Le rôle n'est accordé que si l'e-mail
-- est dans la liste privée. Une tentative avec une autre adresse est refusée côté base.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data ->> 'requested_role', 'student');
  assigned_role public.app_role := 'student';
begin
  if new.email is null or lower(split_part(new.email, '@', 2)) <> 'normandiewebschool.fr' then
    raise exception 'Une adresse e-mail NWS est obligatoire.';
  end if;

  if requested_role = 'admin' then
    if not exists (
      select 1 from public.admin_email_allowlist a where a.email = lower(new.email)
    ) then
      raise exception 'Cette adresse n’est pas autorisée pour un compte administrateur.';
    end if;
    assigned_role := 'admin';
  end if;

  insert into public.profiles (id, email, role)
  values (new.id, lower(new.email), assigned_role);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Après avoir exécuté ce script, autoriser chaque administrateur avec une requête de ce type
-- (remplacer l'adresse d'exemple par une véritable adresse du personnel NWS) :
-- insert into public.admin_email_allowlist(email)
-- values (lower('prenom.nom@normandiewebschool.fr'))
-- on conflict (email) do nothing;
--
-- Ajouter une adresse dans cette liste attribue automatiquement le rôle admin au profil
-- correspondant s'il existe déjà. Sinon, son inscription via "Espace admin" recevra le rôle.
-- Supprimer l'adresse de la liste révoque automatiquement ce rôle.
