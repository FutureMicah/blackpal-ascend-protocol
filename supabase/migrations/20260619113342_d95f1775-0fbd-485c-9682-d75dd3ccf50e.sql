
ALTER TABLE public.btax_rules_audit ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.btax_rules_audit ADD COLUMN IF NOT EXISTS rolled_back_from uuid REFERENCES public.btax_rules_audit(id) ON DELETE SET NULL;

-- Refresh trigger functions to read reason from a session-local GUC
CREATE OR REPLACE FUNCTION public.log_academy_settings_btax_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_reason text := NULLIF(current_setting('app.audit_reason', true), '');
BEGIN
  IF NEW.btax_to_naira_rate IS DISTINCT FROM OLD.btax_to_naira_rate THEN
    INSERT INTO public.btax_rules_audit(scope,field,old_value,new_value,changed_by,entity_label,reason)
    VALUES('settings','btax_to_naira_rate',OLD.btax_to_naira_rate::text,NEW.btax_to_naira_rate::text,v_uid,'₦ per BTAX',v_reason);
  END IF;
  IF NEW.btax_transfer_fee_percent IS DISTINCT FROM OLD.btax_transfer_fee_percent THEN
    INSERT INTO public.btax_rules_audit(scope,field,old_value,new_value,changed_by,entity_label,reason)
    VALUES('settings','btax_transfer_fee_percent',OLD.btax_transfer_fee_percent::text,NEW.btax_transfer_fee_percent::text,v_uid,'Transfer fee %',v_reason);
  END IF;
  IF NEW.btax_daily_transfer_cap IS DISTINCT FROM OLD.btax_daily_transfer_cap THEN
    INSERT INTO public.btax_rules_audit(scope,field,old_value,new_value,changed_by,entity_label,reason)
    VALUES('settings','btax_daily_transfer_cap',OLD.btax_daily_transfer_cap::text,NEW.btax_daily_transfer_cap::text,v_uid,'Daily transfer cap',v_reason);
  END IF;
  IF NEW.p2p_min_transfer IS DISTINCT FROM OLD.p2p_min_transfer THEN
    INSERT INTO public.btax_rules_audit(scope,field,old_value,new_value,changed_by,entity_label,reason)
    VALUES('settings','p2p_min_transfer',OLD.p2p_min_transfer::text,NEW.p2p_min_transfer::text,v_uid,'Min transfer',v_reason);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.log_marketplace_item_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_reason text := NULLIF(current_setting('app.audit_reason', true), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.btax_rules_audit(scope,entity_id,entity_label,field,old_value,new_value,changed_by,reason)
    VALUES('marketplace_item',NEW.id,NEW.name,'created',NULL,NEW.btax_price::text,v_uid,v_reason);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.btax_rules_audit(scope,entity_id,entity_label,field,old_value,new_value,changed_by,reason)
    VALUES('marketplace_item',OLD.id,OLD.name,'deleted',OLD.btax_price::text,NULL,v_uid,v_reason);
    RETURN OLD;
  END IF;
  IF NEW.btax_price IS DISTINCT FROM OLD.btax_price THEN
    INSERT INTO public.btax_rules_audit(scope,entity_id,entity_label,field,old_value,new_value,changed_by,reason)
    VALUES('marketplace_item',NEW.id,NEW.name,'btax_price',OLD.btax_price::text,NEW.btax_price::text,v_uid,v_reason);
  END IF;
  IF NEW.stock IS DISTINCT FROM OLD.stock THEN
    INSERT INTO public.btax_rules_audit(scope,entity_id,entity_label,field,old_value,new_value,changed_by,reason)
    VALUES('marketplace_item',NEW.id,NEW.name,'stock',COALESCE(OLD.stock::text,'∞'),COALESCE(NEW.stock::text,'∞'),v_uid,v_reason);
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    INSERT INTO public.btax_rules_audit(scope,entity_id,entity_label,field,old_value,new_value,changed_by,reason)
    VALUES('marketplace_item',NEW.id,NEW.name,'is_active',OLD.is_active::text,NEW.is_active::text,v_uid,v_reason);
  END IF;
  RETURN NEW;
END $$;

-- Admin notification trigger: notify every admin/super_admin
CREATE OR REPLACE FUNCTION public.notify_admins_on_btax_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid;
  v_actor text;
  v_msg text;
BEGIN
  SELECT COALESCE(display_name, email, 'An admin') INTO v_actor
    FROM public.profiles WHERE id = NEW.changed_by;
  v_msg := COALESCE(NEW.entity_label, NEW.field) || ': ' ||
           COALESCE(NEW.old_value,'—') || ' → ' || COALESCE(NEW.new_value,'—') ||
           CASE WHEN NEW.reason IS NOT NULL THEN ' (' || NEW.reason || ')' ELSE '' END;
  FOR v_admin IN
    SELECT user_id FROM public.user_roles
    WHERE role IN ('admin','super_admin')
  LOOP
    INSERT INTO public.in_app_notifications (user_id, title, message, type, icon, action_url)
    VALUES (v_admin,
            'BTAX rule changed by ' || COALESCE(v_actor,'admin'),
            v_msg, 'info', '💱', '/admin');
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_admins_btax_audit ON public.btax_rules_audit;
CREATE TRIGGER trg_notify_admins_btax_audit
AFTER INSERT ON public.btax_rules_audit
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_btax_audit();

-- RPC: update BTAX rules with reason
CREATE OR REPLACE FUNCTION public.update_btax_rules(
  p_rate numeric, p_fee_pct numeric, p_daily_cap numeric, p_min_transfer numeric, p_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  PERFORM set_config('app.audit_reason', COALESCE(p_reason,''), true);
  UPDATE public.academy_settings
    SET btax_to_naira_rate = p_rate,
        btax_transfer_fee_percent = p_fee_pct,
        btax_daily_transfer_cap = p_daily_cap,
        p2p_min_transfer = p_min_transfer;
END $$;

-- RPC: update marketplace item with reason
CREATE OR REPLACE FUNCTION public.update_marketplace_item(
  p_id uuid, p_price numeric, p_stock integer, p_is_active boolean, p_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  PERFORM set_config('app.audit_reason', COALESCE(p_reason,''), true);
  UPDATE public.marketplace_items
    SET btax_price = p_price,
        stock = p_stock,
        is_active = p_is_active
    WHERE id = p_id;
END $$;

-- RPC: rollback an audit entry by restoring old_value to its source
CREATE OR REPLACE FUNCTION public.rollback_btax_audit(p_audit_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.btax_rules_audit%ROWTYPE;
  v_reason text;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO v_row FROM public.btax_rules_audit WHERE id = p_audit_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Audit entry not found'; END IF;
  IF v_row.old_value IS NULL THEN RAISE EXCEPTION 'No previous value to restore'; END IF;

  v_reason := 'Rollback: ' || COALESCE(p_reason, 'restored to previous value');
  PERFORM set_config('app.audit_reason', v_reason, true);

  IF v_row.scope = 'settings' THEN
    IF v_row.field = 'btax_to_naira_rate' THEN
      UPDATE public.academy_settings SET btax_to_naira_rate = v_row.old_value::numeric;
    ELSIF v_row.field = 'btax_transfer_fee_percent' THEN
      UPDATE public.academy_settings SET btax_transfer_fee_percent = v_row.old_value::numeric;
    ELSIF v_row.field = 'btax_daily_transfer_cap' THEN
      UPDATE public.academy_settings SET btax_daily_transfer_cap = v_row.old_value::numeric;
    ELSIF v_row.field = 'p2p_min_transfer' THEN
      UPDATE public.academy_settings SET p2p_min_transfer = v_row.old_value::numeric;
    ELSE RAISE EXCEPTION 'Unknown settings field';
    END IF;
  ELSIF v_row.scope = 'marketplace_item' THEN
    IF v_row.entity_id IS NULL THEN RAISE EXCEPTION 'Item id missing'; END IF;
    IF v_row.field = 'btax_price' THEN
      UPDATE public.marketplace_items SET btax_price = v_row.old_value::numeric WHERE id = v_row.entity_id;
    ELSIF v_row.field = 'stock' THEN
      UPDATE public.marketplace_items
        SET stock = CASE WHEN v_row.old_value = '∞' THEN NULL ELSE v_row.old_value::integer END
        WHERE id = v_row.entity_id;
    ELSIF v_row.field = 'is_active' THEN
      UPDATE public.marketplace_items SET is_active = (v_row.old_value = 'true') WHERE id = v_row.entity_id;
    ELSE RAISE EXCEPTION 'Field cannot be rolled back';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unknown scope';
  END IF;

  -- Tag the most recent audit entry as a rollback of the original
  UPDATE public.btax_rules_audit
    SET rolled_back_from = p_audit_id
    WHERE id = (SELECT id FROM public.btax_rules_audit ORDER BY changed_at DESC LIMIT 1);
END $$;

REVOKE EXECUTE ON FUNCTION public.update_btax_rules(numeric,numeric,numeric,numeric,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_marketplace_item(uuid,numeric,integer,boolean,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rollback_btax_audit(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_btax_rules(numeric,numeric,numeric,numeric,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_marketplace_item(uuid,numeric,integer,boolean,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_btax_audit(uuid,text) TO authenticated;
