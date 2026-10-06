-- =========================================================
-- road-review Sprint 3: drives + road_info + road_summaries view
-- (architecture ch.3.1 / 3.2 / 3.3 / 3.5 / ch.4 / ch.18 S-8 / ch.19 D-1 / ch.20)
-- Tables, indexes, triggers, RLS and privileges live in one file so no table
-- ever exists without RLS. No speed / time-of-day / lap / ranking columns by design
-- (driven_on is a date; created_at / updated_at are bookkeeping, not drive times).
-- =========================================================

-- ---------- drives ----------
create table if not exists public.drives (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid()
                            references auth.users (id) on delete cascade,
  road_id                 uuid not null references public.roads (id) on delete cascade,
  driven_on               date not null,
  vehicle_type            text,
  weather                 text,
  rating_overall          smallint not null,
  rating_scenery          smallint,
  rating_road_surface     smallint,
  rating_ease_of_driving  smallint,
  -- A situation of the day (few / normal / many), not a score.
  traffic                 text,
  memo                    text not null default '',
  -- MVP: private only. Widen this constraint together with a public-read policy later.
  visibility              text not null default 'private',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint drives_vehicle_type_values check (vehicle_type is null or vehicle_type in ('car', 'motorcycle')),
  constraint drives_weather_values      check (weather is null or weather in ('sunny', 'cloudy', 'rain', 'snow', 'other')),
  constraint drives_rating_overall      check (rating_overall between 1 and 5),
  constraint drives_rating_scenery      check (rating_scenery is null or rating_scenery between 1 and 5),
  constraint drives_rating_road_surface check (rating_road_surface is null or rating_road_surface between 1 and 5),
  constraint drives_rating_ease         check (rating_ease_of_driving is null or rating_ease_of_driving between 1 and 5),
  constraint drives_traffic_values      check (traffic is null or traffic in ('few', 'normal', 'many')),
  constraint drives_memo_length         check (char_length(memo) <= 2000),
  constraint drives_visibility_values   check (visibility in ('private')),
  -- PRD US-06 lower bound. A constant, so the CHECK stays immutable.
  -- The "not in the future" rule depends on the current date and lives in drives_guard instead.
  constraint drives_driven_on_min       check (driven_on >= '2000-01-01')
);

-- Newest-first list per road (US-07) and the latest-drive lookup of road_summaries.
create index if not exists drives_road_driven_idx on public.drives (road_id, driven_on desc, created_at desc);
create index if not exists drives_user_idx        on public.drives (user_id);

-- driven_on must not be after today in Japan (the server runs in UTC, so compare in JST).
-- road_id is immutable: Storage paths (Sprint 4) contain it. Runs for every role, service role included.
create or replace function public.drives_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.driven_on > public.today_in_tokyo() then
    raise exception 'driven_on_in_future' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.road_id is distinct from old.road_id then
    raise exception 'road_id_is_immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Only called by the trigger below; nobody needs to call it directly.
revoke execute on function public.drives_guard() from public, anon, authenticated;

create or replace trigger drives_guard_before_write
  before insert or update on public.drives
  for each row execute function public.drives_guard();

create or replace trigger drives_set_updated_at
  before update on public.drives
  for each row execute function public.set_updated_at();

-- ---------- road_info (1:1 snapshot per drive, PRD US-10 items) ----------
-- Each item is a nullable status (null = 記録しない) plus a memo.
-- toll: paid / free / unknown; every other item: yes / no / unknown.
create table if not exists public.road_info (
  drive_id             uuid primary key references public.drives (id) on delete cascade,
  user_id              uuid not null default auth.uid()
                         references auth.users (id) on delete cascade,
  -- Filled from the drive's driven_on by road_info_guard when not given.
  confirmed_on         date not null,
  motorcycle_ban       text,
  motorcycle_ban_memo  text not null default '',
  night_closure        text,
  night_closure_memo   text not null default '',
  winter_closure       text,
  winter_closure_memo  text not null default '',
  toll                 text,
  toll_memo            text not null default '',
  parking              text,
  parking_memo         text not null default '',
  toilet               text,
  toilet_memo          text not null default '',
  michi_no_eki         text,
  michi_no_eki_memo    text not null default '',
  observatory          text,
  observatory_memo     text not null default '',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint road_info_motorcycle_ban_values check (motorcycle_ban is null or motorcycle_ban in ('yes', 'no', 'unknown')),
  constraint road_info_night_closure_values  check (night_closure is null or night_closure in ('yes', 'no', 'unknown')),
  constraint road_info_winter_closure_values check (winter_closure is null or winter_closure in ('yes', 'no', 'unknown')),
  constraint road_info_toll_values           check (toll is null or toll in ('paid', 'free', 'unknown')),
  constraint road_info_parking_values        check (parking is null or parking in ('yes', 'no', 'unknown')),
  constraint road_info_toilet_values         check (toilet is null or toilet in ('yes', 'no', 'unknown')),
  constraint road_info_michi_no_eki_values   check (michi_no_eki is null or michi_no_eki in ('yes', 'no', 'unknown')),
  constraint road_info_observatory_values    check (observatory is null or observatory in ('yes', 'no', 'unknown')),
  constraint road_info_motorcycle_ban_memo   check (char_length(motorcycle_ban_memo) <= 200),
  constraint road_info_night_closure_memo    check (char_length(night_closure_memo) <= 200),
  constraint road_info_winter_closure_memo   check (char_length(winter_closure_memo) <= 200),
  constraint road_info_toll_memo             check (char_length(toll_memo) <= 200),
  constraint road_info_parking_memo          check (char_length(parking_memo) <= 200),
  constraint road_info_toilet_memo           check (char_length(toilet_memo) <= 200),
  constraint road_info_michi_no_eki_memo     check (char_length(michi_no_eki_memo) <= 200),
  constraint road_info_observatory_memo      check (char_length(observatory_memo) <= 200),
  -- M-27 mirrored in the DB: a row records at least one item.
  constraint road_info_any_item              check (num_nonnulls(motorcycle_ban, night_closure, winter_closure, toll, parking, toilet, michi_no_eki, observatory) >= 1)
);

create index if not exists road_info_user_idx on public.road_info (user_id);

-- confirmed_on defaults to the drive date (a column DEFAULT cannot read another table),
-- must not be after today in Japan, and drive_id is immutable.
-- SECURITY INVOKER: the drives lookup runs under the caller's RLS, so another user's
-- drive yields null -> the NOT NULL check on confirmed_on fails (and the insert policy too).
create or replace function public.road_info_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.confirmed_on is null then
    select d.driven_on into new.confirmed_on
      from public.drives d
     where d.id = new.drive_id;
  end if;
  if new.confirmed_on is not null and new.confirmed_on > public.today_in_tokyo() then
    raise exception 'confirmed_on_in_future' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.drive_id is distinct from old.drive_id then
    raise exception 'drive_id_is_immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke execute on function public.road_info_guard() from public, anon, authenticated;

create or replace trigger road_info_guard_before_write
  before insert or update on public.road_info
  for each row execute function public.road_info_guard();

create or replace trigger road_info_set_updated_at
  before update on public.road_info
  for each row execute function public.set_updated_at();

-- ---------- RLS + privileges ----------
alter table public.drives    enable row level security;
alter table public.road_info enable row level security;

-- Supabase default privileges grant ALL to anon/authenticated; start from nothing (S-8).
revoke all on table public.drives from anon, authenticated;
revoke all on table public.road_info from anon, authenticated;

grant select, delete on table public.drives to authenticated;
-- INSERT: form columns + road_id. user_id is filled by default auth.uid(); visibility / id are
-- not grantable, so a client value for them is a privilege error (42501) (D-1 pattern).
grant insert (road_id, driven_on, vehicle_type, weather, rating_overall, rating_scenery,
              rating_road_surface, rating_ease_of_driving, traffic, memo)
  on table public.drives to authenticated;
-- UPDATE: the edit form columns only. road_id is immutable (also enforced by drives_guard).
grant update (driven_on, vehicle_type, weather, rating_overall, rating_scenery,
              rating_road_surface, rating_ease_of_driving, traffic, memo)
  on table public.drives to authenticated;

grant select, delete on table public.road_info to authenticated;
grant insert (drive_id, confirmed_on,
              motorcycle_ban, motorcycle_ban_memo, night_closure, night_closure_memo,
              winter_closure, winter_closure_memo, toll, toll_memo,
              parking, parking_memo, toilet, toilet_memo,
              michi_no_eki, michi_no_eki_memo, observatory, observatory_memo)
  on table public.road_info to authenticated;
-- UPDATE excludes drive_id (immutable; also enforced by road_info_guard) and user_id.
grant update (confirmed_on,
              motorcycle_ban, motorcycle_ban_memo, night_closure, night_closure_memo,
              winter_closure, winter_closure_memo, toll, toll_memo,
              parking, parking_memo, toilet, toilet_memo,
              michi_no_eki, michi_no_eki_memo, observatory, observatory_memo)
  on table public.road_info to authenticated;

-- ---------- drives policies ----------
drop policy if exists "drives_select_own" on public.drives;
create policy "drives_select_own" on public.drives
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- The parent road must belong to the caller too (blocks inserting under another user's road_id).
drop policy if exists "drives_insert_own" on public.drives;
create policy "drives_insert_own" on public.drives
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.roads r
      where r.id = drives.road_id
        and r.user_id = (select auth.uid())
    )
  );

drop policy if exists "drives_update_own" on public.drives;
create policy "drives_update_own" on public.drives
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.roads r
      where r.id = drives.road_id
        and r.user_id = (select auth.uid())
    )
  );

drop policy if exists "drives_delete_own" on public.drives;
create policy "drives_delete_own" on public.drives
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- road_info policies ----------
drop policy if exists "road_info_select_own" on public.road_info;
create policy "road_info_select_own" on public.road_info
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- The parent drive must belong to the caller too.
drop policy if exists "road_info_insert_own" on public.road_info;
create policy "road_info_insert_own" on public.road_info
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.drives d
      where d.id = road_info.drive_id
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists "road_info_update_own" on public.road_info;
create policy "road_info_update_own" on public.road_info
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.drives d
      where d.id = road_info.drive_id
        and d.user_id = (select auth.uid())
    )
  );

drop policy if exists "road_info_delete_own" on public.road_info;
create policy "road_info_delete_own" on public.road_info
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- road_summaries (list view, architecture 3.3) ----------
-- security_invoker = true so the caller's RLS on roads / drives applies (Postgres 15+).
-- last_* come from the newest drive (same record, so date and rating line up);
-- rating_overall_sum / drive_count give the list average (PRD US-07, rounded in the app).
create or replace view public.road_summaries
with (security_invoker = true)
as
select
  r.id,
  r.user_id,
  r.name,
  r.prefecture_code,
  r.road_type,
  r.start_lat,
  r.start_lng,
  r.end_lat,
  r.end_lng,
  r.created_at,
  r.updated_at,
  latest.driven_on      as last_driven_on,
  latest.rating_overall as last_rating_overall,
  coalesce(stats.drive_count, 0) as drive_count,
  stats.rating_overall_sum
from public.roads r
left join lateral (
  select d.driven_on, d.rating_overall
  from public.drives d
  where d.road_id = r.id
  order by d.driven_on desc, d.created_at desc
  limit 1
) latest on true
left join lateral (
  select
    count(*)::integer               as drive_count,
    sum(d.rating_overall)::integer  as rating_overall_sum
  from public.drives d
  where d.road_id = r.id
) stats on true;

-- Read-only for signed-in users; nothing for anon.
revoke all on table public.road_summaries from anon, authenticated;
grant select on table public.road_summaries to authenticated;
