'use client'

import React, { useState, useEffect } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { calculatePetCareScore, CareScoreResult, PetRow } from '@/lib/pets/calculatePetCareScore'
import Link from 'next/link'

export default function CareScoreWidget({ petId, pet }: { petId: string, pet: PetRow }) {
  const [loading, setLoading] = useState(true)
  const [scoreData, setScoreData] = useState<CareScoreResult | null>(null)
  const [error, setError] = useState(false)
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    let mounted = true
    async function fetchData() {
      try {
        setLoading(true)
        setError(false)
        
        const now = new Date()
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

        const { data: myListings } = await supabase
          .from('breeding_listings')
          .select('id')
          .eq('pet_id', petId)
          .eq('status', 'active')

        const myListingIds = myListings?.map((l: any) => l.id) ?? []

        const [vaccinesRes, galleryRes, expensesRes, eventsRes, weightLogsRes, approvedMatchRes] = await Promise.all([
          fetch(`/api/pets/${petId}/vaccines`),
          supabase.from('pet_gallery').select('id', { count: 'exact', head: true }).eq('pet_id', petId),
          supabase.from('pet_expenses').select('id', { count: 'exact', head: true }).eq('pet_id', petId).gte('date', currentMonthStart),
          supabase.from('pet_care_events').select('id', { count: 'exact', head: true }).eq('pet_id', petId).not('completed_at', 'is', null).gte('completed_at', twentyFourHoursAgo),
          supabase.from('weight_logs').select('id').eq('pet_id', petId).gte('measured_at', thirtyDaysAgo).limit(1),
          supabase.from('breeding_applications').select('id').eq('status', 'approved').or(
            myListingIds.length > 0
              ? `applicant_pet_id.eq.${petId},listing_id.in.(${myListingIds.join(',')})`
              : `applicant_pet_id.eq.${petId}`
          ).limit(1)
        ])

        if (!mounted) return

        let vaccinesCount = 0
        if (vaccinesRes.ok) {
          const vaccinesData = await vaccinesRes.json()
          vaccinesCount = vaccinesData?.data?.length || 0
        }

        const galleryCount = galleryRes.count || 0
        const expensesCount = expensesRes.count || 0
        const eventsCount = eventsRes.count || 0
        const hasRecentWeight = (weightLogsRes.data?.length ?? 0) > 0
        const hasActiveBreedingListing = myListingIds.length > 0
        const hasApprovedMatch = (approvedMatchRes.data?.length ?? 0) > 0

        const result = calculatePetCareScore({
          pet,
          vaccineRecordsLength: vaccinesCount,
          galleryCount: galleryCount,
          currentMonthExpenses: expensesCount,
          todayCompletedEvents: eventsCount,
          hasRecentWeight,
          hasActiveBreedingListing,
          hasApprovedMatch
        })

        setScoreData(result)
      } catch (err) {
        if (mounted) setError(true)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchData()
    return () => { mounted = false }
  }, [petId, pet, supabase])

  if (error) return null

  if (loading) {
    return (
      <div className="card-base p-5 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col gap-3 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-5 w-24 bg-slate-100 rounded"></div>
          <div className="h-5 w-10 bg-slate-100 rounded"></div>
        </div>
        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden"></div>
        <div className="h-4 w-40 bg-slate-100 rounded mt-1"></div>
      </div>
    )
  }

  if (!scoreData) return null

  return (
    <>
      {scoreData.total === 135 && (
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes glow {
            0%, 100% { opacity: 1; box-shadow: 0 0 10px rgba(139, 92, 246, 0.4); }
            50% { opacity: 0.85; box-shadow: 0 0 20px rgba(139, 92, 246, 0.8); }
          }
          .animate-glow { animation: glow 2s infinite; }
        ` }} />
      )}
      <div className="card-base p-5 bg-white border border-border-main shadow-sm rounded-2xl flex flex-col gap-3 animate-fadeInUp">
        <div className="flex justify-between items-end">
          <h3 className="font-extrabold text-text-primary text-[15px] flex items-center gap-1.5">
            <span>⭐</span> Bakım Skoru
          </h3>
          <span className={`text-[18px] font-black leading-none ${scoreData.total > 100 ? 'text-amber-500' : 'text-violet-600'}`}>
            {scoreData.total > 100 ? (
              <>🌟 {scoreData.total} <span className="text-[12px] font-bold">puan</span></>
            ) : (
              <>{scoreData.total}<span className="text-[12px] text-text-secondary font-bold">/100</span></>
            )}
          </span>
        </div>

        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden relative">
          <div 
            className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-400 transition-all duration-700 ease-out ${scoreData.total === 135 ? 'animate-glow' : ''}`}
            style={{ width: `${Math.min(scoreData.total, 100)}%` }}
          />
        </div>

        {scoreData.total >= 100 ? (
          <p className="text-[12px] text-emerald-600 font-bold mt-1">
            🎉 Harika iş! Patili dostun için her şey mükemmel.
          </p>
        ) : scoreData.nextAction ? (
          <div className="mt-1">
            <Link 
              href={scoreData.nextAction.href.startsWith('/') ? scoreData.nextAction.href.replace('[petId]', petId) : `/owner/pets/${petId}/${scoreData.nextAction.href}`}
              className="text-[12px] text-text-secondary hover:text-violet-600 transition-colors font-medium flex flex-wrap items-center gap-x-1 gap-y-0 group"
            >
              <span className="text-violet-500 group-hover:translate-x-0.5 transition-transform">→</span> 
              <span className="font-bold underline decoration-violet-200 underline-offset-2">{scoreData.nextAction.label}</span> ekleyerek <span className="text-violet-600 font-bold">+{scoreData.nextAction.points}</span> puan kazan
            </Link>
          </div>
        ) : null}
      </div>
    </>
  )
}
