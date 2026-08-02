# OPOS Phase 5 — Developer & AI Agent Governance Handbook

## Mandatory Rules for Developers & AI Agents
- **Rule 1 (Turkish Communication):** Always communicate with the user in **Türkçe**.
- **Rule 2 (Single Source of Truth):** Never edit, rename, move, or recreate files under `/public/brand/illustrations/`.
- **Rule 3 (Locked Zones):** Do NOT edit `src/components/pets/PetHeroCard.tsx` or the hero section of `src/components/pets/PetDetailClient.tsx` without explicit written permission from Tufan.
- **Rule 4 (Iconography Standard):** Use pet-centric icons (food bowl, bone, carrier, litter scoop). Generic or human icons (tennis racket, steak) are strictly forbidden.
- **Rule 5 (Typography Standard):** Montserrat font exclusively.
- **Rule 6 (Architecture Guards):** Always run `npm run check:architecture` before submitting changes.
- **Rule 7 (Canonical Data Model):** Maintain a Single Source of Truth for each health domain. Duplicate data stores across modules are strictly prohibited.
- **Rule 8 (Dashboard & Timeline Read-Only Aggregation):** Dashboard and Health Timeline components must not produce or mutate data; they must remain pure read-only views over canonical data.
- **Rule 9 (Health Data Archival Only):** Health and medical records (vaccines, antiparasitics, allergies, prescriptions, weight, lab results) can NEVER be hard deleted. Soft delete / archiving (`is_archived = true`) is mandatory.
- **Rule 10 (AI Visual Indicator Standard):** All AI-generated, AI-assisted, or AI-derived content, recommendations, notifications, forms, and cards must display the official Purple Sparkles icon (`Sparkles`) and purple visual accents (`text-purple-600`, `bg-purple-50`).
- **Rule 11 (AI Human-in-the-Loop Confirmation):** AI systems can NEVER autonomously save, update, or delete database records without user consent. AI outputs (e.g., OCR extraction, diagnosis recommendations) must be presented in a Review & Confirm UI; database mutation occurs ONLY when the user explicitly clicks "Confirm & Save".
- **Rule 12 (AI Confidence Score & Explainability):** All AI-generated health suggestions, symptom analyses, and OCR data extractions must present a Confidence Score (e.g., %85 Confidence) and Explainability text ("Why was this suggested?"). Outputs with <70% confidence must warn the user to manually verify data.
- **Rule 13 (Medical Disclaimer & Legal Boundaries):** AI Veterinary Assistant and health recommendation modules do NOT replace licensed veterinary care. All AI outputs must prominently display a Medical Disclaimer: "Bu bir klinik teşhis değildir. Acil veya şüpheli durumlarda mutlaka lisanslı bir veteriner hekime danışınız."


