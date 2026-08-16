# Odi Pet — Catalog of Current Problems & UX Friction

> **Sürüm:** 2.0.0-AI  
> **Konum:** `c:\Odi.Pet\docs\product-dna\claude-package\11_CURRENT_PROBLEMS.md`  
> **Kapsam:** Bilinen Hatalar, UI Karmaşası, Teknik Borçlar ve UX Sürtünme Kataloğu  

---

## 1. UX ve Kullanıcı Deneyimi Sürtünmeleri

### 1.1 İlk Giriş (Onboarding) Aşırı Veri İsteği
- **Sorun:** Eski akışta kullanıcı kaydolur kaydolmaz mikroçip numarası, pasaport numarası, veteriner hekim adı ve kısırlık detayları gibi tek bir uzun form ekranıyla karşılaşıyordu.
- **Etkisi:** Kullanıcı uygulamadan değer almadan önce "form doldurma yorgunluğu" yaşayarak uygulamayı terk ediyordu.
- **Çözüm Vizyonu:** Progressive Profiling ile yalnızca Tür, İsim ve Yaş alınmalı; gerisi bağlamsal istenmelidir.

### 1.2 Navigasyon Karmaşası ve Kalabalık Menü
- **Sorun:** Alt gezinme çubuğunda (Bottom Navigation) 6 farklı sekme ve üst üste binen FAB butonları karmaşa yaratıyordu.
- **Etkisi:** Mobil ekranda başparmak erişim alanı daralıyor, yanlış tıklamalar oluyordu.

---

## 2. Mimari ve Veri Modeli Borçları (Technical Debt)

### 2.1 Veri Yapısı Çakışması (`plans` vs `health_schedules`)
- **Sorun:** Sağlık görevleri hem legacy `plans` tablosunda hem de yeni `health_schedules` tablosunda kısmen kopyalanıyordu.
- **Etkisi:** Senkronizasyon gecikmelerinde takvim ve dashboard kartları farklı durumlar gösterebiliyordu.
- **Çözüm Vizyonu:** Odi Pet 2.0'da strictly tek bir kanonik `health_schedules` verisi kullanılacaktır.

### 2.2 OCR Yükleme Hata Yönetimi Eksikliği
- **Sorun:** Kamera ile aşı belgesi taratılırken sunucu zaman aşımına ulaştığında kullanıcıya jenerik bir hata veriliyordu.
- **Etkisi:** Kullanıcı taramanın tamamlanıp tamamlanmadığını anlayamıyordu.

---

## 3. Visual Design & Token İhlalleri (Legacy Bugs)

### 3.1 Keyfi Piksel Sızmaları (Arbitrary Tailwind Values)
- **Sorun:** Eski bileşenlerde `text-[13px]`, `p-[11px]`, `rounded-[14px]` gibi OPOS anayasasına uymayan keyfi piksel tanımları kalmıştı.
- **Etkisi:** Ekranlar arasında görsel ritim ve font tutarsızlıkları görünüyordu.

### 3.2 Yanlış İkon Kullanımı (İnsani İkonlar)
- **Sorun:** Bazı eski bakım modüllerinde tenis raketi ve steak et ikonu kullanılmıştı.
- **Etkisi:** OPOS İnsani İkon Yasağı kuralını ihlal ediyordu.
