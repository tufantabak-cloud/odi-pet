import fs from 'fs'
import path from 'path'
import { STARTER_PRODUCT_FAMILIES } from '../src/lib/nutrition/starter-catalog-data'

export interface AuditRecord {
  family_key: string
  official_name: string
  species: string
  product_evidence_url: string | null
  http_status: number | null
  final_url: string | null
  canonical_url: string | null
  title: string | null
  h1: string | null
  is_homepage_redirect: boolean
  has_product_name_match: boolean
  verification_status: 'verified' | 'pending'
  audit_note: string
  checked_at: string
}

async function auditUrl(url: string | null): Promise<{
  httpStatus: number | null
  finalUrl: string | null
  canonicalUrl: string | null
  title: string | null
  h1: string | null
  htmlBody: string
}> {
  if (!url) {
    return { httpStatus: null, finalUrl: null, canonicalUrl: null, title: null, h1: null, htmlBody: '' }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
      },
      redirect: 'follow',
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId))

    const finalUrl = res.url
    const httpStatus = res.status
    const text = await res.text()

    // Extract title
    const titleMatch = text.match(/<title[^>]*>([^<]*)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : null

    // Extract H1
    const h1Match = text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : null

    // Extract rel=canonical
    const canonicalMatch = text.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)
    const canonicalUrl = canonicalMatch ? canonicalMatch[1].trim() : finalUrl

    return { httpStatus, finalUrl, canonicalUrl, title, h1, htmlBody: text }
  } catch (err: any) {
    return { httpStatus: 0, finalUrl: url, canonicalUrl: url, title: null, h1: null, htmlBody: '' }
  }
}

async function runNetworkAudit() {
  console.log('Starting Real Network Evidence Audit (with 4s timeout)...')
  const results: AuditRecord[] = []
  const checkedAt = new Date().toISOString()

  let verifiedCount = 0
  let pendingCount = 0

  for (const family of STARTER_PRODUCT_FAMILIES) {
    const key = `${family.brand_normalized_name}:${family.normalized_name}`
    const targetUrl = family.source_url

    if (!targetUrl || family.verification_status === 'pending') {
      results.push({
        family_key: key,
        official_name: family.official_name,
        species: family.species,
        product_evidence_url: targetUrl,
        http_status: null,
        final_url: null,
        canonical_url: null,
        title: null,
        h1: null,
        is_homepage_redirect: false,
        has_product_name_match: false,
        verification_status: 'pending',
        audit_note: 'Perakendeci taslağı veya kaynak URL bulunmuyor.',
        checked_at: checkedAt
      })
      pendingCount++
      continue
    }

    console.log(`Checking [${key}] -> ${targetUrl}`)
    const networkData = await auditUrl(targetUrl)

    // Analyze homepage redirect
    let isHomepageRedirect = false
    if (networkData.finalUrl) {
      try {
        const parsedFinal = new URL(networkData.finalUrl)
        isHomepageRedirect = parsedFinal.pathname === '/' || parsedFinal.pathname === ''
      } catch {
        isHomepageRedirect = false
      }
    }

    // Analyze product name match in title / H1 / HTML body
    const searchTerms = family.official_name.toLowerCase().split(' ')
    const firstWord = searchTerms[0] || ''
    const bodyLower = networkData.htmlBody.toLowerCase()
    const titleLower = (networkData.title || '').toLowerCase()
    const h1Lower = (networkData.h1 || '').toLowerCase()

    const hasProductNameMatch =
      titleLower.includes(firstWord) ||
      h1Lower.includes(firstWord) ||
      bodyLower.includes(firstWord)

    let finalStatus: 'verified' | 'pending' = 'verified'
    let note = 'Gerçek network doğrulaması başarılı (HTTP 200 OK).'

    if (networkData.httpStatus !== 200) {
      finalStatus = 'pending'
      note = `HTTP hatası veya zaman aşımı (${networkData.httpStatus}). Pending durumuna düşürüldü.`
    } else if (isHomepageRedirect) {
      finalStatus = 'pending'
      note = 'URL ana sayfaya yönlendi. Ürün kanıtı kabul edilemez.'
    } else if (!hasProductNameMatch && networkData.htmlBody.length < 500) {
      finalStatus = 'pending'
      note = 'Erişim engeli veya CAPTCHA tespit edildi.'
    }

    if (finalStatus === 'verified') {
      verifiedCount++
    } else {
      pendingCount++
    }

    results.push({
      family_key: key,
      official_name: family.official_name,
      species: family.species,
      product_evidence_url: targetUrl,
      http_status: networkData.httpStatus,
      final_url: networkData.finalUrl,
      canonical_url: networkData.canonicalUrl,
      title: networkData.title,
      h1: networkData.h1,
      is_homepage_redirect: isHomepageRedirect,
      has_product_name_match: hasProductNameMatch,
      verification_status: finalStatus,
      audit_note: note,
      checked_at: checkedAt
    })
  }

  // Ensure artifacts directory exists
  const artifactsDir = path.join(process.cwd(), 'artifacts')
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true })
  }

  const outputPath = path.join(artifactsDir, 'starter-catalog-network-audit.json')
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8')

  console.log('\n=== REAL NETWORK AUDIT COMPLETED ===')
  console.log(`Total Families Checked: ${results.length}`)
  console.log(`Verified Families: ${verifiedCount}`)
  console.log(`Pending Families: ${pendingCount}`)
  console.log(`Saved Audit Log to: ${outputPath}`)
}

runNetworkAudit().catch(err => {
  console.error('Audit script failed:', err)
  process.exit(1)
})
