'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  QrCode,
  FileText,
  ShieldCheck,
  ChevronRight,
  Loader2,
  User,
  Stethoscope,
  Info,
} from 'lucide-react'
import { analyzeImageQuality } from '@/lib/smart-scan/pre-check'
import { scanBarcodeFromImage, BarcodeScanResult } from '@/lib/smart-scan/barcode-scanner'
import { validateCrossPage, CrossPageValidationResult } from '@/lib/smart-scan/validation'
import { PassportPageType } from '@/lib/smart-scan/vision-gateway'

interface PageConfig {
  type: PassportPageType
  title: string
  subtitle: string
  targetFields: string[]
  pageNumber: number
  passportPageDisplay: string
  sectionName: string
}

const PAGES_FLOW: PageConfig[] = [
  {
    type: 'cover',
    title: 'Pasaport Kapağı',
    subtitle: 'Pasaportun ön kapağını veya ilk kimlik barkodunu çerçeveye hizalayın.',
    targetFields: ['Pasaport Numarası', 'Barkod / Çip Etiketi'],
    pageNumber: 1,
    passportPageDisplay: '1/32',
    sectionName: 'Pasaport Kapağı',
  },
  {
    type: 'page_4',
    title: 'Bölüm I — Sahibine Ait Bilgiler',
    subtitle: 'Ad, soyad, telefon ve ikamet adresi bilgilerinin yer aldığı sayfayı hizalayın.',
    targetFields: ['Adı & Soyadı', 'Telefon', 'İl / İlçe', 'Açık Adres', 'Posta Kodu'],
    pageNumber: 2,
    passportPageDisplay: '4/32',
    sectionName: 'Bölüm I — Sahibine Ait Bilgiler',
  },
  {
    type: 'page_5',
    title: 'Bölüm II — Hayvana Ait Bilgiler',
    subtitle: 'Can dostunuzun adı, türü, ırkı, cinsiyeti ve doğum tarihini içeren sayfayı çekin.',
    targetFields: ['İsim', 'Tür (Kedi/Köpek)', 'Irk', 'Cinsiyet', 'Doğum Tarihi', 'Renk'],
    pageNumber: 3,
    passportPageDisplay: '5/32',
    sectionName: 'Bölüm II — Hayvana Ait Bilgiler',
  },
  {
    type: 'page_6',
    title: 'Bölüm III — Hayvanın Kimlik Bilgileri',
    subtitle: '15 haneli mikroçip numarası, dövme no ve uygulama tarihini içeren sayfayı hizalayın.',
    targetFields: ['Mikroçip Numarası', 'Dövme No', 'Uygulama Tarihi'],
    pageNumber: 4,
    passportPageDisplay: '6/32',
    sectionName: 'Bölüm III — Hayvanın Kimlik Bilgileri',
  },
  {
    type: 'page_7',
    title: 'Bölüm IV — Pasaportu Düzenleyen Yetkili',
    subtitle: 'Pasaportu tanzim eden yetkili veteriner hekim ve klinik bilgilerinin yer aldığı sayfayı çekin.',
    targetFields: ['Veteriner Hekim', 'Klinik / Kurum', 'Telefon / E-posta', 'Kayıt Yeri (İl/İlçe)'],
    pageNumber: 5,
    passportPageDisplay: '7/32',
    sectionName: 'Bölüm IV — Pasaportu Düzenleyen Yetkili',
  },
]

export function PassportScanner() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Flow states
  const [sessionId] = useState<string>(() => crypto.randomUUID())
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0)
  const [isSummaryView, setIsSummaryView] = useState<boolean>(false)

  // Scan & extraction states
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [processingMessage, setProcessingMessage] = useState<string>('')
  const [preCheckWarning, setPreCheckWarning] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Captured data per page
  const [pagesData, setPagesData] = useState<{
    cover?: any
    page_4?: any
    page_5?: any
    page_6?: any
    page_7?: any
  }>({})
  const [barcodes, setBarcodes] = useState<BarcodeScanResult[]>([])
  const [pageConfidences, setPageConfidences] = useState<Record<string, number>>({})

  // Final validation and commit
  const [validationResult, setValidationResult] = useState<CrossPageValidationResult | null>(null)
  const [isCommitting, setIsCommitting] = useState<boolean>(false)

  const currentPage = PAGES_FLOW[currentPageIndex]
  const currentCaptured = pagesData[currentPage.type]

  // Re-calculate validation whenever pagesData updates
  useEffect(() => {
    const confValues = Object.values(pageConfidences)
    const minConfidence = confValues.length > 0 ? Math.min(...confValues) : null

    const result = validateCrossPage({
      cover: pagesData.cover,
      page_4: pagesData.page_4,
      page_5: pagesData.page_5,
      page_6: pagesData.page_6,
      page_7: pagesData.page_7,
      barcode: barcodes[0] || null,
      confidence: minConfidence,
    })
    setValidationResult(result)
  }, [pagesData, barcodes, pageConfidences])

  // Handle image capture
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMsg(null)
    setPreCheckWarning(null)
    setIsProcessing(true)
    setProcessingMessage('Görüntü kalitesi kontrol ediliyor...')

    try {
      // 1. Client-side Image Pre-Check (Blur, Glare, Resolution)
      const imageBitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = imageBitmap.width
      canvas.height = imageBitmap.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(imageBitmap, 0, 0)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const quality = analyzeImageQuality(imgData)

        if (!quality.isPassable && quality.warnings.length > 0) {
          setPreCheckWarning(quality.warnings.join(' '))
        }
      }

      // 2. Client-side Barcode Detection
      setProcessingMessage('Barkod taranıyor...')
      const detectedBarcode = await scanBarcodeFromImage(file)
      if (detectedBarcode) {
        setBarcodes(prev => [...prev, detectedBarcode])
      }

      // 3. Convert to base64 for Vision API
      setProcessingMessage('Akıllı metin okuma yapılıyor...')
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // 4. Send to Server Extract Endpoint (Protected by Redis Cost Guard)
      const response = await fetch('/api/smart-scan/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          pageType: currentPage.type,
          imageBase64: base64,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Safe user-friendly message
        setErrorMsg(data.error || 'Belgenizi otomatik okuyamadık. Bilgileri manuel girerek kaydı tamamlayabilirsiniz.')
        return
      }

      // Save page data and confidence
      setPagesData(prev => ({
        ...prev,
        [currentPage.type]: data.data,
      }))
      if (typeof data.confidence === 'number') {
        setPageConfidences(prev => ({
          ...prev,
          [currentPage.type]: data.confidence,
        }))
      }
    } catch (err) {
      console.error('[PassportScanner] Scan error:', err)
      setErrorMsg('Belgenizi otomatik okuyamadık. Bilgileri manuel girerek kaydı tamamlayabilirsiniz.')
    } finally {
      setIsProcessing(false)
      setProcessingMessage('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Redirect to manual entry wizard with prepopulated values securely via sessionStorage
  const handleManualFallback = () => {
    if (typeof window !== 'undefined' && validationResult?.unifiedData) {
      try {
        sessionStorage.setItem('smart_scan_draft', JSON.stringify(validationResult.unifiedData))
      } catch (e) {
        console.warn('[PassportScanner] Failed to write draft to sessionStorage:', e)
      }
    }

    // Clean URL navigation without exposing PII / identifiers in query parameters
    router.push('/owner/pets/add')
  }

  // Final commit via atomic RPC
  const handleCommit = async () => {
    if (!validationResult || !validationResult.canCommit) {
      setErrorMsg('Lütfen zorunlu alanların (Ad, Tür, Irk) doğru okunduğundan emin olun.')
      return
    }

    setIsCommitting(true)
    setErrorMsg(null)

    try {
      const u = validationResult.unifiedData
      const idempotencyKey = `smart_scan_${sessionId}`
      const res = await fetch('/api/smart-scan/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          idempotencyKey,
          petPayload: {
            name: u.name,
            species: u.species,
            breed: u.breed,
            gender: u.gender || null,
            birth_date: u.birth_date && /^\d{4}-\d{2}-\d{2}$/.test(u.birth_date) ? u.birth_date : null,
            color: u.color || null,
            microchip_no: u.microchip_no || null,
            passport_no: u.passport_no || null,
            tattoo_no: u.tattoo_no || null,
            vet_name: u.vet_name || null,
            vet_company: u.vet_company || null,
            vet_phone: u.vet_phone || null,
            vet_email: u.vet_email || null,
            registration_city: u.registration_city || null,
            registration_district: u.registration_district || null,
          },
          ownerPayload: {
            first_name: u.owner_first_name || null,
            last_name: u.owner_last_name || null,
            phone: u.owner_phone || null,
            city: u.owner_city || null,
            district: u.owner_district || null,
            neighborhood: u.owner_neighborhood || null,
            postal_code: u.owner_postal_code || null,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Kaydetme sırasında bir hata oluştu.')
        return
      }

      // Success -> navigate to pet details
      router.push(`/owner/pets/${data.petId}`)
    } catch (err) {
      console.error('[PassportScanner] Commit error:', err)
      setErrorMsg('Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.')
    } finally {
      setIsCommitting(false)
    }
  }

  // Hidden temp anchor for html5-qrcode
  return (
    <div className="w-full max-w-md mx-auto min-h-[600px] flex flex-col justify-between p-4 bg-surface rounded-2xl border border-border-main shadow-sm animate-fadeIn">
      <div id="qr-reader-temp-anchor" style={{ display: 'none' }} />

      {/* Header & Stepper */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (isSummaryView) {
                setIsSummaryView(false)
              } else if (currentPageIndex > 0) {
                setCurrentPageIndex(p => p - 1)
              } else {
                router.back()
              }
            }}
            className="p-2 rounded-full hover:bg-surface-hover text-text-secondary transition-colors"
            aria-label="Geri"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary bg-surface-muted px-3 py-1.5 rounded-full">
            <Sparkles size={14} className="text-primary" />
            <span>Akıllı Pasaport Taraması</span>
          </div>

          <button
            type="button"
            onClick={handleManualFallback}
            className="text-xs font-medium text-text-secondary hover:text-primary transition-colors underline"
          >
            Manuel Giriş
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="flex gap-1.5 w-full mt-1">
          {PAGES_FLOW.map((p, idx) => (
            <div
              key={p.type}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                idx < currentPageIndex || (idx === currentPageIndex && currentCaptured)
                  ? 'bg-primary'
                  : idx === currentPageIndex
                  ? 'bg-primary/40'
                  : 'bg-border-main'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="my-6 flex-1 flex flex-col justify-center">
        {!isSummaryView ? (
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-1">
              {currentPage.type === 'cover' && <FileText size={32} />}
              {currentPage.type === 'page_4' && <User size={32} />}
              {currentPage.type === 'page_5' && <ShieldCheck size={32} />}
              {currentPage.type === 'page_6' && <QrCode size={32} />}
              {currentPage.type === 'page_7' && <Stethoscope size={32} />}
            </div>

            <div>
              <div className="flex items-center gap-2 justify-center mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                  Sayfa {currentPage.passportPageDisplay}
                </span>
                <span className="text-xs font-medium text-text-secondary">
                  Adım {currentPage.pageNumber} / {PAGES_FLOW.length}
                </span>
                <span className="text-xs text-text-muted">
                  • Kalan: {PAGES_FLOW.length - currentPage.pageNumber} sayfa
                </span>
              </div>
              <h2 className="text-xl font-bold text-text-primary mt-1">{currentPage.title}</h2>
              <p className="text-sm text-text-secondary mt-1 px-4">{currentPage.subtitle}</p>
            </div>

            {/* Target Fields Preview */}
            <div className="w-full bg-surface-muted/60 p-3 rounded-xl border border-border-main/50 text-left mt-2">
              <span className="text-xs font-semibold text-text-secondary block mb-1.5">
                Okunacak Alanlar:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentPage.targetFields.map(f => (
                  <span
                    key={f}
                    className="text-xs bg-surface px-2.5 py-1 rounded-md border border-border-main text-text-primary"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Pre-check Warning Notification */}
            {preCheckWarning && (
              <div className="w-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 p-3 rounded-xl flex items-start gap-2 text-xs text-left">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                <span>{preCheckWarning}</span>
              </div>
            )}

            {/* Error Notification */}
            {errorMsg && (
              <div className="w-full bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 p-3 rounded-xl flex items-start gap-2 text-xs text-left">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                <div className="flex-1">
                  <span>{errorMsg}</span>
                  <button
                    type="button"
                    onClick={handleManualFallback}
                    className="block font-semibold mt-1 text-primary underline"
                  >
                    Formu Manuel Doldur
                  </button>
                </div>
              </div>
            )}

            {/* Instant Confirmation Card for Current Page */}
            {currentCaptured && (
              <div className="w-full bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl text-left mt-2 animate-fadeIn">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Sayfa {currentPage.passportPageDisplay} Başarıyla Okundu
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-text-secondary hover:text-primary flex items-center gap-1"
                  >
                    <RefreshCw size={12} /> Yeniden Çek
                  </button>
                </div>
                <div className="text-xs text-text-secondary space-y-1">
                  {Object.entries(currentCaptured)
                    .filter(([k]) => k !== 'confidence')
                    .map(([key, val]) => (
                      <div key={key} className="flex justify-between border-b border-border-main/30 py-1">
                        <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className="text-text-primary font-semibold">{String(val || '—')}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Summary View with 3 Sections */
          <div className="flex flex-col gap-4 text-left animate-fadeIn">
            <div className="text-center mb-1">
              <h2 className="text-xl font-bold text-text-primary">Bilgileri Teyit Edin</h2>
              <p className="text-xs text-text-secondary mt-1">
                Pasaporttan otomatik aktarılan bilgileri kontrol ederek onaylayın.
              </p>
            </div>

            {/* Validation Decision Badge */}
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                validationResult?.status === 'MATCH'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : validationResult?.status === 'CONFLICT'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                  : 'bg-surface-muted border-border-main text-text-secondary'
              }`}
            >
              {validationResult?.status === 'MATCH' && (
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
              )}
              {validationResult?.status === 'CONFLICT' && (
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              {validationResult?.status === 'UNKNOWN' && (
                <HelpCircle size={18} className="text-text-secondary shrink-0 mt-0.5" />
              )}

              <div>
                <span className="font-bold block">
                  {validationResult?.status === 'MATCH'
                    ? 'Tüm Bilgiler Uyumlu'
                    : validationResult?.status === 'CONFLICT'
                    ? 'Çelişkili Bilgiler Tespit Edildi'
                    : 'Eksik Alanlar Mevcut'}
                </span>
                {validationResult?.conflicts && validationResult.conflicts.length > 0 && (
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {validationResult.conflicts.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
                {validationResult?.warnings && validationResult.warnings.length > 0 && (
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-text-secondary">
                    {validationResult.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* SECTION 1: PET BİLGİLERİ */}
            <div className="bg-surface-muted/60 p-4 rounded-2xl border border-border-main text-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-border-main">
                <span className="font-bold text-text-primary flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-primary" />
                  Can Dostumun Bilgileri
                </span>
                <span className="text-[10px] text-text-muted">Bölüm II & III</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-main/40">
                <span className="text-text-secondary">Adı:</span>
                <span className="font-bold text-text-primary">
                  {validationResult?.unifiedData.name || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-main/40">
                <span className="text-text-secondary">Tür:</span>
                <span className="font-bold text-text-primary capitalize">
                  {validationResult?.unifiedData.species === 'cat'
                    ? 'Kedi'
                    : validationResult?.unifiedData.species === 'dog'
                    ? 'Köpek'
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-main/40">
                <span className="text-text-secondary">Irk:</span>
                <span className="font-bold text-text-primary">
                  {validationResult?.unifiedData.breed || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-main/40">
                <span className="text-text-secondary">Cinsiyet:</span>
                <span className="font-bold text-text-primary">
                  {validationResult?.unifiedData.gender === 'male'
                    ? 'Erkek'
                    : validationResult?.unifiedData.gender === 'female'
                    ? 'Dişi'
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-main/40">
                <span className="text-text-secondary">Doğum Tarihi:</span>
                <span className="font-bold text-text-primary">
                  {validationResult?.unifiedData.birth_date || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-main/40">
                <span className="text-text-secondary">Renk / Görünüm:</span>
                <span className="font-bold text-text-primary">
                  {validationResult?.unifiedData.color || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-main/40">
                <span className="text-text-secondary">Mikroçip No:</span>
                <span className="font-bold text-text-primary font-mono">
                  {validationResult?.unifiedData.microchip_no || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-main/40">
                <span className="text-text-secondary">Dövme No:</span>
                <span className="font-bold text-text-primary font-mono">
                  {validationResult?.unifiedData.tattoo_no || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-secondary">Pasaport No:</span>
                <span className="font-bold text-text-primary font-mono">
                  {validationResult?.unifiedData.passport_no || '—'}
                </span>
              </div>
            </div>

            {/* SECTION 2: SAHİP BİLGİLERİ (Bölüm I — Profil Tamamla) */}
            <div className="bg-surface-muted/60 p-4 rounded-2xl border border-border-main text-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-border-main">
                <span className="font-bold text-text-primary flex items-center gap-1.5">
                  <User size={16} className="text-primary" />
                  Sahip Bilgileri
                </span>
                <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                  Profil Tamamla
                </span>
              </div>
              <p className="text-[11px] text-text-muted flex items-start gap-1 pb-1">
                <Info size={12} className="shrink-0 mt-0.5 text-primary" />
                Mevcut profil bilgileriniz korunur, sadece boş alanlar doldurulur.
              </p>
              <div className="flex justify-between py-1 border-b border-border-main/40">
                <span className="text-text-secondary">Adı & Soyadı:</span>
                <span className="font-bold text-text-primary">
                  {[validationResult?.unifiedData.owner_first_name, validationResult?.unifiedData.owner_last_name]
                    .filter(Boolean)
                    .join(' ') || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-main/40">
                <span className="text-text-secondary">Telefon:</span>
                <span className="font-bold text-text-primary">
                  {validationResult?.unifiedData.owner_phone || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-main/40">
                <span className="text-text-secondary">İl / İlçe:</span>
                <span className="font-bold text-text-primary">
                  {[validationResult?.unifiedData.owner_city, validationResult?.unifiedData.owner_district]
                    .filter(Boolean)
                    .join(' / ') || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-main/40">
                <span className="text-text-secondary">Açık Adres:</span>
                <span className="font-bold text-text-primary text-right max-w-[200px] truncate">
                  {validationResult?.unifiedData.owner_neighborhood || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-secondary">Posta Kodu:</span>
                <span className="font-bold text-text-primary font-mono">
                  {validationResult?.unifiedData.owner_postal_code || '—'}
                </span>
              </div>
            </div>

            {/* SECTION 3: VETERİNER BİLGİLERİ (Bölüm IV) */}
            <div className="bg-surface-muted/60 p-4 rounded-2xl border border-border-main text-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-border-main">
                <span className="font-bold text-text-primary flex items-center gap-1.5">
                  <Stethoscope size={16} className="text-primary" />
                  Veteriner & Düzenleyen Yetkili
                </span>
                <span className="text-[10px] text-text-muted">Bölüm IV</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-main/40">
                <span className="text-text-secondary">Veteriner Hekim:</span>
                <span className="font-bold text-text-primary">
                  {validationResult?.unifiedData.vet_name || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-main/40">
                <span className="text-text-secondary">Klinik / Kurum:</span>
                <span className="font-bold text-text-primary">
                  {validationResult?.unifiedData.vet_company || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-main/40">
                <span className="text-text-secondary">Telefon:</span>
                <span className="font-bold text-text-primary">
                  {validationResult?.unifiedData.vet_phone || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border-main/40">
                <span className="text-text-secondary">E-posta:</span>
                <span className="font-bold text-text-primary">
                  {validationResult?.unifiedData.vet_email || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-secondary">Kayıt Şehri / İlçesi:</span>
                <span className="font-bold text-text-primary">
                  {[validationResult?.unifiedData.registration_city, validationResult?.unifiedData.registration_district]
                    .filter(Boolean)
                    .join(' / ') || '—'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File / Camera Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Actions & Navigation Footer */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border-main">
        {!isSummaryView ? (
          <>
            {!currentCaptured ? (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3.5 px-4 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{processingMessage}</span>
                  </>
                ) : (
                  <>
                    <Camera size={18} />
                    <span>Sayfa {currentPage.passportPageDisplay} Fotoğrafını Çek</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (currentPageIndex < PAGES_FLOW.length - 1) {
                    setCurrentPageIndex(p => p + 1)
                  } else {
                    setIsSummaryView(true)
                  }
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98] cursor-pointer shadow-sm text-sm"
              >
                {currentPageIndex < PAGES_FLOW.length - 1 ? (
                  <>
                    <span className="truncate">
                      Sonraki: Sayfa {PAGES_FLOW[currentPageIndex + 1].passportPageDisplay} ({PAGES_FLOW[currentPageIndex + 1].title})
                    </span>
                    <ChevronRight size={18} className="shrink-0" />
                  </>
                ) : (
                  <>
                    <span>Özeti İncele ve Teyit Et</span>
                    <ChevronRight size={18} className="shrink-0" />
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (currentPageIndex < PAGES_FLOW.length - 1) {
                  setCurrentPageIndex(p => p + 1)
                } else {
                  setIsSummaryView(true)
                }
              }}
              className="text-xs text-text-secondary hover:text-text-primary text-center py-1.5 transition-colors"
            >
              {currentPageIndex < PAGES_FLOW.length - 1 ? 'Bu sayfayı atla' : 'Özeti Gör'}
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={isCommitting || !validationResult?.canCommit}
            onClick={handleCommit}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isCommitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Can Dostumu Kaydet</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
