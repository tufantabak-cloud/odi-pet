# Premium Engine v1.0 Runbook

Bu runbook, Odi.Pet Premium Engine'in (Feature Registry & Idempotent Usage Engine) operasyonel bakımı, olağanüstü durum kurtarma (DR) ve hata müdahalesi (Incident Response) için hazırlanmıştır.

## 1. Publish (Yayınlama) Süreci
Yeni bir özellik eklendiğinde veya bundle/plan güncellendiğinde:
1. Kaynak kodda `src/lib/features/definitions/` altında feature dosyasını oluşturun veya güncelleyin.
2. `npm run validate:registry` çalıştırın.
3. `npm run test:certify` ile tüm sistemi test edin.
4. Supabase veya Admin Panel üzerinden `Publish` butonuna basarak limitleri Snapshot olarak veritabanına kaydedin.

## 2. Rollback (Geri Alma) Süreci
Eğer yayınlanan son konfigürasyon hatalıysa:
1. Supabase `feature_limits_versions` tablosundan bir önceki geçerli `snapshot_hash` değerini bulun.
2. `ROLLBACK` RPC'si veya Admin UI üzerinden eski sürüme dönün.
3. Cache'in otomatik flush edildiğinden emin olun (Gerekirse manuel redis flush).

## 3. Kill Switch (Acil Kapatma)
Belli bir özellikte (örneğin OpenAI entegrasyonu maliyet/güvenlik patlaması yaparsa) kritik sorun çıkarsa:
- **Veritabanından:** `INSERT INTO feature_kill_switches (feature_key, reason) VALUES ('ai_vet', 'Emergency Cost Overrun');`
- Tüm erişimler otomatik olarak `FEATURE_DISABLED_BY_KILL_SWITCH` hatası ile reddedilir. Özelliği tamamen ücretsiz yapmak için `unlimited` limiti atanmalıdır.

## 4. Registry & Bundle Recovery (Veritabanı Kurtarma)
Eğer `feature_limits`, `app_bundles` gibi tablolar uçarsa:
1. `npm run dr:restore --execute` komutunu local/staging üzerinde çalıştırarak yedeklenmiş `dr-backups/` JSON dosyalarından verileri kurtarın.
2. **DİKKAT:** Bu komut Production (`NODE_ENV=production`) üzerinde kilitlidir. Production için acil DB level point-in-time recovery (PITR) kullanın.

## 5. Cache Flush
Eğer özellik yetkileri senkronizasyondan çıkarsa:
- Sistemin (Memory/Redis) CacheProvider'ını temizlemek için API endpointine veya Redis CLI üzerinden `FLUSHALL` komutu gönderin. 

## 6. Service Level Objectives (SLO)
| Bileşen | Hedef P50 | Hedef P95 | Hedef P99 | Not |
| :--- | :--- | :--- | :--- | :--- |
| **Policy Eval** | < 5ms | < 20ms | < 50ms | Memory Cache aktif ise |
| **Consume RPC** | < 15ms | < 50ms | < 100ms | Veritabanı Transaction Lock (Row-level) dahil |
| **Cache Lookup** | < 2ms | < 5ms | < 15ms | |
| **Idempotency** | < 5ms | < 15ms | < 30ms | Tekrarlanan (Duplicate) istek tespiti |

## 7. Emergency Disable (Tüm Sistemi Kapatma)
Premium Engine API endpointini kapatmak için `.env.local` dosyasına (veya Vercel Environment Variables kısmına) `PREMIUM_ENGINE_ENABLED=false` ekleyip redeploy edebilirsiniz (Uygulama kodunda bu env bayrağının kontrol edilmesi gerekir).
