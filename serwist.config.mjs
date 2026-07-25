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
    esbuildOptions: {
      sourcemap: true,
    },
  },
  undefined,
  { isDev: isDevelopment },
);
