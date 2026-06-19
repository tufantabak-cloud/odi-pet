import { NextResponse } from 'next/server';
import { redis } from '@/lib/security/redis';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

// Mock DB for actual publish until lost_reports table is used
const database = new Map<string, any>();

export async function POST(req: Request) {
  try {
    const idempotencyKey = req.headers.get('Idempotency-Key');
    
    // BUG-001: Check Idempotency Key
    if (idempotencyKey) {
      const cachedResponse = await redis.get(idempotencyKey);
      if (cachedResponse) {
        return NextResponse.json(cachedResponse);
      }
    }

    const { action, payload, sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }
    
    const supabaseAdmin = createAdminSupabaseClient();

    if (action === 'save_draft') {
      // BUG-002: Save to Supabase instead of memory, TTL 48h
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      
      // Fetch existing payload first to merge
      const { data: existingDraft } = await supabaseAdmin
        .from('lost_report_drafts')
        .select('payload')
        .eq('session_id', sessionId)
        .single();
        
      const mergedPayload = { ...(existingDraft?.payload || {}), ...payload };

      const { error } = await supabaseAdmin
        .from('lost_report_drafts')
        .upsert({ session_id: sessionId, payload: mergedPayload, expires_at: expiresAt }, { onConflict: 'session_id' });
      
      if (error) throw error;
      return NextResponse.json({ message: 'Draft saved' });
    }

    if (action === 'publish') {
      const { data: draftRecord, error: draftError } = await supabaseAdmin
        .from('lost_report_drafts')
        .select('payload')
        .eq('session_id', sessionId)
        .single();
        
      if (draftError || !draftRecord) {
        return NextResponse.json({ error: 'No draft found' }, { status: 400 });
      }

      const draft = draftRecord.payload;

      // Atomic DB Save Simulation
      const reportId = `report_${Date.now()}`;
      database.set(reportId, { ...draft, status: 'published', createdAt: new Date().toISOString() });
      
      // Clear draft
      await supabaseAdmin.from('lost_report_drafts').delete().eq('session_id', sessionId);

      const responseBody = { message: 'Report published successfully', reportId };
      
      // Cache response for 24 hours to prevent duplicate publishes
      if (idempotencyKey) {
        await redis.set(idempotencyKey, responseBody, { ex: 24 * 60 * 60 });
      }

      return NextResponse.json(responseBody);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error("Publish Route Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

