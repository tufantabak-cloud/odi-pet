import fs from 'fs'
import path from 'path'

const filePath = path.resolve(process.cwd(), 'all_in_one_supabase.sql')
let content = fs.readFileSync(filePath, 'utf8')

// 1. Update public.profiles table definition
const oldProfilesDef = `CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role user_role DEFAULT 'owner'::user_role NOT NULL,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`

const newProfilesDef = `CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role user_role DEFAULT 'owner'::user_role NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);`

// Try standard replacement, handling CRLF/LF by normalizing
const normalize = (str) => str.replace(/\r\n/g, '\n').trim()

let normalizedContent = normalize(content)
let normalizedOldProfiles = normalize(oldProfilesDef)
let normalizedNewProfiles = normalize(newProfilesDef)

if (normalizedContent.includes(normalizedOldProfiles)) {
  console.log("Profiles table definition found! Replacing...")
  normalizedContent = normalizedContent.replace(normalizedOldProfiles, normalizedNewProfiles)
} else {
  console.error("Profiles table definition NOT found by exact match! Trying fallback regex...")
  const regex = /CREATE TABLE public\.profiles \([\s\S]*?updated_at TIMESTAMPTZ DEFAULT NOW\(\)\s*\);/
  if (regex.test(normalizedContent)) {
    console.log("Profiles table definition found via regex! Replacing...")
    normalizedContent = normalizedContent.replace(regex, normalizedNewProfiles)
  } else {
    console.error("Profiles table definition NOT found even with regex!")
  }
}

// 2. Update handle_new_user function
const oldFunctionDef = `CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name)
  VALUES (new.id, new.raw_user_meta_data->>'first_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`

const newFunctionDef = `CREATE OR REPLACE FUNCTION public.handle_new_user()
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
$$ LANGUAGE plpgsql SECURITY DEFINER;`

let normalizedOldFunc = normalize(oldFunctionDef)
let normalizedNewFunc = normalize(newFunctionDef)

if (normalizedContent.includes(normalizedOldFunc)) {
  console.log("handle_new_user() definition found! Replacing...")
  normalizedContent = normalizedContent.replace(normalizedOldFunc, normalizedNewFunc)
} else {
  console.error("handle_new_user() definition NOT found by exact match! Trying fallback regex...")
  const regexFunc = /CREATE OR REPLACE FUNCTION public\.handle_new_user\(\)[\s\S]*?RETURNS TRIGGER[\s\S]*?\$\$ LANGUAGE plpgsql SECURITY DEFINER;/
  if (regexFunc.test(normalizedContent)) {
    console.log("handle_new_user() definition found via regex! Replacing...")
    normalizedContent = normalizedContent.replace(regexFunc, normalizedNewFunc)
  } else {
    console.error("handle_new_user() definition NOT found even with regex!")
  }
}

// Convert back to native line endings (CRLF for Windows since the file uses CRLF)
const finalContent = normalizedContent.replace(/\n/g, '\r\n')
fs.writeFileSync(filePath, finalContent, 'utf8')
console.log("all_in_one_supabase.sql successfully synchronized!")
