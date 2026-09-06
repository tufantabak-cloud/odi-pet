// @ts-check
import { serwist } from "@serwist/next/config";

const isDevelopment =
  process.env.NODE_ENV === "development" ||
  process.env.npm_lifecycle_event === "dev";

export default serwist(
  {
    swSrc: "src/sw.ts",
    swDest: "public/sw.js",
    globIgnores: [
      "public/**/*.html",
      "public/**/*.md",
      "public/**/*.json",
      "public/**/source.svg",
      "public/**/README*",
      "public/**/export/**",
      "public/**/preview.png",
      "**/*.map",
    ],
    manifestTransforms: [
      (entries) => ({
        manifest: entries.filter((entry) => {
          const normalizedUrl = entry.url.replaceAll("\\", "/");

          // Next.js App Router does not serve Pages router SSG manifests and developer docs
          if (
            normalizedUrl.includes("_ssgManifest") ||
            normalizedUrl.includes("_buildManifest") ||
            normalizedUrl.includes("_clientMiddlewareManifest") ||
            normalizedUrl.endsWith(".md") ||
            normalizedUrl.endsWith(".json") ||
            normalizedUrl.endsWith(".map") ||
            normalizedUrl.endsWith("source.svg")
          ) {
            return false;
          }

          // Route handler chunks, admin chunks, and dynamic/authenticated app pages must NEVER be precached.
          // They are dynamic, may return 404 if deleted/split, and are loaded on-demand by Next.js at runtime.
          if (
            normalizedUrl.includes("/chunks/app/api/") ||
            normalizedUrl.includes("/chunks/app/admin/") ||
            normalizedUrl.includes("/chunks/app/clinic/") ||
            normalizedUrl.includes("/chunks/app/owner/") ||
            normalizedUrl.includes("/chunks/app/caregiver/") ||
            normalizedUrl.includes("/chunks/app/hotel/") ||
            normalizedUrl.includes("/chunks/app/groomer/") ||
            normalizedUrl.includes("/chunks/app/trainer/") ||
            normalizedUrl.includes("/chunks/app/sitter/") ||
            normalizedUrl.includes("/chunks/app/sos/") ||
            normalizedUrl.includes("/chunks/app/invite/") ||
            normalizedUrl.includes("/chunks/app/register/") ||
            normalizedUrl.includes("/chunks/app/login/") ||
            normalizedUrl.includes("/chunks/app/reset-password/") ||
            normalizedUrl.includes("/chunks/app/update-password/") ||
            normalizedUrl.includes("/chunks/app/legal/") ||
            normalizedUrl.includes("/chunks/app/plan-yap/")
          ) {
            return false;
          }

          const isPrerenderedPage =
            /\/server\/(?:app|pages)\/.*\.html$/.test(normalizedUrl);

          if (!isPrerenderedPage) return true;

          // Authenticated and request-dependent pages must never be precached.
          // Keep only the static document used as the navigation fallback.
          return /\/server\/app\/offline\.html$/.test(normalizedUrl);
        }),
        warnings: [],
      }),
    ],
    esbuildOptions: {
      sourcemap: false,
    },
  },
  undefined,
  { isDev: isDevelopment },
);
