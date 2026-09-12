'use client'

import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { logout } from '@/features/auth/actions'
import { getDeviceId } from '@/lib/notifications/web-push-client'

export default function LogoutButton() {
  const [deviceId, setDeviceId] = useState<string>('')

  useEffect(() => {
    try {
      const id = getDeviceId()
      if (id && id !== 'server-side') {
        setDeviceId(id)
      }
    } catch {
      // Silently continue if localStorage is inaccessible
    }
  }, [])

  return (
    <form action={logout} className="w-full">
      {deviceId ? <input type="hidden" name="device_id" value={deviceId} /> : null}
      <button
        type="submit"
        className="w-full bg-white rounded-3xl p-4 text-center text-sm font-bold text-error hover:bg-rose-50/50 transition-all border border-rose-100 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.04)] flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        <LogOut className="w-4 h-4 text-error" />
        Hesaptan Çıkış Yap
      </button>
    </form>
  )
}
