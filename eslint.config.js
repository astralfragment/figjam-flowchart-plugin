import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["dist/**", "node_modules/**"]
  },
  {
    files: ["scripts/**/*.mjs", "eslint.config.js"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly"
      }
    },
    rules: {
      "no-undef": "off"
    }
  },
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: false,
        sourceType: "module",
        ecmaVersion: "latest"
      },
      globals: {
        figma: "readonly",
        __html__: "readonly",
        parent: "readonly",
        process: "readonly",
        __dirname: "readonly",
        console: "readonly",
        window: "readonly",
        document: "readonly",
        FileReader: "readonly",
        Blob: "readonly",
        URL: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint
    },
    rules: {
      "no-console": "off",
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-useless-escape": "off",
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
];
