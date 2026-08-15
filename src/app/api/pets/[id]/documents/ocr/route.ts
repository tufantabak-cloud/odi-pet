import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { path } = body;
    const { id } = await params;

    if (!path) {
      return NextResponse.json({ error: 'No path provided' }, { status: 400 });
    }

    // Generate signed URL for 60 seconds (for real AI to use, or UI to preview)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('health_documents')
      .createSignedUrl(path, 60);

    if (signedUrlError || !signedUrlData) {
      console.error('Signed URL error:', signedUrlError);
      return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
    }

    // Simulate AI delay
    await new Promise(r => setTimeout(r, 2000));

    // Mock AI JSON response
    const aiResponse = {
      confidence: 100,
      type: 'vaccine',
      data: {
        brand: 'Nobivac DHPPi',
        date: new Date().toISOString().split('T')[0]
      }
    };

    return NextResponse.json(aiResponse);
  } catch (error: any) {
    console.error('OCR processing error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
