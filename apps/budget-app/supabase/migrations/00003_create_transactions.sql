create type public.transaction_type as enum ('expense', 'income');

create table public.transactions (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category_id uuid references public.categories on delete set null,
  type public.transaction_type not null default 'expense',
  amount integer not null check (amount > 0),
  date date not null default current_date,
  note text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_transactions_user_date on public.transactions (user_id, date desc);
create index idx_transactions_user_category on public.transactions (user_id, category_id);
create index idx_transactions_user_month on public.transactions (user_id, date_trunc('month', date));
create index idx_transactions_note_search on public.transactions using gin (to_tsvector('simple', coalesce(note, '')));

alter table public.transactions enable row level security;

create policy "Users can view own transactions"
  on public.transactions for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own transactions"
  on public.transactions for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete own transactions"
  on public.transactions for delete
  using ((select auth.uid()) = user_id);

create trigger transactions_updated_at
  before update on public.transactions
  for each row execute function public.update_updated_at();
