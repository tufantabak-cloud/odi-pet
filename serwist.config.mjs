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
