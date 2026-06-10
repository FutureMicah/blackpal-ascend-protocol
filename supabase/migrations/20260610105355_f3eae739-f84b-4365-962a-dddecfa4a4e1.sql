
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='user_prop_accounts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_prop_accounts;
  END IF;
END $$;

ALTER TABLE public.user_prop_accounts REPLICA IDENTITY FULL;
