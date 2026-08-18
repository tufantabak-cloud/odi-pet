-- Fix handle_new_user trigger to preserve NULL for unprovided names instead of inserting literal 'Kullanıcı'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_first_name TEXT;
BEGIN
  -- Try to get first_name directly (from email signup or OAuth metadata)
  extracted_first_name := NULLIF(TRIM(new.raw_user_meta_data->>'first_name'), '');

  -- If null, try to get from Google's full_name or name
  IF extracted_first_name IS NULL THEN
    extracted_first_name := NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), '');
  END IF;

  IF extracted_first_name IS NULL THEN
    extracted_first_name := NULLIF(TRIM(new.raw_user_meta_data->>'name'), '');
  END IF;

  -- Filter out literal fallback strings like 'Kullanıcı'
  IF extracted_first_name ILIKE 'kullanıcı' OR extracted_first_name ILIKE 'kullanici' THEN
    extracted_first_name := NULL;
  END IF;

  -- Insert profile and populate email, resolving potential duplicate key errors
  INSERT INTO public.profiles (id, first_name, email)
  VALUES (new.id, extracted_first_name, new.email)
  ON CONFLICT (id) DO UPDATE SET
    first_name = COALESCE(public.profiles.first_name, EXCLUDED.first_name),
    email = COALESCE(public.profiles.email, EXCLUDED.email);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
