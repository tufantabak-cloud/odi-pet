import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const species = searchParams.get('species');
    const category = searchParams.get('category'); // 'Medikal', 'Asi', 'Parazit'
    
    const supabase = await createServerSupabaseClient();
    
    let query = supabase.from('vaccine_templates').select('*');
    
    if (species) {
      const speciesEng = (species === 'Kedi' || species === 'cat') ? 'cat' : 'dog';
      query = query.eq('species', speciesEng);
    }
    
    const { data, error } = await query.order('species').order('first_dose_week', { ascending: true });
    
    if (error) throw error;
    
    let filteredData = data;
    // Eğer Frontend'den 'Asi' veya 'Parazit' olarak ayrı istenirse, ona göre title/category tabanlı bir filtre uygulayalım:
    if (category === 'Asi') {
      filteredData = data.filter(d => d.category === 'vaccine');
    } else if (category === 'Parazit') {
      filteredData = data.filter(d => d.category === 'parasite');
    }
    
    return NextResponse.json(filteredData);
  } catch (error: any) {
    console.error('Error fetching vaccine templates:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createAdminSupabaseClient();
    const body = await req.json();
    
    const { data, error } = await supabaseAdmin
      .from('vaccine_templates')
      .insert({
        ...body,
        profile_id: null // Admin olarak sistem şablonu oluşturuyoruz
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating vaccine template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabaseAdmin = createAdminSupabaseClient();
    const body = await req.json();
    const { id, ...updates } = body;
    
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    
    const { data, error } = await supabaseAdmin
      .from('vaccine_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating vaccine template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    
    const supabaseAdmin = createAdminSupabaseClient();
    const { error } = await supabaseAdmin
      .from('vaccine_templates')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting vaccine template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
