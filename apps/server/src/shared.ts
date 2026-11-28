/**
 * The shared package, imported by relative path. Vercel compiles each function's TypeScript files to .js and
 * rewrites relative `.ts` imports (rewriteRelativeImportExtensions), but a workspace package whose `exports`
 * point at a `.ts` file cannot be resolved there. Server code imports shared types and schemas from here.
 */
export * from '../../../packages/shared/src/index.ts';
