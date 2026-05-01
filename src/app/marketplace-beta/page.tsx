'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics/track'
import { matchPartner } from '@/lib/marketplace/match-partner'

function WaitlistForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const petId = searchParams.get('petId') || ''
  const initialBrand = searchParams.get('brand') || ''
  const initialProduct = searchParams.get('product') || ''
  const urgencyLevel = searchParams.get('risk') || 'warning'

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [alreadyJoined, setAlreadyJoined] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const partner = matchPartner(initialBrand)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!petId) {
      setErrorMsg('Geçerli bir evcil hayvan bulunamadı. Lütfen dashboard üzerinden tekrar deneyin.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    const fd = new FormData(e.currentTarget)
    
    try {
      const res = await fetch('/api/marketplace/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          petId,
          source: 'marketplace_beta',
          preferredFoodBrand: fd.get('brand'),
          preferredFoodProduct: fd.get('product'),
          urgencyLevel,
          notes: fd.get('notes')
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Bir hata oluştu')
      }

      if (data.alreadyJoined) {
        setAlreadyJoined(true)
        trackEvent('marketplace_waitlist_duplicate', { petId, urgencyLevel })
      } else {
        setSuccess(true)
        trackEvent('marketplace_waitlist_joined', { petId, urgencyLevel })
      }
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success || alreadyJoined) {
    return (
      <div className="card-base p-8 text-center animate-fadeIn max-w-md w-full">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-[32px] mx-auto mb-4">
          ✅
        </div>
        <h3 className="text-[20px] font-black text-text-primary mb-2">
          {alreadyJoined ? 'Zaten Listedisiniz!' : "Waitlist'e Eklendiniz"}
        </h3>
        <p className="text-[14px] text-text-secondary mb-8 leading-relaxed">
          {alreadyJoined 
            ? 'Kaydınızı daha önce almıştık. Beta erişimi açıldığında size öncelikli olarak haber vereceğiz.' 
            : 'Talebinizi aldık. Beta erişimi açıldığında öncelikli davet alacaksınız.'}
        </p>
        <Link href={`/owner/pets/${petId}`} className="btn-primary w-full py-3 inline-block">
          Profile Dön
        </Link>
      </div>
    )
  }

  if (partner) {
    return (
      <div className="card-base p-8 text-center animate-fadeIn max-w-md w-full">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[32px] mx-auto mb-4">
          🛒
        </div>
        <h3 className="text-[20px] font-black text-text-primary mb-2">
          Partner Mağazamızda Mevcut!
        </h3>
        <p className="text-[14px] text-text-secondary mb-8 leading-relaxed">
          {initialBrand} markalı mama arayışınız için resmi partnerimiz <strong>{partner.name}</strong> üzerinden hemen sipariş verebilirsiniz.
        </p>
        <button 
          onClick={() => {
            trackEvent('affiliate_partner_clicked', { partnerId: partner.id, foodBrand: initialBrand, petId })
            window.open(partner.baseUrl, '_blank')
          }}
          className="btn-primary w-full py-4 text-[15px] mb-4"
        >
          Partner Mağazaya Git
        </button>
        <Link href={`/owner/pets/${petId}`} className="text-[13px] font-bold text-text-secondary hover:text-text-primary transition-colors">
          İptal Et
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card-base p-6 max-w-md w-full animate-fadeIn text-left">
      <h3 className="font-bold text-text-primary mb-4 border-b border-border-main pb-3">
        Erken Erişim Formu
      </h3>
      
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-bold text-text-secondary">Sipariş Edilecek Mama Markası</label>
          <input name="brand" defaultValue={initialBrand} className="input-base" placeholder="Örn: Royal Canin" required />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-bold text-text-secondary">Ürün Adı (Opsiyonel)</label>
          <input name="product" defaultValue={initialProduct} className="input-base" placeholder="Örn: Sterilised 37" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-bold text-text-secondary">Ek Notlar (Opsiyonel)</label>
          <textarea name="notes" className="input-base resize-none" rows={3} placeholder="Özel diyet veya teslimat notunuz varsa belirtebilirsiniz..." />
        </div>
      </div>

      {errorMsg && <p className="text-red-500 text-[13px] font-medium mb-4 text-center">{errorMsg}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-[15px]">
        {loading ? 'İşleniyor...' : "Waitlist'e Katıl"}
      </button>
      
      <div className="mt-4 text-center">
        <Link href={`/owner/pets/${petId}`} className="text-[13px] font-bold text-text-secondary hover:text-text-primary transition-colors">
          İptal Et
        </Link>
      </div>
    </form>
  )
}

export default function MarketplaceBetaPage() {
  return (
    <div className="min-h-screen bg-bg-main p-6 flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-primary to-indigo-600 rounded-3xl flex items-center justify-center text-[36px] shadow-xl shadow-primary/20 mb-6 animate-bounce-slow">
        🎁
      </div>
      
      <h1 className="text-2xl md:text-3xl font-black text-text-primary mb-2 tracking-tight">
        Mama Sipariş Beta Programı
      </h1>
      
      <p className="text-[15px] font-medium text-text-secondary max-w-md mb-8">
        Yakında seçili kullanıcılarla başlıyoruz. Erken erişim için hemen yerinizi ayırtın.
      </p>

      <Suspense fallback={<div className="card-base p-8 w-full max-w-md text-center">Yükleniyor...</div>}>
        <WaitlistForm />
      </Suspense>
    </div>
  )
}
