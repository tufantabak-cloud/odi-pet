import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import { z } from 'zod'

const recordSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.string().min(1, 'Type is required'),
  document_path: z.string().optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServerSupabaseClient()

  // Pet sahipliği doğrulama
  const { data: ownership } = await supabase
    .from('pet_owners')
    .select('profile_id')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownership) {
    return NextResponse.json(
      { error: 'Bu işlem için yetkiniz yok.' },
      { status: 403 }
    )
  }

  const { data, error } = await supabase
    .from('health_records')
    .select('*')
    .eq('pet_id', id)
    .order('date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const recordsWithSignedUrls = await Promise.all(
    (data ?? []).map(async (record: any) => {
      if (!record.document_path) return record

      let storagePath = record.document_path
      if (storagePath.startsWith('http')) {
        const parts = storagePath.split('/pet-documents/')
        if (parts.length > 1) {
          storagePath = parts[1]
        }
      }

      const { data: signed } = await supabase.storage
        .from('pet-documents')
        .createSignedUrl(storagePath, 3600)

      return {
        ...record,
        document_path: signed?.signedUrl || record.document_path,
        raw_storage_path: storagePath
      }
    })
  )

  return NextResponse.json(recordsWithSignedUrls)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const result = recordSchema.safeParse(body)
  
  if (!result.success) {
    return NextResponse.json({ error: 'Validation error', details: result.error.format() }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  // Pet sahipliği doğrulama
  const { data: ownership } = await supabase
    .from('pet_owners')
    .select('profile_id')
    .eq('pet_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!ownership) {
    return NextResponse.json(
      { error: 'Bu işlem için yetkiniz yok.' },
      { status: 403 }
    )
  }

  const { data: record, error } = await supabase
    .from('health_records')
    .insert({
      pet_id: id,
      title: result.data.title,
      type: result.data.type,
      document_path: result.data.document_path,
      date: result.data.date || new Date().toISOString(),
      notes: result.data.notes,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, record })
}
