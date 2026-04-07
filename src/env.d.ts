// Minimal ambient declaration for process.env.NODE_ENV.
// Bundlers (webpack, vite, rollup-replace, etc.) replace this at build time.
// Avoids pulling in @types/node for a browser-targeted library.
declare const process: { env: { NODE_ENV: string } };
