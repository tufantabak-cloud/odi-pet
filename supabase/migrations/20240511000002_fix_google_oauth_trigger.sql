-- Fix trigger to handle Google OAuth user metadata (name / full_name / first_name)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_first_name TEXT;
BEGIN
  -- Try to get first_name directly (from email signup)
  extracted_first_name := new.raw_user_meta_data->>'first_name';

  -- If null, try to get from Google's full_name or name
  IF extracted_first_name IS NULL THEN
    extracted_first_name := new.raw_user_meta_data->>'full_name';
  END IF;

  IF extracted_first_name IS NULL THEN
    extracted_first_name := new.raw_user_meta_data->>'name';
  END IF;

  -- Default to something if still null
  IF extracted_first_name IS NULL THEN
    extracted_first_name := 'Kullanıcı';
  END IF;

  INSERT INTO public.profiles (id, first_name)
  VALUES (new.id, extracted_first_name);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
