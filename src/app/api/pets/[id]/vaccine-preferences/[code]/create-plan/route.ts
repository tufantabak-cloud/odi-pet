import { NextResponse } from 'next/server'

export async function POST(req: Request, props: { params: Promise<{ id: string; code: string }> }) {
  return NextResponse.json(
    { error: 'GONE', message: 'Aşı planlama artık tekil akışa taşındı.' },
    { status: 410 }
  );
}
