-- ============================================================
-- carskiida 初期スキーマ
-- 設計: docs/product/carskiida-architecture.md §2
-- 原則: read-heavy 公開リファレンス / 全フィールドに出典(field_source) / breadth・depth は同一スキーマ
-- ============================================================

-- ---- 列挙 ----
create type source_type as enum (
  'vpic', 'wikidata', 'wikipedia', 'manufacturer', 'ugc', 'editor'
);
create type depth_level as enum ('breadth', 'showcase');
create type body_type as enum (
  'sedan', 'hatchback', 'coupe', 'wagon', 'suv',
  'minivan', 'kei', 'convertible', 'pickup', 'other'
);
create type part_category as enum (
  'engine', 'drivetrain', 'transmission', 'suspension',
  'brake', 'body', 'safety', 'wheel'
);

-- ---- 生産国 ----
create table production_country (
  id          bigint generated always as identity primary key,
  name_ja     text not null,
  name_en     text not null,
  iso_code    text unique
);

-- ---- メーカー ----
create table manufacturer (
  id          bigint generated always as identity primary key,
  name_ja     text not null,
  name_en     text not null,
  slug        text not null unique,
  country_id  bigint references production_country(id),
  primary_source source_type,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---- 車種（breadth/depth 共通の基底） ----
create table car_model (
  id              bigint generated always as identity primary key,
  manufacturer_id bigint not null references manufacturer(id) on delete cascade,
  name_ja         text not null,
  name_en         text not null,
  slug            text not null,
  aliases         text[] not null default '{}',
  body_type       body_type not null,
  origin_country  text,
  year_from       int,
  year_to         int,
  summary_ja      text,
  depth_level     depth_level not null default 'breadth',
  completeness    smallint not null default 0,
  primary_source  source_type,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (manufacturer_id, slug)
);

-- ---- 世代（showcase のみぶら下がる） ----
create table generation (
  id            bigint generated always as identity primary key,
  car_model_id  bigint not null references car_model(id) on delete cascade,
  ordinal       int not null,
  code_name     text,
  name_ja       text,
  year_from     int not null,
  year_to       int,
  narrative_md  text,
  is_curated    boolean not null default false,
  primary_source source_type,
  unique (car_model_id, ordinal)
);

-- ---- グレード ----
create table grade (
  id            bigint generated always as identity primary key,
  generation_id bigint not null references generation(id) on delete cascade,
  name          text not null,
  drivetrain    text,
  transmission  text,
  primary_source source_type
);

-- ---- エンジン ----
create table engine (
  id              bigint generated always as identity primary key,
  code            text,
  displacement_cc int,
  cylinders       int,
  aspiration      text,
  fuel_type       text,
  max_power_ps    int,
  max_torque_nm   int,
  primary_source  source_type
);

-- ---- パーツ ----
create table part (
  id            bigint generated always as identity primary key,
  category      part_category not null,
  name_ja       text not null,
  name_en       text,
  spec_summary  text,
  detail_md     text,
  primary_source source_type
);

-- ---- 工場 ----
create table plant (
  id            bigint generated always as identity primary key,
  name          text not null,
  country_id    bigint references production_country(id),
  region        text,
  lat           double precision,
  lng           double precision,
  wmi           text,
  primary_source source_type
);

-- ---- 諸元（グレード or 世代に紐づく 1 項目） ----
create table spec_value (
  id               bigint generated always as identity primary key,
  grade_id         bigint references grade(id) on delete cascade,
  generation_id    bigint references generation(id) on delete cascade,
  spec_key         text not null,
  value_normalized double precision not null,
  value_display    text not null,
  unit             text not null,
  confidence       smallint not null default 50,
  check (grade_id is not null or generation_id is not null)
);

-- ---- 中間（N:N） ----
create table grade_engine (
  grade_id    bigint not null references grade(id) on delete cascade,
  engine_id   bigint not null references engine(id) on delete cascade,
  is_standard boolean not null default true,
  primary key (grade_id, engine_id)
);

create table grade_part (
  grade_id      bigint not null references grade(id) on delete cascade,
  part_id       bigint not null references part(id) on delete cascade,
  fitment_note  text,
  primary key (grade_id, part_id)
);

create table generation_plant (
  generation_id bigint not null references generation(id) on delete cascade,
  plant_id      bigint not null references plant(id) on delete cascade,
  year_from     int,
  year_to       int,
  primary key (generation_id, plant_id)
);

-- ---- 用語集 ----
create table term (
  id            bigint generated always as identity primary key,
  slug          text not null unique,
  term_ja       text not null,
  reading       text,
  definition_md text not null,
  primary_source source_type
);

-- ---- 出典（フィールド単位の出典を横断保持） ----
create table field_source (
  id           bigint generated always as identity primary key,
  entity_type  text not null,    -- 'grade' | 'generation' | 'generation_plant' ...
  entity_id    bigint not null,
  field_name   text not null,    -- 'horsepower' | 'plant' | 'displacement' ...
  source_type  source_type not null,
  source_url   text,
  source_ref   text,             -- vPIC variableId / Wikidata Qid・Pid
  license      text,             -- 'CC-BY-SA-4.0' | 'public-domain' | 'fair-use-fact'
  confidence   smallint not null default 50,
  retrieved_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (entity_type, entity_id, field_name)
);

-- ---- インデックス ----
create index idx_car_model_manufacturer on car_model (manufacturer_id);
create index idx_car_model_body_type    on car_model (body_type);
create index idx_car_model_depth        on car_model (depth_level);
create index idx_generation_model       on generation (car_model_id);
create index idx_grade_generation       on grade (generation_id);
create index idx_spec_value_lookup      on spec_value (spec_key, grade_id, generation_id);
create index idx_field_source_entity    on field_source (entity_type, entity_id);
