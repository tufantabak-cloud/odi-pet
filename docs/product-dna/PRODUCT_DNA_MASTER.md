# Odi Pet - Master Product DNA Document

This master document synthesizes the strategic, architectural, functional, and product intelligence of Odi Pet into an authoritative reference answering all 18 core strategic product questions.

---

## Strategic Product Answers

### Q1: What is Odi Pet's fundamental reason for existing?
**ANSWER:** Odi Pet exists to eliminate pet health tracking anxiety, prevent missed vaccination/parasite doses, and centralize all medical, nutrition, care routine, and emergency processes for cats and dogs into a single, intuitive, cross-platform (Web/PWA/Mobile) digital health ecosystem.

---

### Q2: Who is the primary target user and what is their daily behavioral context?
**ANSWER:** Primary users are individual pet parents, multi-person household families, and pet sitters. Their daily behavioral context is mobile-first, brief app sessions (15–45 seconds) to check today's tasks, log feeding/weight, or respond to push reminders.

---

### Q3: What are the core pet species and health categorization models?
**ANSWER:** Odi Pet strictly supports **Cats (`cat`)** and **Dogs (`dog`)**. Health categorization is structured into 4 age groups:
- **Yavru (Puppy/Kitten):** 0 - 1 years
- **Yetişkin (Adult):** 1 - 7 years
- **Yaşlı (Senior):** 7 - 12 years
- **Yaşlı (Senior 12+):** 12+ years
*(Enforced across species standards `src/lib/species.ts` and `AGENTS.md`).*

---

### Q4: What is the fundamental data architecture rule (SSOT & Archival)?
**ANSWER:** Single Source of Truth (SSOT): Every health domain has exactly ONE canonical database table and mutation service. Health records (vaccines, parasite doses, medical history) can NEVER be hard-deleted (`is_archived = true`). Read-only dashboards and timelines aggregate data without directly mutating database rows.

---

### Q5: How does the preventive health engine work (Vaccines & Parasites)?
**ANSWER:** The preventive engine matches pet species, birth date, and weight against protocol definition templates (`vaccine_protocols`, `parasite_protocols`). When a treatment is administered, atomic RPCs (`complete_parasite_plan_rpc`) update history and automatically schedule the next dosage date based on brand-specific recurrence durations (e.g. 60 or 90 days).

---

### Q6: How does nutrition and weight management work?
**ANSWER:** Users assign a food brand from catalog (`pet_food_assignments`), specify bag size (kg) and daily feeding portion (grams). The engine computes package depletion dates to schedule refill push notifications. Weight logs (`weight_logs`) record weight and height over time to generate visual development charts.

---

### Q7: How does care routine planning work?
**ANSWER:** Routine hygiene (baths, nail trims, ear cleaning, dental care) is managed via care plans (`care_plans`, `care_events`) with configurable recurring schedules that populate calendar occurrences and log completed care actions to the pet's activity timeline.

---

### Q8: How does task orchestration and due-date logic operate?
**ANSWER:** Plans (`plans`) create occurrences (`plan_occurrences`) with target dates (`scheduled_at`). Status transitions automatically (`scheduled` -> `due_today` -> `overdue` -> `completed`). Atomic SQL queries dynamically re-evaluate overdue status without relying solely on background updates.

---

### Q9: How does the notification and web push engine deliver alerts?
**ANSWER:** Scheduled alerts insert jobs into `notification_jobs`. Vercel cron calls GET `/api/cron/notifications`, which acquires row locks (`FOR UPDATE SKIP LOCKED`) to batch process pending jobs. Messages are dispatched via WebPush library using VAPID keys to browser Service Worker (`sw.ts`).

---

### Q10: How does AI and document intelligence operate safely (Human-in-the-Loop)?
**ANSWER:** Gemini AI Vision parses physical vaccine booklet photos uploaded to private storage buckets (`vaccine-documents`). AI outputs MUST be rendered in a Human-in-the-Loop Review Modal (`SmartScannerModal.tsx`) with confidence ratings, Mor Yıldız (`Sparkles`) visual indicator, and medical disclaimer. The user MUST explicitly click "Onayla ve Kaydet" to execute a database mutation.

---

### Q11: How does the estrus and reproduction tracker operate?
**ANSWER:** Tracks female pet heat cycles (`pet_estrus_cycles`), symptom start/end dates, enforces single open cycle constraints, calculates 6-month cycle predictions, sends timing alerts, and evaluates breeding eligibility (`pet_breeding_eligibility`).

---

### Q12: How does the SOS & Lost Pet emergency system work?
**ANSWER:** Generates geolocated missing pet reports (`lost_reports`) with location coordinates (province, district, lat, lng). Instantly generates public web flyers (`/sos/[id]`), broadcast push uyarısı to nearby district users, and provides WhatsApp share links.

---

### Q13: How does the Vet & Expert directory function?
**ANSWER:** Maintains a verified directory of veterinary clinics (`clinics`), filterable by emergency status, 24/7 availability, and province location. Facilitates direct appointment requests (`appointments`) linked to pet profiles.

---

### Q14: How does the Experience Orchestrator manage feature access and progressive profiling?
**ANSWER:** Evaluates feature entitlement via `feature_registry` and user plan tier. Controls survey frequency via `user_survey_stats` to enforce strict anti-fatigue limits (min 72 hours between prompts), unlocking features progressively as the pet ages.

---

### Q15: What are Odi Pet's 5 non-negotiable product invariants?
**ANSWER:**
1. Single Source of Truth & Archival-Only Medical Records (`INV-001`)
2. Human-in-the-Loop AI Governance & Mutation Lock (`INV-002`)
3. Row Level Security & Multi-Owner Household Isolation (`INV-003`)
4. Strict Species Isolation (Cats & Dogs Only) (`INV-004`)
5. Progressive Profiling & Anti-Question Fatigue Rules (`INV-005`)

---

### Q16: What are Odi Pet's top 5 architectural & UX weaknesses?
**ANSWER:**
1. Lack of local-first IndexedDB offline mutation layer (`FAIL-012`)
2. Deep nested tab navigation hierarchy (3-4 clicks to check task)
3. Minor legacy database table schema drift (legacy `vaccines` table)
4. Passive VAPID push token expiry handling on browser cache clear
5. Lack of general form draft autosave on page refresh

---

### Q17: What are the safest areas for complete clean-slate reinvention?
**ANSWER:**
1. Replacing deep tab navigation with a Unified Single-Stream Daily Agenda Feed.
2. Making camera OCR snapshot the primary default entry flow for health records.
3. Redesigning onboarding into a conversational, card-based wizard.
4. Implementing local-first IndexedDB optimistic UI mutations.
5. Elevating dashboard widgets to context-aware dynamic smart cards.

---

### Q18: What is the final readiness verdict for Next-Gen / AI Re-engineering?
**ANSWER:** **`READY` WITH MINOR REMEDIATIONS (Readiness Score: 88.5 / 100)**. The repository possesses rock-solid database schemas, comprehensive RLS security policies, strong protocol logic, and well-documented OPOS design system tokens, making it fully prepared for clean-slate AI-driven re-engineering.
