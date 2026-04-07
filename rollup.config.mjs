import { defineConfig } from "rollup";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
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
          file: "dist/index.mjs",
          sourcemap: true,
          format: "esm",
        },
      ],
      external: [
        "react",
      ],
      plugins: [
        nodeResolve({
          browser: true,
          exportConditions: ["browser", "import", "default"],
        }),
        commonjs(),
        typescript(),
        terser(),
      ],
    },
  ];
});
