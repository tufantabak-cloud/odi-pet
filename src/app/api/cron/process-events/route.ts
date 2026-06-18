import { NextResponse } from 'next/server';
import { processHealthEvents } from '@/lib/agents/notificationAgent';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (
      process.env.CRON_SECRET && 
      authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
      new URL(request.url).searchParams.get('token') !== process.env.CRON_SECRET
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Health event'lerini toplayıp (işleyip) bildirimleri fırlatır
    const result = await processHealthEvents();

    if (!result.success) {
      throw new Error('Failed to process health events');
    }

    return NextResponse.json({
      success: true,
      message: 'Events processed and notifications pushed',
      processed: result.processed
    });

  } catch (error: any) {
    console.error('Process Events Cron Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
