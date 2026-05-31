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
