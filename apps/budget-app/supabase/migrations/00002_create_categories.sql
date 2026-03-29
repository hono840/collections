create table public.categories (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  icon text not null default 'circle',
  color text not null default '#6366f1',
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint categories_name_unique unique (user_id, name)
);

create index idx_categories_user_id on public.categories (user_id);
create index idx_categories_active on public.categories (user_id) where is_archived = false;

alter table public.categories enable row level security;

create policy "Users can view own categories"
  on public.categories for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert own categories"
  on public.categories for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own categories"
  on public.categories for update
  using ((select auth.uid()) = user_id);

create policy "Users can delete own categories"
  on public.categories for delete
  using ((select auth.uid()) = user_id);

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.update_updated_at();
