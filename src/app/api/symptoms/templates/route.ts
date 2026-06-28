import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-current-profile';
import { z } from 'zod';

const SymptomTemplateSchema = z.object({
  name: z.string().min(1),
  name_tr: z.string().min(1),
  species: z.enum(['cat', 'dog', 'both']),
  is_critical: z.boolean().optional(),
  body_system: z.string().optional(),
  is_active: z.boolean().optional()
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const species = searchParams.get('species');
    const body_system = searchParams.get('body_system');
    
    const supabase = await createServerSupabaseClient();
    
    let query = supabase.from('symptom_templates').select('*').eq('is_active', true);
    
    if (species) {
      const speciesVal = (species === 'Kedi' || species === 'cat') ? 'cat' : (species === 'Köpek' || species === 'dog' ? 'dog' : 'both');
      if (speciesVal !== 'both') {
        // Find symptoms that are either for this specific species or for 'both'
        query = query.in('species', [speciesVal, 'both']);
      }
    }
    
    if (body_system) {
      query = query.eq('body_system', body_system);
    }
    
    const { data, error } = await query
      .order('is_critical', { ascending: false })
      .order('name_tr', { ascending: true });
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching symptom templates:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(['admin', 'founder']);
    
    const supabaseAdmin = createAdminSupabaseClient();
    const body = await req.json();
    
    const validatedData = SymptomTemplateSchema.parse(body);
    
    const { data, error } = await supabaseAdmin
      .from('symptom_templates')
      .insert(validatedData)
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating symptom template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
