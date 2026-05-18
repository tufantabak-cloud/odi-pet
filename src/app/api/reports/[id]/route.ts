import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: petId } = params;

    // Use SSR Supabase client
    const response = NextResponse.next();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
    }

    // Mock report payload for MVP
    const reportData = {
      verificationHash: Math.random().toString(36).substring(2, 10).toUpperCase(),
      generatedAt: new Date().toISOString(),
      preventiveComplianceScore: 85,
      annualVaccineCount: 3,
      incidentCount: 1,
      appointments: [],
      shareToken: Math.random().toString(36).substring(2, 18),
    };

    return NextResponse.json(reportData, { status: 200 });

  } catch (error: any) {
    console.error('[reports] POST error:', error);
    return NextResponse.json({ error: 'Rapor oluşturulurken bir hata oluştu.' }, { status: 500 });
  }
}
