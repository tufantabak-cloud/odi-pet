import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/get-current-profile'
import crypto from 'crypto'

function detectMimeTypeFromMagicBytes(header: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf' | null {
  if (header.length < 12) return null

  // JPEG: FF D8 FF
  if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
    return 'image/jpeg'
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4E &&
    header[3] === 0x47 &&
    header[4] === 0x0D &&
    header[5] === 0x0A &&
    header[6] === 0x1A &&
    header[7] === 0x0A
  ) {
    return 'image/png'
  }

  // PDF: 25 50 44 46 (%PDF-)
  if (header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) {
    return 'application/pdf'
  }

  // WebP: RIFF (52 49 46 46) ... WEBP (57 45 42 50 at index 8)
  if (
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return 'image/webp'
  }

  return null
}

const MIME_EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

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

  // Read header bytes for magic number verification
  const fileBuffer = new Uint8Array(await file.arrayBuffer())
  const verifiedMime = detectMimeTypeFromMagicBytes(fileBuffer)

  if (!verifiedMime) {
    return NextResponse.json({
      error: 'Geçersiz dosya türü. Yalnızca JPEG, PNG, WebP ve PDF belgeleri kabul edilir.'
    }, { status: 400 })
  }

  const ext = MIME_EXT_MAP[verifiedMime] || 'bin'
  const filename = `${user.id}/${crypto.randomUUID()}.${ext}`

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.storage
    .from('pet-documents')
    .upload(filename, fileBuffer, {
      contentType: verifiedMime,
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
