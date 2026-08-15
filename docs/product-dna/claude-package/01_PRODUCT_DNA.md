# Odi Pet — Product DNA & Core Identity

> **Sürüm:** 2.0.0-AI  
> **Konum:** `c:\Odi.Pet\docs\product-dna\claude-package\01_PRODUCT_DNA.md`  
> **Doğrulama Derecesi:** %100 Doğrulanmış (Code & DB Migrations Verified)  

---

## 1. Ürün Kimliği ve Amacı (Core Identity)

**Odi Pet**, evcil hayvan sahiplerinin kedi ve köpeklerine ait medikal geçmiş, aşı takvimi, parazit mücadele planı, rutin hijyen ve beslenme takiplerini tek bir dijital merkezden otonom olarak yürütmelerini sağlayan **Premium Evcil Hayvan Bakım Ekosistemi (Premium Pet Care Ecosystem)**'dir.

Uygulamanın temel amacı, dağınık fiziksel aşı karnelerinin, unutulan veteriner randevularının ve kaybolan sağlık geçmişinin yarattığı stresi ortadan kaldırmak; klinik hassasiyet ile yüksek estetikli bir mobil/web kullanıcı deneyimini birleştirmektir.

---

## 2. Desteklenen Hayvan Türleri ve Yaş Skalası Anayasası

### 2.1 Tür Kısıtlamaları (Species Lock)
Veritabanı seviyesinde `pets_species_check` kısıtlaması ile yalnızca iki tür kabul edilir:
- **Kedi (`cat`)**
- **Köpek (`dog`)**

> 🚫 **KESİN KISIT:** Kuş, balık, kemirgen veya egzotik hayvan türleri Odi Pet ekosistemine eklenemez. Tüm protokoller, aşı markaları ve beslenme kataloğu sadece Kedi ve Köpek biyolojisine göredir.

### 2.2 Resmi Yaş Skalası Standardı (Mandatory Age Scale)
Uygulama genelinde kedi ve köpek yaş gruplandırması **istisnasız** aşağıdaki ölçeğe göre yapılacaktır:

| Yaş Aralığı | Yaş Grubu Etiketi | Yaşam Evresi Özellikleri |
| :--- | :--- | :--- |
| **0 – 1 Yaş** | **Yavru** (Puppy / Kitten) | Aşılama protokollerinin yoğun olduğu, büyüme ve kilo takibinin kritik olduğu dönem. |
| **1 – 7 Yaş** | **Yetişkin** (Adult) | Rutin yıllık aşı tekrarları, iç/dış parazit ve kilo koruma dönemi. |
| **7 – 12 Yaş** | **Yaşlı** (Senior) | Sağlık kontrollerinin sıklaştığı, böbrek/eklem gibi kronik durum takipleri. |
| **12+ Yaş** | **Yaşlı (12+)** (Super Senior) | Özel beslenme, medikal destek ve sık veteriner izleme dönemi. |

---

## 3. Hedef Kullanıcı Profilleri (Target Personas)

Veritabanı rollerinden (`user_role` enum) ve iş akışlarından doğrulanan 5 ana kullanıcı kategorisi:

```
                  ┌────────────────────────┐
                  │   Bireysel Pet Sahibi  │
                  └───────────┬────────────┘
                              │ (Ortak Sahiplik / Davet)
                  ┌───────────▼────────────┐
                  │ Aile Üyesi / Co-Owner  │
                  └───────────┬────────────┘
                              │ (Tıbbi İnceleme & Randevu)
                  ┌───────────▼────────────┐
                  │ Veteriner / Klinik Staff│
                  └───────────┬────────────┘
                              │ (Topluluk & SOS)
                  ┌───────────▼────────────┐
                  │ Sosyal & Topluluk Üyesi│
                  └───────────┬────────────┘
                              │ (Eşleşme & İlan)
                  ┌───────────▼────────────┐
                  │   Marketplace / Breeder│
                  └────────────────────────┘
```

1. **Bireysel Pet Sahibi (Primary Owner):** Petin ana sorumlusu. Aşı, parazit, beslenme ve bildirim akışlarını yönetir.
2. **Aile Üyesi / Ortak Sahip (Co-Owner):** `pet_owners` tablosu üzerinden yetkilendirilen ikinci sahip. Çift mama verilmesini ve aşı çakışmalarını engeller.
3. **Klinik Personeli / Veteriner (Clinic Staff / Vet):** `user_role = 'clinic_staff'`. Hastalarının dijital aşı karnelerine ve tıbbi geçmişine read-only erişir, randevuları yönetir.
4. **Sosyal & SOS Kullanıcısı (Community Member):** Sosyal akışta paylaşım yapan, kayıp pet (SOS) duyurularına anında yanıt veren topluluk üyesi.
5. **İlan & Üretici (Marketplace / Breeder):** `breeding_listings` ve `breeding_applications` modüllerini kullanarak sağlık onaylı eşleşme ilanları oluşturan kullanıcı.

---

## 4. Temel Değer Önerisi (Core Value Proposition)

- **Auto-Pilot Sağlık Takibi:** Kullanıcı bir aşı/parazit planı tanımladıktan sonra sistem sonraki doz tarihlerini (due date) otomatik hesaplar ve Push bildirimlerle hatırlatır.
- **Klinik Güvenilirlik & Sıfır Veri Kaybı:** Sağlık verileri asla fiziksel olarak silinmez (`is_archived = true`). Geriye dönük tüm tıbbi geçmiş korunur.
- **Yormayan UX (Progressive Profiling):** İlk girişte uzun ve sıkıcı formlar yoktur. Veri sadece ihtiyaç anında (bağlamsal olarak) talep edilir.
- **Şeffaf Yapay Zeka (Human-in-the-Loop):** AI tarafından taranan veya üretilen hiçbir veri habersiz kaydedilmez; kullanıcı onayına sunulur.

---

## 5. Mimari Sürüm & Sahiplik (Product Ownership)

- **Proje Sahibi (Project Owner):** Tufan  
- **Ana Teknolojiler:** Next.js 14 App Router, Supabase PostgreSQL, Tailwind CSS (OPOS Standard), Vercel, Web Push Service Worker, Gemini AI.  
- **Cross-Platform Desteği:** Responsive Web, Mobile Web, PWA (iOS/Android kılıfına uygun).  
