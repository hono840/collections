-- =========================================================
-- road-review Sprint 1: shared functions + user_settings
-- (architecture ch.3.2 / ch.3.5 / ch.4)
-- RLS is defined in the same file as the table so the table never exists without it.
-- =========================================================

-- ---------- shared functions ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.today_in_tokyo()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Tokyo')::date;
$$;

-- Functions are executable by PUBLIC by default; restrict to authenticated.
revoke execute on function public.today_in_tokyo() from public, anon;
grant execute on function public.today_in_tokyo() to authenticated;

-- set_updated_at is only called by triggers; nobody needs to call it directly.
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- ---------- user_settings ----------
-- A missing row means "safety notice not acknowledged yet".
-- Rows are upserted by acknowledgeSafetyNotice (no trigger on auth.users, so sign-up cannot fail here).
create table if not exists public.user_settings (
  user_id                         uuid primary key default auth.uid()
                                    references auth.users (id) on delete cascade,
  safety_notice_acknowledged_at   timestamptz,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

create or replace trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- ---------- RLS + privileges ----------
alter table public.user_settings enable row level security;

revoke all on table public.user_settings from anon;
grant select, insert, update, delete on table public.user_settings to authenticated;

-- No DELETE policy: rows are removed by the auth.users cascade.
drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own" on public.user_settings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own" on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
