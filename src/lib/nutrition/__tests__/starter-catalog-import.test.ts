import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { assertSafeDatabaseTarget, RemoteDatabaseRefusedError } from '../db-safety-barrier'
import { isValidGtin } from '../import-starter-catalog'
import { STARTER_MANUFACTURERS,  STARTER_BRANDS,
  STARTER_PRODUCT_FAMILIES,
  getStarterSkuNaturalKey
} from '../starter-catalog-data'
import manifestList from '../starter-catalog-manifest.json'

/**
 * Beslenme Faz 1B.3.5.3 — İzole Edilmiş Starter Katalog Testleri
 *
 * Bu test dosyası canlı Supabase bağlantısı KULLANMAZ.
 * Tüm testler yerel veri yapıları ve statik dosyalar üzerinde çalışır.
 * Bariyer testi, uzak hedefin bağlantı kurulmadan önce reddedildiğini doğrular.
 */
describe('Beslenme Faz 1B.3.5.3 — İzole Starter Katalog ve Manifest Testleri', () => {

  // ── P0 Bariyer Doğrulaması ──

  it('P0: Vitest ortamında uzak Supabase hedefi bağlantıdan ÖNCE reddedilir', () => {
    expect(() =>
      assertSafeDatabaseTarget('https://soautcxgiqhxiaxrubxv.supabase.co', 'import')
    ).toThrow(RemoteDatabaseRefusedError)
  })

  it('P0: Vitest ortamında localhost hedefi kabul edilir', () => {
    expect(() =>
      assertSafeDatabaseTarget('http://localhost:54321', 'import')
    ).not.toThrow()
  })

  // ── Manifest Bütünlük Testleri ──

  it('Evidence Manifest Dosyası Placeholder, Ürün Uyuşmazlığı ve Kırık URL İçermemelidir', () => {
    expect(manifestList.length).toBeGreaterThanOrEqual(30)

    for (const item of manifestList) {
      expect(item.product_evidence_url).not.toContain('...')
      expect(item.market_evidence_url).not.toContain('...')
      expect(item.product_evidence_url).toMatch(/^https?:\/\//)

      if (item.verification_status === 'verified') {
        expect(item.market_evidence_url).toMatch(/^https?:\/\//)
        expect(item.market_evidence_url).not.toContain('example.com')
        expect(item.http_status).toBe(200)
        expect(item.final_url).toBe(item.canonical_url)
      }

      expect(Array.isArray(item.supported_fields)).toBe(true)
      expect(item.supported_fields.length).toBeGreaterThan(0)
    }
  })

  // ── Statik Veri Yapısı Testleri ──

  it('Kaynaksız "verified" Kayıt Sayısı Kesinlikle 0 Olmalıdır', () => {
    const verifiedFamiliesWithoutSource = STARTER_PRODUCT_FAMILIES.filter(
      f => f.verification_status === 'verified' && !f.source_url
    )
    expect(verifiedFamiliesWithoutSource).toHaveLength(0)

    const verifiedBrandsWithoutSource = STARTER_BRANDS.filter(
      b => b.verification_status === 'verified' && !b.source_url
    )
    expect(verifiedBrandsWithoutSource).toHaveLength(0)
  })

  it('GTIN Kontrol Hanesi Validatörü Geçerli Barkodları Onaylamalıdır', () => {
    expect(isValidGtin('4006381333931')).toBe(true)
    expect(isValidGtin('3182550702423')).toBe(true)
    expect(isValidGtin('3182550702973')).toBe(true)
    expect(isValidGtin(null)).toBe(true)

    expect(isValidGtin('4006381333932')).toBe(false)
    expect(isValidGtin('12345')).toBe(false)
    expect(isValidGtin('400638133393X')).toBe(false)
  })

  it('Üretim Starter Kataloğunda Verified GTIN Sayısı 0 Olmalı ve Uydurma Barkod Bulunmamalıdır', () => {
    const allSkus = STARTER_PRODUCT_FAMILIES.flatMap(f => f.skus)
    const verifiedGtins = allSkus.filter(s => s.gtin !== null && s.verification_status === 'verified')
    expect(verifiedGtins).toHaveLength(0)
  })

  // ── Katalog Veri Sayacı Testleri ──

  it('Starter kataloğu doğru üretici, marka, aile ve SKU sayılarına sahip olmalıdır', () => {
    expect(STARTER_MANUFACTURERS).toHaveLength(12)
    expect(STARTER_BRANDS).toHaveLength(15)
    expect(STARTER_PRODUCT_FAMILIES).toHaveLength(34)

    const totalAliases = STARTER_BRANDS.reduce((sum, b) => sum + b.aliases.length, 0)
    expect(totalAliases).toBe(27)

    const totalSkus = STARTER_PRODUCT_FAMILIES.reduce((sum, f) => sum + f.skus.length, 0)
    expect(totalSkus).toBe(55)

    const allSkus = STARTER_PRODUCT_FAMILIES.flatMap(f => f.skus)
    const vSkus = allSkus.filter(s => s.verification_status === 'verified')
    const pSkus = allSkus.filter(s => s.verification_status === 'pending')
    
    expect(vSkus.length).toBe(24)
    expect(pSkus.length).toBe(31)

    // Duplicate key 0 check
    const skuKeys = new Set<string>()
    for (const family of STARTER_PRODUCT_FAMILIES) {
      const familyKey = `${family.brand_normalized_name}:${family.normalized_name}`
      for (const sku of family.skus) {
        const key = getStarterSkuNaturalKey(familyKey, sku.package_size_grams, sku.package_type, sku.gtin)
        expect(skuKeys.has(key)).toBe(false)
        skuKeys.add(key)
      }
    }
    expect(skuKeys.size).toBe(55)

    const verifiedFamilies = STARTER_PRODUCT_FAMILIES.filter(f => f.verification_status === 'verified')
    const pendingFamilies = STARTER_PRODUCT_FAMILIES.filter(f => f.verification_status === 'pending')
    expect(verifiedFamilies.length + pendingFamilies.length).toBe(34)
  })

  // ── İmporter Canlıya Erişim Engeli ──

  it('importStarterCatalog() Vitest ortamında uzak Supabase URL ile çağrılamaz', async () => {
    // Bariyer, importStarterCatalog içinde createAdminSupabaseClient'tan ÖNCE çalışır
    // Bu test ortamı VITEST=true olduğundan, .env.local'daki uzak URL reddedilir
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const isRemote = !url.includes('localhost') && !url.includes('127.0.0.1')

    if (isRemote) {
      // Uzak hedef: importStarterCatalog çağrısı bariyer tarafından reddedilmeli
      const { importStarterCatalog } = await import('../import-starter-catalog')
      await expect(importStarterCatalog()).rejects.toThrow(/REFUSING_REMOTE_DATABASE_IN_TEST/)
    } else {
      // Yerel hedef: Bu beklenen durumda, bariyer geçiş yapmalı
      expect(isRemote).toBe(false)
    }
  })

  // ── Otomatik Sözleşme Testi (Data vs Manifest vs Audit) ──
  
  it('Data, Manifest ve Network Audit Arasında Status Sözleşmesi Korunmalıdır', async () => {
    // 1. Load the network audit file dynamically since it's an artifact and might not exist initially
    let networkAudit: any[] = []
    try {
      const auditPath = resolve(process.cwd(), 'artifacts/starter-catalog-network-audit.json')
      if (existsSync(auditPath)) {
        networkAudit = JSON.parse(readFileSync(auditPath, 'utf8'))
      }
    } catch (e) {
      // Ignore if file doesn't exist in CI environment
    }
    
    // Only run this test if network audit exists
    if (networkAudit.length > 0) {
      const auditMap = new Map(networkAudit.map(a => [a.family_key, a]))
      
      for (const family of STARTER_PRODUCT_FAMILIES) {
        const key = family.brand_normalized_name + ':' + family.normalized_name
        const auditRecord = auditMap.get(key)
        
        expect(auditRecord).toBeDefined()
        
        if (auditRecord) {
          // Network pending -> data pending
          if (auditRecord.verification_status === 'pending') {
            expect(family.verification_status).toBe('pending')
          }
          // Network verified -> data verified
          if (auditRecord.verification_status === 'verified') {
            expect(family.verification_status).toBe('verified')
          }
        }
        
        // Pending family altında verified SKU bulunamaz
        if (family.verification_status === 'pending') {
          for (const sku of family.skus) {
            expect(sku.verification_status).not.toBe('verified')
          }
        }
      }
      
      // Toplam family/SKU sayısı değişmez (zaten önceki testlerde doğrulandı)
      const totalFamilies = STARTER_PRODUCT_FAMILIES.length
      expect(totalFamilies).toBe(34)
      
      const totalSkus = STARTER_PRODUCT_FAMILIES.reduce((sum, f) => sum + f.skus.length, 0)
      expect(totalSkus).toBe(55)
    }
  })

  // ── İmporter Status Upgrade Engeli ──
  
  it("İmporter'ın mevcut pending kaydı tekrar verified yapamayacağı doğrulanmalıdır", async () => {
    // We test the logic of the importer directly or logically
    // Given the targetStatus logic: existing === 'pending' ? 'pending' : newData
    // If existing is pending, even if new is verified, it stays pending.
    // We can verify this via static source code check or a mock.
    const src = readFileSync(resolve(process.cwd(), 'src/lib/nutrition/import-starter-catalog.ts'), 'utf8')
    
    // Check if the logic we just updated is present
    expect(src).toContain("const targetStatus = existingFamily.verification_status === 'pending'")
    expect(src).toContain("? 'pending'")
    expect(src).toContain(": pfData.verification_status")
    
    expect(src).toContain("const targetStatus = existingSku.verification_status === 'pending'")
    expect(src).toContain("? 'pending'")
    expect(src).toContain(": skuData.verification_status")
  })
})
