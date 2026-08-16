# Odi.Pet — Yayın Öncesi Denetim
## Adım 3: Çekirdek Ürün Akışları (Aşı Motoru, Modül Kapıları)
Tarih: 2026-08-15 · Kod değişikliği yapılmadı, yalnızca denetim.
Kapsam: `src/features/pets/vaccination-algorithm.ts`, `vaccine_protocols` şeması ve seed verisi, `src/lib/modules/registry.ts`, pet ekleme akışı.

---

## ✅ `ODIPET_AUDIT_CURRENT.md`'deki iki açık madde aslında çözülmüş

**1. Kuduz (yasal zorunlu) aşı boşluğu — ÇÖZÜLDÜ**
`vaccine_protocols` tablosunda `DOG_RABIES` (16. hafta + yıllık) ve `CAT_RABIES` (12. hafta + yıllık) satırları **`is_core = true`** olarak tanımlı. Algoritma `is_core` olan her protokolü plana aldığı için kuduz artık otomatik takvime giriyor. Sigorta uygunluk hesabını bozan boşluk kapanmış.

**2. Karma aşı modellemesi — ÇÖZÜLDÜ**
`DOG_CDV` artık üç ayrı satır değil, **tek bir "Gençlik Hastalığı (DHPPi) Protokolü"** satırı; notunda "Distemper, Hepatitis, Parvovirus, Parainfluenza kombine aşı" yazıyor. Kullanıcıya aynı enjeksiyon için 3 ayrı görev gösterme sorunu giderilmiş.

**🟡 Aksiyon:** `ODIPET_AUDIT_CURRENT.md` bu iki maddeyi hâlâ "açık / düzeltilmeyi bekliyor" olarak listeliyor — **belge bayat**. Yayın öncesi güncellenmeli, aksi halde ekip çözülmüş bir sorunu tekrar çözmeye çalışır veya gerçekten açık sanır.

---

## 🟡 BULGU 1 — `legal_required` mekanizması ölü kod, testler yanlış güven veriyor

`vaccination-algorithm.ts` satır 414-416:

```ts
const isIncluded =
  t.is_core ||
  (isLegalRequiredPlansEnabled() && t.mandatory_level === 'legal_required');
```

**Sorun:** Algoritma artık `vaccine_templates` yerine **`vaccine_protocols`** tablosundan okuyor (satır 380). `vaccine_protocols` şemasında **`mandatory_level` diye bir sütun yok** — ne başlangıç migration'ında (`20260605000001`) ne de sonraki `ALTER TABLE`'larda (yalnızca `category` ve `sort_order` eklenmiş).

Yani satır 403'teki `mandatory_level: p.mandatory_level` her zaman `undefined` dönüyor ve filtre koşulunun ikinci yarısı **hiçbir zaman `true` olmuyor**. Kuduz plana giriyor çünkü `is_core = true`, `legal_required` mekanizması yüzünden değil.

**Bunun üç sonucu var:**

1. **`ENABLE_LEGAL_REQUIRED_PLANS` env değişkeni hiçbir işe yaramıyor.** `false` yapsanız da, kaldırsanız da davranış değişmez. (Ayrıca `.env.example`'da da dokümante edilmemiş.)
2. **Testler gerçeği yansıtmıyor.** `vaccination-algorithm-legal-required.test.ts` mock verisinde `mandatory_level: 'legal_required'` alanını elle set ediyor — yani gerçekte var olmayan bir sütunu test ediyor. Test yeşil geçiyor ama ürettiği güven sahte: canlı veritabanında bu kod yolu hiç çalışmıyor.
3. **Mimari guard ölü kodu kilitliyor.** `architecture-guards.test.ts` Guard 5, dosyanın `isLegalRequiredPlansEnabled` metnini **içermesini zorunlu kılıyor**. Yani biri temizlemeye kalkarsa CI kırılır — ölü kod kalıcı hale getirilmiş.

**Risk seviyesi:** Bugünkü davranış **doğru** (kuduz plana giriyor), o yüzden launch-blocker değil. Ama ileride `is_core = false` ama yasal zorunlu bir aşı eklenirse (örneğin ülkeye özel bir zorunluluk), o aşı **sessizce plana girmez** ve kimse fark etmez — çünkü hem kod hem test bu senaryonun çalıştığını iddia ediyor.

**Öneri — iki seçenekten biri:**
- **(A) Sadeleştir:** `mandatory_level` filtresini, `isLegalRequiredPlansEnabled` fonksiyonunu, ilgili testi ve Guard 5'in o satırını kaldır. Tek doğruluk kaynağı `is_core` olsun. En temiz yol.
- **(B) Gerçekten uygula:** `vaccine_protocols` tablosuna `mandatory_level` sütunu ekle, kuduz satırlarını `legal_required` olarak işaretle, testleri gerçek şemaya göre yaz. Ülke bazlı yasal zorunluluk ayrımı ürün planında varsa bu doğru yatırım.

Şu anki üçüncü durum — "ne çalışıyor ne siliniyor, ama test ve guard tarafından korunuyor" — en kötüsü.

---

## ✅ Modül kapısı (feature gating) mimarisi sağlam

`src/lib/modules/registry.ts` içinde her modül `live` / `hidden` / `skeleton` olarak işaretlenmiş ve `getBlockedRoutes()` **`status !== 'live'` olan her şeyi** middleware'in `isBlockedPath` kontrolüne besliyor. Yani yarım kalmış modüller hem menüden düşürülüyor hem route seviyesinde 404'e çekiliyor. Tek bir kayıt satırını `live` yapmak modülü açmaya yetiyor — temiz, denetlenebilir bir yaklaşım.

**Yayın kapsamı (canlı modüller):** dashboard, takvim, social, profile, ai-vet, learn, vets, notifications, help, pet-budget, caregiver-card.

**Kapalı (hidden):** sos-page, pet-share-screen, insurance, services, marketplace, bookings, budget, events, messages, clinic-portal.
**İskelet (skeleton):** groomer, hotel, sitter, trainer.

**🟡 Doğrulama önerisi:** Bu listenin ürün tarafındaki lansman planıyla birebir örtüştüğünü teyit edin. Özellikle `clinic-portal` `hidden` — klinik kayıt sayfası (`/clinic/register`) ve `api/auth/clinic-register` route'u ise mevcut. Klinik onboarding'i lansmanda olacaksa modül `live` yapılmalı; olmayacaksa kayıt sayfasının da erişilebilir olmaması gerekir. Bu tutarsızlığı netleştirin.

---

## Özet Öncelik Tablosu

| # | Bulgu | Risk | Launch Blocker? |
|---|---|---|---|
| 1 | `legal_required` filtresi ölü kod; test + guard onu koruyor | 🟡 Orta | Hayır |
| 2 | `ODIPET_AUDIT_CURRENT.md` bayat — çözülmüş 2 maddeyi açık gösteriyor | 🟡 Orta | Hayır |
| 3 | `clinic-portal` hidden ama klinik kayıt akışı açık — kapsam tutarsızlığı | 🟡 Orta | Doğrulama gerekiyor |
| 4 | `ENABLE_LEGAL_REQUIRED_PLANS` `.env.example`'da yok (ve işlevsiz) | 🟢 Düşük | Hayır |

**Genel değerlendirme:** Aşı motorunun **çıktısı doğru** — kuduz planlanıyor, karma aşı tek görev olarak görünüyor. Sorun davranışta değil, kodun kendi hakkında söylediği şeyde: çalışmayan bir kod yolu, onu doğruluyormuş gibi görünen testler ve o kodu silinmez kılan bir CI guard'ı. Bu, ileride sessiz bir hataya dönüşecek türden bir teknik borç.

---

**Sıradaki adım (Adım 4): Ödeme & Abonelik (Stripe)** — webhook imza doğrulaması, idempotency, abonelik durum senkronizasyonu, `payments/portal` yetkilendirmesi, fiyat ID'lerinin env yapılandırması.

Bu adımdaki maddeleri değerlendirip nasıl ilerlemek istediğinizi söyleyin (özellikle Bulgu 1 için A mı B mi), sonra Adım 4'e geçelim.
