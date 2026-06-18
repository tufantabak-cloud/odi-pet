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
    
    // Auth users siliniyor (ilgili public.profiles kayıtları foreign key cascade ile silinmelidir)
    const results = await Promise.allSettled(
      user_ids.map(async (id: string) => {
        const { data, error } = await adminSupabase.auth.admin.deleteUser(id);
        if (error) throw error;
        return data;
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({ 
      success: true, 
      message: `${successful} kullanıcı başarıyla silindi. ${failed} işlem başarısız.` 
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
