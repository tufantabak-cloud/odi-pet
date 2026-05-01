-- RLS fix for vaccine_records, health_schedules, and payments

DROP POLICY IF EXISTS "Owners manage vaccine records" ON public.vaccine_records;
CREATE POLICY "Owners manage vaccine records" ON public.vaccine_records
  FOR ALL USING (public.user_has_pet_access(pet_id));

DROP POLICY IF EXISTS "Owners manage health schedules" ON public.health_schedules;
CREATE POLICY "Owners manage health schedules" ON public.health_schedules
  FOR ALL USING (public.user_has_pet_access(pet_id));

DROP POLICY IF EXISTS "Owners manage payments" ON public.payments;
CREATE POLICY "Owners manage payments" ON public.payments
  FOR ALL USING (public.user_has_pet_access(pet_id));

DROP POLICY IF EXISTS "Owners manage care plans" ON public.care_plans;
CREATE POLICY "Owners manage care plans" ON public.care_plans
  FOR ALL USING (public.user_has_pet_access(pet_id));
