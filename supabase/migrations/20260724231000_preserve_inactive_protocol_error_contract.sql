-- Preserve the existing client/test-visible error phrase while keeping the
-- legacy-column compatibility fix from the preceding migration.

DO $migration$
DECLARE
  function_definition text;
  updated_definition text;
BEGIN
  SELECT pg_get_functiondef(
    'public.fn_validate_parasite_record()'::regprocedure
  )
  INTO function_definition;

  IF position(
    'INACTIVE_PROTOCOL_FOR_MANUAL_RECORD'
    IN function_definition
  ) = 0 THEN
    RAISE EXCEPTION
      'EXPECTED_INACTIVE_PROTOCOL_ERROR_MARKER_NOT_FOUND';
  END IF;

  updated_definition := replace(
    function_definition,
    'INACTIVE_PROTOCOL_FOR_MANUAL_RECORD',
    'Seçilen parazit protokolü pasif durumdadir. Pasif protokol ile yeni kayit oluşturulamaz.'
  );

  EXECUTE updated_definition;
END;
$migration$;
