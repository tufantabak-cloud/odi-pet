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

export async function logout() {
  const supabase = await createServerSupabaseClient()

  await supabase.auth.signOut()
  
  revalidatePath('/', 'layout')
  redirect('/login')
}
