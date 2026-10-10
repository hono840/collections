import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Atomic Design dependency direction (architecture doc 2.2):
//   atoms <- molecules <- organisms <- templates
// - molecules must not import other molecules
// - organisms may contain other organisms, but not templates
// - only organisms (and app/) may import data/hooks (@/features)
// Relative imports inside a component directory (./Foo) are intentionally not covered.
const layerRule = (forbidden, extra = []) => ({
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        ...forbidden.map((layer) => ({
          group: [`@/components/${layer}/*`],
          message: `Atomic Design: this layer must not import from ${layer}.`,
        })),
        ...extra,
      ],
    },
  ],
});

const noData = [
  {
    group: ["@/features/*"],
    message: "Only organisms (and app/) may touch data/actions.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/components/atoms/**/*.{ts,tsx}"],
    rules: layerRule(["molecules", "organisms", "templates"], noData),
  },
  {
    files: ["src/components/molecules/**/*.{ts,tsx}"],
    rules: layerRule(["molecules", "organisms", "templates"], noData),
  },
  {
    files: ["src/components/organisms/**/*.{ts,tsx}"],
    rules: layerRule(["templates"]),
  },
  {
    files: ["src/components/templates/**/*.{ts,tsx}"],
    rules: layerRule([], noData),
  },
  // Inline HTML would need its own CSP hash. No file may use it (the theme script was removed, C-09);
  // scripts/csp/verify-out.mjs still fails the build if any unhashed inline script appears.
  { files: ["src/**/*.{ts,tsx}"], rules: { "react/no-danger": "error" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
