# Odi Pet - Product Overview

## 1. Ürün Amacı ve Temel Çerçeve
Odi Pet, evcil hayvan (kedi ve köpek) sahiplerinin dostlarına ait tüm sağlık, aşı, parazit, beslenme, rutin bakım ve acil durum süreçlerini tek bir dijital merkezden, pürüzsüz ve modern bir deneyimle yönetmesini sağlayan **Cross-Platform (Web, Mobile & PWA)** pet bakım ekosistemidir.

## 2. Temel Kullanıcı Problemi
- **Veri Dağınıklığı ve Kaybı:** Fiziksel aşı karnelerinin kaybolması, geçmiş tıbbi bilgilerin ve veteriner notlarının unutulması.
- **Takip Zorluğu:** Rutin iç/dış parazit uygulamalarının, karma aşı tarihlerinin ve mama yenileme zamanlarının unutulması.
- **Süreç Karmaşası:** Farklı bakım ve sağlık modüllerinin (beslenme, kilo takibi, rutin banyo/tırnak kesimi) ayrı uygulamalarda veya defterlerde yürütülmeye çalışılması.
- **Tıbbi Hata Riski:** Yanlış aşı dozu/zamanlaması veya tekrarlayan hatalı kayıtlar.

## 3. Hedef Kullanıcı Kütlesi ve Hayvan Türleri
- **Kullanıcılar:** Bireysel pet sahipleri, çoklu pet sahipleri, aile ortak sahipleri (multi-owner family), veteriner klinik personeli/hekimleri, ilan/üretici kullanıcıları.
- **Desteklenen Hayvan Türleri:** **Kedi (Cat)** ve **Köpek (Dog)**. (Not: Veritabanı seviyesinde `pets_species_check` kısıtlaması ile yalnızca Kedi ve Köpek desteklenmektedir).

## 4. Ana Ürün Alanları & Modüller
1. **Pet Core:** Evcil hayvan profili, ırk/tür, biyometrik veriler, dijital pet kartı, fotoğraflar, çoklu sahiplik.
2. **Medical & Preventive Health (Aşı & Parazit):** Aşı protokolleri v2, parazit yönetim motoru, tıbbi geçmiş, reçeteler, alerjiler.
3. **Nutrition (Beslenme):** Mama kataloğu, stok takip, refill engine, kilo/boy gelişim takibi, OCR ambalaj/içerik tarama.
4. **Care (Rutin Bakım):** Tırnak kesimi, banyo, tüy bakımı, diş temizliği, rutin hijyen.
5. **Planning & Agenda (Planlama & Ajanda):** Tekrarlayan görevler, due date hesaplama, overdue statüsü, takvim senkronizasyonu.
6. **Notifications & Automation (Bildirimler & Otomasyon):** Web Push, VAPID, Service Worker, cron tabanlı bildirim motoru, doğum günü & hatırlatıcı akışları.
7. **AI Asistanı & OCR:** Gemini destekli aşı karnesi/belge okuma, akıllı beslenme/sağlık tavsiyeleri, mor yıldız (`Sparkles`) AI göstergesi.
8. **Reproductive (Üreme & Kızgınlık):** Kızgınlık döngü takibi (Estrus tracker), eşleşme/üreme başvuru modülü.
9. **Emergency & Lost Pets (SOS & Kayıp):** Acil durum veteriner rehberi, 7/24 kayıp ilanı sihirbazı (Lost Pet Wizard).
10. **Experts & Services:** Veteriner arama, klinik randevuları, bakıcı/kuaför yönlendirmeleri.
11. **Admin & Experience Orchestrator:** Dinamik özellik yönetimi, kural motoru, A/B ve profilleme pop-up yönetimi.

## 5. Ana Kullanıcı Yolculuğu (Main Journey Map)
```
Kayıt / Login (OTP / Passkey / OAuth)
  ↓
Onboarding (Tek tıkla tür, isim, yaş alımı - Progressive Profiling)
  ↓
Pet Dashboard (Dijital Pet Kartı, Yaklaşan Görevler, Sağlık Özeti)
  ↓
Sağlık & Bakım Ekleme (Manuel / OCR Fotoğraf Tarama)
  ↓
Otomatik Plan & Görev Oluşumu (Vaccine/Parasite Protocols)
  ↓
Zamanlanmış Bildirimler (Push Notification / Cron Engine)
  ↓
Tamamlama & Zaman Çizelgesi Güncellemesi (Timeline & Health Score)
```
