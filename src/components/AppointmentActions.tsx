'use client'

import { updateAppointmentStatus } from '@/features/clinic/actions'
import { useTransition } from 'react'

interface Props {
  appointmentId: string
  currentStatus: string
}

export default function AppointmentActions({ appointmentId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition()

  const handleUpdate = (status: 'confirmed' | 'cancelled' | 'completed') => {
    startTransition(async () => {
      await updateAppointmentStatus(appointmentId, status)
    })
  }

  if (currentStatus === 'cancelled' || currentStatus === 'completed') {
    return null
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      {currentStatus === 'pending' && (
        <button
          onClick={() => handleUpdate('confirmed')}
          disabled={isPending}
          className="btn-primary text-[12px] py-1.5 px-3 disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-primary/20"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {isPending ? '...' : 'Onayla'}
        </button>
      )}
      {currentStatus === 'confirmed' && (
        <button
          onClick={() => handleUpdate('completed')}
          disabled={isPending}
          className="btn-secondary text-[12px] py-1.5 px-3 disabled:opacity-50 border-success text-success hover:bg-success/10"
        >
          {isPending ? '...' : 'Tamamlandı'}
        </button>
      )}
      <button
        onClick={() => handleUpdate('cancelled')}
        disabled={isPending}
        className="w-8 h-8 rounded-full border border-error/30 text-error hover:bg-error/5 flex items-center justify-center transition-colors shrink-0 disabled:opacity-50"
        title="İptal Et"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
