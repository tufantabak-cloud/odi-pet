import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-*/**",
    ".next-e2e/**",
    ".claude/**",
    ".agents/**",
    "out/**",
    "build/**",
    "public/sw.js",
    "public/sw.js.map",
    "next-env.d.ts",
    "test_query.mjs",
    "db_proof.mjs",
    "query.mjs",
    "openapi_proof.mjs",
    "openapi_test.mjs",
    "scratch/**",
    "scripts/**",
    "coverage/**",
    "list_models.js",
    "apply-migration*.js",
    "check-*.js",
    "count_species.js",
    "fix_imports.js",
    "inject.js",
    "replace.js",
    "run_migration.js",
    "test-*.js",
    "test_*.js",
    "update_*.js",
    "src/**/run_db_migration.js",
  ]),
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-unused-vars": "off",
      "@next/next/no-img-element": "off",
      "react/no-unescaped-entities": "off",
      "jsx-a11y/alt-text": "off",
      "react-hooks/exhaustive-deps": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
      "react-hooks/incompatible-library": "off",
      "prefer-const": "off"
    }
  }
]);

export default eslintConfig;
