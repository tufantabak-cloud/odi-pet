import { getCurrentProfile, getSessionUser } from '@/lib/auth/get-current-profile'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EditProfileForm from './EditProfileForm'
import Link from 'next/link'
import { ArrowLeft, UserCheck } from 'lucide-react'

export default async function EditProfilePage() {
  const profile = await getCurrentProfile()
  const user = await getSessionUser()

  if (!profile) {
    redirect('/login')
  }

  // Can dostlarının SOS acil rehberinde kayıtlı 1. ve 2. telefon numaralarını tara
  const supabase = await createServerSupabaseClient()
  let petEmergencyPhone = ''
  let petEmergencyName = ''
  let petEmergencyRelation = ''

  let petEmergency2Phone = ''
  let petEmergency2Name = ''
  let petEmergency2Relation = ''

  if (profile?.id) {
    const { data: pets } = await supabase
      .from('pets')
      .select('sos_contacts')
      .eq('owner_id', profile.id)

    if (pets && pets.length > 0) {
      for (const pet of pets) {
        if (Array.isArray(pet.sos_contacts) && pet.sos_contacts.length > 0) {
          const c1 = pet.sos_contacts[0]
          const c2 = pet.sos_contacts[1]

          if (c1 && !petEmergencyPhone && !petEmergencyName) {
            petEmergencyPhone = c1.phone || ''
            petEmergencyName = c1.name || ''
            petEmergencyRelation = c1.relation || ''
          }
          if (c2 && !petEmergency2Relation && !petEmergency2Name && !petEmergency2Phone) {
            petEmergency2Phone = c2.phone || ''
            petEmergency2Name = c2.name || ''
            petEmergency2Relation = c2.relation || ''
          }

          if (petEmergencyPhone) break
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-12 w-full mx-auto font-sans max-w-3xl">
      {/* Header Section */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <Link
            href="/owner/profile"
            className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-text-secondary hover:text-primary transition-all bg-white shrink-0 shadow-sm hover:scale-[1.05] active:scale-[0.95]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Profili Düzenle</h1>
            <p className="text-xs text-text-secondary font-medium">Kişisel ve iletişim bilgilerinizi detaylıca güncelleyin.</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 text-primary border border-purple-100 text-xs font-bold">
          <UserCheck className="w-4 h-4" />
          <span>Profil Yönetimi</span>
        </div>
      </div>

      {/* Main Enriched Profile Edit Form */}
      <EditProfileForm
        profile={profile}
        user={user}
        petEmergencyPhone={petEmergencyPhone}
        petEmergencyName={petEmergencyName}
        petEmergencyRelation={petEmergencyRelation}
        petEmergency2Phone={petEmergency2Phone}
        petEmergency2Name={petEmergency2Name}
        petEmergency2Relation={petEmergency2Relation}
      />
    </div>
  )
}
