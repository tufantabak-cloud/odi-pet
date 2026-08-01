export type IllustrationCategory = 
  | 'empty-state' | 'onboarding' | 'dashboard' | 'health' | 'vaccines' | 'parasite'
  | 'nutrition' | 'grooming' | 'community' | 'marketplace' | 'services' | 'profile'
  | 'settings' | 'admin' | 'ai' | 'notifications' | 'success' | 'error' | 'offline'
  | 'maintenance' | 'seasonal' | 'marketing' | 'documents' | 'certificates'
  | 'backgrounds' | 'decorations' | 'insurance' | 'pharmacy' | 'adoption' | 'breeding'
  | 'training' | 'behavior' | 'genetics' | 'wearables' | 'iot' | 'analytics' | 'labs'
  | 'emergency' | 'charity' | 'organizations' | 'partners';

export type IllustrationState = 'empty' | 'active' | 'success' | 'warning' | 'error' | 'loading' | 'hero' | 'banner';

export type IllustrationTheme = 'light' | 'dark' | 'system';

export type IllustrationReviewState = 'Draft' | 'Review' | 'Approved' | 'Deprecated' | 'Archived';

export type IllustrationID = 
  | 'empty-no-pets'
  | 'empty-no-vaccines'
  | 'empty-no-food'
  | 'onboarding-welcome'
  | 'dashboard-hero'
  | 'health-checkup'
  | 'vaccine-schedule'
  | 'parasite-control'
  | 'nutrition-plan'
  | 'grooming-care'
  | 'community-share'
  | 'marketplace-empty'
  | 'services-vet-finder'
  | 'profile-pet-card'
  | 'settings-preferences'
  | 'admin-analytics'
  | 'ai-vet-assistant'
  | 'notification-reminder'
  | 'success-check'
  | 'error-warning'
  | 'offline-no-connection'
  | 'maintenance-mode'
  | 'seasonal-banner'
  | 'marketing-banner'
  | 'document-health-report'
  | 'certificate-vaccine'
  | 'background-lilac-glow'
  | 'decoration-paw-pattern'
  | (string & {}); // Extensible for future CLI additions

export interface AIMetadata {
  prompt?: string;
  style?: string;
  seed?: number;
  generation?: string;
  revision?: number;
}

export interface GovernanceMetadata {
  creator: string;
  createdAt: string;
  approvedBy: string;
  copyright: string;
  license: string;
  reviewState: IllustrationReviewState;
}

export interface BundleMetrics {
  svgSizeKb: number;
  png512SizeKb: number;
  gzipSizeKb: number;
  brotliSizeKb: number;
  renderCostMs: number;
}

export interface IllustrationManifestItem {
  id: IllustrationID;
  name: string;
  category: IllustrationCategory;
  module: string;
  complexity: 'S' | 'M' | 'L';
  theme_color: string;
  title: { tr: string; en: string };
  description: { tr: string; en: string };
  screen_usage: string[];
  allowedContexts: string[];
  forbiddenContexts: string[];
  svg_path: string;
  png_512: string;
  png_1024: string;
  png_2048: string;
  dependencies: string[];
  priority: 'P0' | 'P1' | 'P2';
  fallback: string;
  replacement_policy: string;
  systemVersion: string;
  assetVersion: string;
  illustrationVersion: string;
  last_update: string;
  aiMetadata?: AIMetadata;
  governance?: GovernanceMetadata;
  bundleMetrics?: BundleMetrics;
}

export interface QueryIllustrationOptions {
  category?: IllustrationCategory;
  state?: IllustrationState;
  theme?: IllustrationTheme;
  module?: string;
  locale?: 'tr' | 'en';
}

export interface IllustrationProps {
  id: IllustrationID;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  lazy?: boolean;
  theme?: IllustrationTheme;
  locale?: 'tr' | 'en';
  altText?: string;
  onLoad?: () => void;
  onError?: (err: Error) => void;
}
