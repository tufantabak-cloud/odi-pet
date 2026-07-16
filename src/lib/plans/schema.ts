import { z } from 'zod';

export const planCategorySchema = z.enum([
  'saglik', 'asi', 'parazit', 'bakim', 'beslenme', 'hijyen', 'aktivite', 'kontrol'
]);

export const repeatRuleSchema = z.enum(['hour', 'hourly', 'daily', 'weekly', 'monthly', 'yearly']).nullable().optional();
export const notifUnitSchema = z.enum(['minute', 'hour', 'day']);
export const planStatusSchema = z.enum(['active', 'completed', 'cancelled']);

export const createPlanSchema = z.object({
  pet_id: z.string().uuid('Geçersiz pet_id'),
  category: planCategorySchema,
  sub_type: z.string().min(1, 'Alt tür zorunludur'),
  scheduled_at: z.string().datetime({ message: 'Geçersiz tarih/saat formatı' }),
  repeat_rule: repeatRuleSchema,
  ends_at: z.string().datetime().nullable().optional(),
  notif_before: z.number().int().min(0).nullable().default(10),
  notif_unit: notifUnitSchema.default('minute'),
  note: z.string().nullable().optional(),
  extra_data: z.record(z.string(), z.any()).default({}),
});

export const updatePlanSchema = createPlanSchema.partial().extend({
  status: planStatusSchema.optional(),
  administered_at: z.string().optional(),
  brand_free_text: z.string().nullable().optional(),
  product_free_text: z.string().nullable().optional(),
  application_method: z.string().optional(),
  protection_duration_days: z.number().int().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  document_storage_path: z.string().nullable().optional()
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
