-- ============================================================
-- RLS: 公開リファレンスのため anon に SELECT のみ許可。
-- 書き込みは ETL(service_role, RLS バイパス) と将来 UGC のみ。
-- ============================================================

do $$
declare
  t text;
  public_tables text[] := array[
    'production_country', 'manufacturer', 'car_model', 'generation',
    'grade', 'engine', 'part', 'plant', 'spec_value',
    'grade_engine', 'grade_part', 'generation_plant', 'term', 'field_source'
  ];
begin
  foreach t in array public_tables loop
    execute format('alter table %I enable row level security;', t);
    execute format(
      'create policy %I on %I for select to anon, authenticated using (true);',
      t || '_public_read', t
    );
  end loop;
end $$;
