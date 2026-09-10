export interface PreCheckResult {
  isPassable: boolean
  warnings: string[]
  metrics: {
    blurScore: number
    glareRatio: number
    width: number
    height: number
  }
}

/**
 * Analyzes image frame before sending to server / AI model.
 * Detects blur, glare, and resolution issues to prevent wasting user quota.
 */
export function analyzeImageQuality(
  imageData: ImageData | { width: number; height: number; data: Uint8ClampedArray }
): PreCheckResult {
  const { width, height, data } = imageData
  const warnings: string[] = []

  // 1. Resolution check
  if (width < 600 || height < 600) {
    warnings.push('Çözünürlük düşük. Lütfen kamerayı pasaporta biraz daha yaklaştırın.')
  }

  const totalPixels = width * height
  if (totalPixels === 0) {
    return {
      isPassable: false,
      warnings: ['Görüntü boş veya okunamadı.'],
      metrics: { blurScore: 0, glareRatio: 0, width, height },
    }
  }

  // 2. Glare & Grayscale conversion for Laplacian
  let brightPixelCount = 0
  const grayscale = new Float32Array(totalPixels)

  for (let i = 0; i < totalPixels; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]

    // Perceived luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    grayscale[i] = lum

    if (lum > 245) {
      brightPixelCount++
    }
  }

  const glareRatio = brightPixelCount / totalPixels
  if (glareRatio > 0.15) {
    warnings.push('Görüntüde aşırı parlama veya yansıma var. Işık açısını değiştirin.')
  }

  // 3. Blur detection via Laplacian variance (subsampled for performance)
  // Standard 3x3 Laplacian filter on middle region
  const step = Math.max(1, Math.floor(Math.min(width, height) / 300))
  let laplacianSum = 0
  let laplacianSqSum = 0
  let sampleCount = 0

  const startY = Math.floor(height * 0.15)
  const endY = Math.floor(height * 0.85)
  const startX = Math.floor(width * 0.15)
  const endX = Math.floor(width * 0.85)

  for (let y = startY; y < endY; y += step) {
    for (let x = startX; x < endX; x += step) {
      const idx = y * width + x
      const top = (y - 1) * width + x
      const bottom = (y + 1) * width + x
      const left = y * width + (x - 1)
      const right = y * width + (x + 1)

      const centerVal = grayscale[idx]
      const lap = 4 * centerVal - (grayscale[top] + grayscale[bottom] + grayscale[left] + grayscale[right])

      laplacianSum += lap
      laplacianSqSum += lap * lap
      sampleCount++
    }
  }

  const mean = sampleCount > 0 ? laplacianSum / sampleCount : 0
  const blurScore = sampleCount > 0 ? (laplacianSqSum / sampleCount) - (mean * mean) : 0

  if (blurScore < 80) {
    warnings.push('Görüntü bulanık görünüyor. Kamerayı sabit tutarak tekrar deneyin.')
  }

  const isPassable = warnings.length === 0 || (blurScore >= 60 && glareRatio <= 0.20 && width >= 500)

  return {
    isPassable,
    warnings,
    metrics: {
      blurScore: Math.round(blurScore),
      glareRatio: Number(glareRatio.toFixed(3)),
      width,
      height,
    },
  }
}
