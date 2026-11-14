import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { plugin as shadcn } from "@shadcn/lint";

// eslint-config-next 16 ships flat configs; FlatCompat (template default) fails with it.
const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  { ignores: [".next/**", "node_modules/**", "test-results/**", "playwright-report/**", "next-env.d.ts"] },
  // Design-system rules (DESIGN.md > Enforcement). Colours, sizes and radii come from tokens only.
  {
    files: ["app/**/*.tsx", "components/**/*.tsx"],
    ignores: ["components/ui/**"],
    plugins: { shadcn },
    settings: {
      shadcn: {
        mergeFunctions: ["cn"],
        note: "See design/DESIGN.md: use token utilities (bg-bg-*, text-text-*, rounded-element, text-heading-1, figures).",
      },
    },
    rules: {
      "shadcn/no-raw-colors": "error",
      "shadcn/no-arbitrary-values": "warn",
      "shadcn/no-unknown-classes": "warn",
      "shadcn/require-static-classes": "warn",
    },
  },
];

export default eslintConfig;
