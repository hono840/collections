create or replace function public.keep_alive()
returns json as $$
begin
  return json_build_object(
    'status', 'alive',
    'pinged_at', now()
  );
end;
$$ language plpgsql security invoker;
