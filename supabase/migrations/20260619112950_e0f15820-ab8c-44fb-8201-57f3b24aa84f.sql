
CREATE TABLE IF NOT EXISTS public.btax_rules_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  entity_id uuid,
  entity_label text,
  field text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.btax_rules_audit TO authenticated;
GRANT ALL ON public.btax_rules_audit TO service_role;

ALTER TABLE public.btax_rules_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view BTAX rules audit"
ON public.btax_rules_audit FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert BTAX rules audit"
ON public.btax_rules_audit FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_btax_rules_audit_changed_at ON public.btax_rules_audit (changed_at DESC);

-- Trigger: academy_settings (BTAX fields only)
CREATE OR REPLACE FUNCTION public.log_academy_settings_btax_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF NEW.btax_to_naira_rate IS DISTINCT FROM OLD.btax_to_naira_rate THEN
    INSERT INTO public.btax_rules_audit(scope,field,old_value,new_value,changed_by,entity_label)
    VALUES('settings','btax_to_naira_rate',OLD.btax_to_naira_rate::text,NEW.btax_to_naira_rate::text,v_uid,'₦ per BTAX');
  END IF;
  IF NEW.btax_transfer_fee_percent IS DISTINCT FROM OLD.btax_transfer_fee_percent THEN
    INSERT INTO public.btax_rules_audit(scope,field,old_value,new_value,changed_by,entity_label)
    VALUES('settings','btax_transfer_fee_percent',OLD.btax_transfer_fee_percent::text,NEW.btax_transfer_fee_percent::text,v_uid,'Transfer fee %');
  END IF;
  IF NEW.btax_daily_transfer_cap IS DISTINCT FROM OLD.btax_daily_transfer_cap THEN
    INSERT INTO public.btax_rules_audit(scope,field,old_value,new_value,changed_by,entity_label)
    VALUES('settings','btax_daily_transfer_cap',OLD.btax_daily_transfer_cap::text,NEW.btax_daily_transfer_cap::text,v_uid,'Daily transfer cap');
  END IF;
  IF NEW.p2p_min_transfer IS DISTINCT FROM OLD.p2p_min_transfer THEN
    INSERT INTO public.btax_rules_audit(scope,field,old_value,new_value,changed_by,entity_label)
    VALUES('settings','p2p_min_transfer',OLD.p2p_min_transfer::text,NEW.p2p_min_transfer::text,v_uid,'Min transfer');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_academy_settings_btax ON public.academy_settings;
CREATE TRIGGER trg_log_academy_settings_btax
AFTER UPDATE ON public.academy_settings
FOR EACH ROW EXECUTE FUNCTION public.log_academy_settings_btax_changes();

-- Trigger: marketplace_items
CREATE OR REPLACE FUNCTION public.log_marketplace_item_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.btax_rules_audit(scope,entity_id,entity_label,field,old_value,new_value,changed_by)
    VALUES('marketplace_item',NEW.id,NEW.name,'created',NULL,NEW.btax_price::text,v_uid);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.btax_rules_audit(scope,entity_id,entity_label,field,old_value,new_value,changed_by)
    VALUES('marketplace_item',OLD.id,OLD.name,'deleted',OLD.btax_price::text,NULL,v_uid);
    RETURN OLD;
  END IF;
  IF NEW.btax_price IS DISTINCT FROM OLD.btax_price THEN
    INSERT INTO public.btax_rules_audit(scope,entity_id,entity_label,field,old_value,new_value,changed_by)
    VALUES('marketplace_item',NEW.id,NEW.name,'btax_price',OLD.btax_price::text,NEW.btax_price::text,v_uid);
  END IF;
  IF NEW.stock IS DISTINCT FROM OLD.stock THEN
    INSERT INTO public.btax_rules_audit(scope,entity_id,entity_label,field,old_value,new_value,changed_by)
    VALUES('marketplace_item',NEW.id,NEW.name,'stock',COALESCE(OLD.stock::text,'∞'),COALESCE(NEW.stock::text,'∞'),v_uid);
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    INSERT INTO public.btax_rules_audit(scope,entity_id,entity_label,field,old_value,new_value,changed_by)
    VALUES('marketplace_item',NEW.id,NEW.name,'is_active',OLD.is_active::text,NEW.is_active::text,v_uid);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_marketplace_item ON public.marketplace_items;
CREATE TRIGGER trg_log_marketplace_item
AFTER INSERT OR UPDATE OR DELETE ON public.marketplace_items
FOR EACH ROW EXECUTE FUNCTION public.log_marketplace_item_changes();
