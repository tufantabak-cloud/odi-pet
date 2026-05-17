-- Ensure public.profiles has the email column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update the new user creation trigger function to safely copy email and handle existing profiles gracefully
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

  -- Insert profile and populate email, resolving potential duplicate key errors (e.g. from retries, invite flow, or Google OAuth)
  INSERT INTO public.profiles (id, first_name, email)
  VALUES (new.id, extracted_first_name, new.email)
  ON CONFLICT (id) DO UPDATE SET
    first_name = COALESCE(public.profiles.first_name, EXCLUDED.first_name),
    email = COALESCE(public.profiles.email, EXCLUDED.email);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
