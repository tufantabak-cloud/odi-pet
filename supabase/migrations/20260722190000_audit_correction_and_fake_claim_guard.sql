-- Migration: Audit tablosuna action/reference_log_id + sahte klinik ifade engeli
-- File: 20260722190000_audit_correction_and_fake_claim_guard.sql

-- 1. admin_vet_override_logs: action ve reference_log_id kolonları
ALTER TABLE public.admin_vet_override_logs
  ADD COLUMN IF NOT EXISTS action text NOT NULL DEFAULT 'requirement_change',
  ADD COLUMN IF NOT EXISTS reference_log_id uuid REFERENCES public.admin_vet_override_logs(id) ON DELETE SET NULL;

-- action CHECK constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_vet_override_logs_action_check'
  ) THEN
    ALTER TABLE public.admin_vet_override_logs
      ADD CONSTRAINT admin_vet_override_logs_action_check
      CHECK (action IN ('requirement_change', 'override_reason_correction', 'vet_approved', 'vet_rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_admin_vet_override_logs_ref ON public.admin_vet_override_logs(reference_log_id);

-- 2. change_vet_review_requirement RPC (düzeltilmiş regex ile sahte klinik ifade engeli)
CREATE OR REPLACE FUNCTION change_vet_review_requirement(
  p_article_id uuid,
  p_new_requirement text,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_existing articles%ROWTYPE;
  v_actor_role text;
  v_actor_id uuid;
  v_updated_article articles%ROWTYPE;
  v_has_real_vet_approval boolean;
  v_clean_reason text;
BEGIN
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Oturum bulunamadı.';
  END IF;

  -- Rol kontrolü
  SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
  IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'founder') THEN
    RAISE EXCEPTION 'Yetkisiz erişim: Yalnız admin veya founder veteriner gereksinimini değiştirebilir.';
  END IF;

  IF p_new_requirement NOT IN ('required', 'optional', 'not_required') THEN
    RAISE EXCEPTION 'Geçersiz veteriner inceleme gereksinimi: %', p_new_requirement;
  END IF;

  SELECT * INTO v_existing FROM public.articles WHERE id = p_article_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Makale bulunamadı: %', p_article_id;
  END IF;

  -- Tıbbi içeriklerde required -> optional / not_required geçişinde gerekçe zorunluluğu
  IF v_existing.is_medical_content = true AND v_existing.vet_review_requirement = 'required' AND p_new_requirement IN ('optional', 'not_required') THEN
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
      RAISE EXCEPTION 'Tıbbi içeriklerde veteriner onay zorunluluğunu esnetmek için gerekçe belirtilmesi zorunludur.';
    END IF;
  END IF;

  v_clean_reason := COALESCE(trim(p_reason), 'Gereksinim güncellendi');

  -- Sahte klinik onay ifade engeli: Gerçek veteriner onayı yoksa yanıltıcı ifadeler kabul edilmez
  v_has_real_vet_approval := (v_existing.vet_review_status = 'approved' AND v_existing.vet_reviewed_by IS NOT NULL);

  IF NOT v_has_real_vet_approval THEN
    IF v_clean_reason ~* 'klinik.*(denetim|inceleme|kontrol).*(tamamland|yapıld)'
       OR v_clean_reason ~* 'veteriner.*(tarafından\s+)?onayland'
       OR v_clean_reason ~* 'hekim.*(kontrol|inceleme|denetim).*ge.ti'
       OR v_clean_reason ~* 'veteriner\s+hekim\s+incelemes'
    THEN
      RAISE EXCEPTION 'Bu ifade gerçek bir veteriner incelemesi yapıldığını ima ediyor ancak bu makale için onaylanmış veteriner kaydı bulunmuyor. Lütfen gerekçeyi düzeltin.';
    END IF;
  END IF;

  -- 1. Kalıcı Audit Kaydı Oluştur
  INSERT INTO public.admin_vet_override_logs (
    article_id, old_requirement, new_requirement, reason, actor_id, actor_role, action, created_at
  ) VALUES (
    p_article_id,
    COALESCE(v_existing.vet_review_requirement, 'required'),
    p_new_requirement,
    v_clean_reason,
    v_actor_id,
    v_actor_role,
    'requirement_change',
    now()
  );

  -- 2. Articles Tablosunu Güncelle
  UPDATE public.articles SET
    vet_review_requirement = p_new_requirement,
    vet_review_override_reason = v_clean_reason,
    vet_review_override_by = v_actor_id,
    vet_review_override_at = now(),
    vet_review_status = CASE WHEN p_new_requirement = 'not_required' THEN 'not_required' ELSE vet_review_status END
  WHERE id = p_article_id
  RETURNING * INTO v_updated_article;

  RETURN to_jsonb(v_updated_article);
END;
$fn$;

NOTIFY pgrst, 'reload schema';
