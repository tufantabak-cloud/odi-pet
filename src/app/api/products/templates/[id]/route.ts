import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/get-current-profile';
import { z } from 'zod';

const ProductTemplateUpdateSchema = z.object({
  category: z.enum([
    'parasite_external',
    'parasite_internal',
    'parasite_collar',
    'food',
    'supplement'
  ]).optional(),
  brand_name: z.string().min(1).optional(),
  product_name: z.string().optional().nullable(),
  species: z.enum(['cat', 'dog', 'both']).optional(),
  duration_days: z.number().optional().nullable(),
  is_active: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['admin', 'founder']);
    
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    const supabaseAdmin = createAdminSupabaseClient();
    const body = await req.json();
    
    const validatedData = ProductTemplateUpdateSchema.parse(body);
    
    const { data, error } = await supabaseAdmin
      .from('product_templates')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating product template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['admin', 'founder']);
    
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }
    
    const supabaseAdmin = createAdminSupabaseClient();
    const { error } = await supabaseAdmin
      .from('product_templates')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting product template:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
