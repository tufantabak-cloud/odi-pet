# Odi.Pet Proje Yol Haritası (Roadmap) & PRD

## 🚀 Yayın Öncesi (Pre-launch) - KRİTİK EKSİKLER
- [ ] **Google Maps API Key Alınması:** Google Cloud üzerinden Places API key alınarak `.env.local` dosyasına eklenecek. (Backend ve Frontend altyapısı kodlandı, sadece API Key bekliyor).
  - Canlı puanlama (ratings) ve yorumlar.
  - Fotoğraflar ve anlık açılış/kapanış saatleri.
  - Mesafe bazlı Google Navigasyon entegrasyonu.
  - *Not: Bu görev asla iptal edilmeyecek, yayın öncesi final aşamasıdır.*

## ✅ Tamamlanan Çekirdek Özellikler (Premium MVP)

### 🐾 Evcil Hayvan & Sağlık Yönetimi (Core Ecosystem)
- [x] **Sağlık ve Aşı Sistemi (Vaccine OS):** Aşı/parazit alias sistemi, otomatik matris takibi ve akıllı hatırlatıcılar.
- [x] **Tedavi Takibi:** İlaç, dozaj, süre ve hastalık kayıtları, çoklu ilaç yönetimi.
- [x] **Gelişim (Kilo & Boy) Takibi:** Sağlık geçmişine entegre veri girişi ve grafiksel raporlama.
- [x] **Acil Durum (SOS):** Pet bazlı özel JSONB entegrasyonu ile 2 acil durum kişisi atama.
- [x] **Beslenme ve Bakım:** Temel stok, mama markası ve bakım rutinleri takibi.
- [x] **Progressive Profiling:** Mikroçip, kayıt numarası vb. bilgilerin kullanıcıyı yormadan adım adım toplanması.

### 🏥 Veteriner Rehberi (v1)
- [x] **Statik Veritabanı:** Türkiye genelindeki ~4.500 kliniğin sisteme aktarılması.
- [x] **Hibrit Arama:** GPS bazlı yakınlık arama ve manuel Şehir/İlçe filtreleme.
- [x] **Sağlık Merkezi Entegrasyonu:** Sağlık dashboard'undan doğrudan erişim.

### ⚙️ Altyapı ve Güvenlik
- [x] **Kimlik Doğrulama:** Google OAuth entegrasyonu ve güvenli kayıt akışı.
- [x] **RBAC & Veritabanı:** Admin rolleri yönetimi, Supabase RPC fonksiyonları ve RLS korumaları.
- [x] **CI/CD & DevOps:** Vercel üzerine hatasız dağıtım (Next.js konfigürasyonları).
- [x] **Tasarım Sistemi:** Yeni marka kimliği, premium arayüz ve pürüzsüz UX.

## 🗂 Backlog

## Vaccine Record Architecture Refactor — P0 Completed ✅

- Brand/protocol separation (vaccine_name = protocol, brand_id = product)
- Private vaccine-documents bucket (signed URLs, RLS protected)
- DB-level brand validation trigger (brand must match vaccine_code)
- administration_route structured dropdown
- valid_until date capture
- Normalized brand input (brand_id OR free_text, never both)

### Remaining (P1):
- UI click-through test (4 scenarios)
- Edit/update akışı yeni alanlarla test edilmeli
- Delete → Storage dosyası da silinmeli
- Mobile UX validation
- vaccine_code string matching → vaccine_protocol_id FK (gelecek sprint)

### Sprint 4.3B — Confidence Level Normalization
**Amaç:** `confidence_level` yazım değerlerini tekilleştirmek. (Sprint 4.3A'da mimariye dokunulmadı, bilinçli olarak ertelendi — bkz. [ODIPET_AUDIT_CURRENT.md](ODIPET_AUDIT_CURRENT.md) Sprint 4.3 analizi.)

İlk işler:
1. Ortak `CONFIDENCE_LEVELS` sabiti oluştur.
2. `'high'` değerini geçerli bir değere çevir ([src/app/api/pets/[id]/vaccines/route.ts](src/app/api/pets/[id]/vaccines/route.ts)).
3. `ConfidenceBadge` gerçekten kullanılacak mı karar ver (şu an [VaccinesClient.tsx](src/app/owner/pets/[id]/vaccines/VaccinesClient.tsx) içinde tanımlı ama hiç render edilmiyor).
4. `vaccine_records_v2` yeni kayıtlarında sadece izinli değerler yazılsın.
5. DB check constraint sonraki aşamada değerlendirilsin.
