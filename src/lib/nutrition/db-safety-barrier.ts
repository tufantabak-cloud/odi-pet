/**
 * Odi.Pet — Veritabanı Güvenlik Bariyeri (Database Safety Barrier)
 *
 * Bu modül, test, CI ve seed/import süreçlerinin üretim (production)
 * Supabase veritabanına yanlışlıkla bağlanmasını teknik olarak imkânsız
 * hale getirir. Bariyer, bağlantı oluşturulmadan ÖNCE çalışır.
 *
 * Kurallar:
 * - NODE_ENV=test, VITEST veya CI ortamında yalnızca localhost/127.0.0.1 hedefi kabul edilir.
 * - *.supabase.co hedefinde test bağlantısı oluşturulmadan REFUSING_REMOTE_DATABASE_IN_TEST hatası fırlatılır.
 * - Seed/import remote hedefte varsayılan olarak reddedilir.
 * - Üretim importu yalnızca ALLOW_REMOTE_IMPORT=true değişkeniyle mümkündür (tek kullanımlık onay).
 */

export class RemoteDatabaseRefusedError extends Error {
  constructor(url: string, operation: string) {
    super(
      `REFUSING_REMOTE_DATABASE_IN_TEST: ` +
      `"${operation}" işlemi uzak veritabanı hedefine (${maskUrl(url)}) bağlanmayı denedi. ` +
      `Test, CI veya seed/import süreçlerinde yalnızca yerel veritabanı (localhost/127.0.0.1) kabul edilir.`
    )
    this.name = 'RemoteDatabaseRefusedError'
  }
}

/**
 * URL'den yalnızca hostname'i çıkarır. Gizli anahtarları kesinlikle açığa vurmaz.
 */
function maskUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return '[invalid-url]'
  }
}

/**
 * Verilen URL'nin yerel bir veritabanı hedefine işaret edip etmediğini kontrol eder.
 */
function isLocalTarget(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.local')
    )
  } catch {
    return false
  }
}

/**
 * Mevcut ortamın test/CI olup olmadığını tespit eder.
 */
function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.VITEST === 'true' ||
    typeof process.env.VITEST !== 'undefined' ||
    process.env.CI === 'true' ||
    process.env.JEST_WORKER_ID !== undefined
  )
}

/**
 * Veritabanı hedefini doğrular. Bağlantı oluşturulmadan ÖNCE çağrılmalıdır.
 *
 * @param url - Supabase URL hedefi
 * @param operation - İşlem tanımı ('test', 'import', 'seed', 'read', 'audit')
 * @throws RemoteDatabaseRefusedError - Uzak hedef reddedilirse
 */
export function assertSafeDatabaseTarget(
  url: string,
  operation: 'test' | 'import' | 'seed' | 'read' | 'audit'
): void {
  const isLocal = isLocalTarget(url)
  const isTest = isTestEnvironment()

  // Kural 1: Test/CI ortamında uzak hedef kesinlikle reddedilir
  if (isTest && !isLocal) {
    throw new RemoteDatabaseRefusedError(url, operation)
  }

  // Kural 2: Seed/import işlemleri uzak hedefte varsayılan olarak reddedilir
  if ((operation === 'seed' || operation === 'import') && !isLocal) {
    if (process.env.ALLOW_REMOTE_IMPORT !== 'true') {
      throw new RemoteDatabaseRefusedError(url, operation)
    }
  }

  // Kural 3: Read ve audit işlemleri uzak hedefte izinlidir (salt-okunur)
  // → Geçiş (pass-through)
}

/**
 * createAdminSupabaseClient() için güvenli sarmalayıcı.
 * Bağlantı oluşturulmadan önce bariyeri çalıştırır.
 */
export function createSafeAdminClient(operation: 'test' | 'import' | 'seed' | 'read' | 'audit') {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  assertSafeDatabaseTarget(url, operation)

  // Bariyer geçildiyse orijinal client'ı oluştur
  const { createAdminSupabaseClient } = require('../supabase/server')
  return createAdminSupabaseClient()
}
