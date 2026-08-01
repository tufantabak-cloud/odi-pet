import { PostgrestError } from '@supabase/supabase-js'

/**
 * Supabase/PostgreSQL hatalarını standart bir formata dönüştürür.
 * Hassas veritabanı kısıtlama adlarını maskeler ve loglara yazar.
 */
export function formatSupabaseError(error: unknown, defaultMessage = 'İşlem sırasında bir hata oluştu.'): { message: string, code: string } {
  const isErrorObj = error instanceof Error
  const isPostgrest = typeof error === 'object' && error !== null && 'code' in error && 'message' in error

  if (isPostgrest) {
    const pgError = error as PostgrestError
    console.error('[Supabase Error]', {
      code: pgError.code,
      message: pgError.message,
      details: pgError.details,
      hint: pgError.hint,
    })

    // Yabancı anahtar (Foreign Key) hatası
    if (pgError.code === '23503') {
      return { message: 'Bu kayıt başka verilerle bağlantılı olduğu için silinemiyor.', code: 'FK_VIOLATION' }
    }

    // Eşsiz kısıtlama (Unique Constraint) hatası
    if (pgError.code === '23505') {
      return { message: 'Bu kayıt zaten mevcut.', code: 'UNIQUE_VIOLATION' }
    }

    // Yetki (RLS) hatası
    if (pgError.code === '42501') {
      return { message: 'Bu işlem için yetkiniz bulunmuyor.', code: 'INSUFFICIENT_PRIVILEGE' }
    }

    // Bilinmeyen ancak yakalanmış PostgREST hataları için
    return { message: 'Veritabanı işlemi başarısız oldu.', code: pgError.code || 'UNKNOWN_DB_ERROR' }
  }

  if (isErrorObj) {
    console.error('[Error]', error.message, error.stack)
    return { message: defaultMessage, code: 'UNKNOWN_ERROR' }
  }

  console.error('[Unknown Error]', error)
  return { message: defaultMessage, code: 'UNKNOWN_ERROR' }
}
