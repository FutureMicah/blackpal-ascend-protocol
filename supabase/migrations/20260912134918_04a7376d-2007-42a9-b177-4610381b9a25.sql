alter table public.user_prop_accounts
  add column if not exists account_rules text,
  add column if not exists mt5_password text,
  add column if not exists admin_message text,
  add column if not exists credentials_sent_at timestamp with time zone,
  add column if not exists contest_id uuid references public.contests(id) on delete set null;

create index if not exists idx_user_prop_accounts_contest on public.user_prop_accounts(contest_id);