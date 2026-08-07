import { redirect } from 'next/navigation';

import { WizardForm } from '@/components/lost-report/WizardForm';
import { getSessionUser } from '@/lib/auth/get-current-profile';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function LostReportPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login?reason=session_expired');

  let registeredPhone = user.phone || '';
  let isPhoneConfirmed = !!(user as any)?.phone_confirmed_at;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.phone) {
      registeredPhone = profile.phone;
      isPhoneConfirmed = true;
    }
  } catch (err) {
    console.warn('Profile phone lookup warning:', err);
  }

  let pets: any[] = [];
  try {
    const supabase = await createServerSupabaseClient();
    
    // 1. Fetch from pet_memberships
    const { data: memberships } = await supabase
      .from('pet_memberships')
      .select('pet_id')
      .eq('profile_id', user.id)
      .eq('status', 'active');

    // 2. Fetch from direct owner_id
    const { data: ownedPets } = await supabase
      .from('pets')
      .select('id')
      .eq('owner_id', user.id);

    // 3. Fetch from pet_owners
    const { data: petOwners } = await supabase
      .from('pet_owners')
      .select('pet_id')
      .eq('profile_id', user.id);

    const memberIds = (memberships ?? []).map((m: any) => m.pet_id).filter(Boolean);
    const ownedIds = (ownedPets ?? []).map((p: any) => p.id).filter(Boolean);
    const ownerIds = (petOwners ?? []).map((po: any) => po.pet_id).filter(Boolean);

    const allPetIds = Array.from(new Set([...memberIds, ...ownedIds, ...ownerIds]));

    if (allPetIds.length > 0) {
      const { data: petList } = await supabase
        .from('pets')
        .select('*')
        .in('id', allPetIds)
        .order('name');

      if (petList) {
        pets = petList;
      }
    }
  } catch (err) {
    console.warn('Pets lookup error, continuing with empty list:', err);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center pt-8 pb-32 px-4 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900">Kayıp İhbarı Oluştur</h1>
        <p className="mt-2 text-gray-600">
          Lütfen adımları takip ederek kayıp evcil hayvanınızın bilgilerini girin.
        </p>
      </div>

      <WizardForm
        pets={pets}
        userPhone={registeredPhone}
        isPhoneConfirmed={isPhoneConfirmed}
      />
    </div>
  );
}
