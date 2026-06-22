# WeightGoalBand — Antigravity Takım Görev Paketi
**Özellik:** Pet kilo hedef bandı — MinimalGrowthChart entegrasyonu  
**Proje:** Odi.Pet  
**Paket versiyonu:** 1.0  
**Dağıtım:** ODI-Orchestrator bu paketi ilgili subagent'lara atar

---

## Orchestrator'a — Görev Dağıtım Planı

Bu paketi al, aşağıdaki sırayla agent'lara dağıt.  
Her agent tamamlandığında bir sonrakini tetikle.  
Bağımlılık zincirine uy — sıra kritik.

```
1. ODI-Backend      → weightStandards.ts dosyasını yaz + assessWeight() test et
2. ODI-Frontend     → WeightGoalBand.tsx yaz + MinimalGrowthChart'a entegre et
3. ODI-QA           → 3 senaryo ile test et (ideal / fazla / düşük kilo)
4. ODI-DevOps       → build kontrol et, vercel.json dokunma
5. ODI-Pet UX Audit → UX denetimi yap, gerekirse frontend'e geri bildir
```

Tamamlanma eventi:
```json
{
  "event_type": "feature_completed",
  "feature": "weight_goal_band",
  "status": "success"
}
```

---

## ODI-Backend — Görev

**Bağımlılık:** Yok — ilk başlayan  
**Teslim süresi:** Sprint içi, Frontend başlamadan önce bitmeli

### Ne yapacaksın?

`lib/vetStandards/weightStandards.ts` dosyasını oluştur.

### Dosya içeriği

Aşağıdaki tip yapılarını ve fonksiyonları uygula:

```typescript
// Tipler
export type Species = 'cat' | 'dog'
export type Gender  = 'male' | 'female' | 'unknown'
export type WeightStatus = 'underweight' | 'ideal' | 'overweight' | 'unknown'

export interface WeightRange {
  minKg: number
  maxKg: number
  label: string
}

export interface AgeWeightProfile {
  ageMonthMin: number
  ageMonthMax: number   // 999 = sınırsız
  ideal: WeightRange
  overweight: number
  underweight: number
}

export interface BreedStandard {
  breedKey: string       // lowercase, normalize edilmiş
  displayName: string
  species: Species
  profiles: AgeWeightProfile[]
}

export interface WeightAssessment {
  status: WeightStatus
  idealMin: number
  idealMax: number
  overweightThreshold: number
  underweightThreshold: number
  diffKg: number         // pozitif = fazla, negatif = eksik, 0 = ideal
  isFallback: boolean    // ırk bulunamadı, genel profil kullanıldı
}
```

### Referans verileri (WSAVA kaynaklı)

**Kediler:**

| breedKey | displayName | 12ay+ idealMin | 12ay+ idealMax | overweight | underweight |
|----------|-------------|---------------|---------------|------------|-------------|
| `domestic_shorthair` | Tekir / Karışık | 3.5 | 5.5 | 6.0 | 3.0 |
| `persian` | İran Kedisi | 3.0 | 5.5 | 6.5 | 2.5 |
| `maine_coon` | Maine Coon | 4.5 | 8.0 | 9.0 | 4.0 |
| `british_shorthair` | British Shorthair | 4.0 | 7.0 | 8.0 | 3.5 |

**Köpekler:**

| breedKey | displayName | 12ay+ idealMin | 12ay+ idealMax | overweight | underweight |
|----------|-------------|---------------|---------------|------------|-------------|
| `golden_retriever` | Golden Retriever | 25.0 | 34.0 | 36.0 | 22.0 |
| `labrador_retriever` | Labrador Retriever | 25.0 | 36.0 | 38.0 | 23.0 |
| `german_shepherd` | Alman Çoban | 22.0 | 40.0 | 43.0 | 20.0 |
| `beagle` | Beagle | 9.0 | 11.5 | 13.0 | 8.0 |
| `poodle_miniature` | Minyatür Kaniş | 3.5 | 7.0 | 8.0 | 3.0 |
| `chihuahua` | Chihuahua | 1.5 | 3.0 | 3.5 | 1.2 |
| `border_collie` | Border Collie | 14.0 | 20.0 | 23.0 | 12.0 |
| `mixed` | Melez / Sokak | 10.0 | 30.0 | 35.0 | 8.0 |

Her ırk için yavru dönemleri de ekle (0-2ay, 3-5ay, 6-11ay, 12ay+).  
Tam veri için teslim edilen `weightStandards.ts` referans dosyasını kullan.

### Fonksiyonlar

```typescript
// Irk eşleştirme — bulunamazsa fallback döner
export function findBreedStandard(
  species: Species,
  breedRaw: string | null | undefined
): BreedStandard

// Doğum tarihinden ay cinsinden yaş
export function getAgeInMonths(birthDate: string | Date): number

// Ana değerlendirme fonksiyonu
export function assessWeight(params: {
  species: Species
  breed: string | null | undefined
  birthDate: string | Date | null | undefined
  weightKg: number
  isNeutered: boolean
  gender: Gender
}): WeightAssessment
```

**Kısırlaştırma kuralı:**  
`isNeutered = true` ise `idealMax * 0.90` (WSAVA: %10 düşür)

**Fallback kuralı:**  
Irk eşleşmezse kedi → `domestic_shorthair`, köpek → `mixed`  
`isFallback: true` olarak işaretle

### Doğrulama

Şu senaryoları elle test et, sonuçları Orchestrator'a yaz:

```typescript
// Test 1 — İdeal
assessWeight({ species: 'cat', breed: 'british_shorthair',
  birthDate: '2023-01-01', weightKg: 4.5,
  isNeutered: true, gender: 'female' })
// Beklenen: status = 'ideal'

// Test 2 — Fazla kilolu
assessWeight({ species: 'dog', breed: 'golden_retriever',
  birthDate: '2022-01-01', weightKg: 38.5,
  isNeutered: false, gender: 'male' })
// Beklenen: status = 'overweight', diffKg ≈ 4.5

// Test 3 — Yavru, ırk bilinmiyor (fallback)
assessWeight({ species: 'cat', breed: null,
  birthDate: new Date(Date.now() - 8 * 30 * 24 * 60 * 60 * 1000).toISOString(),
  weightKg: 1.2, isNeutered: false, gender: 'unknown' })
// Beklenen: status = 'ideal' veya 'underweight', isFallback = true

// Test 4 — birthDate yok
assessWeight({ species: 'dog', breed: 'beagle',
  birthDate: null, weightKg: 10,
  isNeutered: false, gender: 'male' })
// Beklenen: status = 'unknown'
```

### Kapanış eventi
```
backend_completed: weightStandards_tests_passed: true/false
```

---

## ODI-Frontend — Görev

**Bağımlılık:** ODI-Backend tamamlandıktan sonra başla  
**Dosyalar:** 2 yeni dosya + 1 mevcut dosya güncelleme

### Dosya 1 — `components/pets/WeightGoalBand.tsx`

Yeni bileşen. İki mod destekler:

**compact={true}** → MinimalGrowthChart'ın altında ince şerit  
**compact={false}** → Pet kartında bağımsız kart (ileride kullanılacak)

```typescript
interface WeightGoalBandProps {
  assessment: WeightAssessment
  currentWeight: number
  compact?: boolean      // default: false
}
```

**Durum → renk eşleşmesi:**

| status | label | renk token | ikon |
|--------|-------|-----------|------|
| `ideal` | İdeal kiloda | `color-text-success` | `ti-circle-check` |
| `overweight` | Fazla kilolu | `color-text-warning` | `ti-alert-triangle` |
| `underweight` | Düşük kilolu | `color-text-danger` | `ti-alert-circle` |
| `unknown` | Değerlendirilemedi | `color-text-secondary` | `ti-help-circle` |

**compact modunda göster:**
- İkon + status label
- `overweight`/`underweight` ise: "Hedef kiloya ulaşmak için X.X kg vermesi/alması gerekiyor."
- `ideal` ise: ideal aralık "(min–max kg)"
- `isFallback = true` ise: sağ köşede "Irk tahmini" etiketi

**Görsel bant (compact değilken):**  
SVG veya div tabanlı yatay bant:
- Gri zemin = tüm aralık
- Yeşil bölge = ideal aralık (idealMin–idealMax)  
- Siyah nokta = currentWeight konumu
- Alt etiketler: idealMin kg, idealMax kg

### Dosya 2 — `MinimalGrowthChart.tsx` güncelleme

**Adım 1 — Import ekle (dosya başı):**
```typescript
import { assessWeight, type Species, type Gender, type WeightAssessment }
  from '@/lib/vetStandards/weightStandards'
import WeightGoalBand from '@/components/pets/WeightGoalBand'
```

**Adım 2 — Props tipine ekle:**
```typescript
petSpecies?:   'cat' | 'dog'
petBreed?:     string | null
petBirthDate?: string | null
petGender?:    'male' | 'female' | 'unknown'
isNeutered?:   boolean
```

**Adım 3 — Destructure et (default'larla):**
```typescript
petSpecies = 'cat', petBreed, petBirthDate,
petGender = 'unknown', isNeutered = false
```

**Adım 4 — chartData hesabından sonra ekle:**
```typescript
const lastRecord   = chartData.at(-1)
const lastWeightKg = lastRecord?.weight ?? null

const weightAssessment: WeightAssessment | null =
  lastWeightKg !== null && petBirthDate
    ? assessWeight({ species: petSpecies, breed: petBreed,
        birthDate: petBirthDate, weightKg: lastWeightKg,
        isNeutered, gender: petGender })
    : null
```

**Adım 5 — JSX: mevcut "Son Ölçüm" barının hemen altına ekle:**
```tsx
{weightAssessment && lastWeightKg !== null && (
  <WeightGoalBand
    assessment={weightAssessment}
    currentWeight={lastWeightKg}
    compact={true}
  />
)}
{chartData.length > 0 && !petBirthDate && (
  <div style={{ padding: '8px 12px', fontSize: 12,
    color: 'var(--color-text-tertiary)',
    borderTop: '0.5px solid var(--color-border-tertiary)' }}>
    <i className="ti ti-info-circle" style={{ marginRight: 6 }} />
    Kilo hedefi için doğum tarihini ekle
  </div>
)}
```

**Adım 6 — SVG içine ideal bant ekle (2+ kayıt, grafik görünür dalı):**

Mevcut `minWeight`, `maxWeight`, `weightRange`, `chartHeight`, `paddingLeft`,
`paddingBottom`, `chartWidth` değişkenlerini kullanarak:

```tsx
{weightAssessment && weightAssessment.status !== 'unknown' && (
  <>
    <rect
      x={paddingLeft}
      y={svgHeight - ((weightAssessment.idealMax - minWeight) / weightRange)
        * chartHeight - paddingBottom}
      width={chartWidth}
      height={((weightAssessment.idealMax - weightAssessment.idealMin)
        / weightRange) * chartHeight}
      fill="rgba(29, 158, 117, 0.08)"
      stroke="rgba(29, 158, 117, 0.25)"
      strokeWidth={1}
      strokeDasharray="4 3"
    />
    <text
      x={paddingLeft + chartWidth - 6}
      y={svgHeight - ((weightAssessment.idealMax - minWeight) / weightRange)
        * chartHeight - paddingBottom + 14}
      textAnchor="end"
      fontSize={9}
      fill="rgba(29, 158, 117, 0.6)"
    >
      İdeal
    </text>
  </>
)}
```

**Adım 7 — Bileşenin çağrıldığı tüm yerleri güncelle:**

Pet detay sayfasında `<MinimalGrowthChart>` çağrısına prop'ları geç:
```tsx
<MinimalGrowthChart
  records={pet.growthRecords}
  petSpecies={pet.species as 'cat' | 'dog'}
  petBreed={pet.breed}
  petBirthDate={pet.birth_date}
  petGender={pet.gender as 'male' | 'female' | 'unknown'}
  isNeutered={pet.is_neutered ?? false}
/>
```

### Kapanış eventi
```
frontend_completed: component_rendered: true, integration_applied: true
```

---

## ODI-QA — Görev

**Bağımlılık:** ODI-Frontend tamamlandıktan sonra başla

### Test senaryoları

**Senaryo A — İdeal kilolu, tüm veriler tam**
- Pet: British Shorthair, dişi, kısır, 2 yaş
- Kayıt sayısı: 3 (trend görünür)
- Son kilo: 4.5 kg
- Beklenen: yeşil şerit "İdeal kiloda (4.0–6.3 kg)", grafik üzerinde yeşil kesikli bant görünür

**Senaryo B — Fazla kilolu, ırk köpek**
- Pet: Golden Retriever, erkek, 3 yaş
- Kayıt sayısı: 4
- Son kilo: 38.5 kg
- Beklenen: sarı şerit "Fazla kilolu — 4.5 kg vermesi gerekiyor."

**Senaryo C — Tek kayıt, düşük kilolu**
- Pet: Tekir, erkek, 8 ay
- Kayıt sayısı: 1 (grafik = "2 kayıt ekle" uyarısı)
- Son kilo: 1.2 kg
- Beklenen: kırmızı şerit göründü, "Irk tahmini" etiketi var, grafik uyarısı etkilenmedi

**Senaryo D — Doğum tarihi eksik**
- Pet: Beagle, doğum tarihi girilmemiş
- Son kilo: 10 kg
- Beklenen: hedef şeridi yok, yerine "Kilo hedefi için doğum tarihini ekle" notu

**Senaryo E — Hiç kayıt yok**
- Beklenen: WeightGoalBand hiç render edilmemeli (lastWeightKg = null)

**Senaryo F — TypeScript derleme kontrolü**
```bash
npx tsc --noEmit
```
Hata yoksa geç.

### Kapanış eventi
```
qa_completed: all_scenarios_passed: true/false
failed_scenarios: []   // varsa listele
```

---

## ODI-DevOps — Görev

**Bağımlılık:** ODI-QA tamamlandıktan sonra başla

### Kontrol listesi

```bash
# 1. Build kontrol
npm run build

# 2. Yeni dosyaların bundle'a girdiğini doğrula
# lib/vetStandards/weightStandards.ts → server bundle (client'a sızmadı mı?)
# components/pets/WeightGoalBand.tsx → client bundle

# 3. Bundle boyutu — weightStandards sabit veri içeriyor
# Kabul edilebilir artış: < 15kb gzip
# Aşarsa: dynamic import ile lazy load öner
```

**vercel.json'a dokunma** — cron yapısı değişmedi.

**Yeni env değişkeni yok** — weightStandards tamamen statik.

### Kapanış eventi
```
devops_completed: build_success: true, bundle_size_ok: true
```

---

## ODI-Pet UX Audit — Görev

**Bağımlılık:** ODI-Frontend + ODI-QA sonrası

### Denetim kriterleri

**1. Bilgi hiyerarşisi**  
WeightGoalBand, "Son Ölçüm" barından daha az görsel ağırlık taşımalı.  
Kullanıcı önce kiloyu görüyor, sonra yorumu okuyor. Sıra bozuldu mu?

**2. Boş durum uyumu**  
Mevcut "Trendi görmek için en az 2 kayıt ekleyin" uyarısı + WeightGoalBand  
aynı anda ekranda. İkisi çakışıyor mu, mesaj tutarlı mı?

**3. Kısırlık etiketi**  
Kısırlaştırılmış hayvanda ideal max %10 düşüyor.  
Kullanıcı neden farklı aralık gördüğünü anlıyor mu? "Kısır" bilgisi göze çarpıyor mu?

**4. isFallback durumu**  
"Irk tahmini" etiketi yeterince açıklayıcı mı?  
Alternatif: "Genel profil kullanıldı — ırk girerek doğruluğu artır" daha mı iyi?

**5. Renk erişilebilirliği**  
Yeşil (#1D9E75 yakını) / sarı / kırmızı — renk körü kullanıcılar için  
ikon + metin birlikte mi kullanılıyor? (Evet, `ti-*` ikonlar ekli — doğrula)

### Raporlama formatı

```
UX Audit Raporu — WeightGoalBand

✅ Geçen kriterler: [liste]
⚠️  Gözlem (değişiklik önerisi): [liste]
❌ Düzeltme gerekli: [liste]

Öneri varsa: ODI-Frontend'e geri bildir, tekrar test için ODI-QA tetikle.
```

### Kapanış eventi
```
ux_audit_completed: passed: true/false, frontend_revision_needed: true/false
```

---

## Orchestrator — Tüm Agent Kapanış Kontrolü

Tüm eventler geldiğinde final kontrol yap:

```
✅ backend_completed       → weightStandards_tests_passed: true
✅ frontend_completed      → component_rendered + integration_applied: true
✅ qa_completed            → all_scenarios_passed: true
✅ devops_completed        → build_success + bundle_size_ok: true
✅ ux_audit_completed      → passed: true, revision_needed: false
```

Hepsi ✅ ise event_stream'e yaz:
```json
{
  "event_type": "feature_completed",
  "profile_id": null,
  "metadata": {
    "feature": "weight_goal_band",
    "sprint": "post-4",
    "status": "success",
    "agents_completed": [
      "backend", "frontend", "qa", "devops", "ux_audit"
    ]
  }
}
```

Herhangi biri ❌ ise ilgili agent'ı tekrar tetikle, neden başarısız olduğunu  
`metadata.failure_reason` ile logla.

---

## Referans Dosyalar

Bu göreve başlamadan önce Orchestrator şu dosyaları ilgili agent'lara ilet:

| Dosya | Alıcı | Amaç |
|-------|-------|------|
| `weightStandards.ts` | ODI-Backend | Tam referans implementasyon |
| `WeightGoalBand.tsx` | ODI-Frontend | Tam referans bileşen |
| `MinimalGrowthChart_integration_patch.ts` | ODI-Frontend | Adım adım entegrasyon rehberi |

Bu dosyalar referans içindir — agent'lar projenin mevcut kod stiline  
ve convention'larına uyarak uygular, birebir kopyalamak zorunda değil.

---

*Paket sahibi: Odi.Pet Admin Planning Session*  
*Hedef takım: Antigravity Subagent (ODI-Orchestrator + 4 subagent)*
