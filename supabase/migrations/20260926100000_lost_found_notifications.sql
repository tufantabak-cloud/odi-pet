-- ============================================================
-- LOST FOUND NOTIFICATIONS (Bulunan Pet Bildirimleri)
-- Oluşturulma: 2026-09-26
-- Amaç: Kayıp pet ilanlarına "Buldum Bildir" bildirimi bırakabilen
--        (kimliği doğrulanmış veya anonim) kişilerin kayıtlarını tutar.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lost_found_notifications (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id      UUID        NOT NULL REFERENCES public.lost_reports(id) ON DELETE CASCADE,
  finder_name    TEXT        NOT NULL,
  finder_phone   TEXT,
  found_location TEXT,
  message        TEXT,
  -- Giriş yapmış kullanıcılar için (opsiyonel)
  finder_user_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.lost_found_notifications ENABLE ROW LEVEL SECURITY;

-- Herkes bildirim bırakabilir (anonim kullanım dahil)
CREATE POLICY "Anyone can insert found notifications"
  ON public.lost_found_notifications
  FOR INSERT
  WITH CHECK (true);

-- Yalnızca pet sahibi kendi ilanına gelen bildirimleri görebilir
CREATE POLICY "Pet owner can view found notifications for their reports"
  ON public.lost_found_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.lost_reports lr
      JOIN public.pets p ON p.id = lr.pet_id
      WHERE lr.id = report_id
        AND p.owner_id = auth.uid()
    )
  );

-- İndeks: report_id üzerinden hızlı sorgulama
CREATE INDEX IF NOT EXISTS idx_lost_found_notifications_report_id
  ON public.lost_found_notifications(report_id);
