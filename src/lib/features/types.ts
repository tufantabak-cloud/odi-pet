import { z } from 'zod';
import semver from 'semver';

export const FeatureDefinitionSchema = z.object({
  key: z.string().min(3).regex(/^[a-z][a-z0-9_]+[a-z0-9]$/, {
    message: "Key must be lowercase snake_case and start with a letter",
  }),
  version: z.string().refine((val) => semver.valid(val) === val, {
    message: "Version must follow semantic versioning (e.g. 1.0.0 or 2.0.0-beta.1)",
  }),
  name: z.string().min(3),
  description: z.string().min(10),
  category: z.enum(['health', 'social', 'ai', 'core', 'reports', 'monetization']),
  tags: z.array(z.string()).default([]),
  visibility: z.enum(['public', 'private', 'hidden']),
  display_order: z.number().default(0),
  icon: z.string().default('Star'),
  module: z.string().optional(),
  state: z.enum(['ACTIVE', 'BETA', 'HIDDEN', 'COMING_SOON', 'DEPRECATED', 'DISABLED']).default('ACTIVE'),
  dependsOn: z.array(z.string()).default([]),
  requiresAuth: z.boolean().default(true),
  requiresPet: z.boolean().default(false),
  metadata: z.object({
    owner: z.string().optional(),
    team: z.string().optional(),
    introducedIn: z.string().optional(),
    lastModified: z.string().optional(),
  }).catchall(z.unknown()).default({}),
});

export type FeatureDefinition = z.infer<typeof FeatureDefinitionSchema>;

export type FeatureVersion = string;
export type RegistryVersion = string;
export type SyncVersion = string;

export type SyncSource = 'deploy' | 'manual' | 'cli' | 'cron' | 'rollback';
export type ActorType = 'SYSTEM' | 'USER' | 'CLI' | 'DEPLOY' | 'CRON';
