-- Seed default categories for a user
-- This is called after user creation via the handle_new_user trigger
-- For now, we create a function that seeds categories for a given user

create or replace function public.seed_default_categories(p_user_id uuid)
returns void as $$
begin
  insert into public.categories (user_id, name, icon, color, sort_order, is_default) values
    (p_user_id, '食費', 'utensils', '#ef4444', 0, true),
    (p_user_id, '交通費', 'car', '#f97316', 1, true),
    (p_user_id, '住居費', 'home', '#eab308', 2, true),
    (p_user_id, '光熱費', 'zap', '#84cc16', 3, true),
    (p_user_id, '娯楽費', 'gamepad-2', '#22c55e', 4, true),
    (p_user_id, '買い物', 'shopping-bag', '#14b8a6', 5, true),
    (p_user_id, '医療費', 'heart-pulse', '#06b6d4', 6, true),
    (p_user_id, '教育費', 'graduation-cap', '#3b82f6', 7, true),
    (p_user_id, '個人費', 'user', '#6366f1', 8, true),
    (p_user_id, '贈答費', 'gift', '#8b5cf6', 9, true),
    (p_user_id, '旅行費', 'plane', '#a855f7', 10, true),
    (p_user_id, 'その他', 'circle', '#64748b', 11, true);
end;
$$ language plpgsql security definer;

-- Update handle_new_user to also seed categories
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  );
  perform public.seed_default_categories(new.id);
  return new;
end;
$$ language plpgsql security definer;
