
-- Allow public read on gd_submitted_numbers
CREATE POLICY "Allow public read submitted numbers" ON public.gd_submitted_numbers FOR SELECT USING (true);

-- Allow public read on gd_reset_history  
CREATE POLICY "Allow public read reset history" ON public.gd_reset_history FOR SELECT USING (true);

-- Allow public read on gd_users
CREATE POLICY "Allow public read users" ON public.gd_users FOR SELECT USING (true);

-- Allow public read on gd_settings
CREATE POLICY "Allow public read settings" ON public.gd_settings FOR SELECT USING (true);

-- Allow public read on gd_transactions
CREATE POLICY "Allow public read transactions" ON public.gd_transactions FOR SELECT USING (true);

-- Allow public read on gd_verification_pool
CREATE POLICY "Allow public read verification pool" ON public.gd_verification_pool FOR SELECT USING (true);

-- Allow public insert/update/delete on tables that need it
CREATE POLICY "Allow public insert users" ON public.gd_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update users" ON public.gd_users FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public insert transactions" ON public.gd_transactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public insert submitted numbers" ON public.gd_submitted_numbers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete submitted numbers" ON public.gd_submitted_numbers FOR DELETE USING (true);

CREATE POLICY "Allow public insert reset history" ON public.gd_reset_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public upsert settings" ON public.gd_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update settings" ON public.gd_settings FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public update verification pool" ON public.gd_verification_pool FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public insert verification pool" ON public.gd_verification_pool FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete verification pool" ON public.gd_verification_pool FOR DELETE USING (true);
