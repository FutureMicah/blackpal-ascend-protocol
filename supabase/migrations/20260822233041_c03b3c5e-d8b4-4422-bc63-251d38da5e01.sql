INSERT INTO public.contests (title, description, prize_btax, rules, is_active, starts_at, ends_at)
VALUES
('$10 Gauntlet',
 '78% of traders could not pass this. Prove them wrong and put your name on the record holder leaderboard.',
 1000,
 E'Entry: $10 equivalent in BTAX.\nObjective: +8% gain, max 4% drawdown, minimum 5 trading days.\nOnly 22% make it out. The other 78% blow the drawdown before day three.\nPass and you are locked into the record holder leaderboard permanently.',
 true, now(), now() + interval '30 days'),
('$50 Proving Ground',
 '9 out of 10 traders quit here. If your edge is real, this is where it shows — or where it dies.',
 5000,
 E'Entry: $50 equivalent in BTAX.\nObjective: +10% gain, max 5% drawdown, minimum 7 trading days.\n91% never reach the target. Most stop trying after the first red day.\nSurvivors are ranked publicly by profit factor.',
 true, now(), now() + interval '30 days'),
('$100 Record Run',
 'Only 3% have ever cleared this. Everyone talks — almost nobody holds the record. Take it.',
 10000,
 E'Entry: $100 equivalent in BTAX.\nObjective: +12% gain, max 6% drawdown, minimum 10 trading days.\n97% fail. The leaderboard remembers the 3%.\nTop finisher holds the record until someone beats it.',
 true, now(), now() + interval '30 days');