# Antigravity görev emri — Alt navigasyon düzeltmesi

**Tarih:** 2 Ağustos 2026
**Öncelik:** Yüksek (canlı UI hatası)
**Kapsam:** Yalnızca alt navigasyon (BottomNav) ve modül kaydı uzlaştırma mantığı

---

## 1. Belirti

Mobil alt menü şu an şöyle görünüyor:

```
[avatar]  Sosyal   (+)   Takvim   Menü   Profil
```

Üç sorun var:

1. **Fazladan Profil butonu** — hem soldaki avatar hem sağdaki "Profil" aynı yere gidiyor (mükerrer).
2. **Yanlış sıralama** — Takvim, Anasayfa'nın hemen sağında olmalı; şu an (+) butonunun sağına düşmüş.
3. **Fazla öğe** — 5 öğe + FAB var. Hedef 4 öğe + FAB.

**Hedef durum:**

```
Anasayfa   Takvim   (+)   Sosyal   Profil
```

---

## 2. Kök neden analizi (doğrulanacak)

Menü iki kaynaktan besleniyor:

- `navigation_items` tablosu (canlı veri, `/admin/navigation` üzerinden yönetiliyor)
- `src/lib/modules/registry.ts` → `resolveNavItems()` (modül kaydı)

`resolveNavItems()` iki iş yapıyor: kapalı modüle işaret eden DB satırlarını düşürüyor, DB'de karşılığı olmayan canlı modülleri ekliyor. Hatanın buradan çıktığı değerlendiriliyor:

**H1 — Mükerrer kayıt (en olası).**
`resolveNavItems` mükerrer kontrolünü `href` eşitliğiyle yapıyor:

```ts
const presentPaths = new Set(kept.map(i => i.href.split(/[?#]/)[0]))
```

DB'deki satırın `href` değeri kayıttakinden birazcık farklıysa (sondaki `/`, farklı büyük-küçük harf, `/owner/profile/index` gibi bir varyant) eşleşme tutmuyor ve kayıt **ikinci bir Profil** ekliyor. Aynı durum avatar butonu için de geçerli olabilir.

**H2 — Sıralama ölçeği çakışması.**
DB satırlarının `order_index` değerleri ile modül kaydındaki `order` değerleri aynı ölçekte değil. Birleştirilip sıralanınca Takvim yanlış yere düşüyor. Kayıttaki değerler: Anasayfa 1, Takvim 2, Sosyal 4, Profil 5.

**H3 — Öğe sayısı sınırı yok.**
`resolveNavItems` kaç öğe döneceğini sınırlamıyor. `BottomNav` ise (+) butonunu `Math.floor(uzunluk / 2)` konumuna yerleştiriyor; öğe sayısı değişince (+) yanlış yere kayıyor.

---

## 3. Yapılacak işler

### Adım 1 — Teşhis (önce bunu yap, çıktısını paylaş)

`navigation_items` tablosundaki `slot = 'bottom_nav'` satırlarını listele:

```sql
select id, label, href, icon, slot, order_index, is_active, match_type
from navigation_items
where slot = 'bottom_nav'
order by order_index;
```

Şunları raporla:
- Kaç satır var, `href` değerleri tam olarak ne?
- `/owner/profile` satırı var mı, `href`'i birebir `/owner/profile` mi?
- Ekrandaki soldaki avatar butonu hangi satırdan geliyor — yoksa `BottomNav` içinde ayrı bir bileşen mi?

> Avatar butonu DB satırı değil de ayrı bir bileşense, sorun mükerrerlik değil tasarım kararıdır; bu durumda Adım 3'e geç ve avatarı Profil ile birleştir.

### Adım 2 — `resolveNavItems` sağlamlaştırması

Dosya: `src/lib/modules/registry.ts`

1. **Yol normalizasyonu ekle.** Karşılaştırmadan önce `href`'i normalize eden bir yardımcı yaz: sorgu/fragment at, sondaki `/` at, küçük harfe çevir. Hem `presentPaths` kümesinde hem modül tarafında bu normalize edilmiş değeri kullan.

2. **Sıralamayı tek ölçeğe indir.** DB `order_index` değerlerini olduğu gibi kullanmak yerine, nihai sıralamayı **modül kaydındaki `order`** belirlesin. Kayıtta `order` tanımlı olan öğeler önce ve kendi sıralarıyla, kayıtta olmayan DB öğeleri sonra gelsin.

3. **Öğe sayısını sınırla.** `bottom_nav` için en fazla **4** öğe dönsün (FAB hariç). Fazlası varsa kayıttaki `order` değeri büyük olanlar elensin ve `console.warn` ile hangi öğenin elendiği loglansın.

### Adım 3 — `BottomNav` yerleşimi

Dosya: `src/components/BottomNav.tsx`

- (+) butonu **her zaman tam ortada** olsun: 4 öğede 2. ve 3. arasında. `Math.floor(uzunluk / 2)` hesabı 4 öğe için doğru sonucu verir, ancak öğe sayısı 4'ten farklıysa bozulur — Adım 2.3 ile birlikte bu garanti altına alınmış olacak.
- Soldaki avatar butonu ayrı bir bileşense ve Profil ile aynı yere gidiyorsa, **avatarı kaldır**; Profil sekmesi kalsın. (Alternatif: Profil sekmesinin ikonu avatar olsun, ikisi tek öğeye indirgensin — tercih sende, ancak sonuçta tek Profil girişi olmalı.)

### Adım 4 — DB temizliği

Teşhiste mükerrer veya artık satır çıkarsa `navigation_items` tablosunda düzelt:
- `href` değerlerini modül kaydındakiyle **birebir** aynı yaz (sondaki `/` olmadan).
- Kapatılmış modüllerin satırlarını `is_active = false` yap (kod zaten süzüyor, ama tablo da tutarlı olsun).
- Takvim için satır eklemeye **gerek yok** — modül kaydı zaten ekliyor. Eklersen `href` tam olarak `/owner/takvim` olmalı.

---

## 4. Kabul kriterleri

- [ ] Alt menü tam olarak: `Anasayfa · Takvim · (+) · Sosyal · Profil`
- [ ] Tek Profil girişi var
- [ ] `navigation_items` tablosu boşken de, doluyken de aynı sonuç çıkıyor (ikisini de test et)
- [ ] Kapalı modüller (Hizmetler, Mağaza, Bütçe, Etkinlikler, Mesajlar) menüde görünmüyor
- [ ] `npx tsc --noEmit` temiz
- [ ] `npm run build` hatasız

---

## 5. DOKUNULMAYACAK dosyalar

Aşağıdaki dosyalar pet profilindeki timeline düzenini içeriyor ve bu görevin kapsamı dışındadır. Değiştirilmemeli:

- `src/components/health-tracker/HealthTracker.tsx` (MD5: `c4750ad77d635da5fecea348e740aa10`)
- `src/components/ui/primitives/TimelineChip.tsx` (MD5: `f3ad978f2cc8c8677fa0a53633115b8f`)
- `src/app/owner/pets/[id]/PetDetailClient.tsx` (MD5: `7d86cd30372dd0249fa560199b32b10a`)

İş bitiminde bu üç dosyanın MD5 özetini tekrar alıp yukarıdakilerle aynı olduğunu raporla.

---

## 6. Bağlam: modül kaydı nasıl çalışıyor

`src/lib/modules/registry.ts` "hangi modül açık/kapalı" sorusunun tek yetkili kaynağıdır. Her modülde `status` (`live` / `hidden` / `skeleton`), `version`, `slots`, `note` ve kapalıysa `opensWhen` alanları var.

- Bir modülü açmak/kapatmak = yalnızca `status` alanını değiştirmek.
- `src/proxy.ts` kapalı route'ları `isBlockedPath()` ile engelliyor.
- Menüler `getNavModules()` ve `resolveNavItems()` üzerinden besleniyor.

**Kapalı modülün kodu silinmez**, yalnızca gizlenir.

Bilinen açık iş (bu görevin kapsamı dışında, ayrıca ele alınacak):
`src/proxy.ts` kapalı adresleri `/404` yoluna rewrite ediyor; App Router'da böyle bir route yok. Şu an çalışıyor çünkü olmayan yol not-found'u tetikliyor, ancak kırılgan.
