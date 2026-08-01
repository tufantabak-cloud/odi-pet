# OPOS Enterprise Usage Map & Governance Protocol

This document defines screen mappings, allowed/forbidden contexts, priorities, and fallback policies for every illustration asset in Odi.Pet.

| ID | Module | Complexity | Screen Usage | Allowed Contexts | Forbidden Contexts | Priority | Fallback |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: | :--- |
| **`empty-no-pets`** | `pets` | **S** | /owner/dashboard, /owner/pets | Dashboard, PetsList, Onboarding | <span fill="red">Certificate, Admin, MedicalReport</span> | **P0** | `empty-state/svg/empty-generic.svg` |
| **`empty-no-vaccines`** | `vaccines` | **S** | /owner/pets/[id]/vaccines | VaccineModule, MedicalHistory | <span fill="red">Admin, Marketing</span> | **P0** | `empty-state/svg/empty-generic.svg` |
| **`empty-no-food`** | `nutrition` | **S** | /owner/pets/[id]/nutrition | NutritionModule | <span fill="red">Certificate</span> | **P1** | `empty-state/svg/empty-generic.svg` |
| **`onboarding-welcome`** | `onboarding` | **L** | /onboarding, /auth/register | Onboarding, LandingPage | <span fill="red">Admin, PDFExport</span> | **P0** | `dashboard/svg/dashboard-hero.svg` |
| **`dashboard-hero`** | `dashboard` | **L** | /owner/dashboard | Dashboard | <span fill="red">Settings, Legal</span> | **P0** | `onboarding/svg/onboarding-welcome.svg` |
| **`health-checkup`** | `health` | **M** | /owner/pets/[id]/health | HealthModule, MedicalHistory | <span fill="red">Marketing</span> | **P0** | `vaccines/svg/vaccine-schedule.svg` |
| **`vaccine-schedule`** | `vaccines` | **M** | /owner/pets/[id]/vaccines | VaccineModule | <span fill="red">Marketing</span> | **P0** | `health/svg/health-checkup.svg` |
| **`ai-vet-assistant`** | `ai` | **M** | /ai-vet, /owner/ai-assistant | AIVet, Dashboard | <span fill="red">PDFExport</span> | **P0** | `services/svg/services-vet-finder.svg` |
| **`services-vet-finder`** | `services` | **M** | /services/vets, /sos | Services, SOS | <span fill="red">Settings</span> | **P0** | `health/svg/health-checkup.svg` |
| **`offline-no-connection`** | `common` | **M** | /offline, /pwa-fallback | OfflineState, System | <span fill="red">Certificate</span> | **P0** | `error/svg/error-warning.svg` |
| **`certificate-vaccine`** | `vaccines` | **M** | /owner/pets/[id]/certificates | CertificateModule, PDFExport | <span fill="red">Marketing</span> | **P0** | `documents/svg/document-health-report.svg` |
