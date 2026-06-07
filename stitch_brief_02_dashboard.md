# Odi.Pet — Stitch Redesign Brief #02
## Dashboard (Ana Sayfa)

---

## 1. DASHBOARD'UN ROLÜ

Dashboard, giriş yaptıktan sonra kullanıcının her gün ilk gördüğü ekrandır. Temel görevi:
- Pet sağlık durumunu **tek bakışta** özetlemek
- Gecikmiş veya yaklaşan görevleri öne çıkarmak
- Hızlı aksiyon almayı kolaylaştırmak
- Modüllere giriş noktası olmak

---

## 2. MEVCUT YAPI ANALİZİ (Ne Var, Ne Eksik)

### Mevcut Bölümler (Yukarıdan Aşağı)
1. **Selamlama** — "Merhaba, [İsim]" + alt metin
2. **Pet Slider** — Yatay kaydırılabilir kare kartlar (fotoğraf + isim + yaş)
3. **Smart Card** — Tek, bağlam duyarlı akıllı kart (parazit / aşı sonrası / venue)
4. **Pet Günlüğü Quick Action** — Tek satır kart, "Kaydet +" butonu
5. **Yaklaşan Etkinlikler** — Tarih kutulu timeline listesi (5 öğe)

### Mevcut Sorunlar
- Pet slider kartlarında **son besleme saati ve kilo** gibi istatistikler toplanıyor ama gösterilmiyor — veri boşa gidiyor
- **Smart Card** tek kart gösteriyor, diğer kartlar sıraya giriyor ama görünmüyor
- Sağlık skoru (0–100) hesaplanıyor ama dashboardda gösterilmiyor
- **Modül kısayolları yok** — kullanıcı pet detayına girip sekme seçmek zorunda
- Gecikmiş görev sayısı pet kartlarında badge olarak var ama çok küçük
- Aşı, beslenme, veteriner gibi modüller dashboard'dan doğrudan erişilemiyor

---

## 3. SUNULACAK HİZMETLER & VERİLER (Dashboard'a Taşınacaklar)

### A. Pet Özet Kartı (Güçlendirme)
Her pet için gösterilebilecek veriler:
| Veri | Kaynak | Durum |
|------|--------|-------|
| İsim + fotoğraf | `pets` tablosu | ✅ Mevcut |
| Tür + yaş | `pets.birth_date` | ✅ Mevcut |
| Sağlık skoru (0–100) | hesaplama | ✅ Var ama gösterilmiyor |
| Gecikmiş görev sayısı | `health_schedules` | ✅ Var ama küçük badge |
| Son besleme (X saat önce) | `nutrition_logs` | ✅ Hesaplanıyor, gösterilmiyor |
| Güncel kilo | `weight_logs` | ✅ Hesaplanıyor, gösterilmiyor |

### B. Modül Kısayol Izgara (Yeni)
Dashboard'dan tek dokunuşla erişilmesi gereken 6 modül:

| Modül | Renk | İkon | Route |
|-------|------|------|-------|
| Sağlık & Aşı | Mavi | Vaccine/FirstAid | `/owner/pets/[id]` → Aşı sekmesi |
| Beslenme | Amber/Turuncu | Bowl | `/owner/pets/[id]/nutrition` |
| Bakım | Pembe | Shampoo | `/owner/pets/[id]/care` |
| AI Vet | Mor | Stethoscope | `/owner/ai-vet` |
| Veteriner Bul | İndigo | Carrier | `/owner/vets` |
| Günlük | Primary | Kalem | `/owner/pets/[id]/journal` |

### C. Smart Aksiyon Kartları (Mevcut — Güçlendirilmeli)
Bağlam duyarlı, sırayla gösterilen kartlar:
1. **Dış Parazit** — "Bugün uygulama zamanı" → "Uygulamayı İşaretle"
2. **Aşı Sonrası Takip** — Son 24 saatte aşı varsa → "İştahı Kaydet"
3. **Pet Dostu Mekanlar** — Passive upsell → "/owner/services"
> Kart kapatılınca (Daha Sonra) bir sonraki kart gelir

### D. Yaklaşan Etkinlikler Timeline (Mevcut — İyileştirilmeli)
- Son 30 günün 5 görevi
- Her öğe: tarih kutusu + görev adı + pet adı + durum badge
- Badge renkleri: Bugün=warning, Yarın=primary, Gecikmiş=error, 3+ gün=success

### E. Pet Günlüğü Quick Action (Mevcut)
- "Yeni Durum Kaydet" → İştah, ruh hali, beslenme, aktivite, not

---

## 4. ÖNERİLEN DASHBOARD LAYOUT (Stitch'e Hedef)

```
─────────────────────────────────
  Selamlama (isim + tarih)
─────────────────────────────────
  Pet Kartları (yatay scroll)
  [Fotoğraf + İsim + Sağlık Skoru 
   + Son Besleme + Gecikmiş görev badge]
─────────────────────────────────
  Modül Kısayolları (2×3 ızgara)
  [Aşı] [Beslenme] [Bakım]
  [AI Vet] [Vet Bul] [Günlük]
─────────────────────────────────
  Smart Aksiyon Kartı
  (Parazit / Aşı Takip / Venue)
─────────────────────────────────
  Pet Günlüğü Quick Action
─────────────────────────────────
  Yaklaşan Etkinlikler (Timeline)
─────────────────────────────────
```

---

## 5. PLATFORM & RENK REFERANSI

```
Platform:        Mobile-first PWA, 390px referans genişlik
Bottom nav:      72px yükseklik — içerik pb-32 ile korunmalı
Header:          64px sticky — içerik pt olmadan başlar

Ana renk:        #4F2DBA
Arka plan:       #F8FAFC (+ primary/7 radial gradient)
Yüzey:          #FFFFFF
Border:          #F1F5F9
Metin ana:       #0F172A
Metin ikincil:   #64748B
Hata:            #EF4444
Başarı:          #22C55E
Uyarı:           #FACC15

Kart radius:     20px
Buton radius:    14px
Input radius:    12px
```

---

## 6. BÖLÜM DETAYLARI

### 6.1 Selamlama Bölümü
- Saat bazlı dinamik: "Günaydın / İyi günler / İyi akşamlar, [İsim]"
- Alt satır: bugünün tarihi veya "X aktif göreviniz var"
- Sağda: bildirim ikonu (NotificationBell)

### 6.2 Pet Kartları
Mevcut: kare kart, fotoğraf + isim + yaş

**Beklenti:** Kartta aşağıdakiler görünmeli:
- Büyük fotoğraf (üst %65)
- Alt kısımda: İsim + yaş (beyaz metin, gradient overlay üzerinde)
- **Sağlık skoru halkası** (küçük, sağ üst köşe) — 0–100 arası, renk: yeşil/sarı/kırmızı
- **Gecikmiş görev sayısı** badge'i (kırmızı, belirgin)
- **Son besleme** bilgisi (alt bilgi şeridi: "3 sa. önce beslendi")
- Hover/tap: hafif scale-up

### 6.3 Modül Kısayolları Izgara
- 2 sütun × 3 satır veya 3 sütun × 2 satır (tasarım kararı Stitch'in)
- Her hücre: gradyan arka plan + yarı-3D SVG ikon + modül adı
- Renk şeması modüle özel (brief bölüm 3B'den)
- Tıklanınca: Pet seçim ekranı (birden fazla pet varsa) veya direkt modüle

### 6.4 Smart Aksiyon Kartı
- Hafif mor/warning renkli sol kenar çizgisi (kart tipi rengine göre)
- İkon (sol) + Başlık + Açıklama metni
- CTA butonu (primary) + "Daha Sonra" ghost buton
- Kart tiplerine göre ikon/renk:
  - Parazit → PillIcon + teal/turkuaz vurgu
  - Aşı takibi → VaccineIcon + mavi vurgu
  - Mekanlar → HouseIcon + mor vurgu

### 6.5 Pet Günlüğü Quick Action
- Mevcut tasarım işlevsel, iyileştirme beklentisi: görsel hiyerarşiyi netleştir
- Kalem ikonu + başlık + alt metin + sağda "Kaydet +" butonu

### 6.6 Yaklaşan Etkinlikler
- Her öğe minimum 60px yükseklik (touch target)
- Tarih kutusu: gün (büyük) + ay kısaltması (küçük) — bg-bg-main rounded
- Görev adı (bold) + pet adı (secondary)
- Sağ: durum badge (rounded-full, renkli arka plan + border)
- Sağa swipe ile "Tamamlandı" aksiyonu (opsiyonel, Stitch kararı)

---

## 7. DURUMA GÖRE EKRANLAR

### Durum A: Pet Yok
- Büyük welcome kartı
- "İlk Can Dostunu Ekle" CTA (btn-primary, full-width)
- Modül kısayolları gizli

### Durum B: Pet Var, Görev Yok
- Pet kartları görünür
- Smart Card yerine: "Tüm görevleriniz tamam 🎉" empty state
- Timeline: "Yaklaşan etkinlik yok" empty state

### Durum C: Pet Var, Gecikmiş Görev Var (Normal Durum)
- Tüm bölümler aktif
- Gecikmiş görev badge'leri error rengiyle pulse animasyon

---

## 8. DEĞİŞTİRİLMEMESİ GEREKENLER

- Yatay scroll snap davranışı (pet slider)
- Smart Card mantığı (parazit → aşı takibi → venue sırası)
- Timeline'ın 5 öğe limiti
- Badge renk anlamları (kırmızı=gecikmiş, sarı=bugün, mavi=yarın, yeşil=uzak)
- Bottom nav ile içerik çakışmasını önleyen `pb-32` boşluğu

## 9. STITCH'E SERBEST BIRAKILAN ALANLAR

- Selamlama bölümünün layout ve tipografi düzeni
- Pet kartı iç hiyerarşisi (sağlık skoru halkasının pozisyonu vb.)
- Modül ızgarasının sütun sayısı ve hücre boyutu
- Smart Card'ın sol kenar çizgisi yerine farklı vurgu yöntemi kullanımı
- Timeline öğelerinin görsel işlenmesi
- Genel boşluk ve padding dengesi
- Selamlama bölümüne tarih/görev sayısı eklenmesi kararı

---

*Odi.Pet Stitch Brief #02 — 2026-06-06*
