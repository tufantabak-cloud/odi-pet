-- Eski plan-yap istemcileri protokol kimliğini yalnızca extra_data.product.id
-- altında saklıyordu. Atomik parazit tamamlama RPC'si kanonik üst seviye
-- alanları doğruladığı için bu planlar PLAN_RECORD_IDENTITY_MISMATCH alıyordu.
-- Aktif/gecikmiş planları doğrulanmış protokol kataloğundan geriye dönük doldur.

UPDATE public.plans AS plan
SET extra_data = COALESCE(plan.extra_data, '{}'::jsonb) || jsonb_build_object(
  'parasite_protocol_id', protocol.id,
  'parasite_code', protocol.parasite_code,
  'parasite_type', protocol.parasite_type
)
FROM public.parasite_protocols AS protocol
WHERE plan.category = 'parazit'
  AND plan.status IN ('active', 'overdue')
  AND protocol.id::text = COALESCE(
    NULLIF(plan.extra_data->>'parasite_protocol_id', ''),
    NULLIF(plan.extra_data->'product'->>'id', '')
  )
  AND (
    plan.extra_data->>'parasite_protocol_id' IS DISTINCT FROM protocol.id::text
    OR plan.extra_data->>'parasite_code' IS DISTINCT FROM protocol.parasite_code
    OR plan.extra_data->>'parasite_type' IS DISTINCT FROM protocol.parasite_type
  );