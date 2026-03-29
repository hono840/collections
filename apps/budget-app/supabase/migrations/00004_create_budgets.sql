create table public.budgets (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category_id uuid references public.categories on delete cascade not null,
  amount integer not null check (amount >= 0),
  month date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint budgets_unique unique (user_id, category_id, month)
);

create index idx_budgets_user_month on public.budgets (user_id, month);

alter table public.budgets enable row level security;

create policy "Users can view own budgets"
  on public.budgets for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert own budgets"
  on public.budgets for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own budgets"
  on public.budgets for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete own budgets"
  on public.budgets for delete
  using ((select auth.uid()) = user_id);

create trigger budgets_updated_at
  before update on public.budgets
  for each row execute function public.update_updated_at();
