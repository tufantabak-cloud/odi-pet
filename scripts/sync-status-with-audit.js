/**
 * Faz 1B.3.5.4 — Yerel starter-catalog-data.ts dosyasındaki
 * verification_status alanlarını network audit sonuçlarıyla eşitleyen script.
 * 
 * CANLIYA YAZMA YAPMAZ. Yalnızca yerel dosyayı günceller.
 */
const fs = require('fs')
const path = require('path')

const auditPath = path.join(__dirname, '..', 'artifacts', 'starter-catalog-network-audit.json')
const dataPath = path.join(__dirname, '..', 'src', 'lib', 'nutrition', 'starter-catalog-data.ts')

const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'))
const auditMap = new Map(audit.map(a => [a.family_key, a]))

// Build set of family normalized_names that should be pending
const pendingFamilyKeys = new Set()
for (const [key, a] of auditMap) {
  if (a.verification_status === 'pending') {
    pendingFamilyKeys.add(key)
  }
}

let src = fs.readFileSync(dataPath, 'utf8')
const lines = src.split('\n')

// Parse family blocks: find brand_normalized_name + normalized_name to determine key,
// then update family verification_status and all SKU verification_status under it.

let currentBrand = ''
let currentNorm = ''
let familyChanges = 0
let skuChanges = 0
let inSkusArray = false
let skuDepth = 0

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]

  // Track brand_normalized_name
  const brandMatch = line.match(/brand_normalized_name:\s*'([^']+)'/)
  if (brandMatch) {
    currentBrand = brandMatch[1]
  }

  // Track normalized_name (family level, not SKU level)
  const normMatch = line.match(/^\s+normalized_name:\s*'([^']+)'/)
  if (normMatch && !inSkusArray) {
    currentNorm = normMatch[1]
  }

  // Detect start of skus array
  if (line.match(/^\s+skus:\s*\[/)) {
    inSkusArray = true
    skuDepth = 0
    // Count opening brackets on this line
    for (const ch of line) {
      if (ch === '[') skuDepth++
      if (ch === ']') skuDepth--
    }
    continue
  }

  if (inSkusArray) {
    for (const ch of line) {
      if (ch === '[') skuDepth++
      if (ch === ']') skuDepth--
    }

    // Check if this is a SKU verification_status line
    const familyKey = currentBrand + ':' + currentNorm
    if (pendingFamilyKeys.has(familyKey) && line.includes("verification_status: 'verified'")) {
      lines[i] = line.replace("verification_status: 'verified'", "verification_status: 'pending'")
      skuChanges++
    }

    if (skuDepth <= 0) {
      inSkusArray = false
    }
    continue
  }

  // Family-level verification_status (outside skus array)
  const familyKey = currentBrand + ':' + currentNorm
  if (pendingFamilyKeys.has(familyKey) && line.match(/^\s+verification_status:\s*'verified'/) && !inSkusArray) {
    lines[i] = line.replace("verification_status: 'verified'", "verification_status: 'pending'")
    familyChanges++
  }
}

fs.writeFileSync(dataPath, lines.join('\n'), 'utf8')

console.log('=== STATUS SYNC COMPLETE ===')
console.log('Family status changes (verified→pending):', familyChanges)
console.log('SKU status changes (verified→pending):', skuChanges)

// Verify
const { STARTER_PRODUCT_FAMILIES } = require(dataPath)
const vFam = STARTER_PRODUCT_FAMILIES.filter(f => f.verification_status === 'verified').length
const pFam = STARTER_PRODUCT_FAMILIES.filter(f => f.verification_status === 'pending').length
const allSkus = STARTER_PRODUCT_FAMILIES.flatMap(f => f.skus)
const vSku = allSkus.filter(s => s.verification_status === 'verified').length
const pSku = allSkus.filter(s => s.verification_status === 'pending').length
const vGtin = allSkus.filter(s => s.gtin && s.verification_status === 'verified').length

console.log('Family verified:', vFam, '/ pending:', pFam, '/ total:', vFam + pFam)
console.log('SKU verified:', vSku, '/ pending:', pSku, '/ total:', vSku + pSku)
console.log('Verified GTIN:', vGtin)
