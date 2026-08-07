# Antigravity Görev Promptu — Aylık Gelişim & Galeri Takibi Modülü (Revize Plan v2)

> Bu prompt, "Deneyim Orkestratörü — Aylık Gelişim ve Galeri Takibi Modülü" planının kod denetimi sonrası revize edilmiş halidir.
> Önceki plan mevcut orkestratör motoruyla uyumsuzdu: kampanya ya hiç görünmüyor ya da 30 gün yerine 7 günde bir çıkıyordu.
> **Aşağıdaki 14 maddenin tamamı uygulanmadan görev tamamlanmış sayılmaz.**

---

## 0. Bağlam ve Değişmez Kurallar

- SSOT: Fotoğraflar `pet_gallery_bucket` storage + `pet_gallery` kanonik tablosu, `category = 'growth_timeline'`.
- OPOS Design Bible v1.0: Plus Jakarta Sans, `rounded-3xl` (24px radius), Lucide **rounded outline** ikonlar, `active:scale-[0.98]`, soft shadow, dondurulmuş renk token'ları.
- Tek seferde yalnızca 1 kampanya gösterilir (motor zaten böyle çalışır — bozma).
- Hiçbir mutation_action istemciden gelmez; her zaman `orchestrator_prompts` üzerinden sunucuda çözülür.
- Mevcut acil durum (SOS / `click_emergency_button`) kampanyasının davranışı **hiçbir şekilde bozulmayacak**. Regresyon testi zorunlu.

---

## 1. [MODIFY] `src/app/api/orchestrator/evaluate/route.ts` — Cooldown penceresi hatası (BLOCKER)

**Sorun:** Analytics sorgusu sabit `weekAgo` (7 gün) penceresi kullanıyor. `cooldown_hours: 720` (30 gün) için gerekli `lastSeen` kaydı pencerenin dışında kaldığından cooldown hesaplanamıyor ve kampanya 8. günde tekrar gösteriliyor.

**Yapılacak:**
- Aktif kampanyaların `cooldown_rules->>'cooldown_hours'` değerlerinin **maksimumunu** hesapla (varsayılan 24, taban 168 saat).
- Analytics sorgusunun `gte('created_at', ...)` alt sınırını bu maksimuma göre dinamik kur:
  `const lookbackHours = Math.max(168, ...campaigns.map(c => c.cooldown_rules?.cooldown_hours ?? 24))`
- Sorgu sırasını buna göre düzenle (kampanyalar analytics'ten **önce** çekilmeli).
- Performans için `orchestrator_analytics(profile_id, campaign_id, created_at)` bileşik indeksi ekle (bkz. madde 4).

**Kabul kriteri:** 29 gün önce `completed` kaydı olan kullanıcıya kampanya **dönmez**; 31 gün önce olana **döner**. Integration testle kanıtla.

---

## 2. [MODIFY] `src/app/api/orchestrator/evaluate/route.ts` — Tekrarlayan kampanya desteği (BLOCKER)

**Sorun:** `campaignCompleted.has(campaign.id) → continue`. Bir kez tamamlanan kampanya (emergency hariç) bir daha asla gösterilmiyor. Aylık tekrar eden kurgu bu mantıkla imkânsız.

**Yapılacak:**
- `orchestrator_campaigns.cooldown_rules` içine `"recurring": true` bayrağı ekle (JSONB, şema değişikliği gerektirmez).
- Motorda: kampanya `recurring === true` ise **completed-skip kuralı uygulanmaz**, yalnızca `cooldown_hours` kuralı uygulanır.
- `recurring` false/yok ise mevcut davranış aynen korunur (geriye dönük uyumluluk).

**Kabul kriteri:** Aylık kampanya, tamamlandıktan 30 gün sonra tekrar döner. Adres kampanyası (tek seferlik) tamamlandıktan sonra bir daha dönmez.

---

## 3. [MODIFY] `src/components/orchestrator/DynamicExperienceEngine.tsx` — `pet_id` iletimi (BLOCKER)

**Sorun:** Bileşen `petId` prop'unu alıyor ama ne `/evaluate` ne `/submit` gövdesine koyuyor. `submit` route'u `pet_id`'yi top-level bekliyor. Sonuç: galeri kaydı pet'siz kalır.

**Yapılacak:**
- `/api/orchestrator/evaluate` gövdesine `petId` ekle (motor ileride pet bazlı segmentasyon için kullanacak — madde 8).
- `/api/orchestrator/submit` gövdesine `pet_id: petId` ekle (top-level, mevcut zod şemasına uygun).
- `ComponentRegistry`'ye `SmartMonthlyGrowthPrompt` dynamic import'unu ekle.
- Bileşene `petId`'yi prop olarak da geçir (yükleme yolunu `${petId}/${filename}` kurmak için gerekli).

---

## 4. [NEW] `supabase/migrations/20260806123000_monthly_growth_orchestrator.sql` — Seed (BLOCKER düzeltmeleri dahil)

**Sorun:** Motor `.lte('start_date', now).gte('end_date', now)` filtresi uyguluyor; `start_date`/`end_date` NULL olan kampanya **hiç dönmez**. Önceki planda bu alanlar yoktu.

**Yapılacak — kampanya kaydı:**
```
name: 'Aylık Pet Gelişim ve Galeri Takibi'
status: 'active'
base_priority: 15
start_date: now()                    -- ZORUNLU, NULL olamaz
end_date: '2099-12-31T00:00:00Z'     -- ZORUNLU, NULL olamaz
trigger_events: ARRAY['on_load']     -- ZORUNLU (boş dizi + on_load dışı trigger = atlanır)
target_segment_rules: {"target_tags": ["pet_detail"]}
cooldown_rules: {"cooldown_hours": 720, "recurring": true}
```
**Prompt kaydı:**
```
component_name: 'SmartMonthlyGrowthPrompt'
mutation_action: 'SAVE_MONTHLY_GROWTH'
display_type: 'bottom_sheet'
ui_config: { başlık, açıklama, CTA metni, is_ai_generated: false }
```
**Ek DDL (aynı migration içinde):**
- `CREATE INDEX IF NOT EXISTS idx_orchestrator_analytics_profile_campaign_created ON public.orchestrator_analytics(profile_id, campaign_id, created_at DESC);`
- `CREATE INDEX IF NOT EXISTS idx_pet_gallery_pet_category_taken ON public.pet_gallery(pet_id, category, taken_at DESC);`

**Migration idempotent olmalı** (`ON CONFLICT DO NOTHING` / `WHERE NOT EXISTS`), tekrar çalıştırıldığında ikinci kampanya yaratmamalı.

**Not:** `base_priority = 15` değerini yazmadan önce prod DB'deki mevcut kampanyaların `base_priority` değerlerini sorgula ve acil durum (SOS) kampanyasını bastırmadığını doğrula. Bastırıyorsa değeri düşür.

---

## 5. [MODIFY] `src/components/orchestrator/DynamicExperienceEngine.tsx` + mount noktası (BLOCKER)

**Sorun:** `DynamicExperienceEngine` şu anda **yalnızca** `src/components/FloatingSOS.tsx` içinde ve `triggerEvent="click_emergency_button"` ile mount ediliyor. Aylık prompt'un tetikleneceği hiçbir yer yok → kullanıcı bunu asla görmez.

**Yapılacak:**
- Pet detay sayfasına (`src/app/owner/pets/[id]/PetDetailClient.tsx`) motoru mount et:
  ```
  <DynamicExperienceEngine
    contextTags={['pet_detail']}
    triggerEvent="on_load"
    petId={pet.id}
  />
  ```
- Mount, sayfa yükünü bloklamamalı: `dynamic(..., { ssr: false })` ile lazy yükle, `mounted` guard kullan (FloatingSOS'taki desenle aynı).
- Aynı sayfada birden fazla motor örneği çalışmadığından emin ol (çift `shown` event'i yasak).

---

## 6. [MODIFY] `src/app/api/orchestrator/submit/route.ts` — Dismiss `completed` sayılıyor (BLOCKER)

**Sorun:** Engine, kapatmada da `/submit`'e `payload: { _event: 'dismissed' }` gönderiyor; route ise koşulsuz `event_type: 'completed'` yazıp mutation switch'ini çalıştırıyor. Sonuç: vazgeçen kullanıcı "tamamladı" sayılıyor ve yeni case boş payload'la `pet_gallery`'ye yazmaya çalışıyor.

**Yapılacak:**
- Route başında: `if (payload._event === 'dismissed')` → `orchestrator_analytics`'e `event_type: 'dismissed'` yaz ve **mutation çalıştırmadan** `{ success: true }` dön.
- `completed` kaydı yalnızca mutation başarıyla tamamlandıktan **sonra** yazılsın (şu an mutation'dan önce yazılıyor; başarısız mutation da completed görünüyor).
- Mutation hata verirse `event_type: 'failed_validation'` yaz ve 4xx dön.

---

## 7. [MODIFY] `src/app/api/orchestrator/submit/route.ts` — `SAVE_MONTHLY_GROWTH` case (BLOCKER: NOT NULL + IDOR)

**Sorunlar:** (a) `pet_gallery.user_id` NOT NULL ve RLS `auth.uid() = user_id`; önceki plan bu alanı yazmıyordu → insert patlar. (b) Pet sahipliği doğrulanmıyor → IDOR. (c) `image_url` istemciden geliyor, whitelist yok → keyfi URL yazılabilir.

**Yapılacak:**
```
case 'SAVE_MONTHLY_GROWTH': {
  1. pet_id zorunlu; yoksa 400.
  2. SAHİPLİK KONTROLÜ: pets/pet_memberships üzerinden pet_id'nin user.id'ye ait
     olduğunu doğrula (projedeki mevcut kanonik yetki helper'ını kullan,
     yeni mantık YAZMA). Değilse 403.
  3. image_url doğrulaması: yalnızca kendi Supabase storage public URL'i ve
     yalnızca `/pet_gallery_bucket/${pet_id}/` prefix'i kabul edilir.
     Aksi halde 400. (Harici URL kesinlikle reddedilir.)
  4. caption: trim + max 200 karakter (zod).
  5. taken_at: istemciden gelen değeri KABUL ETME veya gelecekteki tarihi reddet;
     yoksa new Date().toISOString() kullan.
  6. INSERT pet_gallery { pet_id, user_id: user.id, image_url, caption,
     taken_at, category: 'growth_timeline' }
  7. Insert hatasında failed_validation + 400.
}
```
Zod ile ayrı bir `monthlyGrowthPayloadSchema` tanımla; `z.record(z.any())` gevşekliğine güvenme.

---

## 8. [MODIFY] `src/app/api/orchestrator/evaluate/route.ts` — Gerçek hedefleme (kritik eksik)

**Sorun:** Kampanya yalnızca cooldown'a dayanıyor. Dün fotoğraf yükleyen kullanıcı da, hiç yüklemeyen de aynı prompt'u alıyor. `target_segment_rules` şu an sadece contextTags AND eşleşmesi destekliyor.

**Yapılacak:**
- `target_segment_rules` içine deklaratif koşul desteği ekle:
  `{"target_tags": ["pet_detail"], "requires": {"no_gallery_photo_in_days": 30, "category": "growth_timeline"}}`
- Motor, `requires.no_gallery_photo_in_days` varsa `pet_gallery`'den ilgili pet + kategori için en son `taken_at`'i sorgulasın; 30 günden yeni foto varsa kampanyayı **atla**.
- Bu kontrol `petId` gerektirir (madde 3). `petId` yoksa koşul sağlanamaz → kampanya atlanır (güvenli varsayılan).
- Kod genelleştirilebilir olsun; her yeni kampanya için motor değiştirmek gerekmesin.

---

## 9. [NEW] `src/components/orchestrator/prompts/SmartMonthlyGrowthPrompt.tsx`

- Prop sözleşmesi mevcut `OrchestratorPromptComponentProps` ile **birebir** aynı olsun (`open`, `onClose`, `onSubmit`, `uiConfig`, `displayType`) + `petId`.
- Referans olarak `SmartAddressPrompt.tsx` ve `SmartWeightPrompt.tsx` desenlerini kullan; yeni desen icat etme.
- Akış (maksimum 2 adım, OPOS "az tıklama" ilkesi): fotoğraf seç → (opsiyonel not) → Kaydet.
- Yükleme: dosya `pet_gallery_bucket`'a `${petId}/${uuid}.${ext}` yoluna yüklenir, public URL alınır, `onSubmit({ image_url, caption, taken_at })` çağrılır.
- İstemci tarafı doğrulama: yalnızca image/jpeg|png|webp, max 5MB, aksi halde toast (07.17) ile hata.
- OPOS: `rounded-3xl`, Plus Jakarta Sans, Lucide outline ikonlar (`Camera`, `ImagePlus`, `X`), `active:scale-[0.98]`, mobilde bottom_sheet (07.16) / desktop'ta modal (07.15), yükleme sırasında skeleton/spinner (07.14).
- Bileşen Yönetişimi (OPOS Cilt 3): önce mevcut bileşenleri kullan, gerekirse genişlet; yeni bileşen üretirsen Brand Book'a dokümante et.
- **Yeni bileşen `export default` olmalı** (dynamic import bu şekilde çalışıyor).

---

## 10. [MODIFY] `src/components/pets/tabs/GalleryTab.tsx` — Kategori şeması (kritik eksik)

**Sorun:** `CategorySchema = z.enum(['general','health','document','memory','daily'])` içinde `growth_timeline` yok. Yeni fotoğraflar galeride "Genel" görünür, kategori sekmesinde filtrelenemez, zod parse edilen yerlerde hata riski var.

**Yapılacak:**
- `CategorySchema`'ya `'growth_timeline'` ekle.
- `categoryLabels`'a `growth_timeline: 'Gelişim'` ekle.
- Filtre sekmelerinde ve rozet gösteriminde doğru göründüğünü doğrula.
- Bu enum'un başka yerlerde kullanılıp kullanılmadığını grep'le ve hepsini güncelle.

---

## 11. [MODIFY] Galeri kotası: ücretsiz plan 5 fotoğraf, sonrası premium (BLOCKER — ÜRÜN KARARI VERİLDİ)

**Ürün kararı:** Ücretsiz planda evcil hayvan başına **5 fotoğraf** limiti uygulanacaktır (mevcut 10 değeri **5'e düşürülüyor**). 5. fotoğraftan sonra kullanıcı premium'a yönlendirilir. Premium limiti 200 olarak kalır.

**Sorun 1 — Kota yalnızca istemcide:** `GalleryTab.tsx:73` → `maxPhotosAllowed = isPremium ? 200 : 10` ve kontrol yalnızca `handleFileChange` içinde. Yeni `SAVE_MONTHLY_GROWTH` route'unda hiçbir kota kontrolü yok → ücretsiz kullanıcı prompt üzerinden limitsiz yükleyebilir, ödeme duvarı tamamen bypass edilir.

**Sorun 2 — Kota sabiti SSOT değil:** Limit magic number olarak bileşenin içinde. Yeni route ile birlikte iki ayrı yerde tekrar edecek ve kaçınılmaz olarak birbirinden ayrışacak.

**Yapılacak:**

**11.a — [NEW] `src/lib/plans/galleryQuota.ts` (tek doğruluk kaynağı)**
```ts
export const GALLERY_PHOTO_LIMIT_FREE = 5
export const GALLERY_PHOTO_LIMIT_PREMIUM = 200
export function getGalleryPhotoLimit(isPremium: boolean): number
```
Limit değerleri **yalnızca burada** tanımlanır. Başka hiçbir dosyada sayı hard-code edilmez.

**11.b — [MODIFY] `src/app/api/orchestrator/submit/route.ts` (sunucu tarafı zorlama)**
`SAVE_MONTHLY_GROWTH` case'inde, sahiplik doğrulamasından sonra ve insert'ten önce:
1. `profiles.premium_until` okunarak `isPremium` hesaplanır (`premium_until > now()`), `GalleryTab`'daki mantıkla birebir aynı olmalı.
2. `pet_gallery` içinde ilgili `pet_id` için `count: 'exact', head: true` ile mevcut fotoğraf sayısı alınır.
3. `count >= getGalleryPhotoLimit(isPremium)` ise:
   - Insert **yapılmaz**, storage'a yüklenen dosya varsa temizlenir (bkz. 11.e).
   - `orchestrator_analytics`'e `event_type: 'failed_validation'`, `event_data: { reason: 'gallery_quota_exceeded', limit, count }` yazılır.
   - `403` + `{ error: 'gallery_quota_exceeded', limit, upgrade_required: true }` döner.
4. İstemci bu yanıtı yakalayıp `PaywallCard`/upgrade CTA gösterir (bkz. 11.d).

**Bu kontrol istemciye bırakılamaz.** Sunucu tarafı zorlama olmadan madde tamamlanmış sayılmaz.

**11.c — [MODIFY] `src/components/pets/tabs/GalleryTab.tsx`**
- `maxPhotosAllowed` artık `getGalleryPhotoLimit(isPremium)` çağrısından gelir; `10` ve `200` sabitleri kaldırılır.
- `PaywallCard` açıklama metni dinamik limitle güncellenir: "Ücretsiz planda evcil hayvan başına en fazla **5** fotoğraf yükleyebilirsiniz. Odi Pro ile 200 fotoğrafa kadar yükleyin."
- Kalan hak göstergesi eklenir (ör. "3 / 5 fotoğraf") — kullanıcı limite sürpriz şekilde çarpmasın (OPOS: "kullanıcı kolay ve anlaşılır hissetmeli").

**11.d — [MODIFY] `SmartMonthlyGrowthPrompt.tsx`**
- Prompt açılışında kota doluysa yükleme alanı yerine doğrudan premium yönlendirmesi (upgrade CTA) gösterilir; kullanıcıya boşuna dosya seçtirilmez.
- `submit` 403 `gallery_quota_exceeded` dönerse toast (07.17) + upgrade CTA gösterilir, prompt hata vermeden kapanır.

**11.e — Yetim dosya (orphan) temizliği**
Bileşen dosyayı storage'a **yükledikten sonra** `submit` çağırıyor. Kota/403/400 durumunda storage'da yetim dosya kalır. İki seçenekten biri uygulanmalı:
- (Tercih edilen) Yükleme öncesi kota kontrolü için hafif bir ön-kontrol yapılır **ve** başarısız `submit` sonrası istemci yüklediği dosyayı `storage.remove()` ile siler.
- Veya `src/app/api/cron/storage-cleanup/route.ts` yetim dosya temizliğini zaten kapsıyorsa, bu senaryonun kapsandığı doğrulanır ve not düşülür.

**11.f — [MODIFY] `src/app/api/orchestrator/evaluate/route.ts` (gereksiz prompt gösterme)**
`target_segment_rules.requires` içine `"gallery_quota_available": true` koşulu eklenir; kotası dolu ücretsiz kullanıcıya kampanya **hiç gösterilmez** (ad-fatigue limitini boşa harcamamak ve kullanıcıyı hayal kırıklığına uğratmamak için). Seed'deki `requires` bloğu buna göre güncellenir.

**11.g — MEVCUT KULLANICILAR (kritik — karar gerektirir)**
Limit 10 → 5 düşürüldüğü için, hâlihazırda 6–10 fotoğrafı olan ücretsiz kullanıcılar limit üstünde kalacak.
- **Mevcut fotoğraflar ASLA silinmez veya gizlenmez.** Yalnızca yeni yükleme engellenir.
- Bu kullanıcılara gösterilecek mesaj ayrıca yazılmalı: "Planınızın fotoğraf limiti güncellendi. Mevcut fotoğraflarınız korunuyor; yeni fotoğraf eklemek için Odi Pro'ya geçin." — jenerik "limit doldu" metni bu grup için yanıltıcıdır.
- Uygulama öncesi prod'da kaç ücretsiz kullanıcının 5'ten fazla fotoğrafı olduğu sorgulanıp raporlanmalı; sayı yüksekse ürün sahibine geri bildirim verilmeli.

**11.h — Dokümantasyon**
Limit değişikliği (10 → 5) `CHANGELOG.md`'ye ve varsa fiyatlandırma/plan dokümanına yazılmalıdır. Bu bir **ürün/fiyatlandırma değişikliğidir**, sessizce yapılmaz.

**Kabul kriteri:**
- 5 fotoğrafı olan ücretsiz kullanıcı, hem `GalleryTab`'dan hem orkestratör prompt'undan 6. fotoğrafı yükleyemez; her iki yolda da premium CTA görür.
- API'ye doğrudan istek atılsa dahi 403 `gallery_quota_exceeded` döner (istemci bypass edilemez).
- Premium kullanıcı 200'e kadar yükleyebilir.
- Limit üstündeki mevcut ücretsiz kullanıcıların fotoğrafları görünmeye devam eder.

---

## 12. Ad-fatigue etkileşimi (doğrulama)

`GLOBAL_MAX_PROMPTS_PER_DAY = 3` limiti aylık kampanyayı bastırabilir. Aylık kampanyanın günlük limite takılıp sessizce kaybolmadığını test et; takılıyorsa kampanya sıraya alındığı için ertesi gün çıkabilmeli (cooldown yalnızca `completed`/`dismissed` sonrası işlemeli, `shown`+abandon durumu ayrı ele alınmalı).

---

## 13. Test Planı (önceki plan yetersizdi)

**Otomatik:**
- `npx tsc --noEmit` ve `npm run lint` — sıfır hata.
- **Integration testler (`vitest.integration.config.mts`), zorunlu:**
  1. 29 gün önce `completed` → kampanya dönmez. 31 gün önce → döner. (madde 1+2)
  2. `start_date`/`end_date` dolu kampanya `evaluate`'ten döner.
  3. Başkasının `pet_id`'si ile `SAVE_MONTHLY_GROWTH` → 403.
  4. Harici `image_url` ile submit → 400.
  5. `_event: 'dismissed'` → `pet_gallery`'ye insert **yok**, analytics `dismissed`.
  6. Başarılı akış → `pet_gallery`'de `category='growth_timeline'` ve `user_id = auth.uid()` kaydı.
  7. Son 30 gün içinde `growth_timeline` fotoğrafı olan pet için kampanya dönmez. (madde 8)
  8. **Regresyon:** SOS / `click_emergency_button` kampanyası eskisi gibi çalışıyor.
  9. **Kota:** 5 fotoğrafı olan ücretsiz kullanıcının `SAVE_MONTHLY_GROWTH` isteği → 403 `gallery_quota_exceeded`, `pet_gallery`'ye insert yok.
  10. **Kota:** 4 fotoğrafı olan ücretsiz kullanıcı → başarılı insert (5'e çıkar).
  11. **Kota:** premium kullanıcı 5'in üstünde yükleyebiliyor.
  12. **Kota:** kotası dolu kullanıcıya `/evaluate` kampanyayı döndürmüyor (madde 11.f).

**Manuel:**
- `/api/orchestrator/evaluate` çağrısında tek seferde yalnızca 1 kampanya döndüğü doğrulanır.
- Prompt mobil (bottom sheet) ve desktop (modal) görünümünde OPOS uyumluluğu kontrol edilir.
- Yükleme sonrası fotoğrafın Galeri sekmesinde "Gelişim" kategorisi altında göründüğü doğrulanır.
- **Otonom denetim kuralı gereği** (AGENTS.md): tamamlandığında browser subagent ile uçtan uca UX denetimi çalıştırılır ve rapor üretilir.

---

## 14. Dokümantasyon

- `CHANGELOG.md`: motor davranış değişiklikleri (dinamik cooldown penceresi, `recurring` bayrağı, `requires` segment kuralı, dismiss/completed ayrımı) açıkça yazılsın — bunlar tüm kampanyaları etkileyen **kırıcı olmayan ama davranışsal** değişikliklerdir.
- OPOS Cilt 3: yeni bileşen dokümante edilip dondurulsun.

---

## Teslim Kriteri

Aşağıdakilerin hepsi doğru olduğunda görev tamamlanmış sayılır:

1. Kampanya pet detay sayfasında gerçekten görünüyor.
2. Tamamlandıktan sonra **tam 30 gün** boyunca görünmüyor, 30. günden sonra tekrar görünüyor.
3. Son 30 günde gelişim fotoğrafı yüklemiş pet için hiç görünmüyor.
4. Kaydedilen foto `pet_gallery`'de `category='growth_timeline'`, doğru `user_id` ve `pet_id` ile duruyor; galeride "Gelişim" olarak listeleniyor.
5. Başka kullanıcının pet'ine veya harici URL ile yazma denemesi reddediliyor.
6. SOS kampanyası davranışında hiçbir regresyon yok.
7. `tsc`, `lint` ve 8 integration testin tamamı yeşil.
