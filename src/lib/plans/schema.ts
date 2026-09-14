import { z } from 'zod';

export const planCategorySchema = z.enum([
  'saglik', 'asi', 'parazit', 'bakim', 'beslenme', 'hijyen', 'aktivite', 'kontrol'
]);

export const repeatRuleSchema = z.enum(['hour', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'none']).nullable().optional();
export const notifUnitSchema = z.enum(['minute', 'hour', 'day']);
// 'overdue': build-vaccination-schedule geçmiş tarihli dozları bu statüyle yazar
// 'deleted': soft-delete kuralı için eklenmiştir
export const planStatusSchema = z.enum(['active', 'completed', 'cancelled', 'overdue', 'deleted']);

export const planSourceSchema = z.enum(['user', 'system', 'protocol', 'clinical', 'ai']).default('user');
export const planPolicySchema = z.enum(['optional', 'recommended', 'required']).default('optional');

export const createPlanSchema = z.object({
  pet_id: z.string().uuid('Geçersiz pet_id'),
  category: planCategorySchema,
  sub_type: z.string().min(1, 'Alt tür zorunludur'),
  title: z.string().nullable().optional(),
  scheduled_at: z.string().datetime({ message: 'Geçersiz tarih/saat formatı' }),
  occurrence_scheduled_at: z.string().datetime().nullable().optional(),
  repeat_rule: repeatRuleSchema,
  ends_at: z.string().datetime().nullable().optional(),
  notif_before: z.number().int().min(0).nullable().default(10),
  notif_unit: notifUnitSchema.default('minute'),
  note: z.string().nullable().optional(),
  extra_data: z.record(z.string(), z.any()).default({}),
  parent_plan_id: z.string().uuid().nullable().optional(),
  source: planSourceSchema.optional(),
  policy: planPolicySchema.optional(),
  assigned_to: z.string().uuid('Geçersiz assigned_to').nullable().optional(),
  is_active: z.boolean().default(true).optional(),
});

export const updatePlanSchema = createPlanSchema.partial().extend({
  status: planStatusSchema.optional(),
  administered_at: z.string().optional(),
  brand_free_text: z.string().nullable().optional(),
  product_free_text: z.string().nullable().optional(),
  application_method: z.string().optional(),
  protection_duration_days: z.number().int().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  document_storage_path: z.string().nullable().optional(),
  parent_plan_id: z.string().uuid().nullable().optional(),
  occurrence_scheduled_at: z.string().datetime().nullable().optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
