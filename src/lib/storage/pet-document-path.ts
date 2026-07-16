import { createAdminSupabaseClient } from '../supabase/server';

export async function validatePetDocumentPath(
  userId: string,
  petId: string,
  storagePath: string
): Promise<boolean> {
  if (
    storagePath.includes('..') ||
    storagePath.includes('\\') ||
    storagePath.includes('\0')
  ) {
    return false;
  }
  
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
    return false;
  }

  const parts = storagePath.split('/');
  if (parts.length !== 3) {
    return false;
  }

  const [pathUserId, pathPetId, filename] = parts;
  if (pathUserId !== userId || pathPetId !== petId || !filename.trim()) {
    return false;
  }

  // Exact storage presence verify
  const adminClient = createAdminSupabaseClient();
  const { data: files, error } = await adminClient.storage
    .from('pet-documents')
    .list(`${userId}/${petId}`, {
      search: filename
    });

  if (error || !files) return false;
  return files.some((f) => f.name === filename);
}
