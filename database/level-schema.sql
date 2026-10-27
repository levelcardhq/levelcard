create table public.level_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '' check (length(full_name) <= 200),
 created_at timestamptz not null default now()
);
alter table public.level_profiles enable row level security;
revoke all on public.level_profiles from anon, authenticated;
grant select, insert, update on public.level_profiles to authenticated;
create policy profiles_select on public.level_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy profiles_insert on public.level_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy profiles_update on public.level_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create table public.level_applications (
 user_id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null check (length(full_name) between 1 and 200),
 email text not null check (length(email) between 3 and 320),
 business_name text not null check (length(business_name) between 1 and 200),
 has_business_funds boolean not null,
 status text not null default 'submitted' check (status in ('submitted','under_review','approved','declined')),
 created_at timestamptz not null default now()
);
alter table public.level_applications enable row level security;
revoke all on public.level_applications from anon, authenticated;
grant select on public.level_applications to authenticated;
grant insert (user_id,full_name,email,business_name,has_business_funds) on public.level_applications to authenticated;
create policy applications_select on public.level_applications for select to authenticated using ((select auth.uid()) = user_id);
create policy applications_insert on public.level_applications for insert to authenticated with check ((select auth.uid()) = user_id);
