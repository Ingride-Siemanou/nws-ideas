-- NWS Ideas — schéma initial Supabase/PostgreSQL
-- À exécuter dans Supabase > SQL Editor.
create extension if not exists pgcrypto;

create type public.app_role as enum ('student', 'admin');
create type public.idea_category as enum ('Vie étudiante', 'Équipements', 'Pédagogie', 'Événements', 'Autres');
create type public.idea_status as enum ('Proposée', 'À l’étude', 'Acceptée', 'Refusée', 'Réalisée');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.app_role not null default 'student',
  created_at timestamptz not null default now()
);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 100),
  description text not null check (char_length(description) between 15 and 3000),
  category public.idea_category not null,
  status public.idea_status not null default 'Proposée',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.idea_votes (
  idea_id uuid not null references public.ideas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  idea_id uuid not null references public.ideas(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index ideas_created_at_idx on public.ideas(created_at desc);
create index ideas_category_idx on public.ideas(category);
create index ideas_status_idx on public.ideas(status);
create index comments_idea_idx on public.comments(idea_id, created_at);

-- Create a private profile row for each newly registered user.
-- Restrict registration to the school's domain in Supabase Auth and in the frontend.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if lower(split_part(new.email, '@', 2)) <> 'normandiewebschool.fr' then
    raise exception 'Une adresse e-mail NWS est obligatoire.';
  end if;
  insert into public.profiles (id, email, role)
  values (new.id, lower(new.email), 'student');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Admin role can only be assigned by a trusted administrator through SQL/dashboard.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_votes enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;

-- Profiles are not publicly readable: each user sees their own profile; admins can moderate.
create policy "read own profile or admin" on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_admin());
create policy "update own profile email only" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()) and role = 'student');
-- No client-side role updates are permitted: remove update policy and keep role assignment server-side.
drop policy "update own profile email only" on public.profiles;
create policy "read published ideas" on public.ideas for select to authenticated using (true);
create policy "students create ideas as themselves" on public.ideas for insert to authenticated
with check (author_id = (select auth.uid()));
create policy "authors or admins update ideas" on public.ideas for update to authenticated
using (author_id = (select auth.uid()) or public.is_admin())
with check (author_id = (select auth.uid()) or public.is_admin());
create policy "admins delete ideas" on public.ideas for delete to authenticated using (public.is_admin());

create policy "votes visible to authenticated users" on public.idea_votes for select to authenticated using (true);
create policy "vote as self" on public.idea_votes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "remove own vote" on public.idea_votes for delete to authenticated using (user_id = (select auth.uid()));

create policy "read comments" on public.comments for select to authenticated using (true);
create policy "create own comments" on public.comments for insert to authenticated with check (author_id = (select auth.uid()));
create policy "delete own comments or admin" on public.comments for delete to authenticated using (author_id = (select auth.uid()) or public.is_admin());

create policy "read own notifications" on public.notifications for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "mark own notifications read" on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- A status change creates a notification for the idea's author.
create or replace function public.notify_idea_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications(user_id, idea_id, message)
    values (new.author_id, new.id, 'Le statut de votre idée « ' || new.title || ' » est passé à : ' || new.status::text);
  end if;
  return new;
end;
$$;
create trigger idea_status_notification after update of status on public.ideas
for each row execute procedure public.notify_idea_status_change();

-- Storage bucket: images are public to authenticated viewers; uploads are restricted to the owner's folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('idea-images', 'idea-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "authenticated view idea images" on storage.objects for select to authenticated
using (bucket_id = 'idea-images');
create policy "upload image into own folder" on storage.objects for insert to authenticated
with check (bucket_id = 'idea-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own idea images" on storage.objects for delete to authenticated
using (bucket_id = 'idea-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Après avoir appliqué ce schéma, exécuter aussi supabase/admin-access.sql
-- pour activer le formulaire administrateur basé sur une liste d'adresses autorisées.
