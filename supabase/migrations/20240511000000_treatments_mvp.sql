-- ==========================================
-- SPRINT: TEDAVİ TAKİP MODÜLÜ (Treatments MVP)
-- ==========================================

-- 1. TEDAVİLER TABLOSU
CREATE TABLE IF NOT EXISTS public.health_treatments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  disease_name TEXT NOT NULL,
  category TEXT DEFAULT 'Rutin Kontrol', -- Rutin Kontrol, Acil, Kronik Hastalık, Ameliyat
  status TEXT DEFAULT 'Devam Ediyor', -- Devam Ediyor, Tamamlandı, İptal Edildi
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  clinic_name TEXT,
  treatment_methods TEXT,
  cost DECIMAL(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'Borçlu', -- Ödendi, Borçlu, Taksitli
  expense_items TEXT,
  documents TEXT[], -- Fotoğraf galerisi için URL'ler
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.health_treatments ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
CREATE POLICY "Owners can view their pet treatments" ON public.health_treatments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);
CREATE POLICY "Owners can insert their pet treatments" ON public.health_treatments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);
CREATE POLICY "Owners can update their pet treatments" ON public.health_treatments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);
CREATE POLICY "Owners can delete their pet treatments" ON public.health_treatments FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_id AND pets.owner_id = auth.uid())
);
