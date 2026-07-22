import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-current-profile';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/content/[id]/revisions
 * Makalenin geçmiş revizyon snapshot'larını getirir.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: revisions, error } = await supabase
    .from('article_revisions')
    .select('*')
    .eq('article_id', id)
    .order('version_number', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(revisions || []);
}
