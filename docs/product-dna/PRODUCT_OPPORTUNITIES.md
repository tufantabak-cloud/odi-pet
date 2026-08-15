# Odi Pet - Product & Automation Opportunity Map

This document outlines the strategic product, AI, vision, IoT, and automation opportunity map for the Odi Pet ecosystem.

---

## 1. Automated Health & Preventive Engine Opportunities
- **OPPORTUNITY:** **Zero-Touch Protocol Auto-Selection based on Location & Breed.**
  - **CONCEPT:** Automatically adjust parasite protocols based on regional tick/parasite prevalence (e.g. coastal regions vs interior cities) and seasonal climate data.
  - **IMPACT:** Higher medical compliance and hyper-localized care relevance.
  - **TECHNICAL FEASIBILITY:** High (uses existing `provinces` location data + `parasite_protocols`).

---

## 2. Advanced AI & Document Vision Opportunities
- **OPPORTUNITY:** **Multi-Page Medical History Booklet Parsing & Automated Lab Results Analysis.**
  - **CONCEPT:** Expand Gemini OCR scanner from single vaccine stamps to multi-page PDF veterinary lab reports (blood tests, X-rays, prescriptions), automatically parsing key markers (e.g., ALT, BUN, Creatinine).
  - **IMPACT:** Transforms paper medical history into structured longitudinal health charts.
  - **TECHNICAL FEASIBILITY:** High (extends `/api/scan-document` with Gemini 2.0 Flash / Pro).

---

## 3. Social & Expert Ecosystem Opportunities
- **OPPORTUNITY:** **Verified Tele-Vet Consultation & Digital Prescription Delivery.**
  - **CONCEPT:** Integrate live video/text consultations with verified veterinary clinics (`clinics`), generating official digital prescriptions directly linked to the pet's health records.
  - **IMPACT:** Opens a direct high-margin B2B2C revenue channel and provides instant veterinary assistance.
  - **TECHNICAL FEASIBILITY:** Medium (requires WebRTC & clinic backend integration).

---

## 4. IoT & Smart Hardware Integration
- **OPPORTUNITY:** **Smart Feeder & Smart Collar Data Sync.**
  - **CONCEPT:** Sync daily activity data (steps, sleep) from smart collars and exact feeding weights from smart feeders into `weight_logs` and `pet_food_assignments`.
  - **IMPACT:** Eliminates manual logging; enables real-time calorie balance monitoring.
  - **TECHNICAL FEASIBILITY:** Medium (uses standard BLE or REST API integrations).

---

## 5. Low-Friction Preventive Care Rewards & Gamification
- **OPPORTUNITY:** **"Healthy Pet Streak" Care Badges & Pharmacy Discounts.**
  - **CONCEPT:** Reward 100% on-time vaccination and parasite compliance with unlockable care badges and partner pharmacy discount coupons.
  - **IMPACT:** Boosts monthly active user (MAU) retention and incentivizes preventive care compliance.
  - **TECHNICAL FEASIBILITY:** High (builds on `care_points_rpc.sql` and `referral_system.sql`).

---

## 6. Seamless Multi-Pet Family Management & Task Delegation
- **OPPORTUNITY:** **One-Tap Task Delegation to Caregivers & Sitters.**
  - **CONCEPT:** Allow owners to temporarily assign specific care tasks (e.g., "Give evening pill") to a pet sitter with 1-tap SMS/WhatsApp deep links and completion push confirmation.
  - **IMPACT:** Solves pet care coordination during owner travel or busy workdays.
  - **TECHNICAL FEASIBILITY:** High (uses existing `pet_memberships` and invitation tokens).
