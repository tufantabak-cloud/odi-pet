import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/get-current-profile';

// Legacy vaccine_templates tablosu artık mevcut değil (vaccine_protocols'e taşındı).
// Bu route yalnızca 410 döner, hiçbir DB sorgusu göndermez.
const RETIRED_RESPONSE = {
  error: 'Legacy vaccine templates API has been retired.',
  replacement: '/api/admin/vaccines',
};

export async function GET() {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(RETIRED_RESPONSE, { status: 410 });
}

export async function POST() {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(RETIRED_RESPONSE, { status: 410 });
}

export async function PUT() {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(RETIRED_RESPONSE, { status: 410 });
}

export async function DELETE() {
  const actor = await requireRole(['admin', 'founder']);
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(RETIRED_RESPONSE, { status: 410 });
}
