
-- ===== Marketplace items =====
CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('boost','cosmetic','service','card')),
  btax_price numeric NOT NULL CHECK (btax_price >= 0),
  image_url text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  stock integer,
  per_user_limit integer,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.marketplace_items TO anon, authenticated;
GRANT ALL ON public.marketplace_items TO service_role;
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active items" ON public.marketplace_items FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage items" ON public.marketplace_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER marketplace_items_updated BEFORE UPDATE ON public.marketplace_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ===== XP ledger =====
CREATE TABLE IF NOT EXISTS public.xp_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  source text NOT NULL,
  source_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS xp_ledger_user_created_idx ON public.xp_ledger (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS xp_ledger_dedupe_idx ON public.xp_ledger (user_id, source, source_id) WHERE source_id IS NOT NULL;
GRANT SELECT ON public.xp_ledger TO authenticated;
GRANT ALL ON public.xp_ledger TO service_role;
ALTER TABLE public.xp_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own xp" ON public.xp_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ===== XP quests =====
CREATE TABLE IF NOT EXISTS public.xp_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_key text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  period text NOT NULL CHECK (period IN ('daily','weekly')),
  target integer NOT NULL CHECK (target > 0),
  xp_reward integer NOT NULL DEFAULT 0,
  btax_reward numeric NOT NULL DEFAULT 0,
  icon text,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.xp_quests TO authenticated;
GRANT ALL ON public.xp_quests TO service_role;
ALTER TABLE public.xp_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed-in reads active quests" ON public.xp_quests FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins manage quests" ON public.xp_quests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.xp_quest_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quest_id uuid NOT NULL REFERENCES public.xp_quests(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  claimed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_id, period_start)
);
GRANT SELECT, INSERT, UPDATE ON public.xp_quest_progress TO authenticated;
GRANT ALL ON public.xp_quest_progress TO service_role;
ALTER TABLE public.xp_quest_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own quest progress" ON public.xp_quest_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own quest progress" ON public.xp_quest_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own quest progress" ON public.xp_quest_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER xp_quest_progress_updated BEFORE UPDATE ON public.xp_quest_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ===== Extend xp_tier_config & academy_settings =====
ALTER TABLE public.xp_tier_config
  ADD COLUMN IF NOT EXISTS btax_reward numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unlock_feature text,
  ADD COLUMN IF NOT EXISTS cosmetic_reward jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.academy_settings
  ADD COLUMN IF NOT EXISTS btax_transfer_fee_percent numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS btax_daily_transfer_cap numeric NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS p2p_min_transfer numeric NOT NULL DEFAULT 1;

-- ===== award_xp helper =====
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id uuid, p_amount integer, p_source text, p_source_id uuid DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_amount = 0 THEN RETURN NULL; END IF;
  BEGIN
    INSERT INTO public.xp_ledger (user_id, amount, source, source_id, metadata)
    VALUES (p_user_id, p_amount, p_source, p_source_id, COALESCE(p_metadata, '{}'::jsonb))
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN NULL; -- dedupe by (user, source, source_id)
  END;
  UPDATE public.profiles
    SET xp_points = COALESCE(xp_points, 0) + p_amount
    WHERE id = p_user_id;
  RETURN v_id;
END $$;

-- ===== Trading XP trigger =====
CREATE OR REPLACE FUNCTION public.award_trading_xp_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid;
  v_pnl numeric;
  v_win boolean;
  v_today_wins int;
BEGIN
  -- Fire only on close transition
  IF (TG_OP = 'INSERT' AND NEW.status = 'closed') OR
     (TG_OP = 'UPDATE' AND NEW.status = 'closed' AND COALESCE(OLD.status,'') <> 'closed') THEN
    v_user := NEW.user_id;
    v_pnl := COALESCE(NEW.profit_loss,0) + COALESCE(NEW.commission,0) + COALESCE(NEW.swap,0);
    v_win := v_pnl > 0;
    PERFORM public.award_xp(v_user, 10, 'trade_closed', NEW.id);
    IF v_win THEN
      PERFORM public.award_xp(v_user, 25, 'trade_won', NEW.id);
      SELECT count(*) INTO v_today_wins
        FROM public.prop_trades
        WHERE user_id = v_user
          AND status = 'closed'
          AND COALESCE(profit_loss,0)+COALESCE(commission,0)+COALESCE(swap,0) > 0
          AND closed_at::date = (now() AT TIME ZONE 'UTC')::date;
      IF v_today_wins >= 3 THEN
        PERFORM public.award_xp(v_user, 50, 'win_streak_day',
          (md5(v_user::text || (now() AT TIME ZONE 'UTC')::date::text || 'streak'))::uuid);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS prop_trades_award_xp ON public.prop_trades;
CREATE TRIGGER prop_trades_award_xp AFTER INSERT OR UPDATE ON public.prop_trades
  FOR EACH ROW EXECUTE FUNCTION public.award_trading_xp_trg();

-- ===== Phase-pass XP on user_prop_accounts =====
CREATE OR REPLACE FUNCTION public.award_phase_pass_xp_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'passed' AND COALESCE(OLD.status,'') <> 'passed' THEN
    PERFORM public.award_xp(NEW.user_id, 500, 'phase_passed', NEW.id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS prop_accounts_award_phase_xp ON public.user_prop_accounts;
CREATE TRIGGER prop_accounts_award_phase_xp AFTER UPDATE ON public.user_prop_accounts
  FOR EACH ROW EXECUTE FUNCTION public.award_phase_pass_xp_trg();

-- ===== Level-up reward trigger =====
CREATE OR REPLACE FUNCTION public.apply_level_rewards_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_level int;
  v_old_level int := COALESCE(OLD.rank_level, 0);
  v_tier RECORD;
  v_wallet public.wallets%ROWTYPE;
  v_rate numeric;
BEGIN
  IF NEW.xp_points = COALESCE(OLD.xp_points,0) THEN RETURN NEW; END IF;
  SELECT COALESCE(MAX(tier_level), v_old_level) INTO v_new_level
    FROM public.xp_tier_config
    WHERE COALESCE(xp_required,0) <= COALESCE(NEW.xp_points,0) AND is_active = true;
  IF v_new_level > v_old_level THEN
    NEW.rank_level := v_new_level;
    FOR v_tier IN SELECT * FROM public.xp_tier_config
      WHERE tier_level > v_old_level AND tier_level <= v_new_level AND is_active = true
      ORDER BY tier_level
    LOOP
      IF v_tier.btax_reward > 0 THEN
        SELECT * INTO v_wallet FROM public.wallets WHERE user_id = NEW.id;
        IF FOUND THEN
          SELECT btax_to_naira_rate INTO v_rate FROM public.academy_settings LIMIT 1;
          UPDATE public.wallets
            SET btax_balance = btax_balance + v_tier.btax_reward,
                btax_earned_total = btax_earned_total + v_tier.btax_reward
            WHERE id = v_wallet.id;
          INSERT INTO public.wallet_transactions (wallet_id, type, btax_amount, naira_amount, description, status)
          VALUES (v_wallet.id, 'reward', v_tier.btax_reward,
                  round(v_tier.btax_reward * COALESCE(v_rate, 100), 2),
                  'Level ' || v_tier.tier_level || ' reward — ' || v_tier.tier_name, 'completed');
        END IF;
      END IF;
      INSERT INTO public.in_app_notifications (user_id, title, message, type, icon, action_url)
      VALUES (NEW.id, 'Level up — ' || v_tier.tier_name,
              'You reached level ' || v_tier.tier_level || '.' ||
              CASE WHEN v_tier.btax_reward > 0 THEN ' +' || v_tier.btax_reward::text || ' BTAX credited.' ELSE '' END ||
              CASE WHEN v_tier.unlock_feature IS NOT NULL THEN ' Unlocked: ' || v_tier.unlock_feature || '.' ELSE '' END,
              'success','🏆','/profile');
    END LOOP;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_apply_level_rewards ON public.profiles;
CREATE TRIGGER profiles_apply_level_rewards BEFORE UPDATE OF xp_points ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.apply_level_rewards_trg();

-- ===== transfer_btax =====
CREATE OR REPLACE FUNCTION public.transfer_btax(p_recipient uuid, p_amount numeric, p_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sender uuid := auth.uid();
  v_sender_wallet public.wallets%ROWTYPE;
  v_recipient_wallet public.wallets%ROWTYPE;
  v_settings public.academy_settings%ROWTYPE;
  v_fee numeric;
  v_net numeric;
  v_rate numeric;
  v_today_total numeric;
  v_tx_id uuid;
BEGIN
  IF v_sender IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_sender = p_recipient THEN RAISE EXCEPTION 'Cannot send to yourself'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than 0'; END IF;

  SELECT * INTO v_settings FROM public.academy_settings LIMIT 1;
  IF p_amount < COALESCE(v_settings.p2p_min_transfer, 1) THEN
    RAISE EXCEPTION 'Minimum transfer is % BTAX', COALESCE(v_settings.p2p_min_transfer,1);
  END IF;

  SELECT COALESCE(SUM(btax_amount),0) INTO v_today_total
    FROM public.wallet_transactions wt
    JOIN public.wallets w ON w.id = wt.wallet_id
    WHERE w.user_id = v_sender
      AND wt.type = 'transfer_out'
      AND wt.created_at::date = (now() AT TIME ZONE 'UTC')::date;
  IF v_today_total + p_amount > COALESCE(v_settings.btax_daily_transfer_cap, 50000) THEN
    RAISE EXCEPTION 'Daily transfer cap reached (% BTAX)', v_settings.btax_daily_transfer_cap;
  END IF;

  v_fee := round(p_amount * COALESCE(v_settings.btax_transfer_fee_percent,0) / 100.0, 2);
  v_net := p_amount - v_fee;
  v_rate := COALESCE(v_settings.btax_to_naira_rate, 100);

  SELECT * INTO v_sender_wallet FROM public.wallets WHERE user_id = v_sender FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sender wallet missing'; END IF;
  IF v_sender_wallet.status <> 'active' THEN RAISE EXCEPTION 'Wallet inactive'; END IF;
  IF v_sender_wallet.btax_balance < p_amount THEN RAISE EXCEPTION 'Insufficient BTAX'; END IF;

  SELECT * INTO v_recipient_wallet FROM public.wallets WHERE user_id = p_recipient FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recipient wallet not found'; END IF;

  UPDATE public.wallets SET btax_balance = btax_balance - p_amount,
         btax_spent_total = btax_spent_total + p_amount
    WHERE id = v_sender_wallet.id;
  UPDATE public.wallets SET btax_balance = btax_balance + v_net,
         btax_earned_total = btax_earned_total + v_net
    WHERE id = v_recipient_wallet.id;
  IF v_fee > 0 THEN
    UPDATE public.academy_settings SET operations_pool_balance = operations_pool_balance + round(v_fee * v_rate, 2);
  END IF;

  INSERT INTO public.wallet_transactions (wallet_id, type, btax_amount, naira_amount, description, status)
  VALUES (v_sender_wallet.id, 'transfer_out', p_amount, round(p_amount * v_rate, 2),
          COALESCE('To ' || (SELECT display_name FROM public.profiles WHERE id = p_recipient), 'P2P transfer') ||
          CASE WHEN p_note IS NOT NULL AND length(p_note) > 0 THEN ' — ' || p_note ELSE '' END, 'completed')
  RETURNING id INTO v_tx_id;
  INSERT INTO public.wallet_transactions (wallet_id, type, btax_amount, naira_amount, description, status)
  VALUES (v_recipient_wallet.id, 'transfer_in', v_net, round(v_net * v_rate, 2),
          COALESCE('From ' || (SELECT display_name FROM public.profiles WHERE id = v_sender), 'P2P transfer') ||
          CASE WHEN p_note IS NOT NULL AND length(p_note) > 0 THEN ' — ' || p_note ELSE '' END, 'completed');

  INSERT INTO public.in_app_notifications (user_id, title, message, type, icon, action_url)
  VALUES (p_recipient, 'You received BTAX',
          'Received ' || v_net::text || ' BTAX from ' ||
          COALESCE((SELECT display_name FROM public.profiles WHERE id = v_sender), 'a trader') ||
          CASE WHEN p_note IS NOT NULL AND length(p_note) > 0 THEN ' — ' || p_note ELSE '' END,
          'success', '💎', '/wallet');

  RETURN v_tx_id;
END $$;

-- ===== marketplace_purchase =====
CREATE OR REPLACE FUNCTION public.marketplace_purchase(p_item_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_item public.marketplace_items%ROWTYPE;
  v_tx uuid;
  v_owned int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_item FROM public.marketplace_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND OR NOT v_item.is_active THEN RAISE EXCEPTION 'Item unavailable'; END IF;
  IF v_item.stock IS NOT NULL AND v_item.stock <= 0 THEN RAISE EXCEPTION 'Out of stock'; END IF;
  IF v_item.per_user_limit IS NOT NULL THEN
    SELECT count(*) INTO v_owned FROM public.purchases WHERE user_id = v_user AND product_id = v_item.id;
    IF v_owned >= v_item.per_user_limit THEN RAISE EXCEPTION 'Purchase limit reached'; END IF;
  END IF;

  v_tx := public.spend_wallet(v_item.btax_price, p_item_id::text, 'Marketplace: ' || v_item.name);

  INSERT INTO public.purchases (user_id, product_id, amount, status, reference)
  VALUES (v_user, v_item.id, v_item.btax_price, 'completed', v_tx::text);

  IF v_item.stock IS NOT NULL THEN
    UPDATE public.marketplace_items SET stock = GREATEST(0, stock - 1) WHERE id = v_item.id;
  END IF;

  INSERT INTO public.in_app_notifications (user_id, title, message, type, icon, action_url)
  VALUES (v_user, 'Purchase confirmed', 'You bought ' || v_item.name || ' for ' || v_item.btax_price::text || ' BTAX.',
          'success', '🛒', '/marketplace');

  RETURN v_tx;
END $$;

-- ===== claim_quest =====
CREATE OR REPLACE FUNCTION public.claim_quest(p_progress_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_prog public.xp_quest_progress%ROWTYPE;
  v_quest public.xp_quests%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_rate numeric;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_prog FROM public.xp_quest_progress WHERE id = p_progress_id FOR UPDATE;
  IF NOT FOUND OR v_prog.user_id <> v_user THEN RAISE EXCEPTION 'Quest not found'; END IF;
  IF v_prog.claimed_at IS NOT NULL THEN RAISE EXCEPTION 'Already claimed'; END IF;
  SELECT * INTO v_quest FROM public.xp_quests WHERE id = v_prog.quest_id;
  IF v_prog.progress < v_quest.target THEN RAISE EXCEPTION 'Quest not complete'; END IF;
  UPDATE public.xp_quest_progress SET claimed_at = now(), completed_at = COALESCE(completed_at, now())
    WHERE id = p_progress_id;
  IF v_quest.xp_reward > 0 THEN
    PERFORM public.award_xp(v_user, v_quest.xp_reward, 'quest', p_progress_id, jsonb_build_object('quest_key', v_quest.quest_key));
  END IF;
  IF v_quest.btax_reward > 0 THEN
    SELECT * INTO v_wallet FROM public.wallets WHERE user_id = v_user;
    IF FOUND THEN
      SELECT btax_to_naira_rate INTO v_rate FROM public.academy_settings LIMIT 1;
      UPDATE public.wallets SET btax_balance = btax_balance + v_quest.btax_reward,
             btax_earned_total = btax_earned_total + v_quest.btax_reward WHERE id = v_wallet.id;
      INSERT INTO public.wallet_transactions (wallet_id, type, btax_amount, naira_amount, description, status)
      VALUES (v_wallet.id, 'reward', v_quest.btax_reward, round(v_quest.btax_reward * COALESCE(v_rate,100),2),
              'Quest reward: ' || v_quest.title, 'completed');
    END IF;
  END IF;
END $$;

-- ===== Seed quests =====
INSERT INTO public.xp_quests (quest_key, title, description, period, target, xp_reward, btax_reward, icon, category, sort_order)
VALUES
  ('daily_trade', 'Take a trade today', 'Open and close at least one trade today.', 'daily', 1, 50, 5, '📈', 'trading', 1),
  ('daily_journal', 'Write a journal entry', 'Reflect on your trading day.', 'daily', 1, 30, 3, '📓', 'discipline', 2),
  ('daily_login', 'Daily check-in', 'Sign in to keep your streak alive.', 'daily', 1, 10, 1, '✨', 'engagement', 3),
  ('weekly_wins', 'Win 5 trades this week', 'Close five profitable trades.', 'weekly', 5, 250, 25, '🏆', 'trading', 10),
  ('weekly_consistency', 'Trade on 4 days', 'Be active across at least four days.', 'weekly', 4, 200, 20, '🔥', 'discipline', 11)
ON CONFLICT (quest_key) DO NOTHING;

-- ===== Seed sample marketplace items =====
INSERT INTO public.marketplace_items (slug, name, description, category, btax_price, image_url, payload, sort_order)
VALUES
  ('xp-boost-24h', 'XP Boost · 24h', 'Double XP from trades for 24 hours.', 'boost', 200, NULL, '{"type":"xp_multiplier","multiplier":2,"hours":24}'::jsonb, 1),
  ('streak-shield', 'Streak Shield', 'Skip one missed day without losing your streak.', 'boost', 150, NULL, '{"type":"streak_shield"}'::jsonb, 2),
  ('starter-sticker-pack', 'Starter Sticker Pack', '10 chat stickers to flex your style.', 'cosmetic', 100, NULL, '{"type":"sticker_pack","slug":"starter"}'::jsonb, 3),
  ('neon-profile-theme', 'Neon Profile Theme', 'Cyberpunk-inspired profile background.', 'cosmetic', 350, NULL, '{"type":"profile_theme","slug":"neon"}'::jsonb, 4),
  ('lottery-spin', 'Lottery Spin', 'One bonus daily lottery spin.', 'card', 50, NULL, '{"type":"lottery_spin","count":1}'::jsonb, 5),
  ('mentor-15min', '15-min Mentor Slot', 'Priority booking with a mentor.', 'service', 1500, NULL, '{"type":"mentor_credit","minutes":15}'::jsonb, 6)
ON CONFLICT (slug) DO NOTHING;

-- ===== Realtime =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.xp_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE public.xp_quest_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;
