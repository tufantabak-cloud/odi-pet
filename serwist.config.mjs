// @ts-check
import { serwist } from "@serwist/next/config";

const isDevelopment =
  process.env.NODE_ENV === "development" ||
  process.env.npm_lifecycle_event === "dev";

export default serwist(
  {
    swSrc: "src/sw.ts",
    swDest: "public/sw.js",
    globIgnores: ["public/**/*.html"],
    manifestTransforms: [
      (entries) => ({
        manifest: entries.filter((entry) => {
          const normalizedUrl = entry.url.replaceAll("\\", "/");
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
      sourcemap: true,
    },
  },
  undefined,
  { isDev: isDevelopment },
);
