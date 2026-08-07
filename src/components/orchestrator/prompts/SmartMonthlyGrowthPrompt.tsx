'use client'

import React, { useState, useRef } from 'react'
import { Camera, ImagePlus, X } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import Image from 'next/image'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

interface SmartMonthlyGrowthPromptProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: Record<string, unknown>) => Promise<void>
  uiConfig?: Record<string, unknown>
  displayType?: string
  petId?: string
}

export default function SmartMonthlyGrowthPrompt({
  open,
  onClose,
  onSubmit,
  uiConfig,
  displayType,
  petId,
}: SmartMonthlyGrowthPromptProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (!ACCEPTED_IMAGE_TYPES.includes(selected.type)) {
      setError('Yalnızca JPG, PNG veya WEBP formatında fotoğraf yükleyebilirsiniz.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setError(`Fotoğraf boyutu en fazla ${MAX_FILE_SIZE_MB} MB olabilir.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    setError(null)
  }

  const clearSelection = () => {
    setFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !petId) {
      setError('Lütfen bir fotoğraf seçin.')
      return
    }

    setLoading(true)
    setError(null)
    let uploadedPath = ''

    try {
      const supabase = createBrowserSupabaseClient()

      // 1. Upload file
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `${petId}/${Date.now()}_growth.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('pet_gallery_bucket')
        .upload(fileName, file)

      if (uploadError) throw uploadError
      uploadedPath = fileName

      const { data: urlData } = supabase.storage
        .from('pet_gallery_bucket')
        .getPublicUrl(fileName)

      // 2. Submit to Orchestrator Mutation
      // We pass the URL. If the server throws 403 gallery_quota_exceeded, we catch it.
      await onSubmit({
        image_url: urlData.publicUrl,
        caption: caption.trim() || 'Aylık Gelişim Fotoğrafı',
        taken_at: new Date().toISOString()
      })
      
      // Cleanup preview
      clearSelection()

    } catch (err: unknown) {
      // Sunucu isteği reddettiyse storage'da yetim dosya birakma
      if (uploadedPath) {
        try {
          const supabase = createBrowserSupabaseClient()
          await supabase.storage.from('pet_gallery_bucket').remove([uploadedPath])
        } catch (cleanupErr) {
          console.error('[SmartMonthlyGrowthPrompt] Orphan cleanup failed:', cleanupErr)
        }
      }

      const reason = err instanceof Error ? err.message : ''

      if (reason === 'gallery_quota_exceeded') {
        setError(
          `Galeri kotanız doldu. Odi Pro ile sınırsız fotoğraf yükleyebilirsiniz.`
        )
      } else if (reason === 'forbidden') {
        setError('Bu evcil hayvan için fotoğraf ekleme yetkiniz yok.')
      } else if (reason === 'invalid_image_url_source' || reason === 'invalid_payload') {
        setError('Fotoğraf doğrulanamadı. Lütfen tekrar deneyin.')
      } else {
        setError('Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl overflow-hidden animate-fade-in relative"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors active:scale-95"
        >
          <X size={16} strokeWidth={2.5} />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-3">
            <Camera size={28} strokeWidth={2} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Aylık Gelişim</h3>
          <p className="text-sm text-slate-500 mt-1">Bu ayın büyüme fotoğrafını ekleyin, gelişimini zaman tünelinde izleyelim.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!previewUrl ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-video border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 hover:border-purple-300 transition-colors group"
            >
              <ImagePlus size={24} className="text-slate-400 group-hover:text-purple-500 transition-colors" />
              <span className="text-sm font-semibold text-slate-500 group-hover:text-purple-600">Fotoğraf Seç</span>
            </div>
          ) : (
            <div className="w-full aspect-video relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              <Image src={previewUrl} alt="Preview" fill className="object-cover" />
              <button
                type="button"
                onClick={clearSelection}
                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}
          
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
          />

          <input 
            type="text" 
            placeholder="Kısa bir not ekleyin (Opsiyonel)" 
            maxLength={100}
            value={caption}
            onChange={e => setCaption(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all placeholder:text-slate-400"
          />

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 text-center">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2 mt-2">
            <button 
              type="submit" 
              disabled={loading || !file}
              className="w-full bg-purple-600 text-white font-bold py-3.5 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 shadow-sm"
            >
              {loading ? 'Yükleniyor...' : 'Gelişimi Kaydet'}
            </button>
            <button 
              type="button" 
              onClick={onClose}
              disabled={loading}
              className="w-full bg-white text-slate-500 font-bold py-3.5 rounded-2xl active:scale-[0.98] transition-all hover:bg-slate-50"
            >
              Sonra Hatırlat
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
