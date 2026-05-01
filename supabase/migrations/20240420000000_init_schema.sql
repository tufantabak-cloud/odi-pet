-- ENUMS
CREATE TYPE user_role AS ENUM ('owner', 'clinic_staff', 'clinic_admin', 'super_admin');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- 1. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role user_role DEFAULT 'owner'::user_role NOT NULL,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. CLINICS TABLE
CREATE TABLE public.clinics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- 3. CLINIC MEMBERSHIPS
CREATE TABLE public.clinic_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, clinic_id)
);
ALTER TABLE public.clinic_memberships ENABLE ROW LEVEL SECURITY;

-- 4. PETS
CREATE TABLE public.pets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL,
  breed TEXT,
  birth_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- 5. CARE PLANS
CREATE TABLE public.care_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;

-- 6. APPOINTMENTS
CREATE TABLE public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status appointment_status DEFAULT 'pending'::appointment_status,
  owner_reason TEXT,
  vet_notes TEXT, -- RLS ile gizlenecek
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 7. NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =====================================
-- POLICIES (ROW LEVEL SECURITY)
-- =====================================

-- Profiles: Own profile
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

-- Clinic Memberships: Self memberships
CREATE POLICY "Staff can view their memberships" ON public.clinic_memberships FOR SELECT USING (auth.uid() = profile_id);

-- Clinics: Public read
CREATE POLICY "Anyone can view clinics" ON public.clinics FOR SELECT USING (true);

-- Pets: Owners
CREATE POLICY "Owners can view their own pets" ON public.pets FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert their own pets" ON public.pets FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their own pets" ON public.pets FOR UPDATE USING (auth.uid() = owner_id);

-- Pets: Clinic Staff (Can see pets if they have appointment in staff's clinic)
CREATE POLICY "Clinic staff can view pets with appointments in their clinic" ON public.pets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.appointments a
    JOIN public.clinic_memberships cm ON a.clinic_id = cm.clinic_id
    WHERE a.pet_id = pets.id AND cm.profile_id = auth.uid()
  )
);

-- Appointments: Owners
CREATE POLICY "Owners can view their pet's appointments" ON public.appointments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);

-- Appointments: Clinic Staff
CREATE POLICY "Clinic staff can view their clinic's appointments" ON public.appointments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.clinic_memberships cm
    WHERE cm.clinic_id = appointments.clinic_id AND cm.profile_id = auth.uid()
  )
);

-- Notifications
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = profile_id);

-- =====================================
-- DATABASE TRIGGERS
-- =====================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name)
  VALUES (new.id, new.raw_user_meta_data->>'first_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
