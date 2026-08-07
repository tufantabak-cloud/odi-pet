import { FeatureDefinition, FeatureDefinitionSchema } from './types';
import { features as autoLoadedFeatures } from './generated';
import { createHash } from 'crypto';

const registry = new Map<string, FeatureDefinition>();

export function registerFeature(definition: unknown): void {
  // 1. Zod Validation
  const result = FeatureDefinitionSchema.safeParse(definition);
  
  if (!result.success) {
    throw new Error(`Invalid feature definition: ${result.error.message}`);
  }

  const validFeature = result.data;
  const key = validFeature.key;

  // 2. Duplicate Detection
  if (registry.has(key)) {
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      throw new Error(`Feature with key '${key}' is already registered.`);
    } else {
      console.warn(`[FeatureRegistry] Warning: Feature '${key}' is already registered. Keeping the first definition.`);
      return; // Keep the first definition in production
    }
  }

  registry.set(key, validFeature);
}

/**
 * Validates feature dependencies recursively using Depth-First Search (DFS)
 * and detects circular dependencies (cycles).
 */
export function validateDependencies(): void {
  const errors: string[] = [];

  // Helper for DFS cycle detection
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(key: string, path: string[]): boolean {
    visited.add(key);
    recursionStack.add(key);

    const feature = registry.get(key);
    if (feature && feature.dependsOn && feature.dependsOn.length > 0) {
      for (const dep of feature.dependsOn) {
        if (!registry.has(dep)) {
          errors.push(`Feature '${key}' depends on non-existent feature '${dep}'`);
        } else {
          const depFeature = registry.get(dep)!;
          if (depFeature.state === 'DISABLED' || depFeature.state === 'DEPRECATED') {
            console.warn(`[FeatureRegistry] Warning: Feature '${key}' depends on '${dep}' which is ${depFeature.state}.`);
          }

          if (recursionStack.has(dep)) {
            const cyclePath = [...path, key, dep].join(' -> ');
            errors.push(`Circular dependency detected: ${cyclePath}`);
          } else if (!visited.has(dep)) {
            dfs(dep, [...path, key]);
          }
        }
      }
    }

    recursionStack.delete(key);
    return true;
  }

  for (const [key] of registry.entries()) {
    if (!visited.has(key)) {
      dfs(key, []);
    }
  }
  
  if (errors.length > 0) {
    const errorMsg = `Registry dependency validation failed:\n${errors.join('\n')}`;
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      throw new Error(errorMsg);
    } else {
      console.error(`[FeatureRegistry] ${errorMsg}`);
    }
  }
}

/**
 * Deterministically sorts object keys for canonical JSON serialization.
 */
function canonicalize(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(canonicalize);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result: Record<string, any> = {};
  for (const key of sortedKeys) {
    result[key] = canonicalize(obj[key]);
  }
  return result;
}

/**
 * Calculates a SHA-256 hash of the canonicalized registry content.
 * Guarantees that insertion order does not affect the hash output.
 */
export function getCanonicalRegistryHash(): string {
  const sortedFeatures = Array.from(registry.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(canonicalize);

  const canonicalJson = JSON.stringify(sortedFeatures);
  return createHash('sha256').update(canonicalJson).digest('hex');
}

export function getFeature(key: string): FeatureDefinition | undefined {
  return registry.get(key);
}

export function hasFeature(key: string): boolean {
  return registry.has(key);
}

export function getAllRegisteredFeatures(): FeatureDefinition[] {
  return Array.from(registry.values());
}

/**
 * Bootstraps the registry by loading the generated index.
 */
export function initializeRegistry(): void {
  registry.clear(); // Reset for tests or HMR
  autoLoadedFeatures.forEach((feature) => {
    try {
      registerFeature(feature);
    } catch (error) {
      console.error(`[FeatureRegistry] Failed to register auto-loaded feature:`, error);
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        throw error;
      }
    }
  });
  
  validateDependencies();
}

// Auto-initialize when the module is imported
initializeRegistry();

export const featureRegistry = registry;
