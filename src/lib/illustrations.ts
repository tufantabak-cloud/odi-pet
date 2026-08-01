import { 
  IllustrationID, 
  IllustrationManifestItem, 
  QueryIllustrationOptions 
} from '@/types/illustration.types';
import manifestData from '../../public/brand/illustrations/illustration-manifest.json';
import { trackIllustrationRender } from './illustration-telemetry';

const manifestMap = new Map<string, IllustrationManifestItem>(
  (manifestData as unknown as IllustrationManifestItem[]).map(item => [item.id, item])
);

/**
 * Core Illustration API - Retrieve by exact ID or query parameters
 */
export function getIllustration(
  query: IllustrationID | QueryIllustrationOptions
): IllustrationManifestItem | null {
  if (typeof query === 'string') {
    const asset = manifestMap.get(query);
    if (asset) {
      trackIllustrationRender(asset.id);
      return asset;
    }
    return null;
  }

  // Query by Category/State/Module
  const items = Array.from(manifestMap.values());
  const found = items.find(item => {
    if (query.category && item.category !== query.category) return false;
    if (query.module && item.module !== query.module) return false;
    return true;
  });

  if (found) {
    trackIllustrationRender(found.id);
    return found;
  }

  return items[0] || null;
}

/**
 * Search and Filter Illustrations Catalog
 */
export function searchIllustrations(options: QueryIllustrationOptions): IllustrationManifestItem[] {
  const items = Array.from(manifestMap.values());
  return items.filter(item => {
    if (options.category && item.category !== options.category) return false;
    if (options.module && item.module !== options.module) return false;
    return true;
  });
}

/**
 * Get all available illustration IDs
 */
export function getAllIllustrationIds(): IllustrationID[] {
  return Array.from(manifestMap.keys()) as IllustrationID[];
}
