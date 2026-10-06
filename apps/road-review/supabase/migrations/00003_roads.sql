-- =========================================================
-- road-review Sprint 2: roads
-- (architecture ch.3.1 / ch.3.2 / ch.3.5 / ch.4 / ch.19)
-- Table, index, trigger, RLS and privileges live in one file so the table
-- never exists without RLS. No speed / time-of-day / lap / ranking columns by design.
-- =========================================================

create table if not exists public.roads (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid()
                     references auth.users (id) on delete cascade,
  name             text not null,
  prefecture_code  smallint not null,
  road_type        text not null default 'other',
  start_lat        double precision not null,
  start_lng        double precision not null,
  end_lat          double precision,
  end_lng          double precision,
  -- MVP: private only. Widen this constraint together with a public-read policy later.
  visibility       text not null default 'private',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- D-2: \S is space-aware in PostgreSQL regex (also rejects U+3000 at either end);
  -- [[:cntrl:]] rejects tabs, newlines and other control characters anywhere.
  constraint roads_name_length       check (char_length(name) between 1 and 50),
  constraint roads_name_edges        check (name ~ '^\S(.*\S)?$'),
  constraint roads_name_no_controls  check (name !~ '[[:cntrl:]]'),
  constraint roads_prefecture_range  check (prefecture_code between 1 and 47),
  constraint roads_road_type_values  check (road_type in ('pass', 'skyline', 'coastal', 'forest', 'other')),
  constraint roads_visibility_values check (visibility in ('private')),
  constraint roads_start_in_japan    check (start_lat between 20 and 46 and start_lng between 122 and 154),
  constraint roads_end_pair          check ((end_lat is null) = (end_lng is null)),
  constraint roads_end_in_japan      check (end_lat is null or (end_lat between 20 and 46 and end_lng between 122 and 154))
);

-- List query: own roads, newest first. Also serves the user_id lookup used by RLS.
create index if not exists roads_user_created_idx on public.roads (user_id, created_at desc);

create or replace trigger roads_set_updated_at
  before update on public.roads
  for each row execute function public.set_updated_at();

-- D-3: at most 500 roads per user. Runs for every role (service role included).
-- The per-user advisory lock serialises concurrent inserts for the same user until the
-- transaction ends, so two parallel inserts at 499 cannot both pass the count.
-- SECURITY INVOKER: under RLS the count only sees the caller's own rows, which is exactly
-- what is counted (a row for another user_id is rejected by the insert policy anyway).
create or replace function public.enforce_road_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  road_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('roads:' || new.user_id::text));

  select pg_catalog.count(*) into road_count
    from public.roads
   where user_id = new.user_id;

  if road_count >= 500 then
    raise exception 'road_limit_exceeded' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- Only called by the trigger below; nobody needs to call it directly.
revoke execute on function public.enforce_road_limit() from public, anon, authenticated;

create or replace trigger roads_enforce_limit
  before insert on public.roads
  for each row execute function public.enforce_road_limit();

-- ---------- RLS + privileges ----------
alter table public.roads enable row level security;

-- Supabase default privileges grant ALL to anon/authenticated; start from nothing (S-8).
revoke all on table public.roads from anon, authenticated;

grant select, delete on table public.roads to authenticated;
-- INSERT: only the form columns. user_id is filled by default auth.uid(); visibility is not
-- grantable either (D-1), so it always takes its default 'private' and any client value is a
-- privilege error (42501).
grant insert (name, prefecture_code, road_type, start_lat, start_lng, end_lat, end_lng)
  on table public.roads to authenticated;
-- UPDATE: only the columns the edit form writes. user_id / visibility / timestamps cannot be
-- changed by clients (updated_at is set by the trigger).
grant update (name, prefecture_code, road_type, start_lat, start_lng, end_lat, end_lng)
  on table public.roads to authenticated;

drop policy if exists "roads_select_own" on public.roads;
create policy "roads_select_own" on public.roads
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "roads_insert_own" on public.roads;
create policy "roads_insert_own" on public.roads
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "roads_update_own" on public.roads;
create policy "roads_update_own" on public.roads
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "roads_delete_own" on public.roads;
create policy "roads_delete_own" on public.roads
  for delete to authenticated
  using ((select auth.uid()) = user_id);
