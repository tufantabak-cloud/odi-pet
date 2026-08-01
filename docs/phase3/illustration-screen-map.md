# OPOS Phase 3A — Illustration Screen Map

| Screen Route | Illustration ID | Priority | Integration Reason | Fallback Asset |
| :--- | :--- | :---: | :--- | :--- |
| `/owner/dashboard` | **`p0-dashboard-hero`** | **P0** | Ana kontrol paneli karşılama hero alanı | `onboarding-welcome` |
| `/owner/pets` | **`empty-no-pets`** | **P0** | Evcil hayvan bulunmadığında gösterilen boş durum | `empty-no-pets` |
| `/owner/pets/[id]/vaccines` | **`vaccine-schedule`** | **P0** | Akıllı aşı takvimi kartı | `empty-no-vaccines` |
| `/owner/medical` | **`health-checkup`** | **P0** | Tıbbi geçmiş ve genel muayene kartı | `health-checkup` |
| `/ai-vet` | **`ai-vet-assistant`** | **P0** | Yapay zeka veteriner danışma modülü | `services-vet-finder` |
| `/services/vets` | **`services-vet-finder`** | **P0** | Nöbetçi veteriner ve klinik haritası | `health-checkup` |
| `/owner/pets/[id]/parasite` | **`parasite-control`** | **P0** | Parazit koruma ve damla takvimi | `vaccine-schedule` |
| `/owner/pets/[id]/nutrition` | **`nutrition-plan`** | **P1** | Beslenme ve mama planlama kartı | `empty-no-food` |
| `/owner/pets/[id]/grooming` | **`grooming-care`** | **P1** | Kuaför ve tüy bakım kartı | `health-checkup` |
| `/community` | **`community-share`** | **P1** | Topluluk ve sosyal etkileşim alanı | `onboarding-welcome` |
| `/marketplace` | **`marketplace-empty`** | **P2** | Pazaryeri ve mağaza başlığı | `dashboard-hero` |
| `/offline` | **`offline-no-connection`** | **P0** | Serwist PWA çevrimdışı bağlantı ekranı | `error-warning` |
| `/maintenance` | **`maintenance-mode`** | **P1** | Sistem bakım modu ekranı | `offline-no-connection` |
