# Adım 3 — Doğrulama Raporu
Bağımsız kontrol: `git show`, kaynak okuma, `tsc --noEmit`, dosya kodlaması (`file`, `xxd`). Kod değişikliği yapılmadı.

## ✅ Doğrulananlar

| # | İddia | Sonuç |
|---|---|---|
| 1 | Commit + push (`3e4d38c`) | ✅ **Doğrulandı.** `origin/phase18-wip` ile senkron. Bu sefer düzeltme ile commit aynı turda yapılmış — süreç iyileşmesi işe yaradı. |
| 2 | `isLegalRequiredPlansEnabled` + `mandatory_level` filtresi kaldırıldı | ✅ **Doğrulandı.** Filtre koşulu ve fonksiyon tanımı `vaccination-algorithm.ts`'den silinmiş. |
| 3 | Yanıltıcı test dosyası silindi | ✅ **Doğrulandı.** `vaccination-algorithm-legal-required.test.ts` (207 satır) diskte yok. |
| 4 | CI Guard 5 gevşetildi | ✅ **Doğrulandı.** Guard artık yalnızca `is_core` semantiğini koruyor, ölü kodu kilitlemiyor. `scripts/check-architecture-guards.mjs` de güncellenmiş. |
| 5 | `clinic-portal` API rotası kapatıldı | ✅ **Doğrulandı.** `extraRoutes` listesine `/api/auth/clinic-register` ve `/clinic/register` dahil 12 rota eklenmiş; modül `hidden` olduğu için `getBlockedRoutes()` hepsini middleware'e bildiriyor. Kapsam tutarsızlığı kapandı. |
| 6 | `tsc --noEmit` | ✅ **Doğrulandı.** 0 hata. |

---

## 🔴 BULGU 1 — `ODIPET_AUDIT_CURRENT.md` karakter kodlaması bozuldu

Dosya yeniden yazılırken **UTF-8 yerine ISO-8859 (Windows ANSI)** olarak kaydedilmiş. Tüm Türkçe karakterler bozulmuş:

```
## A��k Sorunlar
�u an i�in kritik bir a��k sorun bulunmamaktad�r.
1. **Yasal Zorunlu A�� (Kuduz) Bo�lu�u**: ��Z�LD�.
```

Doğrulama:
- `file ODIPET_AUDIT_CURRENT.md` → `ISO-8859 text` (aynı commit'teki `registry.ts` ve `vaccination-algorithm.ts` → `UTF-8 text`, yani sorun sadece bu dosyada)
- Ham bayt kontrolü: `A e7 fd k` — UTF-8 çok baytlı dizisi değil, tek baytlı Latin-1 kodlaması.

**İronik durum:** Bayat dokümanı düzeltmek için yapılan işlem, dokümanı okunamaz hale getirdi. İçerik doğru (kuduz ve karma aşı maddeleri "ÇÖZÜLDÜ" olarak taşınmış), ama Türkçe metin bozuk.

**Ek not:** Bu, Adım 1'de eklenen `.gitattributes`'un yakalayamayacağı bir sorun — `.gitattributes` satır sonlarını yönetir, karakter kodlamasını değil. Sorunun kaynağı büyük olasılıkla dosyayı yazan PowerShell/araç zincirinin varsayılan ANSI kodlaması (`Out-File` varsayılanı gibi).

**Öneri:** Dosyayı UTF-8 olarak yeniden yazın. Ayrıca dosya yazan alt ajanlara/script'lere UTF-8 kodlaması zorunlu kılınmalı (PowerShell'de `-Encoding utf8`). Aksi halde aynı hata başka Türkçe dokümanlarda da tekrar eder.

---

## 🟡 BULGU 2 — Aynı sınıftan bir ölü kod satırı gözden kaçtı

`vaccination-algorithm.ts` satır 492 hâlâ duruyor:

```ts
const enrichedTemplate: VaccineTemplate = {
  ...
  is_core: t.mandatory_level === 'core',   // ← mandatory_level yok, hep false
  ...
};
```

Bu, temizlenen kodla **birebir aynı hata**: `t` nesnesi `vaccine_protocols`'tan mapleniyor ve `mandatory_level` alanı yok, dolayısıyla bu ifade **her zaman `false`** dönüyor. Hemen üstteki mapping'de (satır 401) doğru değer `is_core: p.is_core` olarak zaten mevcut — burada `t.is_core` yazılmalıydı.

**Bugünkü etkisi:** Zararsız. `processPlanItemsForTemplate()` fonksiyonunun gövdesini inceledim, `template.is_core` alanını **hiç okumuyor**. Yani yanlış değer hiçbir yere akmıyor.

**Neden yine de düzeltilmeli:** Bu alan `VaccineTemplate` tipinin bir parçası ve ileride biri "aşı zorunlu mu" kontrolü için `template.is_core` okuduğu anda, sessizce **her aşı opsiyonel** görünecek. Tam olarak az önce temizlediğimiz sahte-güven tuzağının aynısı.

**Öneri:** `t.mandatory_level === 'core'` → `t.is_core` olarak düzeltilsin. Tek satır.

---

## Adım 3 Durum Özeti

| # | Madde | Durum |
|---|---|---|
| Ölü `legal_required` kodu, testi, guard'ı | ✅ Temizlendi |
| `clinic-portal` API rotası kapatma | ✅ Doğrulandı |
| `ODIPET_AUDIT_CURRENT.md` içeriği | ✅ Güncel |
| `ODIPET_AUDIT_CURRENT.md` kodlaması | 🔴 Bozuk (ISO-8859) |
| `vaccination-algorithm.ts:492` artık ölü kod | 🟡 Açık |

İkisi de launch-blocker değil, ama ikisi de küçük ve hızlı düzeltilebilir. Bunlar kapatıldığında Adım 3 tamamen kapanır.

---

**Sıradaki adım (Adım 4): Ödeme & Abonelik (Stripe)** — webhook imza doğrulaması, idempotency (aynı event'in iki kez işlenmesi), abonelik durum senkronizasyonu, `payments/portal` yetkilendirmesi, fiyat ID'lerinin ortam yapılandırması ve ödeme yapılandırılmamışken UI'ın yanıltıcı başarı göstermemesi.
