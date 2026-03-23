import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  // 核心：让 ESLint 忽略编译产物和自动生成的路由树
  { ignores: ["dist", "src/routeTree.gen.ts", "vitest.config.ts"] },
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        // 新增下面这一行，将 tsconfig 的解析根目录锁定在当前前端子包
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "react-hooks/incompatible-library": "off",
    },
  },
])
