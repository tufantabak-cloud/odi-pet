import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // 5MB limit
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 })
  }

  // File type check
  if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Invalid file type. Only images and PDFs are allowed.' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  
  const ext = file.name.split('.').pop() || 'tmp'
  const filename = `${user.id}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from('pet-documents')
    .upload(filename, file, {
      contentType: file.type,
      upsert: false
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('pet-documents')
    .getPublicUrl(filename)

  return NextResponse.json({ 
    success: true, 
    path: filename, 
    url: publicUrl 
  })
}
