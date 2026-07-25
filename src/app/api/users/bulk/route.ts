import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { getSessionUser, getCurrentProfile } from '@/lib/auth/get-current-profile';

// DELETE: Bulk user deletion
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { user_ids } = body;

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json({ error: 'Geçersiz veri: user_ids dizisi bekleniyor.' }, { status: 400 });
    }

    const adminSupabase = createAdminSupabaseClient();
    
    // Auth users siliniyor (kullanıcının kendi hesabını silmesi engellenir, ilişkili profiller temizlenir)
    const results = await Promise.allSettled(
      user_ids.map(async (id: string) => {
        if (id === user.id) {
          throw new Error('Kendi hesabınızı silemezsiniz.');
        }

        // Önce profiles kaydını ve bağlı verilerini temizlemeyi dene
        await adminSupabase.from('profiles').delete().eq('id', id);

        // Supabase Auth kullanıcısını sil
        const { data, error } = await adminSupabase.auth.admin.deleteUser(id);
        if (error) throw error;
        return data;
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failedResults = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    const failed = failedResults.length;

    // Hata nedenlerini benzersiz ve anlaşılır olarak topla
    const errorDetails = Array.from(new Set(failedResults.map(r => {
      const msg = r.reason?.message || String(r.reason);
      if (msg.includes('invalid JWT') || msg.includes('unrecognized JWT')) {
        return 'Test/Mock hesaba ait geçersiz JWT kimliği (Supabase Auth imza doğrulaması başarısız)';
      }
      if (msg.includes('Database error deleting user')) {
        return 'Veritabanında bağımlı kayıt/trigger kısıtlaması (Database error deleting user)';
      }
      return msg;
    })));

    let message = `${successful} kullanıcı başarıyla silindi.`;
    if (failed > 0) {
      message += ` ${failed} işlem başarısız.\n\nNedenler:\n• ${errorDetails.join('\n• ')}`;
    }

    return NextResponse.json({ 
      success: true, 
      message,
      successful,
      failed,
      errorDetails
    });
  } catch (error: unknown) {
    console.error('[API/Users Bulk DELETE] Error:', error);
    const message = error instanceof Error ? error.message : 'Silme işlemi sırasında hata oluştu.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Bulk user update (e.g. assigning roles)
export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { user_ids, data } = body;

    if (!Array.isArray(user_ids) || user_ids.length === 0 || !data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Geçersiz veri: user_ids dizisi ve güncellenecek data nesnesi bekleniyor.' }, { status: 400 });
    }

    const adminSupabase = createAdminSupabaseClient();

    // RLS'i aşmak için admin client kullanıyoruz
    const { data: updatedData, error } = await adminSupabase
      .from('profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .in('id', user_ids)
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      message: `${updatedData.length} kullanıcı başarıyla güncellendi.`,
      updated: updatedData.length
    });
  } catch (error: unknown) {
    console.error('[API/Users Bulk PATCH] Error:', error);
    const message = error instanceof Error ? error.message : 'Güncelleme işlemi sırasında hata oluştu.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
