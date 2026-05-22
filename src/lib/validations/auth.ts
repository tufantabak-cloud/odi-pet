import * as z from "zod";

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  password: z.string().min(1, "Şifre zorunludur."),
  turnstileToken: z.string().optional(),
  rememberMe: z.coerce.boolean().optional().default(false),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Ad soyad en az 2 karakter olmalıdır."),
  email: z.string().email("Geçerli bir e-posta adresi giriniz."),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalıdır.")
    .regex(/[A-Z]/, "Şifre en az 1 büyük harf içermelidir.")
    .regex(/[0-9]/, "Şifre en az 1 rakam içermelidir."),
  confirmPassword: z.string().min(1, "Şifre onayı zorunludur."),
  terms: z.literal(true, {
    errorMap: () => ({ message: "Kullanım koşullarını kabul etmelisiniz." }),
  }),
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
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
