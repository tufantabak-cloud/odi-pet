# Odi.Pet UX Audit Raporu: Karne ve Beslenme Sayfaları

## Hedef Sayfalar
1. **Karne (Pet Profile):** `http://localhost:3000/owner/pets/[id]`
2. **Beslenme:** `http://localhost:3000/owner/pets/[id]/nutrition`

## 1. Düzen (Layout) Analizi
- **Karne Sayfası:** `flex flex-col gap-6` ve `mx-auto` kullanılarak genel olarak düzenli bir yapı kurulmuş. Ancak `PetDetailClient.tsx` içindeki ana kapsayıcı `<div className="flex flex-col gap-6 pb-20 w-full mx-auto">` şeklinde ayarlanmış. 
- **Beslenme Sayfası:** Benzer şekilde `NutritionClient.tsx` dosyasında ana div `<div className="flex flex-col gap-6 pb-20 w-full mx-auto">` yapısına sahip.

## 2. Güvenli Alan Paddingleri (Safe Area / pb-safe)
- Her iki sayfada da ana kapsayıcılarda `pb-20` (80px) padding kullanılmış. Ancak iOS ve çentikli mobil cihazlarda gezinme çubuğu (Home indicator) ile çakışmaları önlemek için **`pb-safe`** (örneğin `pb-[calc(80px+env(safe-area-inset-bottom))]`) kullanımı **eksik**. 
- **Geliştirme Önerisi:** Ana container sınıflarına güvenli alan boşluğu eklenmelidir.

## 3. Etkileşimli Alanlar ve Buton Büyüklükleri (Hitbox 44x44px kuralı)
- **Karne Sayfası:**
  - *Profili Düzenle İkonu:* `w-8 h-8` (32x32px) boyutunda tanımlanmış (Satır 1008 civarı). Bu boyut, mobil dokunmatik standartı olan min 44x44px'in (veya 50px) altındadır ve tıklama zorluğu yaratabilir. En az `w-11 h-11` (44px) yapılmalı veya hitbox'u artırmak için padding eklenmelidir.
  - *Geri Dön Butonu:* Padding eksikliği var, tıklama alanı dar kalıyor.
- **Beslenme Sayfası:**
  - *Tab Menüsü (Mama & Stok, Öğünler vb.):* `px-4 py-2.5` kullanılmış. Toplam yükseklik yaklaşık 40px civarında kalıyor. Minimum 44px hedefini karşılamıyor. `py-3` olarak güncellenebilir.
  - *Profile Dön Butonu:* Hitbox çok küçük. Dokunulabilir alanın (padding) artırılması gerekiyor.
  - *Kaydet Butonları:* `py-3.5` (~48px) kullanılmış, standartlara uygun.

## 4. Görsel Kaymaları (CLS - Cumulative Layout Shift)
- **Karne ve Beslenme:**
  - Profil fotoğraflarında (`<Image fill={true} />`) kullanılarak önceden boyut verilmiş (relative bir `w-20 h-20` ve `w-16 h-16` kutusu içinde). Bu sayede sayfa yüklenirken CLS sorunu oluşmuyor.
  - İçerik geçişleri ve tab yüklemeleri (animate-fadeIn) nispeten pürüzsüz.

## Özet Geliştirme Önerileri
1. Tüm ana sayfa kapsayıcılarındaki `pb-20` sınıfları `pb-[calc(5rem+env(safe-area-inset-bottom))]` veya projede tanımlıysa `pb-safe` ile desteklenmeli.
2. `PetDetailClient.tsx` dosyasındaki "Profili Düzenle" kalem ikonunun boyutu `w-11 h-11` olarak güncellenmeli.
3. Geri Dön (Back) butonlarına (her iki sayfada da) `p-2 -m-2` gibi sınıflar eklenerek görsel boyutu büyümeden tıklama alanı (hitbox) büyütülmeli.
4. Beslenme sayfasındaki sekmelerin (Tab) `py` değerleri artırılarak 44px standartlarına çıkarılmalı.
