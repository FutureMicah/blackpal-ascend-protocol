-- Assign super_admin role to futuremicah4@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::app_role
FROM auth.users u
WHERE u.email = 'futuremicah4@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE u.email = 'futuremicah4@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Create admin_staff table
CREATE TABLE IF NOT EXISTS public.admin_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  department text NOT NULL DEFAULT 'general',
  title text,
  permissions jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  assigned_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.admin_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view staff" ON public.admin_staff
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage staff" ON public.admin_staff
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb DEFAULT '{}',
  updated_by uuid,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only super admins can modify settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Allow admins to update payments
CREATE POLICY "Admins can update payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Allow admins to update profiles for activation  
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Enable realtime for admin_broadcasts
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_staff;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;