import { defineConfig } from "rollup";
import typescript from '@rollup/plugin-typescript';
import terser from "@rollup/plugin-terser";

export default defineConfig(() => {
  return [
    {
      input: "src/index.ts",
      output: [
        {
          file: "dist/index.cjs",
          sourcemap: true,
          format: "cjs",
        },
        {
          file: "dist/index.js",
          sourcemap: true,
          format: "esm",
        },
      ],
      external: [
        "react-reconciler",
        "react-reconciler/constants",
        "react-is",
        "react",
      ],
      plugins: [typescript(), terser()],
    },
  ];
});
