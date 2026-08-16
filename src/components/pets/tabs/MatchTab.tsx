'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Database } from '@/types'

type PetRow = Database['public']['Tables']['pets']['Row']

export default function MatchTab({ pet }: { pet: PetRow }) {
  const [hasActiveListing, setHasActiveListing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkListing = async () => {
      try {
        const res = await fetch(`/api/breeding-listings`)
        if (res.ok) {
          const data = await res.json()
          const myListing = data.listings?.find((l: any) => l.pet_id === pet.id && l.status === 'active')
          if (myListing) {
            setHasActiveListing(true)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    checkListing()
  }, [pet.id])

  if (loading) {
    return <div className="animate-pulse bg-slate-100 h-24 rounded-xl w-full" />
  }

  return (
    <div className="flex flex-col gap-4 animate-fadeInUp">
      <div className="card-base p-6 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 shadow-sm rounded-2xl flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm">
          <span className="text-2xl">❤️</span>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="font-extrabold text-text-primary text-[17px]">Eşleşme Adaylarını Keşfet</h3>
          <p className="text-[13px] text-text-secondary leading-relaxed max-w-[280px]">
            Diğer ilanları görmek ve başvuru yapmak için Sosyal sekmesini ziyaret edin.
          </p>
        </div>
        
        <Link 
          href="/owner/social?tab=eslestirme" 
          className="btn-primary w-full py-3 text-center text-sm bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl transition-all shadow-sm"
        >
          Sosyal &gt; Eşleştirme →
        </Link>

        {hasActiveListing && (
          <p className="text-[11px] text-pink-600 font-bold mt-1">
            ✨ İlanınız yayında — başvurular buraya gelecek.
          </p>
        )}
      </div>
    </div>
  )
}
