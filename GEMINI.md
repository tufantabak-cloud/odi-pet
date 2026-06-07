# Odi.Pet — Global Agent Rules

## Stack
Next.js 14 (App Router), Supabase, Tailwind CSS, Vercel

## File Ownership (conflict prevention)
- Frontend agent: /app/(app)/**, /components/**
- Backend agent: /app/api/**, /lib/**, /supabase/**
- DevOps agent: vercel.json, next.config.js, .env.example

## Non-negotiables
- All user-facing strings: Turkish
- All list/card components: empty + loading + error state
- All new Supabase tables: RLS policy required
- No secrets in client-side code
- Mobile-first (375px minimum)

## Project owner: Tufan (not Tan)
Feature decisions escalate to Tufan, not to implementers.
