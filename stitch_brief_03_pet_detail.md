# Odi.Pet — Stitch Redesign Brief #03
## Pet Detay Sayfası `/owner/pets/[id]`

---

## 1. SAYFANIN ROLÜ

Bu sayfa uygulamanın kalbidir. Kullanıcının en çok zaman geçirdiği ekran. Her pet için:
- Kimlik ve sağlık özetini görüntüler
- Tüm bakım görevlerini yönetir
- 8 modüle (Sağlık, Aşı, Bakım, Beslenme, Hijyen, Aktivite, Veteriner, Diğer) accordion ile erişim sağlar
- Haftalık takvim şeridi + günlük görev listesi içerir
- Profil tamamlama widget'ı barındırır
- Acil durum (SOS) paneline erişim verir

---

## 2. PLATFORM & RENKLER

```
Viewport:        375–390px (mobile-first)
Bottom nav:      72px — içerik pb-32 ile korunmalı
Header:          64px sticky

Primary:         #4F2DBA
Arka plan:       #F8FAFC
Yüzey:           #FFFFFF
Border:          #F1F5F9
Metin ana:       #0F172A
Metin ikincil:   #64748B
Hata:            #EF4444
Başarı:          #22C55E
Uyarı:           #FACC15

Kart radius:     20px
Buton radius:    14px
```

---

## 3. MEVCUT SAYFA YAPISI (Yukarıdan Aşağıya)

### 3.1 Üst Bar
- **← Dön** linki (sol)
- **"[Pet Adı]'nın AI Asistanı"** butonu (sağ, primary, 🧠 ikonu)

### 3.2 Pet Hero Kartı
- Mor üst şerit (gradient)
- **Avatar** (96×96px, rounded-24px) — sol
- **Düzenle** ikonu (sağ üst köşe, kalem)
- **Pet adı** (22–26px, extrabold)
- **Tür + ırk** (14px, secondary)
- **Yaş badge** (🎂 ile)
- **Kilo badge** (⚖️ ile)
- **Boy badge** (📏 ile)
- **Cinsiyet** bilgisi
- **Mikroçip** badge (📡 ile)
- ---
- **Acil Durum footer** (SOS butonu — border-top ile ayrılmış)

### 3.3 Profili Zenginleştir Widget (koşullu)
- Sol kenar primary bordür
- "🌟 Profili Zenginleştir" başlık + % tamamlanma badge
- Progress bar (primary rengi)
- Açılır/kapanır (chevron)
- Eksik bilgiler chip buton listesi:
  - Fotoğraf Ekle / Irk Bilgisi Gir / Veteriner Bilgisi Gir
  - İlk Aşısını Gir / Kimlik & Çip Bilgisi
  - Kilo & Boy Bilgisi Gir / Kullandığı Mamayı Ekle
  - SOS Ağı Kur / Biyometrik Giriş Tanımla

### 3.4 Görevler & Ajanda Bölümü (`id="pet-tasks"`)
**Üst bar:**
- "Görevler & Ajanda" başlık
- 🚨 Gecikmiş görev sayısı butonu (varsa, error rengi)

**Haftalık Takvim Şeridi:**
- Yatay kaydırılabilir, 7 gün
- Her hücre: 60×72px, gün kısaltması + tarih sayısı + görev dot'ları (max 3)
- Seçili gün: primary border + bg
- Bugün: ayrı stil

**Günlük Görev Listesi (seçili güne göre):**
- Gecikmiş görevler (bugün için) ayrı blok
- Günün görevleri liste
- Her görev satırı: ikon + başlık + kategori + saat + aksiyon menüsü (⋮)
- Görev aksiyonları: ✓ Tamamlandı / 📅 1 Gün Ertele / ✏️ Düzenle / ❌ Sil
- Boş durum: "✨ Bugün için planlı görev yok"

### 3.5 Büyüme Grafiği
- Mini kilo/boy trend çizgi grafiği
- "+ Kilo/Boy Ekle" butonu

### 3.6 Irk Sağlık Kartı (BreedHealthCard)
- Irka özgü sağlık bilgileri
- Dikkat edilmesi gereken hastalıklar

### 3.7 İnsan Yaşı Hesaplayıcı (HumanAgeCalculator)
- Pet yaşı → insan yaşı karşılığı

### 3.8 Sağlık ve Bakım Accordion (8 Modül)
Her modül için:
- Accordion başlık: ikon (renkli kare bg) + modül adı + bekleyen görev sayısı badge + ok
- Açıldığında: görev listesi + "Görev Planla" CTA banner

**8 Modül:**
| Modül | Renk | İkon |
|-------|------|------|
| Sağlık | Kırmızı | FirstAid |
| Aşı | Mavi | Vaccine |
| Bakım | Pembe | Shampoo |
| Beslenme | Turuncu | Bowl |
| Hijyen | Teal | Scoop |
| Aktivite | Yeşil | Bone |
| Veteriner | Mor | Carrier |
| Diğer | Gri | House |

### 3.9 Ek Sekmeler (Alt kısım)
- Aile (FamilyTab) — bakıcı/ortak sahip davet
- Raporlar (ReportsTab)
- Galeri (GalleryTab)
- Eşleşme (MatchTab)
- Bütçe (BudgetTab)
- Sahiplendirme (AdoptionTab)

---

## 4. MODALler

| Modal | Tetikleyici | İçerik |
|-------|------------|--------|
| SmartTaskWizard | Görev planla butonları | 4 adımlı görev oluşturucu |
| QuickUpdateModal | Kilo/boy güncelle | Tek alan form |
| SmartScanner | Tarama butonu | QR/belge kamera tarayıcı |
| FloatingSOS | SOS butonu | Acil durum panel |
| LostPetWizard | Kayıp ihbar | Kayıp bildirme akışı |

---

## 5. MEVCUT SORUNLAR / İYİLEŞTİRME ALANLARI

1. **Hero kart bilgi yoğunluğu** — Kilo, boy, yaş, cinsiyet, mikroçip hepsi aynı anda badge olarak görünüyor. Görsel hiyerarşi zayıf.

2. **Görev şeridi ile accordion arasında bağlantı yok** — Kullanıcı haftalık şerit'ten görevi görüp, aynı görevi modülde bulmak için aşağı kaydırmak zorunda.

3. **Sağlık skoru hero'da yok** — Dashboard'da hesaplanıp gösterilen skor, pet detayında eksik.

4. **Accordion çok uzun** — 8 modül accordion tüm kapalıyken bile sayfayı uzatıyor. Compact düzen gerekiyor.

5. **AI Asistanı butonu başlıkta kaybolabiliyor** — Küçük ekranlarda metin kısalıyor.

6. **Profili Zenginleştir widget'ı** — Önemli bir özellik ama tasarımı dikkat çekmiyor.

---

## 6. STITCH'E HEDEF LAYOUT

```
─────────────────────────────────
  ← Dön         [AI Asistanı]
─────────────────────────────────
  HERO KARTI
  ┌─────────────────────────────┐
  │ [Avatar]  İsim              │
  │           Tür • Irk         │
  │           [Sağlık Skoru]    │
  │  ─────── istatistik chip'ler│
  │  Acil Durum [SOS]           │
  └─────────────────────────────┘
─────────────────────────────────
  Profili Zenginleştir (varsa)
─────────────────────────────────
  GÖREVLER & AJANDA
  [Pzt] [Sal] [Çar] [Per] [Cum] [Cmt] [Paz]
  ──────────── seçili gün görevleri ────────
─────────────────────────────────
  SAĞLIK VE BAKIM (8 accordion)
  [Sağlık ▶]  [Aşı ▶]  badge'ler
  [Bakım ▶]   [Beslenme ▶]
  ...
─────────────────────────────────
  Büyüme + Irk Bilgisi
─────────────────────────────────
  Ek Sekmeler (Aile / Rapor / vb.)
─────────────────────────────────
```

---

## 7. DEĞİŞTİRİLMEMESİ GEREKENLER

- `id="pet-tasks"` anchor (dashboard timeline linklerinden buraya derin bağlantı var)
- FloatingSOS bileşeninin varlığı ve konumu
- SmartTaskWizard modal akışı (4 adım)
- Haftalık şerit mantığı (7 gün, bugün seçili)
- Accordion modüllerinin sırası ve renk kodlaması
- Görev aksiyonları (tamamla / ertele / düzenle / sil)

## 8. STITCH'E SERBEST BIRAKILAN ALANLAR

- Hero kartın avatar + bilgi layout düzeni
- Sağlık skoru'nun hero'da konumu (halka mı, linear bar mı, badge mi)
- Bilgi chip'lerinin görselleştirilmesi (kilo, boy, yaş)
- Accordion header'ının compact tasarımı
- Haftalık şeridin görsel stili (daire mi, kare mi, pill mi)
- Profili Zenginleştir widget'ının vurgu stili
- Ek sekmeler navigasyon düzeni

---

*Odi.Pet Stitch Brief #03 — 2026-06-06*
