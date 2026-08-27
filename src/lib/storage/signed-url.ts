import type { SupabaseClient } from '@supabase/supabase-js'

export async function injectSignedUrls<T extends { document_storage_path?: string | null }>(
  records: T[],
  supabase: SupabaseClient
): Promise<(T & { signed_url?: string | null })[]> {
  if (!records || !records.length) return records

  return Promise.all(
    records.map(async (rec) => {
      if (!rec.document_storage_path) return rec

      let storagePath = rec.document_storage_path
      if (storagePath.startsWith('http')) {
        const parts = storagePath.split('/pet-documents/')
        if (parts.length > 1) {
          storagePath = parts[1]
        }
      }

      const { data: signed, error } = await supabase.storage
        .from('pet-documents')
        .createSignedUrl(storagePath, 3600)

      if (error) {
        console.error('Signed URL generation failed:', error)
      }

      return {
        ...rec,
        signed_url: signed?.signedUrl || null
      }
    })
  )
}
