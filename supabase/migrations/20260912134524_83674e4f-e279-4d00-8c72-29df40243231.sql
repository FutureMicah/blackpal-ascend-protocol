create or replace function public.profit_share_leaderboard(p_limit integer default 50)
returns table(
  user_id uuid,
  display_name text,
  avatar_url text,
  tier_name text,
  badge_icon text,
  total_pnl numeric,
  account_balance numeric,
  profit_split_percent numeric,
  trader_share numeric,
  platform_share numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.user_id,
    coalesce(p.display_name, 'Ascender') as display_name,
    p.avatar_url,
    t.tier_name,
    t.badge_icon,
    coalesce(a.total_pnl, 0) as total_pnl,
    coalesce(a.account_balance, 0) as account_balance,
    coalesce(t.profit_split_percent, 80) as profit_split_percent,
    round(greatest(coalesce(a.total_pnl, 0), 0) * coalesce(t.profit_split_percent, 80) / 100.0, 2) as trader_share,
    round(greatest(coalesce(a.total_pnl, 0), 0) * (100 - coalesce(t.profit_split_percent, 80)) / 100.0, 2) as platform_share
  from public.user_prop_accounts a
  join public.prop_tiers t on t.id = a.tier_id
  left join public.profiles p on p.id = a.user_id
  where coalesce(a.total_pnl, 0) <> 0
  order by coalesce(a.total_pnl, 0) desc
  limit greatest(1, least(coalesce(p_limit, 50), 200))
$$;

grant execute on function public.profit_share_leaderboard(integer) to authenticated;