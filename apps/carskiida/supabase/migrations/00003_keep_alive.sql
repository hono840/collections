-- ============================================================
-- Supabase Free の自動一時停止（1週間 API 無アクセスで停止）を回避するための
-- keep-alive 関数。外部 cron（GitHub Actions schedule 等）から毎日 1 回呼ぶ。
-- 参照: docs/finance/carskiida-costs.md §4（最優先の最適化）
-- ============================================================

create or replace function public.keep_alive()
returns json
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return json_build_object(
    'status', 'alive',
    'pinged_at', now()
  );
end;
$$;

-- GitHub Actions が anon キーで叩くため EXECUTE を明示付与
revoke all on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon;
