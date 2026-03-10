
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload payment proofs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own payment proofs" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all payment proofs" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));
