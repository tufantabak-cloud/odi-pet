# Odi Pet — Product Weaknesses & Areas for Redesign

> **Sürüm:** 2.0.0-AI  
> **Konum:** `c:\Odi.Pet\docs\product-dna\claude-package\13_PRODUCT_WEAKNESSES.md`  
> **Kapsam:** Yeniden Tasarlanacak Zayıf Alanlar ve İyileştirme Fırsatları  

---

## 1. Zayıf Alan 1: Kalabalık Alt Navigasyon (Navigation Overload)

- **Problem:** Alt barda 5-6 farklı ikonun bulunması ve merkezde karmaşık aksiyon butonlarının (FAB) yer alması.
- **Yeniden Tasarım Çözümü:** 4 Ana Sekmeli Temiz Yapı (Anasayfa/Dashboard, Takvim/Ajanda, Sağlık/Bakım, Profil) + Tek Merkezi "+" Hızlı Ekleme Sheet'i.

---

## 2. Zayıf Alan 2: Aşı ve Parazit Ekleme Formlarının Uzunluğu

- **Problem:** Kullanıcı aşı eklerken marka, seri no, uygulayan veteriner, belge yükleme gibi 8 farklı alanla tek ekranda karşılaşabiliyor.
- **Yeniden Tasarım Çözümü:** 2 Adımlı Hızlı Ekleme (1. Aşı Tipi & Tarih, 2. Opsiyonel Detaylar) veya Doğrudan Fotoğraf Çekerek OCR Taraması.

---

## 3. Zayıf Alan 3: Statik Mama Stok Tahmini

- **Problem:** Kullanıcı her gün mamayı verip vermediğini manuel işaretlemek zorunda kalabiliyordu.
- **Yeniden Tasarım Çözümü:** Otonom Günlük Porsiyon Düşüm Motoru. Kullanıcı hiçbir tuşa basmasa dahi sistem her gece 00:00'da porsiyonu düşer ve stoku güncel tutar.

---

## 4. Zayıf Alan 4: Sağlık Verisinden Kopuk Sosyal Akış

- **Problem:** Topluluk sekmesinin evcil hayvanın sağlık ve gelişim durumundan bağımsız genel bir forum gibi kalması.
- **Yeniden Tasarım Çözümü:** Sağlık Miltaşları (Örn: "Luna bugün Karma 2 aşısını oldu! 🐶") paylaşımlarının otomatik topluluk akışına entegre edilebilmesi.
