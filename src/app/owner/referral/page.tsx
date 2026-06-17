import { getSessionUser } from '@/lib/auth/get-current-profile'
import { redirect } from 'next/navigation'
import ReferralClient from './ReferralClient'

interface ReferralData {
  referralCode: string
  referralUrl: string
  referralCount: number
}

interface BadgeData {
  key: string
  label: string
  emoji: string
  threshold: number
  earned: boolean
  earnedAt: string | null
  progress: number
}

// Sunucu tarafında fetch yardımcısı — auth cookie'yi taşır
async function fetchWithAuth(path: string) {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://odi-petcare.vercel.app'

  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Cookie: cookieHeader },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export const metadata = {
  title: 'Arkadaşını Davet Et — Odi.Pet',
  description: 'Referral kodunla arkadaşlarını Odi.Pet\'e davet et, rozetler kazan!',
}

export default async function ReferralPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  // Paralel fetch
  const [referralData, badgesData] = await Promise.all([
    fetchWithAuth('/api/referral') as Promise<ReferralData | null>,
    fetchWithAuth('/api/referral/badges') as Promise<{ referralCount: number; badges: BadgeData[] } | null>,
  ])

  // Referral kodu yoksa ya da hata varsa, fallback değerler
  const referralCode = referralData?.referralCode ?? '—'
  const referralUrl = referralData?.referralUrl ?? 'https://odi-petcare.vercel.app'
  const referralCount = badgesData?.referralCount ?? referralData?.referralCount ?? 0
  const badges = badgesData?.badges ?? []

  return (
    <div className="max-w-lg mx-auto">
      <ReferralClient
        referralCode={referralCode}
        referralUrl={referralUrl}
        referralCount={referralCount}
        badges={badges}
      />
    </div>
  )
}
