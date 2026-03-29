create or replace function public.get_monthly_summary(
  p_user_id uuid,
  p_month date
)
returns table (
  category_id uuid,
  category_name text,
  category_icon text,
  category_color text,
  total_spent bigint,
  budget_amount integer
) as $$
begin
  return query
  select
    c.id as category_id,
    c.name as category_name,
    c.icon as category_icon,
    c.color as category_color,
    coalesce(sum(t.amount), 0)::bigint as total_spent,
    coalesce(
      b_month.amount,
      b_template.amount,
      0
    ) as budget_amount
  from public.categories c
  left join public.transactions t
    on t.category_id = c.id
    and t.user_id = p_user_id
    and t.type = 'expense'
    and date_trunc('month', t.date) = date_trunc('month', p_month)
  left join public.budgets b_month
    on b_month.category_id = c.id
    and b_month.user_id = p_user_id
    and b_month.month = date_trunc('month', p_month)::date
  left join public.budgets b_template
    on b_template.category_id = c.id
    and b_template.user_id = p_user_id
    and b_template.month is null
  where c.user_id = p_user_id
    and c.is_archived = false
  group by c.id, c.name, c.icon, c.color, c.sort_order, b_month.amount, b_template.amount
  order by c.sort_order asc;
end;
$$ language plpgsql security definer;
