'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
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
  ShieldCheck,
  ChevronRight,
  Loader2,
  User,
  Stethoscope,
  Info,
  FileEdit,
} from 'lucide-react'
import { analyzeImageQuality } from '@/lib/smart-scan/pre-check'
import { scanBarcodeFromImage, BarcodeScanResult } from '@/lib/smart-scan/barcode-scanner'
import { validateCrossPage, CrossPageValidationResult } from '@/lib/smart-scan/validation'
import { PassportPageType } from '@/lib/smart-scan/vision-gateway'
import { PassportPageReference } from './PassportPageReference'

export interface PageConfig {
  type: PassportPageType
  title: string
  subtitle: string
  targetFields: string[]
  pageNumber: number
  passportPageDisplay: string
  sectionName: string
  photoCta: string
  manualTitle: string
}

export const PAGES_FLOW: PageConfig[] = [
  {
    type: 'cover',
    title: 'Pasaport Kapağı',
    subtitle: 'Pasaportun ön kapağını veya ilk kimlik barkodunu çerçeveye hizalayın.',
    targetFields: ['Pasaport Numarası', 'Barkod / Çip Etiketi'],
    pageNumber: 1,
    passportPageDisplay: '1/32',
    sectionName: 'Pasaport Kapağı',
    photoCta: 'Pasaport Kapağını Fotoğraflayın →',
    manualTitle: 'Pasaport Kapağı — Bilgileri Manuel Girin',
  },
  {
    type: 'page_4',
    title: 'Bölüm I — Sahibine Ait Bilgiler',
    subtitle: 'Ad, soyad, telefon ve ikamet adresi bilgilerinin yer aldığı sayfayı hizalayın.',
    targetFields: ['Adı & Soyadı', 'Telefon', 'İl / İlçe', 'Açık Adres', 'Posta Kodu'],
    pageNumber: 2,
    passportPageDisplay: '4/32',
    sectionName: 'Bölüm I — Sahibine Ait Bilgiler',
    photoCta: 'Sahip Bilgilerini Fotoğraflayın →',
    manualTitle: 'Sayfa 4/32 — Sahibine Ait Bilgileri Manuel Girin',
  },
  {
    type: 'page_5',
    title: 'Bölüm II — Hayvana Ait Bilgiler',
    subtitle: 'Can dostunuzun adı, türü, ırkı, cinsiyeti ve doğum tarihini içeren sayfayı çekin.',
    targetFields: ['İsim', 'Tür (Kedi/Köpek)', 'Irk', 'Cinsiyet', 'Doğum Tarihi', 'Renk'],
    pageNumber: 3,
    passportPageDisplay: '5/32',
    sectionName: 'Bölüm II — Hayvana Ait Bilgiler',
    photoCta: 'Hayvan Bilgilerini Fotoğraflayın →',
    manualTitle: 'Sayfa 5/32 — Hayvana Ait Bilgileri Manuel Girin',
  },
  {
    type: 'page_6',
    title: 'Bölüm III — Hayvanın Kimlik Bilgileri',
    subtitle: '15 haneli mikroçip numarası, dövme no ve uygulama tarihini içeren sayfayı hizalayın.',
    targetFields: ['Mikroçip Numarası', 'Dövme No', 'Uygulama Tarihi'],
    pageNumber: 4,
    passportPageDisplay: '6/32',
    sectionName: 'Bölüm III — Hayvanın Kimlik Bilgileri',
    photoCta: 'Kimlik & Çip Sayfasını Fotoğraflayın →',
    manualTitle: 'Sayfa 6/32 — Kimlik ve Çip Bilgilerini Manuel Girin',
  },
  {
    type: 'page_7',
    title: 'Bölüm IV — Pasaportu Düzenleyen Yetkili',
    subtitle: 'Pasaportu tanzim eden yetkili veteriner hekim ve klinik bilgilerinin yer aldığı sayfayı çekin.',
    targetFields: ['Veteriner Hekim', 'Klinik / Kurum', 'Telefon / E-posta', 'Kayıt Yeri (İl/İlçe)'],
    pageNumber: 5,
    passportPageDisplay: '7/32',
    sectionName: 'Bölüm IV — Pasaportu Düzenleyen Yetkili',
    photoCta: 'Yetkili Veteriner Sayfasını Fotoğraflayın →',
    manualTitle: 'Sayfa 7/32 — Yetkili Veteriner Bilgilerini Manuel Girin',
  },
]

export const QUICK_COLORS = [
  'Beyaz',
  'Siyah',
  'Sarı / Sarman',
  'Kahverengi',
  'Tekir',
  'Alacalı',
  'Gri',
] as const

export interface ConfirmationData {
  name: string
  species: 'cat' | 'dog' | ''
  breed: string
  gender: 'male' | 'female' | ''
  birth_date: string
  color: string
  microchip_no: string
  tattoo_no: string
  passport_no: string

  owner_first_name: string
  owner_last_name: string
  owner_phone: string
  owner_city: string
  owner_district: string
  owner_address: string
  owner_postal_code: string

  vet_name: string
  vet_company: string
  vet_phone: string
  vet_email: string
  registration_city: string
  registration_district: string
}

/**
 * Downscales camera image client-side to max 1600px and converts to 0.8 JPEG.
 * Reduces 12MP-48MP mobile camera photos (~5MB-15MB base64) to ~250-350KB,
 * speeding up mobile upload by >90% and staying well under API / serverless limits.
 */
export async function optimizeImageForOcr(
  file: File,
  maxDimension = 1600,
  quality = 0.8
): Promise<{ base64: string; imageData?: ImageData }> {
  if (typeof window === 'undefined') {
    const base64 = await readFileAsDataUrl(file)
    return { base64 }
  }

  try {
    let sourceWidth = 0
    let sourceHeight = 0
    let imageSource: CanvasImageSource | null = null

    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file)
      sourceWidth = bitmap.width
      sourceHeight = bitmap.height
      imageSource = bitmap
    } else if (typeof Image !== 'undefined') {
      const img = new Image()
      const url = URL.createObjectURL(file)
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = url
      })
      URL.revokeObjectURL(url)
      sourceWidth = img.naturalWidth || img.width
      sourceHeight = img.naturalHeight || img.height
      imageSource = img
    }

    if (!imageSource || !sourceWidth || !sourceHeight) {
      const base64 = await readFileAsDataUrl(file)
      return { base64 }
    }

    let targetWidth = sourceWidth
    let targetHeight = sourceHeight

    if (targetWidth > maxDimension || targetHeight > maxDimension) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDimension) / targetWidth)
        targetWidth = maxDimension
      } else {
        targetWidth = Math.round((targetWidth * maxDimension) / targetHeight)
        targetHeight = maxDimension
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      const base64 = await readFileAsDataUrl(file)
      return { base64 }
    }

    ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight)
    const base64 = canvas.toDataURL('image/jpeg', quality)
    let imageData: ImageData | undefined
    try {
      imageData = ctx.getImageData(0, 0, targetWidth, targetHeight)
    } catch {
      // ignore
    }

    return { base64, imageData }
  } catch (err) {
    console.warn('[PassportScanner] Image optimization fallback:', err)
    const base64 = await readFileAsDataUrl(file)
    return { base64 }
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function PassportScanner() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Flow states
  const [sessionId] = useState<string>(() => crypto.randomUUID())
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0)
  const [isSummaryView, setIsSummaryView] = useState<boolean>(false)
  const [isManualEntry, setIsManualEntry] = useState<boolean>(false)
  const [returnToSummary, setReturnToSummary] = useState<boolean>(false)

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

  // Local draft state for active manual form
  const [manualFormData, setManualFormData] = useState<Record<string, any>>({})

  // Final validation and commit
  const [validationResult, setValidationResult] = useState<CrossPageValidationResult | null>(null)
  const [isCommitting, setIsCommitting] = useState<boolean>(false)

  // Confirmation normalized model states
  const [userEdits, setUserEdits] = useState<Partial<ConfirmationData>>({})
  const [activeEditSection, setActiveEditSection] = useState<'pet' | 'owner' | 'vet' | null>(null)
  const [sectionDraft, setSectionDraft] = useState<Partial<ConfirmationData>>({})
  const [confirmationError, setConfirmationError] = useState<string | null>(null)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const isSubmittingRef = useRef<boolean>(false)

  // Base extracted data derived from OCR pages + barcode + validation unified data
  const extractedData: ConfirmationData = useMemo(() => {
    const u = validationResult?.unifiedData || {}
    return {
      name: u.name || pagesData.page_5?.name || '',
      species: (u.species || pagesData.page_5?.species || '') as any,
      breed: u.breed || pagesData.page_5?.breed || '',
      gender: (u.gender || pagesData.page_5?.gender || '') as any,
      birth_date: u.birth_date || pagesData.page_5?.birth_date || '',
      color: u.color || pagesData.page_5?.color || '',
      microchip_no:
        u.microchip_no ||
        pagesData.page_6?.microchip_no ||
        pagesData.cover?.microchip_no ||
        barcodes[0]?.text ||
        '',
      tattoo_no: u.tattoo_no || pagesData.page_6?.tattoo_no || '',
      passport_no: u.passport_no || pagesData.cover?.passport_no || '',

      owner_first_name: u.owner_first_name || pagesData.page_4?.owner_first_name || '',
      owner_last_name: u.owner_last_name || pagesData.page_4?.owner_last_name || '',
      owner_phone: u.owner_phone || pagesData.page_4?.owner_phone || '',
      owner_city: u.owner_city || pagesData.page_4?.owner_city || '',
      owner_district: u.owner_district || pagesData.page_4?.owner_district || '',
      owner_address: u.owner_neighborhood || pagesData.page_4?.owner_address || '',
      owner_postal_code: u.owner_postal_code || pagesData.page_4?.owner_postal_code || '',

      vet_name: u.vet_name || pagesData.page_7?.veterinarian_name || '',
      vet_company: u.vet_company || pagesData.page_7?.clinic_name || '',
      vet_phone: u.vet_phone || pagesData.page_7?.vet_phone || '',
      vet_email: u.vet_email || pagesData.page_7?.vet_email || '',
      registration_city: u.registration_city || pagesData.page_7?.registration_city || '',
      registration_district: u.registration_district || pagesData.page_7?.registration_district || '',
    }
  }, [validationResult, pagesData, barcodes])

  // Final confirmed data: extracted data + user edits
  const finalData: ConfirmationData = useMemo(() => {
    return {
      ...extractedData,
      ...userEdits,
    }
  }, [extractedData, userEdits])

  const currentPage = PAGES_FLOW[currentPageIndex]
  const currentCaptured = pagesData[currentPage.type]

  // Sync manual form data with current captured page whenever opening manual form or switching page
  useEffect(() => {
    if (isManualEntry) {
      const currentData = { ...(pagesData[currentPage.type] || {}) }

      // Prefill Page 6 (Identity & Chip) with microchip from Page 1 (cover) / barcode / unifiedData
      if (currentPage.type === 'page_6' && !currentData.microchip_no) {
        const prefilledChip =
          pagesData.cover?.microchip_no ||
          barcodes[0]?.text ||
          validationResult?.unifiedData?.microchip_no ||
          ''
        if (prefilledChip) {
          currentData.microchip_no = prefilledChip
        }
      }

      setManualFormData(currentData)
    }
  }, [isManualEntry, currentPageIndex, currentPage.type, pagesData, barcodes, validationResult])

  // Re-calculate validation whenever pagesData, userEdits, or barcodes update
  useEffect(() => {
    const confValues = Object.values(pageConfidences)
    const minConfidence = confValues.length > 0 ? Math.min(...confValues) : null

    // Effective user corrections
    const effectiveMicrochip = userEdits.microchip_no !== undefined ? userEdits.microchip_no : undefined
    const effectivePassport = userEdits.passport_no !== undefined ? userEdits.passport_no : undefined

    const result = validateCrossPage({
      cover: {
        ...(pagesData.cover || {}),
        ...(effectivePassport !== undefined ? { passport_no: effectivePassport } : {}),
        ...(effectiveMicrochip !== undefined ? { microchip_no: effectiveMicrochip } : {}),
      },
      page_4: {
        ...(pagesData.page_4 || {}),
        ...(userEdits.owner_first_name !== undefined ? { owner_first_name: userEdits.owner_first_name } : {}),
        ...(userEdits.owner_last_name !== undefined ? { owner_last_name: userEdits.owner_last_name } : {}),
        ...(userEdits.owner_phone !== undefined ? { owner_phone: userEdits.owner_phone } : {}),
        ...(userEdits.owner_city !== undefined ? { owner_city: userEdits.owner_city } : {}),
        ...(userEdits.owner_district !== undefined ? { owner_district: userEdits.owner_district } : {}),
        ...(userEdits.owner_address !== undefined ? { owner_address: userEdits.owner_address } : {}),
        ...(userEdits.owner_postal_code !== undefined ? { owner_postal_code: userEdits.owner_postal_code } : {}),
      },
      page_5: {
        ...(pagesData.page_5 || {}),
        ...(userEdits.name !== undefined ? { name: userEdits.name } : {}),
        ...(userEdits.species !== undefined ? { species: userEdits.species } : {}),
        ...(userEdits.breed !== undefined ? { breed: userEdits.breed } : {}),
        ...(userEdits.gender !== undefined ? { gender: userEdits.gender } : {}),
        ...(userEdits.birth_date !== undefined ? { birth_date: userEdits.birth_date } : {}),
        ...(userEdits.color !== undefined ? { color: userEdits.color } : {}),
      },
      page_6: {
        ...(pagesData.page_6 || {}),
        ...(effectiveMicrochip !== undefined ? { microchip_no: effectiveMicrochip } : {}),
        ...(userEdits.tattoo_no !== undefined ? { tattoo_no: userEdits.tattoo_no } : {}),
      },
      page_7: {
        ...(pagesData.page_7 || {}),
        ...(userEdits.vet_name !== undefined ? { veterinarian_name: userEdits.vet_name } : {}),
        ...(userEdits.vet_company !== undefined ? { clinic_name: userEdits.vet_company } : {}),
        ...(userEdits.vet_phone !== undefined ? { vet_phone: userEdits.vet_phone } : {}),
        ...(userEdits.vet_email !== undefined ? { vet_email: userEdits.vet_email } : {}),
        ...(userEdits.registration_city !== undefined ? { registration_city: userEdits.registration_city } : {}),
        ...(userEdits.registration_district !== undefined ? { registration_district: userEdits.registration_district } : {}),
      },
      // If user explicitly provided a valid microchip or passport, suppress barcode conflict
      barcode: (effectiveMicrochip || effectivePassport) ? null : (barcodes[0] || null),
      confidence: minConfidence,
    })
    setValidationResult(result)
  }, [pagesData, barcodes, pageConfidences, userEdits])

  // Handle image capture
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMsg(null)
    setPreCheckWarning(null)
    setIsProcessing(true)
    setProcessingMessage('Görüntü optimize ediliyor...')

    try {
      // 1. Client-side Image Optimization (Downscale to max 1600px, 0.8 JPEG)
      const { base64, imageData } = await optimizeImageForOcr(file)

      // Fast image pre-check (blur, glare, resolution)
      if (imageData) {
        const quality = analyzeImageQuality(imageData)
        if (!quality.isPassable && quality.warnings.length > 0) {
          setPreCheckWarning(quality.warnings.join(' '))
        }
      }

      // 2. Client-side Barcode Detection (Restricted to cover and page 6)
      if (currentPage.type === 'cover' || currentPage.type === 'page_6') {
        setProcessingMessage('Barkod taranıyor...')
        const detectedBarcode = await scanBarcodeFromImage(file)
        if (detectedBarcode) {
          setBarcodes(prev => [...prev, detectedBarcode])
        }
      }

      // 3. Send to Server Extract Endpoint (Protected by Redis Cost Guard)
      setProcessingMessage('Akıllı metin okuma yapılıyor...')
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

  // Open in-place manual form without navigating away from the Smart Scan page
  const handleOpenManualEntry = () => {
    setIsManualEntry(true)
    setErrorMsg(null)
  }

  // Handle field change in manual form
  const handleManualFieldChange = (field: string, value: any) => {
    setManualFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  // Start inline section edit on confirmation screen
  const handleStartEdit = (section: 'pet' | 'owner' | 'vet') => {
    setActiveEditSection(section)
    setSectionDraft({ ...finalData })
    setConfirmationError(null)
  }

  // Cancel inline section edit and discard temporary changes
  const handleCancelEdit = () => {
    setActiveEditSection(null)
    setSectionDraft({})
    setConfirmationError(null)
  }

  // Update field in active section draft
  const handleDraftChange = (field: keyof ConfirmationData, value: any) => {
    setSectionDraft(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  // Save section draft into userEdits and return to view state
  const handleSaveEdit = (section: 'pet' | 'owner' | 'vet') => {
    if (section === 'pet') {
      if (!sectionDraft.name?.trim()) {
        setConfirmationError('Can dostunuzun adı zorunludur.')
        return
      }
      if (!sectionDraft.species || (sectionDraft.species !== 'cat' && sectionDraft.species !== 'dog')) {
        setConfirmationError('Lütfen tür seçiniz (Kedi veya Köpek).')
        return
      }
      if (!sectionDraft.breed?.trim()) {
        setConfirmationError('Irk bilgisi zorunludur.')
        return
      }
      if (sectionDraft.birth_date) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(sectionDraft.birth_date)) {
          setConfirmationError('Doğum tarihi formatı YYYY-MM-DD olmalıdır.')
          return
        }
        const bDate = new Date(sectionDraft.birth_date)
        if (isNaN(bDate.getTime()) || bDate > new Date()) {
          setConfirmationError('Doğum tarihi bugünden ileri bir tarih olamaz.')
          return
        }
      }
      if (sectionDraft.microchip_no) {
        const cleanChip = sectionDraft.microchip_no.replace(/\D/g, '')
        if (cleanChip && cleanChip.length !== 15) {
          setConfirmationError('Mikroçip numarası 15 haneli sayı olmalıdır.')
          return
        }
      }
    }

    if (section === 'owner') {
      if (sectionDraft.owner_postal_code) {
        const cleanPost = sectionDraft.owner_postal_code.replace(/\D/g, '')
        if (cleanPost && cleanPost.length !== 5) {
          setConfirmationError('Posta kodu 5 haneli sayı olmalıdır.')
          return
        }
      }
    }

    // Persist verified edits to userEdits state
    setUserEdits(prev => ({
      ...prev,
      ...sectionDraft,
    }))

    setActiveEditSection(null)
    setSectionDraft({})
    setConfirmationError(null)
  }

  // Jump to specific step from Summary view or open inline edit
  const handleEditFromSummary = (targetPageType: PassportPageType) => {
    if (targetPageType === 'page_5' || targetPageType === 'cover' || targetPageType === 'page_6') {
      handleStartEdit('pet')
    } else if (targetPageType === 'page_4') {
      handleStartEdit('owner')
    } else if (targetPageType === 'page_7') {
      handleStartEdit('vet')
    }
  }

  // Submit in-place manual form and advance to next page or summary
  const handleSaveManualEntry = (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    // Save entered data to pagesData
    setPagesData(prev => ({
      ...prev,
      [currentPage.type]: {
        ...(prev[currentPage.type] || {}),
        ...manualFormData,
      },
    }))

    // Mark high confidence for manually verified/entered data
    setPageConfidences(prev => ({
      ...prev,
      [currentPage.type]: 1.0,
    }))

    setIsManualEntry(false)
    setErrorMsg(null)

    // If returning from direct summary edit, route directly back to summary
    if (returnToSummary) {
      setReturnToSummary(false)
      setIsSummaryView(true)
      return
    }

    // Advance to next step or summary view
    if (currentPageIndex < PAGES_FLOW.length - 1) {
      setCurrentPageIndex(p => p + 1)
    } else {
      setIsSummaryView(true)
    }
  }

  // Final commit via atomic RPC with full finalData validation and double-submit protection
  const handleCommit = async () => {
    if (isSubmittingRef.current || isCommitting) return

    setConfirmationError(null)

    // Ensure any open section edit is saved or dismissed
    if (activeEditSection !== null) {
      setConfirmationError('Lütfen açık olan düzenleme formunu kaydedin veya vazgeçin.')
      return
    }

    // Client-side validation of finalData
    if (!finalData.name?.trim()) {
      setConfirmationError('Can dostunuzun adı zorunludur. Lütfen "Can Dostumun Bilgileri" bölümünü düzenleyin.')
      return
    }
    if (!finalData.species || (finalData.species !== 'cat' && finalData.species !== 'dog')) {
      setConfirmationError('Tür seçimi (Kedi veya Köpek) zorunludur.')
      return
    }
    if (!finalData.breed?.trim()) {
      setConfirmationError('Irk bilgisi zorunludur. Lütfen "Can Dostumun Bilgileri" bölümünü düzenleyin.')
      return
    }
    if (finalData.birth_date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(finalData.birth_date)) {
        setConfirmationError('Doğum tarihi formatı YYYY-MM-DD olmalıdır.')
        return
      }
      const bDate = new Date(finalData.birth_date)
      if (isNaN(bDate.getTime()) || bDate > new Date()) {
        setConfirmationError('Doğum tarihi bugünden ileri bir tarih olamaz.')
        return
      }
    }
    if (finalData.microchip_no) {
      const cleanChip = finalData.microchip_no.replace(/\D/g, '')
      if (cleanChip && cleanChip.length !== 15) {
        setConfirmationError('Mikroçip numarası 15 haneli sayı olmalıdır.')
        return
      }
    }
    if (finalData.owner_postal_code) {
      const cleanPostal = finalData.owner_postal_code.replace(/\D/g, '')
      if (cleanPostal && cleanPostal.length !== 5) {
        setConfirmationError('Posta kodu 5 haneli sayı olmalıdır.')
        return
      }
    }

    isSubmittingRef.current = true
    setIsCommitting(true)
    setSubmitStatus('submitting')

    try {
      const idempotencyKey = `smart_scan_${sessionId}`
      const res = await fetch('/api/smart-scan/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          idempotencyKey,
          petPayload: {
            name: finalData.name.trim(),
            species: finalData.species,
            breed: finalData.breed.trim(),
            gender: finalData.gender || null,
            birth_date: finalData.birth_date && /^\d{4}-\d{2}-\d{2}$/.test(finalData.birth_date) ? finalData.birth_date : null,
            color: finalData.color || null,
            microchip_no: finalData.microchip_no ? finalData.microchip_no.replace(/\D/g, '') : null,
            passport_no: finalData.passport_no ? finalData.passport_no.trim() : null,
            tattoo_no: finalData.tattoo_no ? finalData.tattoo_no.trim() : null,
            vet_name: finalData.vet_name ? finalData.vet_name.trim() : null,
            vet_company: finalData.vet_company ? finalData.vet_company.trim() : null,
            vet_phone: finalData.vet_phone ? finalData.vet_phone.trim() : null,
            vet_email: finalData.vet_email ? finalData.vet_email.trim() : null,
            registration_city: finalData.registration_city ? finalData.registration_city.trim() : null,
            registration_district: finalData.registration_district ? finalData.registration_district.trim() : null,
          },
          ownerPayload: {
            first_name: finalData.owner_first_name ? finalData.owner_first_name.trim() : null,
            last_name: finalData.owner_last_name ? finalData.owner_last_name.trim() : null,
            phone: finalData.owner_phone ? finalData.owner_phone.trim() : null,
            city: finalData.owner_city ? finalData.owner_city.trim() : null,
            district: finalData.owner_district ? finalData.owner_district.trim() : null,
            neighborhood: finalData.owner_address ? finalData.owner_address.trim() : null,
            postal_code: finalData.owner_postal_code ? finalData.owner_postal_code.replace(/\D/g, '') : null,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        setConfirmationError(data.error || 'Bilgiler kaydedilemedi. Lütfen tekrar deneyin.')
        setSubmitStatus('idle')
        setIsCommitting(false)
        isSubmittingRef.current = false
        return
      }

      setSubmitStatus('success')
      router.push(`/owner/pets/${data.petId}`)
    } catch (err) {
      console.error('[PassportScanner] Commit error:', err)
      setConfirmationError('Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.')
      setSubmitStatus('idle')
      setIsCommitting(false)
      isSubmittingRef.current = false
    }
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col p-4 bg-surface rounded-2xl border border-border-main shadow-sm animate-fadeIn">
      <div id="qr-reader-temp-anchor" style={{ display: 'none' }} />

      {/* Header & Stepper */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            data-testid="back-button"
            onClick={() => {
              if (isManualEntry) {
                setIsManualEntry(false)
              } else if (isSummaryView) {
                if (activeEditSection) {
                  setActiveEditSection(null)
                  setSectionDraft({})
                } else {
                  setIsSummaryView(false)
                }
              } else if (currentPageIndex > 0) {
                setCurrentPageIndex(p => p - 1)
              } else {
                router.back()
              }
            }}
            className="p-2 rounded-full hover:bg-surface-hover text-text-secondary transition-colors cursor-pointer"
            aria-label="Geri"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary bg-surface-muted px-3 py-1.5 rounded-full">
            <Sparkles size={14} className="text-primary" />
            <span>Akıllı Pasaport Taraması</span>
          </div>

          {!isSummaryView && !isManualEntry && (
            <button
              type="button"
              data-testid="header-manual-btn"
              onClick={handleOpenManualEntry}
              className="text-xs font-medium text-text-secondary hover:text-primary transition-colors underline cursor-pointer"
            >
              Manuel Giriş
            </button>
          )}

          {isManualEntry && (
            <button
              type="button"
              data-testid="header-camera-return-btn"
              onClick={() => setIsManualEntry(false)}
              className="text-xs font-medium text-text-secondary hover:text-primary transition-colors underline cursor-pointer"
            >
              Fotoğrafa Dön
            </button>
          )}

          {isSummaryView && <div className="w-16" />}
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
      <div className={`w-full flex-1 flex flex-col ${isSummaryView ? 'my-2 gap-3' : 'my-5 justify-center'}`}>
        {/* VIEW 1: IN-PLACE MANUAL ENTRY FORM */}
        {isManualEntry && !isSummaryView && (
          <form
            data-testid={`manual-form-${currentPage.type}`}
            onSubmit={handleSaveManualEntry}
            className="flex flex-col gap-4 text-left animate-fadeIn"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                  Sayfa {currentPage.passportPageDisplay}
                </span>
                <span className="text-xs font-medium text-text-secondary">
                  Adım {currentPage.pageNumber} / {PAGES_FLOW.length}
                </span>
              </div>
              <h2 className="text-lg font-bold text-text-primary mt-1">{currentPage.manualTitle}</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Bu sayfadaki alanları elle doldurarak akışa kesintisiz devam edebilirsiniz.
              </p>
            </div>

            <div className="bg-surface-muted/50 p-4 rounded-2xl border border-border-main/70 space-y-3">
              {/* Cover Fields */}
              {currentPage.type === 'cover' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">
                      Pasaport Numarası
                    </label>
                    <input
                      type="text"
                      data-testid="input-passport-no"
                      value={manualFormData.passport_no || ''}
                      onChange={e => handleManualFieldChange('passport_no', e.target.value.toUpperCase())}
                      placeholder="Örn: TR-06-123456"
                      className="w-full text-xs font-mono font-semibold p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">
                      Mikroçip Numarası (Kapak Barkod Etiketi)
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      data-testid="input-cover-microchip"
                      value={manualFormData.microchip_no || ''}
                      onChange={e => handleManualFieldChange('microchip_no', e.target.value.replace(/\D/g, ''))}
                      placeholder="15 haneli sayı"
                      className="w-full text-xs font-mono font-semibold p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </>
              )}

              {/* Page 4 Fields: Owner */}
              {currentPage.type === 'page_4' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Sahip Adı</label>
                      <input
                        type="text"
                        data-testid="input-owner-first-name"
                        value={manualFormData.owner_first_name || ''}
                        onChange={e => handleManualFieldChange('owner_first_name', e.target.value)}
                        placeholder="Örn: Tufan"
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Sahip Soyadı</label>
                      <input
                        type="text"
                        data-testid="input-owner-last-name"
                        value={manualFormData.owner_last_name || ''}
                        onChange={e => handleManualFieldChange('owner_last_name', e.target.value)}
                        placeholder="Örn: Tabak"
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">Telefon Numarası</label>
                    <input
                      type="tel"
                      data-testid="input-owner-phone"
                      value={manualFormData.owner_phone || ''}
                      onChange={e => handleManualFieldChange('owner_phone', e.target.value)}
                      placeholder="Örn: +90 532 111 22 33"
                      className="w-full text-xs font-medium p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">İl</label>
                      <input
                        type="text"
                        data-testid="input-owner-city"
                        value={manualFormData.owner_city || ''}
                        onChange={e => handleManualFieldChange('owner_city', e.target.value)}
                        placeholder="Örn: İstanbul"
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">İlçe</label>
                      <input
                        type="text"
                        data-testid="input-owner-district"
                        value={manualFormData.owner_district || ''}
                        onChange={e => handleManualFieldChange('owner_district', e.target.value)}
                        placeholder="Örn: Kadıköy"
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">Açık Adres (Mahalle / Sokak)</label>
                    <input
                      type="text"
                      data-testid="input-owner-address"
                      value={manualFormData.owner_address || ''}
                      onChange={e => handleManualFieldChange('owner_address', e.target.value)}
                      placeholder="Örn: Moda Cad. No: 12 D: 4"
                      className="w-full text-xs font-medium p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">Posta Kodu</label>
                    <input
                      type="text"
                      maxLength={5}
                      data-testid="input-owner-postal-code"
                      value={manualFormData.owner_postal_code || ''}
                      onChange={e => handleManualFieldChange('owner_postal_code', e.target.value.replace(/\D/g, ''))}
                      placeholder="Örn: 34710"
                      className="w-full text-xs font-mono font-medium p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                    />
                  </div>
                </>
              )}

              {/* Page 5 Fields: Pet */}
              {currentPage.type === 'page_5' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">
                      Can Dostunun Adı <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      data-testid="input-pet-name"
                      value={manualFormData.name || ''}
                      onChange={e => handleManualFieldChange('name', e.target.value)}
                      placeholder="Örn: Boncuk, Duman, Karamel"
                      className="w-full text-xs font-semibold p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">
                      Türü <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        data-testid="species-toggle-cat"
                        onClick={() => handleManualFieldChange('species', 'cat')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          manualFormData.species === 'cat'
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-surface border-border-main text-text-secondary hover:bg-surface-hover'
                        }`}
                      >
                        🐱 Kedi
                      </button>
                      <button
                        type="button"
                        data-testid="species-toggle-dog"
                        onClick={() => handleManualFieldChange('species', 'dog')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          manualFormData.species === 'dog'
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-surface border-border-main text-text-secondary hover:bg-surface-hover'
                        }`}
                      >
                        🐶 Köpek
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">
                        Irkı <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        data-testid="input-pet-breed"
                        value={manualFormData.breed || ''}
                        onChange={e => handleManualFieldChange('breed', e.target.value)}
                        placeholder="Örn: Tekir, Golden"
                        className="w-full text-xs font-semibold p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Cinsiyeti</label>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          data-testid="gender-toggle-male"
                          onClick={() => handleManualFieldChange('gender', 'male')}
                          className={`py-2 px-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                            manualFormData.gender === 'male'
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-surface border-border-main text-text-secondary'
                          }`}
                        >
                          Erkek
                        </button>
                        <button
                          type="button"
                          data-testid="gender-toggle-female"
                          onClick={() => handleManualFieldChange('gender', 'female')}
                          className={`py-2 px-1 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                            manualFormData.gender === 'female'
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-surface border-border-main text-text-secondary'
                          }`}
                        >
                          Dişi
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Doğum Tarihi</label>
                      <input
                        type="date"
                        data-testid="input-pet-birth-date"
                        value={manualFormData.birth_date || ''}
                        onChange={e => handleManualFieldChange('birth_date', e.target.value)}
                        className="w-full text-xs font-medium p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Renk / Görünüm</label>
                      <input
                        type="text"
                        data-testid="input-pet-color"
                        value={manualFormData.color || ''}
                        onChange={e => handleManualFieldChange('color', e.target.value)}
                        placeholder="Örn: Sarı, Beyaz"
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary block mb-1.5">
                      Hızlı Renk Seçimi
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_COLORS.map(c => {
                        const testIdSlug = c
                          .toLowerCase()
                          .replace(/ç/g, 'c')
                          .replace(/ğ/g, 'g')
                          .replace(/ı/g, 'i')
                          .replace(/ö/g, 'o')
                          .replace(/ş/g, 's')
                          .replace(/ü/g, 'u')
                          .replace(/[^a-z0-9]/g, '-')
                          .replace(/-+/g, '-')
                          .replace(/^-|-$/g, '')
                        return (
                          <button
                            key={c}
                            type="button"
                            data-testid={`color-chip-${testIdSlug}`}
                            onClick={() => handleManualFieldChange('color', c)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-[0.98] cursor-pointer border ${
                              manualFormData.color === c
                                ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                                : 'bg-surface border-border-main text-text-secondary hover:border-primary/40'
                            }`}
                          >
                            {c}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Page 6 Fields: Identity & Chip */}
              {currentPage.type === 'page_6' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">
                        Mikroçip Numarası
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        data-testid="input-chip-microchip"
                        value={manualFormData.microchip_no || ''}
                        onChange={e => handleManualFieldChange('microchip_no', e.target.value.replace(/\D/g, ''))}
                        placeholder="15 haneli sayı"
                        className="w-full text-xs font-mono font-semibold p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Dövme No</label>
                      <input
                        type="text"
                        data-testid="input-chip-tattoo"
                        value={manualFormData.tattoo_no || ''}
                        onChange={e => handleManualFieldChange('tattoo_no', e.target.value)}
                        placeholder="Örn: TAT-9988"
                        className="w-full text-xs font-mono font-medium p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Uygulama Tarihi</label>
                      <input
                        type="date"
                        data-testid="input-chip-implant-date"
                        value={manualFormData.implant_date || ''}
                        onChange={e => handleManualFieldChange('implant_date', e.target.value)}
                        className="w-full text-xs font-medium p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Uygulama Yeri</label>
                      <input
                        type="text"
                        data-testid="input-chip-implant-location"
                        value={manualFormData.implant_location || ''}
                        onChange={e => handleManualFieldChange('implant_location', e.target.value)}
                        placeholder="Örn: Sol boyun"
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Page 7 Fields: Veterinarian */}
              {currentPage.type === 'page_7' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Yetkili Hekim Adı</label>
                      <input
                        type="text"
                        data-testid="input-vet-name"
                        value={manualFormData.veterinarian_name || ''}
                        onChange={e => handleManualFieldChange('veterinarian_name', e.target.value)}
                        placeholder="Dr. Ahmet Yılmaz"
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Klinik / Kurum</label>
                      <input
                        type="text"
                        data-testid="input-vet-clinic"
                        value={manualFormData.clinic_name || ''}
                        onChange={e => handleManualFieldChange('clinic_name', e.target.value)}
                        placeholder="Kadıköy Veteriner Kliniği"
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Klinik Telefonu</label>
                      <input
                        type="tel"
                        data-testid="input-vet-phone"
                        value={manualFormData.vet_phone || ''}
                        onChange={e => handleManualFieldChange('vet_phone', e.target.value)}
                        placeholder="+90 216 123 45 67"
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Klinik E-posta</label>
                      <input
                        type="email"
                        data-testid="input-vet-email"
                        value={manualFormData.vet_email || ''}
                        onChange={e => handleManualFieldChange('vet_email', e.target.value)}
                        placeholder="vet@kadikoyvet.com"
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Kayıt Şehri</label>
                      <input
                        type="text"
                        data-testid="input-vet-city"
                        value={manualFormData.registration_city || ''}
                        onChange={e => handleManualFieldChange('registration_city', e.target.value)}
                        placeholder="İstanbul"
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Kayıt İlçesi</label>
                      <input
                        type="text"
                        data-testid="input-vet-district"
                        value={manualFormData.registration_district || ''}
                        onChange={e => handleManualFieldChange('registration_district', e.target.value)}
                        placeholder="Kadıköy"
                        className="w-full text-xs font-medium p-2.5 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Form Actions */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                data-testid="save-manual-entry-btn"
                onClick={handleSaveManualEntry}
                className="w-full py-3.5 px-4 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all active:scale-[0.98] cursor-pointer shadow-sm text-sm"
              >
                {returnToSummary ? (
                  <>
                    <span>Değişiklikleri Kaydet ve Özete Dön</span>
                    <ChevronRight size={18} className="shrink-0" />
                  </>
                ) : currentPageIndex < PAGES_FLOW.length - 1 ? (
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

              <button
                type="button"
                data-testid="cancel-manual-entry-btn"
                onClick={() => {
                  setIsManualEntry(false)
                  if (returnToSummary) {
                    setReturnToSummary(false)
                    setIsSummaryView(true)
                  }
                }}
                className="text-xs text-text-secondary hover:text-text-primary text-center py-1.5 transition-colors cursor-pointer"
              >
                {returnToSummary ? 'Özete Geri Dön' : 'Fotoğraf Çekmeye Geri Dön'}
              </button>
            </div>
          </form>
        )}

        {/* VIEW 2: CAMERA CAPTURE VIEW */}
        {!isSummaryView && !isManualEntry && (
          <div className="flex flex-col items-center text-center gap-3">
            {/* Top Page Badge */}
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
              <p className="text-xs text-text-secondary mt-1 px-4">{currentPage.subtitle}</p>
            </div>

            {/* PII-Free Passport Page Reference Visual */}
            <PassportPageReference pageType={currentPage.type} />

            {/* Target Fields Preview */}
            <div className="w-full bg-surface-muted/60 p-3 rounded-xl border border-border-main/50 text-left mt-1">
              <span className="text-xs font-semibold text-text-secondary block mb-1.5">
                Bu sayfadaki bilgiler otomatik okunacaktır:
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

            {/* OCR Failure Box with In-Place Action Buttons */}
            {errorMsg && (
              <div
                data-testid="smart-scan-error-card"
                className="w-full bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 p-3.5 rounded-2xl flex flex-col gap-2.5 text-xs text-left"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                  <div className="flex-1 font-medium">
                    <span className="block font-bold mb-0.5">Bu sayfadaki bilgiler otomatik okunamadı.</span>
                    <span className="opacity-90">{errorMsg}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-red-500/20">
                  <button
                    type="button"
                    data-testid="retry-photo-btn"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 px-3 rounded-xl bg-surface border border-border-main text-text-primary font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-hover transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <RefreshCw size={14} />
                    <span>Tekrar Fotoğrafla</span>
                  </button>
                  <button
                    type="button"
                    data-testid="manual-fallback-btn"
                    onClick={handleOpenManualEntry}
                    className="flex-1 py-2 px-3 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                  >
                    <FileEdit size={14} />
                    <span>Manuel Devam Et</span>
                  </button>
                </div>
              </div>
            )}

            {/* Instant Confirmation Card for Current Page */}
            {currentCaptured && (
              <div
                data-testid={`instant-confirmation-${currentPage.type}`}
                className="w-full bg-emerald-500/5 border border-emerald-500/20 p-3.5 rounded-xl text-left mt-1 animate-fadeIn"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Sayfa {currentPage.passportPageDisplay} Bilgileri Kaydedildi
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenManualEntry}
                      className="text-xs text-text-secondary hover:text-primary flex items-center gap-1 cursor-pointer"
                    >
                      <FileEdit size={12} /> Düzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-text-secondary hover:text-primary flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={12} /> Yeniden Çek
                    </button>
                  </div>
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
        )}

        {/* VIEW 3: SUMMARY VIEW WITH 3 CANONICAL SECTIONS & INLINE EDIT */}
        {isSummaryView && (
          <div data-testid="smart-scan-summary-view" className="flex flex-col gap-3 text-left animate-fadeIn">
            <div className="text-center mb-0.5">
              <h2 className="text-xl font-bold text-text-primary">Bilgileri Teyit Edin</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Pasaporttan aktarılan bilgileri kontrol ederek onaylayın.
              </p>
            </div>

            {/* Validation & Low-Confidence Decision Banner */}
            {(() => {
              const minConfidence = Object.values(pageConfidences).length > 0
                ? Math.min(...Object.values(pageConfidences))
                : null
              const isLowConf = minConfidence !== null && minConfidence < 0.70
              const hasConflicts = validationResult?.conflicts && validationResult.conflicts.length > 0

              if (hasConflicts || isLowConf) {
                return (
                  <div
                    data-testid="summary-status-banner"
                    className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2.5"
                  >
                    <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        {hasConflicts
                          ? 'Çelişkili Bilgiler Tespit Edildi'
                          : 'Bazı bilgiler kontrol gerektiriyor'}
                      </span>
                      <p className="mt-0.5 text-text-secondary">
                        {isLowConf
                          ? 'Bazı bilgiler düşük güvenle okundu. Lütfen alanları kontrol edip gerekiyorsa düzenleyin.'
                          : 'Lütfen pasaporttan aktarılan bilgileri kontrol edin.'}
                      </p>
                      {hasConflicts && (
                        <ul className="list-disc pl-4 mt-1 space-y-0.5">
                          {validationResult!.conflicts.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )
              }

              return (
                <div
                  data-testid="summary-status-banner"
                  className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-text-primary text-xs flex items-start gap-2.5"
                >
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-text-primary">Bilgileri kontrol edin</span>
                    <p className="mt-0.5 text-text-secondary">
                      Pasaporttan aktarılan bilgileri kontrol ederek onaylayabilirsiniz.
                    </p>
                  </div>
                </div>
              )
            })()}

            {/* Visible Confirmation Error Box with Retry */}
            {confirmationError && (
              <div
                data-testid="confirmation-error-card"
                className="w-full bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 p-3.5 rounded-2xl flex flex-col gap-2 text-xs text-left"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                  <div className="flex-1 font-medium">
                    <span className="block font-bold">⚠ Bilgiler kaydedilemedi</span>
                    <span className="opacity-90">{confirmationError}</span>
                  </div>
                </div>
                <div className="pt-1 border-t border-red-500/20 flex justify-end">
                  <button
                    type="button"
                    data-testid="retry-commit-btn"
                    onClick={handleCommit}
                    className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-semibold text-xs hover:bg-red-700 transition-colors cursor-pointer"
                  >
                    Tekrar Dene
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 1: PET BİLGİLERİ */}
            <div data-testid="summary-card-pet" className="bg-surface-muted/50 p-3.5 rounded-2xl border border-border-main text-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-border-main">
                <span className="font-bold text-text-primary flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-primary" />
                  Can Dostumun Bilgileri
                </span>
                {activeEditSection !== 'pet' && (
                  <button
                    type="button"
                    data-testid="edit-pet-summary-btn"
                    onClick={() => handleStartEdit('pet')}
                    className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FileEdit size={12} /> Düzenle
                  </button>
                )}
              </div>

              {activeEditSection === 'pet' ? (
                /* INLINE EDIT FORM FOR PET */
                <div
                  data-testid="manual-form-page_5"
                  className="flex flex-col gap-3 pt-1 text-left animate-fadeIn"
                >
                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">
                      Can Dostunun Adı <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      data-testid="input-pet-name"
                      value={sectionDraft.name || ''}
                      onChange={e => handleDraftChange('name', e.target.value)}
                      placeholder="Örn: Boncuk, Duman"
                      className="w-full text-xs font-semibold p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">
                      Türü <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        data-testid="species-toggle-cat"
                        onClick={() => handleDraftChange('species', 'cat')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          sectionDraft.species === 'cat'
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-surface border-border-main text-text-secondary hover:bg-surface-hover'
                        }`}
                      >
                        🐱 Kedi
                      </button>
                      <button
                        type="button"
                        data-testid="species-toggle-dog"
                        onClick={() => handleDraftChange('species', 'dog')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          sectionDraft.species === 'dog'
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-surface border-border-main text-text-secondary hover:bg-surface-hover'
                        }`}
                      >
                        🐶 Köpek
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">
                        Irkı <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        data-testid="input-pet-breed"
                        value={sectionDraft.breed || ''}
                        onChange={e => handleDraftChange('breed', e.target.value)}
                        placeholder="Örn: Tekir, Golden"
                        className="w-full text-xs font-semibold p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Cinsiyeti</label>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          data-testid="gender-toggle-male"
                          onClick={() => handleDraftChange('gender', 'male')}
                          className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            sectionDraft.gender === 'male'
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-surface border-border-main text-text-secondary'
                          }`}
                        >
                          Erkek
                        </button>
                        <button
                          type="button"
                          data-testid="gender-toggle-female"
                          onClick={() => handleDraftChange('gender', 'female')}
                          className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            sectionDraft.gender === 'female'
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-surface border-border-main text-text-secondary'
                          }`}
                        >
                          Dişi
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Doğum Tarihi</label>
                      <input
                        type="date"
                        data-testid="input-pet-birth-date"
                        value={sectionDraft.birth_date || ''}
                        onChange={e => handleDraftChange('birth_date', e.target.value)}
                        className="w-full text-xs font-medium p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Renk / Görünüm</label>
                      <input
                        type="text"
                        data-testid="input-pet-color"
                        value={sectionDraft.color || ''}
                        onChange={e => handleDraftChange('color', e.target.value)}
                        placeholder="Örn: Gri, Beyaz"
                        className="w-full text-xs font-medium p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  {/* Quick Color Chips */}
                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                      Hızlı Renk Seçimi
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {QUICK_COLORS.map(c => {
                        const testIdSlug = c
                          .toLowerCase()
                          .replace(/ç/g, 'c')
                          .replace(/ğ/g, 'g')
                          .replace(/ı/g, 'i')
                          .replace(/ö/g, 'o')
                          .replace(/ş/g, 's')
                          .replace(/ü/g, 'u')
                          .replace(/[^a-z0-9]/g, '-')
                          .replace(/-+/g, '-')
                          .replace(/^-|-$/g, '')
                        return (
                          <button
                            key={c}
                            type="button"
                            data-testid={`color-chip-${testIdSlug}`}
                            onClick={() => handleDraftChange('color', c)}
                            className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all active:scale-[0.98] cursor-pointer border ${
                              sectionDraft.color === c
                                ? 'bg-primary/10 border-primary text-primary font-bold'
                                : 'bg-surface border-border-main text-text-secondary hover:border-primary/40'
                            }`}
                          >
                            {c}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">
                        Mikroçip Numarası
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        data-testid="input-cover-microchip"
                        value={sectionDraft.microchip_no || ''}
                        onChange={e => handleDraftChange('microchip_no', e.target.value.replace(/\D/g, ''))}
                        placeholder="15 haneli sayı"
                        className="w-full text-xs font-mono font-semibold p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Dövme No</label>
                      <input
                        type="text"
                        data-testid="input-chip-tattoo"
                        value={sectionDraft.tattoo_no || ''}
                        onChange={e => handleDraftChange('tattoo_no', e.target.value)}
                        placeholder="Örn: TAT-9988"
                        className="w-full text-xs font-mono font-medium p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">Pasaport No</label>
                    <input
                      type="text"
                      data-testid="input-passport-no"
                      value={sectionDraft.passport_no || ''}
                      onChange={e => handleDraftChange('passport_no', e.target.value.toUpperCase())}
                      placeholder="Örn: TR-06-123456"
                      className="w-full text-xs font-mono font-semibold p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border-main">
                    <button
                      type="button"
                      data-testid="cancel-manual-entry-btn"
                      onClick={handleCancelEdit}
                      className="flex-1 py-2 px-3 rounded-xl border border-border-main text-text-secondary hover:text-text-primary text-xs font-semibold text-center transition-colors cursor-pointer"
                    >
                      Özete Geri Dön
                    </button>
                    <button
                      type="button"
                      data-testid="save-manual-entry-btn"
                      onClick={() => handleSaveEdit('pet')}
                      className="flex-1 py-2 px-3 rounded-xl bg-primary text-white text-xs font-semibold flex items-center justify-center gap-1 hover:bg-primary/90 transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                    >
                      <span>Değişiklikleri Kaydet ve Özete Dön</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* VIEW STATE FOR PET */
                <>
                  <div className="flex justify-between py-1 border-b border-border-main/30">
                    <span className="text-text-secondary">Adı:</span>
                    <span className="font-bold text-text-primary">{finalData.name || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-main/30">
                    <span className="text-text-secondary">Tür:</span>
                    <span className="font-bold text-text-primary capitalize">
                      {finalData.species === 'cat'
                        ? 'Kedi'
                        : finalData.species === 'dog'
                        ? 'Köpek'
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-main/30">
                    <span className="text-text-secondary">Irk:</span>
                    <span className="font-bold text-text-primary">{finalData.breed || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-main/30">
                    <span className="text-text-secondary">Cinsiyet:</span>
                    <span className="font-bold text-text-primary">
                      {finalData.gender === 'male'
                        ? 'Erkek'
                        : finalData.gender === 'female'
                        ? 'Dişi'
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-main/30">
                    <span className="text-text-secondary">Doğum Tarihi:</span>
                    <span className="font-bold text-text-primary">{finalData.birth_date || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-main/30">
                    <span className="text-text-secondary">Renk / Görünüm:</span>
                    <span className="font-bold text-text-primary">{finalData.color || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-main/30">
                    <span className="text-text-secondary">Mikroçip No:</span>
                    <span className="font-bold text-text-primary font-mono">{finalData.microchip_no || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-main/30">
                    <span className="text-text-secondary">Dövme No:</span>
                    <span className="font-bold text-text-primary font-mono">{finalData.tattoo_no || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-text-secondary">Pasaport No:</span>
                    <span className="font-bold text-text-primary font-mono">{finalData.passport_no || '—'}</span>
                  </div>
                </>
              )}
            </div>

            {/* SECTION 2: SAHİP BİLGİLERİ */}
            <div data-testid="summary-card-owner" className="bg-surface-muted/50 p-3.5 rounded-2xl border border-border-main text-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-border-main">
                <span className="font-bold text-text-primary flex items-center gap-1.5">
                  <User size={16} className="text-primary" />
                  Sahip Bilgileri
                </span>
                {activeEditSection !== 'owner' && (
                  <button
                    type="button"
                    data-testid="edit-owner-summary-btn"
                    onClick={() => handleStartEdit('owner')}
                    className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FileEdit size={12} /> Düzenle
                  </button>
                )}
              </div>

              {activeEditSection === 'owner' ? (
                /* INLINE EDIT FORM FOR OWNER */
                <div
                  data-testid="manual-form-page_4"
                  className="flex flex-col gap-2.5 pt-1 text-left animate-fadeIn"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Sahip Adı</label>
                      <input
                        type="text"
                        data-testid="input-owner-first-name"
                        value={sectionDraft.owner_first_name || ''}
                        onChange={e => handleDraftChange('owner_first_name', e.target.value)}
                        placeholder="Örn: Tufan"
                        className="w-full text-xs font-medium p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Sahip Soyadı</label>
                      <input
                        type="text"
                        data-testid="input-owner-last-name"
                        value={sectionDraft.owner_last_name || ''}
                        onChange={e => handleDraftChange('owner_last_name', e.target.value)}
                        placeholder="Örn: Tabak"
                        className="w-full text-xs font-medium p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">Telefon Numarası</label>
                    <input
                      type="tel"
                      data-testid="input-owner-phone"
                      value={sectionDraft.owner_phone || ''}
                      onChange={e => handleDraftChange('owner_phone', e.target.value)}
                      placeholder="Örn: +90 532 111 22 33"
                      className="w-full text-xs font-medium p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">İl</label>
                      <input
                        type="text"
                        data-testid="input-owner-city"
                        value={sectionDraft.owner_city || ''}
                        onChange={e => handleDraftChange('owner_city', e.target.value)}
                        placeholder="Örn: İstanbul"
                        className="w-full text-xs font-medium p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">İlçe</label>
                      <input
                        type="text"
                        data-testid="input-owner-district"
                        value={sectionDraft.owner_district || ''}
                        onChange={e => handleDraftChange('owner_district', e.target.value)}
                        placeholder="Örn: Kadıköy"
                        className="w-full text-xs font-medium p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">Açık Adres (Mahalle / Sokak)</label>
                    <input
                      type="text"
                      data-testid="input-owner-address"
                      value={sectionDraft.owner_address || ''}
                      onChange={e => handleDraftChange('owner_address', e.target.value)}
                      placeholder="Örn: Moda Cad. No: 12 D: 4"
                      className="w-full text-xs font-medium p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">Posta Kodu</label>
                    <input
                      type="text"
                      maxLength={5}
                      data-testid="input-owner-postal-code"
                      value={sectionDraft.owner_postal_code || ''}
                      onChange={e => handleDraftChange('owner_postal_code', e.target.value.replace(/\D/g, ''))}
                      placeholder="Örn: 34710"
                      className="w-full text-xs font-mono font-medium p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border-main">
                    <button
                      type="button"
                      data-testid="cancel-manual-entry-btn"
                      onClick={handleCancelEdit}
                      className="flex-1 py-2 px-3 rounded-xl border border-border-main text-text-secondary hover:text-text-primary text-xs font-semibold text-center transition-colors cursor-pointer"
                    >
                      Özete Geri Dön
                    </button>
                    <button
                      type="button"
                      data-testid="save-manual-entry-btn"
                      onClick={() => handleSaveEdit('owner')}
                      className="flex-1 py-2 px-3 rounded-xl bg-primary text-white text-xs font-semibold flex items-center justify-center gap-1 hover:bg-primary/90 transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                    >
                      <span>Değişiklikleri Kaydet ve Özete Dön</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* VIEW STATE FOR OWNER */
                <>
                  <div className="flex justify-between py-1 border-b border-border-main/30">
                    <span className="text-text-secondary">Adı & Soyadı:</span>
                    <span className="font-bold text-text-primary">
                      {[finalData.owner_first_name, finalData.owner_last_name].filter(Boolean).join(' ') || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-main/30">
                    <span className="text-text-secondary">Telefon:</span>
                    <span className="font-bold text-text-primary">{finalData.owner_phone || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-main/30">
                    <span className="text-text-secondary">İl / İlçe:</span>
                    <span className="font-bold text-text-primary">
                      {[finalData.owner_city, finalData.owner_district].filter(Boolean).join(' / ') || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-main/30">
                    <span className="text-text-secondary">Açık Adres:</span>
                    <span className="font-bold text-text-primary text-right max-w-[200px] truncate">
                      {finalData.owner_address || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-text-secondary">Posta Kodu:</span>
                    <span className="font-bold text-text-primary font-mono">{finalData.owner_postal_code || '—'}</span>
                  </div>
                </>
              )}
            </div>

            {/* SECTION 3: VETERİNER BİLGİLERİ */}
            <div data-testid="summary-card-vet" className="bg-surface-muted/50 p-3.5 rounded-2xl border border-border-main text-xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-border-main">
                <span className="font-bold text-text-primary flex items-center gap-1.5">
                  <Stethoscope size={16} className="text-primary" />
                  Veteriner & Düzenleyen Yetkili
                </span>
                {activeEditSection !== 'vet' && (
                  <button
                    type="button"
                    data-testid="edit-vet-summary-btn"
                    onClick={() => handleStartEdit('vet')}
                    className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <FileEdit size={12} /> Düzenle
                  </button>
                )}
              </div>

              {activeEditSection === 'vet' ? (
                /* INLINE EDIT FORM FOR VETERINARIAN */
                <div
                  data-testid="manual-form-page_7"
                  className="flex flex-col gap-2.5 pt-1 text-left animate-fadeIn"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Yetkili Hekim Adı</label>
                      <input
                        type="text"
                        data-testid="input-vet-name"
                        value={sectionDraft.vet_name || ''}
                        onChange={e => handleDraftChange('vet_name', e.target.value)}
                        placeholder="Dr. Ahmet Yılmaz"
                        className="w-full text-xs font-medium p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Klinik / Kurum</label>
                      <input
                        type="text"
                        data-testid="input-vet-clinic"
                        value={sectionDraft.vet_company || ''}
                        onChange={e => handleDraftChange('vet_company', e.target.value)}
                        placeholder="Kadıköy Veteriner Kliniği"
                        className="w-full text-xs font-medium p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Klinik Telefonu</label>
                      <input
                        type="tel"
                        data-testid="input-vet-phone"
                        value={sectionDraft.vet_phone || ''}
                        onChange={e => handleDraftChange('vet_phone', e.target.value)}
                        placeholder="+90 216 123 45 67"
                        className="w-full text-xs font-medium p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Klinik E-posta</label>
                      <input
                        type="email"
                        data-testid="input-vet-email"
                        value={sectionDraft.vet_email || ''}
                        onChange={e => handleDraftChange('vet_email', e.target.value)}
                        placeholder="vet@kadikoyvet.com"
                        className="w-full text-xs font-medium p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Kayıt Şehri</label>
                      <input
                        type="text"
                        data-testid="input-vet-city"
                        value={sectionDraft.registration_city || ''}
                        onChange={e => handleDraftChange('registration_city', e.target.value)}
                        placeholder="İstanbul"
                        className="w-full text-xs font-medium p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-primary block mb-1">Kayıt İlçesi</label>
                      <input
                        type="text"
                        data-testid="input-vet-district"
                        value={sectionDraft.registration_district || ''}
                        onChange={e => handleDraftChange('registration_district', e.target.value)}
                        placeholder="Kadıköy"
                        className="w-full text-xs font-medium p-2 rounded-xl border border-border-main bg-surface focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border-main">
                    <button
                      type="button"
                      data-testid="cancel-manual-entry-btn"
                      onClick={handleCancelEdit}
                      className="flex-1 py-2 px-3 rounded-xl border border-border-main text-text-secondary hover:text-text-primary text-xs font-semibold text-center transition-colors cursor-pointer"
                    >
                      Özete Geri Dön
                    </button>
                    <button
                      type="button"
                      data-testid="save-manual-entry-btn"
                      onClick={() => handleSaveEdit('vet')}
                      className="flex-1 py-2 px-3 rounded-xl bg-primary text-white text-xs font-semibold flex items-center justify-center gap-1 hover:bg-primary/90 transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                    >
                      <span>Değişiklikleri Kaydet ve Özete Dön</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* VIEW STATE FOR VETERINARIAN */
                <>
                  <div className="flex justify-between py-1 border-b border-border-main/30">
                    <span className="text-text-secondary">Veteriner Hekim:</span>
                    <span className="font-bold text-text-primary">{finalData.vet_name || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-main/30">
                    <span className="text-text-secondary">Klinik / Kurum:</span>
                    <span className="font-bold text-text-primary">{finalData.vet_company || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-main/30">
                    <span className="text-text-secondary">Telefon:</span>
                    <span className="font-bold text-text-primary">{finalData.vet_phone || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border-main/30">
                    <span className="text-text-secondary">E-posta:</span>
                    <span className="font-bold text-text-primary">{finalData.vet_email || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-text-secondary">Kayıt Şehri / İlçesi:</span>
                    <span className="font-bold text-text-primary">
                      {[finalData.registration_city, finalData.registration_district].filter(Boolean).join(' / ') || '—'}
                    </span>
                  </div>
                </>
              )}
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
      {!isManualEntry && (
        <div className="flex flex-col gap-2 pt-2 border-t border-border-main">
          {!isSummaryView ? (
            <>
              {!currentCaptured ? (
                <button
                  type="button"
                  data-testid="photo-cta-btn"
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
                      <span>{currentPage.photoCta}</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="next-step-btn"
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
                data-testid="skip-page-btn"
                onClick={() => {
                  if (currentPageIndex < PAGES_FLOW.length - 1) {
                    setCurrentPageIndex(p => p + 1)
                  } else {
                    setIsSummaryView(true)
                  }
                }}
                className="text-xs text-text-secondary hover:text-text-primary text-center py-1.5 transition-colors cursor-pointer"
              >
                {currentPageIndex < PAGES_FLOW.length - 1 ? 'Bu sayfayı atla' : 'Özeti Gör'}
              </button>
            </>
          ) : (
            <button
              type="button"
              data-testid="commit-btn"
              disabled={isCommitting || submitStatus === 'submitting'}
              onClick={handleCommit}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer shadow-sm text-sm"
            >
              {submitStatus === 'submitting' ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Bilgiler kaydediliyor...</span>
                </>
              ) : submitStatus === 'success' ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>✓ Pet profiline geçiliyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Bilgileri Onayla ve Devam Et →</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
