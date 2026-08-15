import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: petId } = await params;

    // Check pet ownership
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('id')
      .eq('id', petId)
      .eq('user_id', user.id)
      .single();

    if (petError || !pet) {
      return NextResponse.json({ error: 'Pet not found or unauthorized' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${user.id}/${petId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;

    const { error: uploadError } = await supabase.storage
      .from('health_documents')
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
    }

    return NextResponse.json({ success: true, path: filePath });
  } catch (error: any) {
    console.error('Document upload error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
