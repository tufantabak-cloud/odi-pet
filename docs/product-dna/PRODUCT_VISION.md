# Odi Pet - Product Vision

## 1. Neden Var? (Varoluş Amacı)
Odi Pet, evcil hayvan sahiplerinin dostlarının sağlık (aşı, parazit, hastalık), gelişim, beslenme, rutin bakım ve acil durum süreçlerini tek bir merkezden, karmaşadan uzak ve modern bir şekilde yönetebilmeleri için yaratılmış bir **Premium Pet Care Ecosystem (Premium Evcil Hayvan Bakım Ekosistemi)**'dir. Geleneksel, sıkıcı veya karmaşık veteriner/hayvan bakım uygulamalarının aksine, duygusal bağ kurmayı sağlayan sıcak bir arayüzle klinik hassasiyetini birleştirir.

## 2. Hangi Problemi Çözüyor?
- **Dağınık Sağlık Verisi:** Pet sahipleri aşı tarihlerini, kullanılan parazit damlalarını, veteriner notlarını ve kilo/gelişim verilerini farklı defterlerde, PDF'lerde veya WhatsApp mesajlarında tutarlar. Odi Pet bu veriyi tekilleştirir (Single Source of Truth).
- **Karmaşık Hatırlatmalar:** Aşı, parazit veya rutin bakım (tırnak kesimi vb.) periyotlarını akılda tutmak zordur. Odi Pet'in planlama ve bildirim motoru bu yükü kullanıcıdan alır.
- **Kullanıcı Yorgunluğu (Friction):** Mevcut uygulamalar uzun kayıt formları, karmaşık menüler ve gereksiz özelliklerle doludur. Odi Pet, "Progressive Profiling (Aşamalı Veri Toplama)" ile kullanıcıyı yormadan, sadece ihtiyaç duyulduğunda veri talep eder.
- **Güven Eksikliği:** İlaç, aşı ve hastalık takibinde oluşabilecek hatalı veri girişlerinin önüne geçmek için AI ve doğrulanmış iş kuralları (Vet onayı, OCR belge okuma, kesin yaş/kategori kuralları) kullanılır.

## 3. Sunduğu Temel Değer (Value Proposition)
- **Klinik Kesinlik, Premium His:** Medikal bir uygulamanın güvenilirliğini (veri bütünlüğü, RLS, kalıcı veri arşivleme) sunarken, lüks ve modern bir tüketici uygulamasının (Glassmorphism, tactile dokunsal mikro-animasyonlar, pürüzsüz UX) hissini verir.
- **Otomasyon (Auto-pilot Bakım):** Kullanıcı sadece bir plan oluşturur (veya veterinerden gelen belgeyi taratır), geri kalan tüm takip, zamanlama (upcoming, overdue) ve hatırlatma süreci sistem tarafından otonom yürütülür.
- **Evcil Hayvan Odaklılık:** İnsan odaklı tasarım öğeleri (örn. tenis raketi) reddedilir, her görsel öğe ve ikonografi doğrudan evcil hayvanların evrenine (kemik, mama kabı, kum küreği) aittir. 

## 4. Diğer Uygulamalardan Nasıl Ayrışıyor (Differentiators)?
- **One Product, One Style (OPOS):** Tasarım dilindeki radikal tutarlılık. Tüm bileşenlerin 24px radius, 8pt ızgara sistemi ve önceden belirlenmiş renk/token paletine sadık kalması.
- **Oyunlaştırmanın Reddi:** Puanlama, gereksiz rozetler veya karmaşık ödül sistemleri (gamification) kesinlikle yasaktır. Amaç basitlik ve minimum tıklamayla hedefe ulaştırmaktır.
- **Yapay Zeka Yönetişimi (Human-in-the-Loop):** AI asla habersiz veritabanına yazmaz. AI önerileri, OCR taramaları veya sağlık çıkarımları her zaman mor renkli bir "AI Indicator (Sparkles)" ile belirtilir ve mutlaka kullanıcının açık onayından (Taslak İnceleme Modalı) geçer.
- **Gerçek Zamanlı Senkronizasyon:** Cross-platform (Next.js SSR + PWA) yapısı sayesinde çevrimdışı önbellekleme ve anlık bildirim senkronizasyonu.
- **Dinamik Yönetim Paneli (Orchestrator):** Yeni özellikler kod yazmadan, admin panelindeki kural motoru üzerinden açılıp kapatılabilir.

## 5. Uzun Vadeli Ürün Vizyonu (Inferred from Code & Architecture)
Odi Pet, sadece kişisel bir "kayıt defteri" olmanın ötesine geçerek;
1. **Pazaryeri ve Uzman Ağı:** Veterinerler, eğitmenler ve pet kuaförlerinin dahil olduğu entegre bir hizmet ve rezervasyon ekosistemine (Expert Service & Marketplace) evrilme potansiyeli taşır.
2. **Akıllı Sağlık Öngörüsü:** Girilen gelişim, kilo, aşı ve alerji verilerini analiz ederek proaktif (koruyucu) veterinerlik tavsiyelerinde bulunacak AI tabanlı bir sağlık asistanı (Predictive Insights) olma hedefindedir.
3. **Sosyal Topluluk:** Pet sahiplerinin deneyimlerini ve hayvanlarının gelişimlerini paylaştığı, kayıp ilanlarının (SOS) hızlıca yayıldığı güvenli bir topluluk (Community) alanına doğru genişleyebilir.
