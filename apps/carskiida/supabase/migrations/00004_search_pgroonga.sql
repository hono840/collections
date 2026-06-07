-- ============================================================
-- 日本語全文検索（PGroonga）+ ファセット用マテビュー + 検索 RPC。
-- 標準 to_tsvector は日本語形態素非対応のため PGroonga を採用。
-- PGroonga は Supabase の全新規プロジェクトにプリインストール済み。
-- ============================================================

create extension if not exists pgroonga;

-- 検索インデックス用マテリアライズドビュー（breadth + depth を母集団に）
create materialized view car_search_index as
select
  cm.id,
  cm.slug,
  cm.name_ja,
  cm.name_en,
  cm.body_type,
  cm.depth_level,
  cm.completeness,
  cm.origin_country,
  cm.year_from,
  cm.year_to,
  m.slug    as manufacturer_slug,
  m.name_ja as manufacturer_name_ja,
  (
    coalesce(cm.name_ja, '') || ' ' ||
    coalesce(cm.name_en, '') || ' ' ||
    array_to_string(cm.aliases, ' ') || ' ' ||
    coalesce(m.name_ja, '') || ' ' ||
    coalesce(m.name_en, '')
  ) as search_text
from car_model cm
join manufacturer m on m.id = cm.manufacturer_id;

-- 同時 REFRESH 用の一意インデックス
create unique index idx_car_search_id on car_search_index (id);
-- 日本語全文検索インデックス
create index idx_car_search_pgroonga on car_search_index using pgroonga (search_text);
-- ファセット用
create index idx_car_search_maker on car_search_index (manufacturer_slug);
create index idx_car_search_body on car_search_index (body_type);

-- マテリアライズドビューには RLS が効かないため、公開可な母集団のみで構成する前提。
-- 将来 UGC / 非公開フィールドを導入する際は、ビュー定義側で公開述語を絞ること。
grant select on car_search_index to anon, authenticated;

-- 検索 RPC（アプリからは supabase.rpc('search_cars', {...}) で呼ぶ）
-- search_path を固定し、参照はスキーマ修飾する（function_search_path_mutable 対策）
create or replace function public.search_cars(
  q text default '',
  maker text default null,
  body text default null,
  showcase_only boolean default false
)
returns setof public.car_search_index
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from public.car_search_index
  where (coalesce(q, '') = '' or search_text &@~ q)
    and (maker is null or manufacturer_slug = maker)
    and (body is null or body_type::text = body)
    and (showcase_only = false or depth_level = 'showcase');
$$;

revoke all on function public.search_cars(text, text, text, boolean) from public;
grant execute on function public.search_cars(text, text, text, boolean) to anon, authenticated;

-- ETL 完了後に: refresh materialized view concurrently public.car_search_index;
