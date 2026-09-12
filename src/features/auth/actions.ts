'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createServerSupabaseClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return redirect('/login?message=Kullanıcı adı veya şifre hatalı')
  }

  revalidatePath('/', 'layout')
  redirect('/') // Middleware ve layout'lar doğru sayfaya (/owner veya /clinic) yollayacak.
}

export async function logout(formData?: FormData) {
  const supabase = await createServerSupabaseClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    const deviceId = formData?.get('device_id') as string | null

    if (user && deviceId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(deviceId)) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('profile_id', user.id)
          .eq('device_id', deviceId)
      }
    }
  } catch (err) {
    console.warn('[logout] push subscription cleanup failed, proceeding with signOut:', err)
  } finally {
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
  }

  redirect('/login')
}
