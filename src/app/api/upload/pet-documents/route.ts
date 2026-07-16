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

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { path, pet_id: petId } = body;

    if (!path || !petId) {
      return NextResponse.json({ error: 'Path ve pet_id belirtilmelidir.' }, { status: 400 });
    }

    // 1. Path traversal / bucket escape check
    if (path.includes('..') || !path.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { createAdminSupabaseClient } = await import('@/lib/supabase/server');
    const adminClient = createAdminSupabaseClient();

    // 2. Verify pet ownership
    const { data: petOwner } = await adminClient
      .from('pet_owners')
      .select('id')
      .eq('pet_id', petId)
      .eq('profile_id', user.id)
      .maybeSingle();

    if (!petOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Verify if document is in use
    const { data: parasiteUsed } = await adminClient
      .from('parasite_records')
      .select('id')
      .eq('document_storage_path', path)
      .limit(1);

    const { data: vaccineUsed } = await adminClient
      .from('vaccine_records_v2')
      .select('id')
      .eq('document_storage_path', path)
      .limit(1);

    const { data: reproductiveUsed } = await adminClient
      .from('pet_reproductive_tests')
      .select('id')
      .eq('document_storage_path', path)
      .limit(1);

    if (
      (parasiteUsed && parasiteUsed.length > 0) ||
      (vaccineUsed && vaccineUsed.length > 0) ||
      (reproductiveUsed && reproductiveUsed.length > 0)
    ) {
      return NextResponse.json({ error: 'DOCUMENT_IN_USE' }, { status: 409 });
    }

    // 4. Perform secure storage removal
    const { error: removeError } = await adminClient.storage
      .from('pet-documents')
      .remove([path]);

    if (removeError) {
      console.error('[API/Upload DELETE] Storage remove error:', removeError);
      return NextResponse.json({ error: removeError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API/Upload DELETE] Exception:', err);
    return NextResponse.json({ error: 'Silme işlemi gerçekleştirilemedi.' }, { status: 500 });
  }
}
