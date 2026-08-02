# Odi.Pet OPOS Migration — UI Inventory & Component Catalog

> **Status:** AUDITED / READ-ONLY MIGRATION BASELINE  
> **Target Design System:** OPOS Design System (Soft Glassmorphism & Tactile Luxury Architecture)  
> **Scope:** Full Application UI Surface Area Audit  

---

## 1. Executive Summary

This document establishes the exhaustive UI Inventory of the **Odi.Pet** application. Every production route, screen overlay, dialog, drawer, bottom sheet, navigation structure, form control, card container, timeline, and state variation is inventoried.

---

## 2. Production Routes & Screen Inventory

### 2.1 Owner Domain (Primary Pet Parent Application)
| Route Path | Screen Name | Screen Type | Layout Structure | Current State Handlers |
| :--- | :--- | :--- | :--- | :--- |
| `/owner/dashboard` | Main Owner Dashboard | Core Portal | Header + Hero + Grid Cards + BottomNav | LoadingSkeleton, ErrorState, EmptyPetList |
| `/owner/pets` | Pet List Overview | Portal Page | Header + Pet Grid + Floating Action | Skeleton, EmptyState |
| `/owner/pets/add` | Add Pet Wizard | Multi-step Form | Stepper Header + Form Steps + Footer | Inline Errors, LoadingSpinner |
| `/owner/pets/add/success` | Pet Added Confirmation | Celebration Screen | Card Center + Confetti CTA | Success State |
| `/owner/pets/[id]` | Pet Detail Dashboard | Core Portal | Hero Header + Quick Stats + Module Grid | PetHeroSkeleton, ErrorState |
| `/owner/pets/[id]/edit` | Edit Pet Profile | Form Screen | Standard Form + Upload Modal | Form Validation State |
| `/owner/pets/[id]/vaccines` | Vaccine Tracking | Health Module | Page Header + Timeline + Modal Trigger | VaccineSkeleton, EmptyVaccines |
| `/owner/pets/[id]/parasite` | Parasite Protection | Health Module | Page Header + Protection Status + Log List | ParasiteSkeleton, EmptyParasites |
| `/owner/pets/[id]/nutrition` | Nutrition & Feeding | Wellness Module | Meal Cards + Daily Calculator + History | NutritionSkeleton, EmptyMeals |
| `/owner/pets/[id]/care` | General Care & Hygiene | Wellness Module | Routine List + Log Button | CareSkeleton, EmptyCareLogs |
| `/owner/pets/[id]/health-history` | Medical Records & Vitals | Health Module | Health Score + Vitals Graph + History | HistorySkeleton, EmptyHistory |
| `/owner/pets/[id]/journal` | Pet Daily Journal | Social/Personal | Feed List + Media Grid + Add Entry FAB | JournalSkeleton, EmptyJournal |
| `/owner/pets/[id]/journal/new` | Create Journal Entry | Form Screen | Media Picker + Rich Text Input | Upload Progress State |
| `/owner/pets/[id]/reports` | Health PDF Reports | Export Feature | Report Selector + Preview + Download | Generating PDF State |
| `/owner/pets/[id]/adoption` | Adoption Passport | Specialty | Digital Certificate + QR Share | Verified / Pending State |
| `/owner/pets/[id]/match` | Playdate & Breeding Match | Social Module | Swipe Cards + Preference Filter | EmptyMatches State |
| `/owner/pets/[id]/budget` | Pet Expense Tracker | Finance Module | Monthly Chart + Category Breakdown | EmptyExpenses State |
| `/owner/pets/[id]/gallery` | Photo & Document Gallery | Media Module | Grid View + Fullscreen Lightbox | EmptyGallery State |
| `/owner/pets/[id]/share` | Caregiver & Family Share | Access Control | Invite Link Generator + Active Shares | Link Copied State |
| `/owner/ai-vet` | AI Veterinary Assistant | AI Assistant | Chat Interface + Quick Prompts + Disclaimer | Streaming Response State |
| `/owner/vets` | Vet Finder & Booking | Services | Search Bar + Map/List Toggle + Vet Card | Location Error, EmptyVets |
| `/owner/marketplace` | Pet Product Store | Commerce | Hero Banners + Category Chips + Product Grid | ShoppingCart, EmptyMarket |
| `/owner/social` | Pet Community Feed | Social Feed | Feed Post + Like/Comment + Story Row | FeedSkeleton, EmptyFeed |
| `/owner/messages` | Direct Messaging | Chat | Thread List + Active Chat Drawer | TypingIndicator, EmptyInbox |
| `/owner/notifications` | Activity & Alerts Center | System Utility | Grouped List + Mark Read CTA | EmptyNotifications State |
| `/owner/plan-yap` | Smart Routine Planner | AI Planner | Task Cards + Frequency Selectors | PlanGenerated State |
| `/owner/budget` | Global Expenses | Finance Module | Total Spend + Category Distribution | ExpenseSkeleton |
| `/owner/events` | Pet Events & Reminders | Calendar | Month View + Agenda List | EmptyEvents State |
| `/owner/learn` | Knowledge & Blog Base | Education | Article Search + Category Tabs + Article | ArticleSkeleton |
| `/owner/lost-report` | Emergency Lost Pet Portal | Emergency | High Alert Red Header + Broadcast Map | Active Alert State |
| `/owner/scanner` | QR & Barcode Scanner | Utility Tool | Fullscreen Camera Overlay + Result Card | CameraPermission Error |
| `/owner/profile` | Owner Account & Pets | Account | Profile Header + Setting Rows + Logout | SaveState |
| `/owner/profile/edit` | Edit Account Profile | Form Screen | Profile Avatar + Personal Info Form | Validation Error State |
| `/owner/profile/subscription` | Premium Odi+ Membership | Monetization | Tier Comparison Cards + Paywall CTA | Processing Payment State |

---

### 2.2 Auth, Onboarding & Public Pages
| Route Path | Screen Name | Screen Type | Components Used |
| :--- | :--- | :--- | :--- |
| `/` | Landing / Hero Splash | Landing Page | Brand Banner, Feature Cards, CTA Buttons |
| `/login` | User Login Screen | Authentication | Biometric Button, Passkey Form, OAuth Buttons |
| `/register` | User Registration | Authentication | Progressive Multi-step Registration Form |
| `/register/business` | B2B Partner Register | Authentication | Business Info Form, License Uploader |
| `/reset-password` | Password Recovery | Utility | Reset Email Form, Code Validator |
| `/update-password` | Password Change | Security Form | Password Inputs, Security Meter |
| `/sos/[id]` | Public Lost Pet SOS Page | Emergency Public | Pet Details, Contact Owner CTA, Map |
| `/invite/[token]` | Family Share Acceptance | Invitation | Access Permission Card, Accept CTA |
| `/legal/kvkk` | KVKK & Privacy Policy | Legal Document | Scrollable Document Layout |
| `/legal/terms` | Terms of Service | Legal Document | Scrollable Document Layout |
| `/offline` | PWA Offline Fallback | Offline Screen | Offline Graphic, Retry Sync Button |

---

### 2.3 B2B, Service Provider & Admin Portals
| Route Path | Screen Name | Role | Primary Features |
| :--- | :--- | :--- | :--- |
| `/admin` | System Admin Control Center | Super Admin | System Health, User Metrics, Global Controls |
| `/admin/users` | User Management Table | Super Admin | Data Table, Role Selector, Audit Logs |
| `/admin/pets` | Pet Database Registry | Super Admin | Search Filter, Species/Breed Audit Table |
| `/admin/vaccines` | Master Vaccine Protocols | Medical Admin | Master Vaccine Rules & Dosage Database |
| `/clinic/dashboard` | Veterinary Clinic Portal | Vet Clinic | Patient Appointments, Records, Prescription Form |
| `/groomer/dashboard` | Pet Groomer Portal | Groomer | Grooming Calendar, Services Management |
| `/sitter/dashboard` | Pet Sitter Dashboard | Caregiver | Active Visits, Pet Care Logs, Client Chat |
| `/trainer/dashboard` | Dog Trainer Dashboard | Trainer | Training Plans, Client Progress Tracking |
| `/hotel/dashboard` | Pet Hotel Manager | Hotel Owner | Cage Allocation, Check-in/Check-out Board |

---

## 3. UI Overlays, Micro-Components & Interactive Elements

### 3.1 Overlays, Dialogs & Drawers
- **`FormModal`**: Global form bottom sheet/dialog wrapper.
- **`ConfirmModal`**: Destructive and action verification dialog.
- **`Modal`**: Standard translucent glassmorphism pop-up.
- **`PwaEnforcer` / `PwaUpdater`**: Progressive Web App install prompt & update notification bar.
- **`CoachMark`**: User onboarding spotlight tooltips.
- **`FloatingSOS`**: Permanent double-pulse red SOS action overlay button.
- **`FloatingHelp` / `FloatingLostPets`**: Contextual floating action triggers.
- **`BiometricPrompt`**: Touch ID / Face ID native authentication overlay.

### 3.2 Navigation & Controls
- **`BottomNav`**: Fixed 4-tab bottom navigation with magenta accent & rounded floating dock styling.
- **`SideNav`**: Desktop 256px fixed sidebar navigation with icon labels and pet selector dropdown.
- **`SmartBackButton`**: Dynamic back navigation button with fallback routing.
- **`NotificationBell`**: Badge-enabled notification trigger icon.

### 3.3 State Controls & Feedback
- **`LoadingState` / `Skeleton`**: Content loading placeholders.
- **`EmptyState`**: Zero-data illustration container with action CTAs.
- **`ErrorState`**: Network/API error banner with refresh retry action.
- **`OfflineIndicator`**: Network disconnect notification strip.

---

## 4. Current State Deficiencies Summary
1. **Button Inconsistency**: Primary buttons mix solid purple `#4F2DBA`, inline violet `#3800a4`, rounded full vs 16px radius, and varying press compression effects.
2. **Card Stack Hierarchy**: Cards alternate between white cards with border, semi-transparent glass cards, and standard gray borders without backdrop blur.
3. **Typography Variance**: Mixing system sans-serif fonts, Inter, and Montserrat with arbitrary sizes (`text-xs`, `text-[13px]`, `text-sm`, `text-base`) instead of OPOS standardized scale.
4. **Category Palette Misalignment**: Colors for Vaccines (Sky), Nutrition (Amber), Health (Rose), and Vet (Indigo) are inconsistently applied across sub-views.
