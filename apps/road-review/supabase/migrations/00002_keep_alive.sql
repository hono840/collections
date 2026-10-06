-- =========================================================
-- road-review Sprint 1: keep-alive ping (architecture ch.3.4)
-- Called by .github/workflows/supabase-keep-alive.yml with the anon key
-- so the free-tier project is not paused for inactivity. Touches no tables.
-- =========================================================
create or replace function public.keep_alive()
returns json
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return json_build_object('status', 'alive', 'pinged_at', now());
end;
$$;

-- Functions are executable by PUBLIC by default; grant only the API roles (S-8).
revoke execute on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated;
