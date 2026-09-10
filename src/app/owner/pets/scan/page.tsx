import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth/get-current-profile'
import { PassportScanner } from '@/components/smart-scan/PassportScanner'

export const metadata = {
  title: 'Akıllı Pasaport Taraması | Odi.Pet',
  description: 'Evcil hayvan pasaportunuzu kameranızla saniyeler içinde tarayarak profil oluşturun.',
}

export default async function SmartPassportScanPage() {
  const profile = await getCurrentProfile()
  if (!profile) {
    redirect('/login?returnUrl=/owner/pets/scan')
  }

  return (
    <main className="min-h-screen bg-surface-muted/30 py-6 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md mb-4 text-center">
        <h1 className="text-2xl font-black text-text-primary tracking-tight">
          Akıllı Pasaport Taraması
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          T.C. Evcil Hayvan Pasaportunuzu çekin, can dostunuzun profilini otomatik oluşturalım.
        </p>
      </div>

      <PassportScanner />
    </main>
  )
}
