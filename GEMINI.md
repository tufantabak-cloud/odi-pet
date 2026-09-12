# Odi.Pet — Global Agent Rules

## Stack
Next.js 16 (App Router), React 19, Supabase, Tailwind CSS, Vercel

## File Ownership (conflict prevention)
- Frontend agent: /src/app/**, /src/components/**
- Backend agent: /src/app/api/**, /src/lib/**, /supabase/**
- DevOps agent: vercel.json, next.config.ts, .env.example

## Non-negotiables
- All user-facing strings: Turkish
- All list/card components: empty + loading + error state
- All new Supabase tables: RLS policy required
- No secrets in client-side code
- Mobile-first (375px minimum)

## Project owner: Tufan (not Tan)
Feature decisions escalate to Tufan, not to implementers.
