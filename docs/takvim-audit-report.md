# Takvim Sayfası Veri Görünürlüğü — Denetim Raporu
Tarih: 2026-08-02  |  Test hesabı: `tufan.tabak@gmail.com` (`4f1256db-2a84-434d-852c-bdba22e538ca`)  |  Referans pet: ODİ (`49448c35-72b5-4522-ac31-caf1961340f4`)

## 1. Özet
Alt navigasyon Takvim sayfası (`/owner/takvim`), kanonik ajanda toplama servisini (`buildPetAgendaEvents`) çağırmak yerine `/api/calendar` endpoint'i üzerinden yalnızca artık kullanılmayan `health_schedules` ve `appointments` tablolarını sorgulamaktadır. Ayrıca istemci ve sunucu katmanındaki `completed` filtreleri tüm gerçek tıbbi kayıtları (`displayStatus: 'completed'`) %100 oranında elemekte, RLS politikaları co-owner/bakıcı planlarını engellemekte ve alan adı uyumsuzlukları (`scheduled_at` vs `appointment_date`, `measured_at` vs `recorded_at`) veri kayıplarına yol açmaktadır.

---

## 2. Sayım Zinciri (Referans Pet: ODİ)

| Aşama | Olay Sayısı | Detay ve Kaynak Dağılımı |
| :--- | :---: | :--- |
| **DB Ham Satır Toplamı** | **10** | `plans`: 7, `vaccine_records_v2`: 2, `weight_logs`: 1, `parasite_records`: 0, `health_schedules`: 0, `appointments`: 0, `health_medications`: 0, `nutrition_logs`: 0, `growth_records`: 0 |
| **`buildPetAgendaEvents` Çıktısı** | **8** | 2 tıbbi aşı (`vaccine_records_v2`), 1 kilo ölçümü (`weight_logs`), 5 plan (`plans`). *Not: `vaccine_records_v2` kayıtlarına bağlı 2 adet tamamlanmış çocuk plan (`eb6756b2`, `af232b3a`) `linkedPlanIds` ile ayıklanmıştır.* |
| **`selectTimelineEvents` (-7 / +30 Gün) Sonrası** | **3** | `2026-07-26` – `2026-09-01` aralığı dışında kalan 5 kayıt düştü: 2 geçmiş aşı (`2025-07-12`, `2026-06-26`), 1 kilo ölçümü (boş/hatalı dateKey), 1 geçmiş plan, 1 uzak gelecek planı. Kalan 3 kayıt yalnızca `plans` kökenlidir. |
| **`completed` Filtresi (`displayStatus !== 'completed'`) Sonrası** | **2** | 1 adet tamamlanmış plan (`c68f09fb` - Tüy Bakımı) elendi. Kalan 2 kayıt aktif/gelecek rutin planlarıdır. Tıbbi geçmiş kayıtlarının tamamı (%100) `displayStatus: 'completed'` ürettiği için bu aşamaya sıfır tıbbi kayıt ulaşır. |
| **Ekranda Görünen Kart (Mevcut `/api/calendar` İle)** | **0** | Mevcut `/api/calendar/route.ts` servisi `plans`, `vaccine_records_v2` ve `weight_logs` tablolarını HİÇ SORGULAMAYIP yalnızca boş `health_schedules` ve `appointments` tablolarını sorguladığı için ekrana **0 kart** yansır ve "Planlı görev yok" uyarısı gösterilir. |

---

## 3. Hipotez Sonuçları

| # | Hipotez | Durum | Kanıt & Ölçüm |
| :-: | :--- | :-: | :--- |
| **H1** | `completed` filtresi tüm gerçek tıbbi kayıtları eliyor | **DOĞRULANDI** | Kanonik handler'lar `normalizeActualRecord` metotlarında `displayStatus: 'completed'` değerini sabitlemektedir (`vaccine-handler.ts:92`, `parasite-handler.ts:107`, `growth-handler.ts:77`, `nutrition-handler.ts:87`). `buildPetAgendaEvents` ile üretilen 8 olayın 4'ü `completed` durumundadır. `.filter(e => e.displayStatus !== 'completed')` işlemi uygulandığında `vaccine_records_v2` ve `weight_logs` kaynaklı tüm gerçek tıbbi kayıtlar (%100) düşmektedir. |
| **H2** | `pet_memberships` için geri düşüş (fallback) yok | **DOĞRULANDI** | Veritabanı şemasında `pet_memberships` adında bir tablo bulunmamaktadır (sorgulandığında `Could not find the table 'public.pet_memberships' in the schema cache` hatası dönmektedir). Gerçek tablo adı `pet_members`'dır. Sorguların `pet_members` + `pets.owner_id` birleşimi ile yapılmaması durumunda veri kümesi boş (`[]`) dönmektedir. |
| **H3** | RLS uyumsuzluğu: `plans` üyelik değil sahiplik tabanlı | **DOĞRULANDI** | `supabase/migrations/20260615154000_create_plans_and_notification_jobs.sql:46-48` içerisinde `plans` tablosu SELECT RLS politikası `USING (auth.uid() = user_id)` olarak tanımlanmıştır. `vaccine_records_v2` ve `pets` tabloları sahiplik/üyelik tabanlı iken `plans` tablosu yalnızca oluşturan `user_id` ile sınırlıdır. Bir petin ikincil sahibi/bakıcısı, diğer sahibi tarafından oluşturulmuş planları görememektedir. |
| **H4** | Sessiz hata yutma (teşhisi imkânsızlaştırıyor) | **DOĞRULANDI** | `src/app/api/calendar/route.ts:80` ve `src/components/health-tracker/useHealthTracker.ts:188-190` alanlarında `Promise.all` ile paralel çalıştırılan DB sorgularında `error` kontrolleri yapılmamaktadır. Tablo adı hatası veya RLS reddinde `data: null` dönmekte ve `data || []` mantığı ile hata sessizce yutularak boş liste kabul edilmektedir. |
| **H5** | Tarih penceresi (-7 / +30 gün) | **DOĞRULANDI** | `selectTimelineEvents(events, rangeStart, rangeEnd)` metodu (`selectors.ts:54-59`), verilen aralık dışındaki tüm olayları eler. Referans pet ODİ'nin 8 gündem olayının 5 tanesi (%62.5) bu pencerenin dışında kalmaktadır. Özellikle geçmiş aşılar (`2025-07-12` ve `2026-06-26`) 7 günden daha eski olduğu için takvim çizelgesinden tamamen silinmektedir. |
| **H6** | `appointments` alan adı uyuşmazlığı | **DOĞRULANDI** | Veritabanındaki `appointments` tablosunun gerçek tarih kolonu `scheduled_at`'tir (`database.types.ts:244`). Ancak `src/lib/agenda/handlers/appointment-handler.ts:57` satırında `record.appointment_date` okunmaktadır. Bu alan `undefined` döndüğü için kod `created_at` (kayıt oluşturulma tarihi) tarihine düşmekte veya `dateKey: ''` oluşturarak randevuyu takvimden düşürmektedir. |

> 💡 **Bonus Kanıtlanmış Bulgular:**
> - **`weight_logs` Alan Adı Uyuşmazlığı:** `src/lib/agenda/handlers/growth-handler.ts:56` satırında `record.recorded_at` okunmaktadır. Ancak `weight_logs` tablosundaki tarih alanı `measured_at`'tir. Bu nedenle `growth-handler` `weight_logs` için `dateKey: ''` üretmekte ve kilo ölçüm kayıtları takvim filtrelerinde kaybolmaktadır.
> - **Kanonik Servis Kopukluğu:** `/owner/takvim` sayfasının veri kaynağı olan `/api/calendar/route.ts`, projenin kanonik ajanda servisi olan `buildPetAgendaEvents` (`src/lib/agenda/pet-agenda-service.ts`) bileşenini çağırmamaktadır. Sadece boş durumdaki `health_schedules` tablosunu sorgulamaktadır.

---

## 4. Kök Neden

Sorunun kök nedeni 3 mimari katmandaki uyumsuzluğun birleşimidir:

1. **Servis Kopukluğu (`src/app/api/calendar/route.ts:61-80`):**
   Takvim istemci bileşeni (`TakvimClient.tsx`), verisini `/api/calendar` endpoint'inden çekmektedir. Ancak bu endpoint projenin kanonik veri toplama motoru olan `buildPetAgendaEvents` fonksiyonunu kullanmamakta; sadece eski `health_schedules` ve `appointments` tablolarını sorgulamaktadır. Veritabanında `health_schedules` tablosu boş olduğu için API her zaman `{ events: [] }` dönmektedir.

2. **Kanonik Handler & İstemci Filtre Çelişkisi (`src/lib/agenda/handlers/*.ts` & `TakvimClient.tsx:155`):**
   Kanonik handler'lar (`vaccine-handler.ts:92`, `parasite-handler.ts:107`, `growth-handler.ts:77`) tamamlanmış tıbbi kayıtları normalize ederken durumlarını sabit olarak `displayStatus: 'completed'` yapmaktadır. Ancak takvim arayüzü ve selectors katmanı "tamamlanmış geçmiş görevleri gizleme" amacıyla `displayStatus !== 'completed'` filtresi uyguladığından, evcil hayvanın tüm gerçek tıbbi geçmişi (aşılar, kilo ölçümleri, parazit uygulamaları) istemciye hiç yansıtılmamaktadır.

3. **Veritabanı Şeması ve RLS Kapsam Tutarsızlığı (`appointments`, `growth_records`, `plans` RLS):**
   - `appointment-handler.ts:57` kolonu `scheduled_at` yerine `appointment_date` olarak aramaktadır.
   - `growth-handler.ts:56` kolonu `measured_at` yerine `recorded_at` olarak aramaktadır.
   - `plans` RLS politikası (`20260615154000_create_plans_and_notification_jobs.sql:46`) `user_id = auth.uid()` şartına bağlı olduğundan, pet ortak sahipleri diğer sahibin oluşturduğu planları çekememektedir.

---

## 5. Önerilen Düzeltme

> ⚠️ **UYARI:** OPOS Cilt 13 (Human-in-the-Loop) ilkesi gereği aşağıdaki diff ve mimari öneriler Tufan'ın onayına sunulmuştur. Kod üzerinde herhangi bir değişiklik yapılmamıştır.

### Öneri A: `/api/calendar/route.ts` Endpoint'ini Kanonik Servisle Entegre Etmek
Endpoint'in tüm kanonik tabloları (`plans`, `vaccine_records_v2`, `parasite_records`, `weight_logs`, `growth_records`, `appointments`, `health_medications`, `nutrition_logs`) çekip `buildPetAgendaEvents` servisini kullanması:

```diff
// src/app/api/calendar/route.ts
+ import { buildPetAgendaEvents } from '@/lib/agenda/pet-agenda-service'

  export async function GET(req: NextRequest) {
    ...
-   const { data: schedules } = await supabase.from('health_schedules')...
-   const { data: appointments } = await supabase.from('appointments')...

+   const [plansRes, vacRes, parRes, schRes, grwRes, wgtRes, appRes, medRes, nutRes] = await Promise.all([
+     supabase.from('plans').select('*').in('pet_id', allPetIds),
+     supabase.from('vaccine_records_v2').select('*').in('pet_id', allPetIds),
+     supabase.from('parasite_records').select('*').in('pet_id', allPetIds),
+     supabase.from('health_schedules').select('*').in('pet_id', allPetIds),
+     supabase.from('growth_records').select('*').in('pet_id', allPetIds),
+     supabase.from('weight_logs').select('*').in('pet_id', allPetIds),
+     supabase.from('appointments').select('*').in('pet_id', allPetIds),
+     supabase.from('health_medications').select('*').in('pet_id', allPetIds),
+     supabase.from('nutrition_logs').select('*').in('pet_id', allPetIds),
+   ])
+
+   // H4 Önlemi: Hata kontrolü
+   if (plansRes.error) console.error('[Calendar API] plans fetch error:', plansRes.error)
+   if (vacRes.error) console.error('[Calendar API] vaccines fetch error:', vacRes.error)
+   ...
+
+   const rawGrowth = [...(grwRes.data || []), ...(wgtRes.data || [])]
+   const canonicalEvents = buildPetAgendaEvents(
+     plansRes.data || [], vacRes.data || [], parRes.data || [],
+     schRes.data || [], rawGrowth, appRes.data || [],
+     medRes.data || [], nutRes.data || []
+   )
```

### Öneri B: Handler Alan Adı Uyuşmazlıklarını Düzeltmek

```diff
// src/lib/agenda/handlers/appointment-handler.ts
- const appAt = record.appointment_date || record.created_at;
+ const appAt = record.scheduled_at || record.appointment_date || record.created_at;

// src/lib/agenda/handlers/growth-handler.ts
- const recAt = record.recorded_at ? `${record.recorded_at}T12:00:00.000Z` : record.created_at;
+ const recAt = record.measured_at || record.recorded_at || record.created_at;
```

### Öneri C: `completed` Kayıtlar İçin Kullanıcı Dostu Takvim Görünümü (OPOS Sadelik İlkesi)
Geçmiş tıbbi kayıtların takvimi boğmaması için:
1. Varsayılan görünümde **Yaklaşan / Geciken Görevler + Son 30 Günde Yapılan Tıbbi Uygulamalar** gösterilmelidir.
2. Arayüze "Geçmiş Kayıtları Göster" çipi/anahtarı veya "Tamamlananlar" sekmesi eklenerek kullanıcının istediğinde tüm tıbbi geçmişi görmesi sağlanmalıdır.

---

## 6. Regresyon Riski

1. **Pet Detay "Takvim / Sağlık Takip" Sekmesi (`useHealthTracker.ts`):**
   `useHealthTracker.ts` bileşeni `buildPetAgendaEvents` servisini zaten bağımsız olarak kullanmaktadır. Handler'lardaki alan adı düzeltmeleri (`scheduled_at` ve `measured_at`), Pet Detay sekmesinde randevu ve kilo kayıtlarının görünürlüğünü **olumlu yönde** düzeltecek, kırılmaya yol açmayacaktır.

2. **Dashboard Özet Widget'ları:**
   Dashboard sorguları (`dashboard-queries.ts`) kendi veri çekme mantığını kullanmaktadır. `/api/calendar` üzerinde yapılacak iyileştirmeler Dashboard'u olumsuz etkilemez.

3. **Veritabanı ve Performans Yükü:**
   `/api/calendar` üzerinde 8 tablonun paralel çekilmesi çok petli hanelerde veritabanı yükünü hafif artırabilir. Pet sayısı az olduğu için (genelde 1-3 pet) etkisi milisaniye seviyesindedir.

---

## 7. Açık Sorular (Tufan'ın Karar Vermesi Gereken Noktalar)

1. **Geçmiş Tıbbi Kayıtların Takvimdeki Görünürlük Sınırı (H1 & H5 Kararı):**
   - **Opsiyon 1 (Önerilen):** Takvim ana akışında varsayılan olarak **aktif/yaklaşan planlar + son 30 gün içinde tamamlanmış aşı/tıbbi kayıtlar** gösterilsin. Arayüze "Geçmiş Tıbbi Kayıtlar" toggle/filtre çipi eklensin.
   - **Opsiyon 2:** Takvim yalnızca ileriye dönük ajanda (planlar + randevular) olarak kalsın, geçmiş tıbbi kayıtlar yalnızca Pet Profilindeki Sağlık Geçmişi sekmesinden izlensin.

2. **`plans` Tablosu RLS Politikası Güncellemesi (H3 Kararı):**
   - `plans` tablosu RLS politikasının `USING (auth.uid() = user_id OR pet_id IN (SELECT pet_id FROM public.pet_members WHERE profile_id = auth.uid()))` şeklinde güncellenmesini onaylıyor musunuz?

3. **Tarih Penceresi Varsayılanı (H5 Kararı):**
   - Varsayılan takvim tarih aralığı mevcut `-7 / +30 gün` olarak mı kalsın, yoksa `-30 / +60 gün` olarak genişletilsin mi?
