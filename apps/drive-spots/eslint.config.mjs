import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Atomic Design dependency direction (collection/CLAUDE.md):
//   atoms <- molecules <- organisms <- templates
// - molecules must not import other molecules
// - organisms may contain other organisms, but not templates
// Relative imports inside a component directory (./Foo) are intentionally not covered.
const layerRule = (forbidden) => ({
  "no-restricted-imports": [
    "error",
    {
      patterns: forbidden.map((layer) => ({
        group: [`@/components/${layer}/*`],
        message: `Atomic Design: this layer must not import from ${layer}.`,
      })),
    },
  ],
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/components/atoms/**/*.{ts,tsx}"],
    rules: layerRule(["molecules", "organisms", "templates"]),
  },
  {
    files: ["src/components/molecules/**/*.{ts,tsx}"],
    rules: layerRule(["molecules", "organisms", "templates"]),
  },
  {
    files: ["src/components/organisms/**/*.{ts,tsx}"],
    rules: layerRule(["templates"]),
  },
  // Inline HTML (dangerouslySetInnerHTML, e.g. a theme/no-flash <script>) would need its own CSP
  // hash and is banned; scripts/csp/verify-out.mjs still fails the build if an unhashed inline
  // script ever appears in out/.
  { files: ["src/**/*.{ts,tsx}"], rules: { "react/no-danger": "error" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "coverage/**"]),
]);

export default eslintConfig;
