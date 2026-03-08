
-- Create users table
CREATE TABLE public.gd_users (
  id SERIAL PRIMARY KEY,
  guest_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  balance INTEGER NOT NULL DEFAULT 0,
  key_count INTEGER NOT NULL DEFAULT 0,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  payment_status TEXT NOT NULL DEFAULT 'none',
  payment_scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create settings table
CREATE TABLE public.gd_settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
);

-- Create verification pool table
CREATE TABLE public.gd_verification_pool (
  id SERIAL PRIMARY KEY,
  private_key TEXT NOT NULL,
  verify_url TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  added_by TEXT NOT NULL DEFAULT 'Unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create submitted numbers table
CREATE TABLE public.gd_submitted_numbers (
  id SERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL,
  verified_count INTEGER NOT NULL DEFAULT 0,
  submitted_by TEXT NOT NULL DEFAULT 'Unknown',
  payment_number TEXT,
  payment_method TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create reset history table
CREATE TABLE public.gd_reset_history (
  id SERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL,
  verified_count INTEGER NOT NULL DEFAULT 0,
  submitted_by TEXT NOT NULL DEFAULT 'Unknown',
  payment_number TEXT,
  payment_method TEXT,
  reset_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.gd_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.gd_users(id),
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.gd_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_verification_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_submitted_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_reset_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gd_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow all access (edge functions use service_role key)
CREATE POLICY "Allow all for service role" ON public.gd_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON public.gd_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON public.gd_verification_pool FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON public.gd_submitted_numbers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON public.gd_reset_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON public.gd_transactions FOR ALL USING (true) WITH CHECK (true);

-- Insert default settings
INSERT INTO public.gd_settings (key, value) VALUES ('rewardRate', '40');
INSERT INTO public.gd_settings (key, value) VALUES ('buyStatus', 'on');
INSERT INTO public.gd_settings (key, value) VALUES ('bonusStatus', 'off');
INSERT INTO public.gd_settings (key, value) VALUES ('bonusTarget', '10');

-- Create indexes
CREATE INDEX idx_gd_users_guest_id ON public.gd_users(guest_id);
CREATE INDEX idx_gd_transactions_user_id ON public.gd_transactions(user_id);
CREATE INDEX idx_gd_verification_pool_is_used ON public.gd_verification_pool(is_used);
