import { z } from 'zod';

export const planCategorySchema = z.enum([
  'saglik', 'asi', 'parazit', 'bakim', 'beslenme', 'hijyen', 'aktivite'
]);

export const repeatRuleSchema = z.enum(['daily', 'weekly', 'monthly', 'yearly']).nullable().optional();
export const notifUnitSchema = z.enum(['minute', 'hour', 'day']);
export const planStatusSchema = z.enum(['active', 'completed', 'cancelled']);

export const createPlanSchema = z.object({
  pet_id: z.string().uuid('Geçersiz pet_id'),
  category: planCategorySchema,
  sub_type: z.string().min(1, 'Alt tür zorunludur'),
  scheduled_at: z.string().datetime({ message: 'Geçersiz tarih/saat formatı' }),
  repeat_rule: repeatRuleSchema,
  ends_at: z.string().datetime().nullable().optional(),
  notif_before: z.number().int().min(0).default(10),
  notif_unit: notifUnitSchema.default('minute'),
  note: z.string().nullable().optional(),
  extra_data: z.record(z.string(), z.any()).default({}),
});

export const updatePlanSchema = createPlanSchema.partial().extend({
  status: planStatusSchema.optional()
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
