# Odi Pet — Reinvention Boundaries ("Safe to Reinvent")

> **Sürüm:** 2.0.0-AI  
> **Konum:** `c:\Odi.Pet\docs\product-dna\claude-package\16_REINVENTION_BOUNDARIES.md`  
> **Kapsam:** Odi Pet 2.0 Tasarımında Serbestçe Yeniden İcat Edilebilecek ve Dokunulmayacak Alanlar  

---

## 1. YENİDEN İCAT EDİLMESİ SERBEST ALANLAR (SAFE TO REINVENT)

Sıfır-legacy bir Odi Pet 2.0 uygulamasında ürün mimarı ve AI aşağıdaki alanları daha iyi bir kullanıcı deneyimi sunmak amacıyla tamamen sıfırdan kurgulayabilir:

### 1.1 Bilgi Mimarisi & Navigasyon Yapısı
- **Serbestlik:** Alt gezinme çubuğunun (Bottom Bar) sekme sayısı, sıralaması, FAB aksiyon menüsünün sunum biçimi tamamen yeniden tasarlanabilir. (Örn: 6 sekme yerine 4 ana sekme + Hızlı Ekle Sheet'i).

### 1.2 Sayfa Yerleşimi & Kart Grid Düzeni (Screen Layouts)
- **Serbestlik:** Dashboard üzerindeki widget'ların dikey/yatay dizilimi, kartların yan yana kaydırılabilir (carousel) veya liste şeklinde sunumu serbesttir.

### 1.3 Modal ve Dialog Sunum Biçimleri
- **Serbestlik:** Formların tam sayfa wizard, merkezlenmiş modal veya alttan açılan Bottom Sheet (Drawer) şeklinde sunulması serbesttir.

### 1.4 Dashboard Widget Kişiselleştirmesi
- **Serbestlik:** Kullanıcının ana ekrandaki kartları sürükleyip bırakarak (drag-and-drop) yeniden sıralamasına izin verilebilir.

---

## 2. KESİNLİKLE DOKUNULMAYACAK ALANLAR (NOT SAFE TO REINVENT)

> 🚫 **YASAK ALANLAR:** Aşağıdaki mimari unsurlar yenilik adı altında DEĞİŞTİRİLEMEZ:

1. Veritabanı kanonik şema yapısı ve RLS güvenlik politikaları.
2. Tıbbi verilerin kalıcı arşivlenme (`is_archived = true`) kuralı.
3. Kedi ve Köpek haricinde yeni tür ekleme veya yaş skalası gruplarını değiştirme.
4. AI çıktılarında Human-in-the-Loop onay modalını kaldırıp otomatik kayıt yapma.
5. Plus Jakarta Sans fontunu veya 24px radius anayasasını keyfi piksel tanımlarıyla bozma.
