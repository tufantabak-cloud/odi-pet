import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/get-current-profile';

function jsonToCsv(json: any[]) {
  if (!json || json.length === 0) return '';
  const keys = Object.keys(json[0]);
  const header = keys.join(',');
  const rows = json.map(obj => {
    return keys.map(key => {
      let val = obj[key];
      if (val === null || val === undefined) {
        return '';
      }
      if (typeof val === 'object') {
        val = JSON.stringify(val);
      } else {
        val = String(val);
      }
      val = val.replace(/"/g, '""');
      if (val.includes(',') || val.includes('\n') || val.includes('"')) {
        val = `"${val}"`;
      }
      return val;
    }).join(',');
  });
  return [header, ...rows].join('\n');
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'csv';

    const adminSupabase = createAdminSupabaseClient();
    
    const { data: profiles, error } = await adminSupabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const exportData = profiles || [];

    if (format === 'json') {
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="users.json"',
        },
      });
    } else {
      // Default to CSV
      const csvData = jsonToCsv(exportData);
      // UTF-8 BOM ekliyoruz, böylece Excel Türkçe karakterleri doğru tanır
      const bom = '\uFEFF';
      return new NextResponse(bom + csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="users.csv"',
        },
      });
    }

  } catch (error: unknown) {
    console.error('[API/Users Export GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Veri dışa aktarılırken hata oluştu.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
