import { SupabaseClient } from '@supabase/supabase-js';

const PET_BUCKETS = ['pet-avatars', 'pet-gallery', 'pet_gallery_bucket', 'vaccine-documents', 'pet-documents'];
const PROFILE_BUCKETS = ['avatars', 'user-documents'];

export async function deletePetStorageFiles(
  supabase: SupabaseClient,
  petId: string
): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
  let deletedCount = 0;
  const errors: string[] = [];

  for (const bucket of PET_BUCKETS) {
    try {
      const { data: files, error: listError } = await supabase.storage
        .from(bucket)
        .list(petId);

      if (listError) {
        // Folder might not exist, skip silently if not found
        continue;
      }

      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${petId}/${f.name}`);
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove(filePaths);

        if (deleteError) {
          errors.push(`Failed to delete files in ${bucket} for pet ${petId}: ${deleteError.message}`);
        } else {
          deletedCount += filePaths.length;
        }
      }
    } catch (err: any) {
      errors.push(`Unexpected error in bucket ${bucket} for pet ${petId}: ${err?.message || err}`);
    }
  }

  return { success: errors.length === 0, deletedCount, errors };
}

export async function deleteProfileStorageFiles(
  supabase: SupabaseClient,
  profileId: string
): Promise<{ success: boolean; deletedCount: number; errors: string[] }> {
  let deletedCount = 0;
  const errors: string[] = [];

  for (const bucket of PROFILE_BUCKETS) {
    try {
      const { data: files, error: listError } = await supabase.storage
        .from(bucket)
        .list(profileId);

      if (listError) continue;

      if (files && files.length > 0) {
        const filePaths = files.map((f) => `${profileId}/${f.name}`);
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove(filePaths);

        if (deleteError) {
          errors.push(`Failed to delete files in ${bucket} for profile ${profileId}: ${deleteError.message}`);
        } else {
          deletedCount += filePaths.length;
        }
      }
    } catch (err: any) {
      errors.push(`Unexpected error in bucket ${bucket} for profile ${profileId}: ${err?.message || err}`);
    }
  }

  return { success: errors.length === 0, deletedCount, errors };
}
