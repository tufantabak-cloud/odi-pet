import * as z from "zod";

// Shared password rules — single source of truth for all auth forms
export const passwordSchema = z
  .string()
  .min(8, "Şifre en az 8 karakter olmalıdır.")
  .regex(/[A-Z]/, "Şifre en az 1 büyük harf içermelidir.")
  .regex(/[0-9]/, "Şifre en az 1 rakam içermelidir.");

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  password: z.string().min(1, "Şifre zorunludur."),
  turnstileToken: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Ad soyad en az 2 karakter olmalıdır."),
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Şifre onayı zorunludur."),
  terms: z.literal(true, {
    message: "Kullanım koşullarını kabul etmelisiniz.",
  }),
  turnstileToken: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor.",
  path: ["confirmPassword"],
});

export const clinicRegisterSchema = z.object({
  name: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalıdır.").max(100),
  clinicName: z.string().trim().min(2, "Klinik adı en az 2 karakter olmalıdır.").max(160),
  clinicPhone: z.string().trim().max(30).optional(),
  email: z.string().trim().email("Geçerli bir e-posta adresi giriniz.").max(254),
  password: passwordSchema,
  terms: z.literal(true, {
    message: "Kullanım koşullarını kabul etmelisiniz.",
  }),
  turnstileToken: z.string().optional(),
});

export const updatePasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Şifre onayı zorunludur."),
  turnstileToken: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor.",
  path: ["confirmPassword"],
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  turnstileToken: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ClinicRegisterInput = z.infer<typeof clinicRegisterSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
