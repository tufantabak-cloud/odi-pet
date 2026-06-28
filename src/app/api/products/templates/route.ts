import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-current-profile';
import { z } from 'zod';

const ProductTemplateSchema = z.object({
  category: z.enum([
    'parasite_external',
    'parasite_internal',
    'parasite_collar',
    'food',
    'supplement'
  ]),
  brand_name: z.string().min(1),
  product_name: z.string().optional().nullable(),
  species: z.enum(['cat', 'dog', 'both']),
  duration_days: z.number().optional().nullable(),
  is_active: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const species = searchParams.get('species');
    
    const supabase = await createServerSupabaseClient();
    
    let query = supabase.from('product_templates').select('*').eq('is_active', true);
    
    if (category) {
      query = query.eq('category', category);
    }
    
    if (species) {
      const speciesVal = (species === 'Kedi' || species === 'cat') ? 'cat' : (species === 'Köpek' || species === 'dog' ? 'dog' : 'both');
      if (speciesVal !== 'both') {
        query = query.in('species', [speciesVal, 'both']);
      }
    }
    
    const { data, error } = await query.order('brand_name', { ascending: true });
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching product templates:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(['admin', 'founder']);
    
    const supabaseAdmin = createAdminSupabaseClient();
    const body = await req.json();
    
    const validatedData = ProductTemplateSchema.parse(body);
    
    const { data, error } = await supabaseAdmin
      .from('product_templates')
      .insert(validatedData)
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating product template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
