import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { createRequire } from "node:module";
import serverless from "serverless-http";

// Polyfill CommonJS globals that esbuild strips when bundling to ESM.
// These must be set BEFORE the Express app module is imported, because
// app.ts and many dependencies reference __dirname, __filename, or require().
const __filenameLocal = fileURLToPath(import.meta.url);
const __dirnameLocal = dirname(__filenameLocal);
globalThis.__filename ??= __filenameLocal;
globalThis.__dirname ??= __dirnameLocal;
globalThis.require ??= createRequire(import.meta.url);

// Dynamic import ensures the polyfills above are applied before the Express
// module tree is evaluated.
const { default: app } = await import("../artifacts/api-server/src/app.ts");

export default serverless(app);
