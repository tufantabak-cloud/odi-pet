# Odi.Pet — Subagent Denetim Promptları

Her başlık, ilgili subagent'a doğrudan yapıştırılabilecek bir görev tanımıdır. Her prompt, agent'ın kendi `[alan]_audit_report.md` dosyasını `docs/audits/` altına yazmasını ve bulguları önem derecesine (P0/P1/P2) göre sınıflandırmasını ister.

---

## 1. Research Subagent — Kod & Mimari Denetimi

```
Görev: Odi.Pet kod tabanında (src/, supabase/, lib/) derinlemesine bir eksik/hata taraması yap.

Kapsam:
1. src/ ve app/ altında TODO, FIXME, @ts-ignore, any tipi kullanımlarını tespit et.
2. Veri modelleri (Supabase şemaları, all_in_one_supabase.sql, migration dosyaları) ile
   uygulama kodundaki (types, zod şemaları) tutarsızlıkları bul.
3. Kanonik veri kuralına uyumu kontrol et: sağlık verilerinde gerçek DELETE yerine
   is_archived kullanılıyor mu? Aksi örnekleri listele.
4. Bağımlılıkları (package.json) güncellik ve güvenlik açısından tara (npm audit).
5. Yarım kalmış/çelişkili dokümantasyonu bul (AGENTS.md, CLAUDE.md, ROADMAP.md,
   ODIPET_AUDIT_CURRENT.md arasındaki çelişkiler dahil).
6. Kritik modüller (Sağlık, Aşı, Beslenme) için testlerin (vitest) kapsama durumunu
   ve eksik test senaryolarını listele.

Çıktı: docs/audits/research_audit_report.md
Format: Bulgu tablosu (Dosya, Sorun, Önem Derecesi P0/P1/P2, Öneri) + Yönetici Özeti.
Sadece raporla, kod değişikliği yapma.
```

---

## 2. Browser / UX Audit Agent

```
Komut: /ux-audit [URL] [Test Email:Şifre]

Görev: Playwright ile hedef sayfaya git ve Odi.Pet Design Bible v1.0 (OPOS)
standartlarına uygunluğu denetle.

Kontrol listesi:
1. Renk kontrastı WCAG 2.1 AA (metin/arkaplan oranları).
2. Tipografi: Plus Jakarta Sans Variable dışında font kullanımı var mı?
3. İkonlar: Lucide Rounded Outline dışında (filled, jenerik/insan odaklı) ikon var mı?
4. Bileşenler: 07 Component System'deki 20 temel bileşen grubuna (Butonlar, Kartlar,
   Input'lar, Badge, Chip, Timeline, Empty State, Toast vb.) uygunluk.
5. Mobil öncelik: 375px minimum genişlikte layout kırılması var mı?
6. Spacing/Radius: 24px kart radius'u, 8pt grid uygulanmış mı?
7. Mikro-etkileşim: active:scale-[0.98] ve hover efektleri mevcut mu?
8. Kritik akışlarda (Sağlık, Aşı, Beslenme) uçtan uca (E2E) fonksiyonel test —
   formlar gönderiliyor mu, hata mesajları doğru görünüyor mu?

Çıktı: ux_audit_report.md
İçerik: Genel Değerlendirme, Estetik Puan (1-10), Kullanılabilirlik/UX Analizi,
öncelik sıralı Geliştirme Önerileri.
```

---

## 3. Dynamic Admin Agent

```
Görev: Ana uygulama (Main App) ile Admin Panel arasındaki senkronizasyon eksiklerini denetle.

Kapsam:
1. Supabase şemasındaki tüm tabloları/kolonları çıkar; Admin App'te karşılığı olan
   CRUD arayüzü var mı kontrol et. Eksik tabloları listele.
2. Yeni eklenmiş API uç noktalarının (app/api altında) Admin panelde yönetim
   arayüzü olup olmadığını doğrula.
3. RBAC (Rol Tabanlı Erişim Kontrolü) kurallarının Admin panelin tüm route'larında
   uygulanıp uygulanmadığını kontrol et — yetkisiz erişim açığı var mı?
4. Dashboard widget/grafiklerinin canlı veriye mi yoksa mock veriye mi bağlı
   olduğunu tespit et.
5. RLS politikaları ile Admin panel sorguları arasında çelişki (Admin'in RLS
   tarafından bloklanan bir veriye erişmeye çalışması) var mı?

Çıktı: docs/audits/admin_sync_audit_report.md
Format: Eksik Modül Listesi, Güvenlik Açığı Listesi (varsa), Öncelik Sıralı Aksiyon Planı.
```

---

## 4. Frontend / UI Subagent

```
Görev: components/ ve app/(app)/ altındaki UI bileşenlerinin OPOS standartlarına
uygunluğunu ve teknik borcunu denetle.

Kapsam:
1. 07 Component System'deki 20 bileşen grubunun her biri için: bileşen mevcut mu,
   varyantları (Primary/Secondary/Outline/Ghost/Danger; Small/Medium/Large) eksiksiz mi?
2. Component Governance ihlali var mı? (Mevcut bileşen varken yeni, tekrarlayan
   bileşen yazılmış mı — duplicate button/card implementasyonları ara.)
3. Mobil öncelik: 375px altında taşma/kırılma yaşayan bileşen var mı?
4. Erişilebilirlik: input'larda label/aria eksikliği, focus ring eksikliği.
5. Tutarsız spacing/radius/renk token kullanımı (hardcoded hex/px yerine
   design token kullanılmalı).
6. active:scale-[0.98] mikro-animasyonu eksik olan tıklanabilir öğeler.
7. Empty state, loading (skeleton/shimmer) durumları her kritik listede mevcut mu?

Çıktı: docs/audits/frontend_audit_report.md
Format: Bileşen bazlı tablo (Bileşen, Sorun, OPOS Referansı, Önem, Öneri).
```

---

## 5. Backend & Database Subagent

```
Görev: app/api, lib, supabase dizinlerinde veri/güvenlik denetimi yap.

Kapsam:
1. RLS politikaları: her tabloda RLS aktif mi, "her kullanıcı sadece kendi
   verisine erişir" ilkesi tüm tablolarda (pets, health, vaccines, weight,
   nutrition vb.) sağlanıyor mu?
2. RPC fonksiyonlarında SECURITY DEFINER kullanımı ve olası privilege escalation
   riski.
3. Single Source of Truth ihlali: sağlık verilerinde hard delete (DELETE FROM)
   kullanan endpoint var mı? is_archived pattern'i tutarlı uygulanıyor mu?
4. Private Storage: dosya/görsel URL'lerinin süresiz public URL mi yoksa
   zaman sınırlı Signed URL mi olduğunu kontrol et (Cilt 17 standardı).
5. API endpoint'lerinde input validation (zod/yup) eksikliği, rate limiting yokluğu.
6. Vitest birim/entegrasyon testlerini çalıştır (npm run test / vitest.config.mts,
   vitest.integration.config.mts) ve başarısız/eksik testleri raporla.
7. Migration dosyaları (supabase/, *.sql) ile canlı şema arasında drift var mı?

Çıktı: docs/audits/backend_audit_report.md
Format: Güvenlik Bulguları (kritiklik dahil), Test Sonuçları Özeti, Şema Drift Raporu.
```

---

## 6. DevOps Subagent

```
Görev: next.config.ts, vercel.json, serwist.config.mjs ve build/deploy zincirini denetle.

Kapsam:
1. PWA/Service Worker (Serwist) yapılandırması: offline cache stratejisi doğru
   tanımlı mı, stale-while-revalidate/network-first kritik veri için doğru
   kullanılıyor mu?
2. next.config.ts içindeki build ayarları (ör. typescript/eslint hatalarının
   build'i engellemesi gerektiği halde ignoreBuildErrors ile kapatılmış olması
   gibi riskli bypass'lar).
3. vercel.json: environment/region/cron ayarlarının doğruluğu.
4. .env.example ile gerçek kullanılan environment değişkenleri arasında eksik/fazla var mı?
5. tsconfig.tsbuildinfo ve eslint.config.mjs üzerinden derleme/lint hatalarının
   gerçek sayısını çıkar (lint_report.json varsa referans al).
6. Playwright test/report klasörlerinden (playwright-report, test-results) son
   CI koşusundaki başarısız testleri özetle.

Çıktı: docs/audits/devops_audit_report.md
Format: Yapılandırma Riskleri, Build/Lint Hata Sayısı, Aksiyon Planı.
```

---

## 7. Self / Dynamic Subagent — Konsolidasyon

```
Görev: Yukarıdaki 6 subagent'ın raporlarını (docs/audits/*.md) oku, çapraz
referansla ve tek bir üst düzey konsolide rapor üret.

Kapsam:
1. Tüm raporlardaki P0 (kritik) bulguları tek bir listede topla ve
   bağımlılıklarına göre sırala (örn. şema düzeltilmeden Admin CRUD yapılamaz).
2. Çakışan/çelişen önerileri tespit et (örn. Frontend'in önerdiği bileşen
   değişikliği Backend'in veri modeliyle çelişiyorsa işaretle).
3. "Kolay ve anlaşılır" ürün felsefesine aykırı bulguları (gereksiz karmaşıklık,
   fazla tıklama, kalabalık modül) ayrı bir bölümde vurgula.
4. Önerilen düzeltmeleri sprint bazlı bir aksiyon planına (Şimdi / Sonraki / Sonra)
   döküp önceliklendir.

Çıktı: docs/audits/consolidated_audit_report.md
Format: Yönetici Özeti, P0 Kritik Liste, Çelişki Listesi, Sprint Planı.
```
