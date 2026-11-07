// Pure helpers for scripts/check-readme-sync.mjs (tested in readme-sync.test.mjs).

// Environment variables that come from the platform, not from .env.example.
export const PLATFORM_ENV = new Set([
  'NODE_ENV',
  'CI',
  'NO_COLOR',
  'FORCE_COLOR',
  'VERCEL',
  'VERCEL_ENV',
  'KV_REST_API_URL',
  'KV_REST_API_TOKEN',
]);

export function envNamesInExample(text) {
  const names = [];
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*=/.exec(line);
    if (match) names.push(match[1]);
  }
  return names;
}

// Names read from process.env.X, process.env['X'] or env.X (but not import.meta.env.X).
export function envNamesReadInCode(text) {
  const names = new Set();
  const patterns = [
    /process\.env\.([A-Z][A-Z0-9_]+)/g,
    /process\.env\[['"]([A-Z][A-Z0-9_]+)['"]\]/g,
    /(?<!meta\.)\benv\.([A-Z][A-Z0-9_]{2,})/g,
  ];
  for (const regex of patterns) for (const match of text.matchAll(regex)) names.add(match[1]);
  return [...names];
}

// `npm run <name>` mentions in a document, plus `npm test`.
export function npmScriptsMentioned(text) {
  const names = new Set();
  for (const match of text.matchAll(/npm run ([a-z][a-z0-9:_-]*)/g)) names.add(match[1]);
  if (/\bnpm test\b/.test(text)) names.add('test');
  return [...names];
}

export function readmeMentionsEnv(readme, name) {
  if (readme.includes(name)) return true;
  // Allow documented wildcards such as ELEVENLABS_VOICE_ID_*
  for (const match of readme.matchAll(/`([A-Z][A-Z0-9_]*_)\*`/g)) if (name.startsWith(match[1])) return true;
  return false;
}

export function findSyncProblems({ scripts, readme, envExample, codeEnvNames }) {
  const problems = [];
  const exampleNames = envNamesInExample(envExample);
  const mentioned = npmScriptsMentioned(readme);

  for (const script of scripts) {
    const documented = script === 'test' ? mentioned.includes('test') : readme.includes(`npm run ${script}`);
    if (!documented) problems.push(`README does not document the "${script}" script`);
  }
  for (const name of mentioned) {
    if (!scripts.includes(name))
      problems.push(`README mentions "npm run ${name}", but package.json has no such script`);
  }
  for (const name of exampleNames) {
    if (!readmeMentionsEnv(readme, name)) problems.push(`README does not mention ${name} from .env.example`);
  }
  for (const name of codeEnvNames) {
    if (!PLATFORM_ENV.has(name) && !exampleNames.includes(name)) {
      problems.push(`Code reads ${name}, but .env.example does not define it`);
    }
  }
  if (!readme.includes('## For AI Coding Agents'))
    problems.push('README is missing the "For AI Coding Agents" section');
  return problems;
}
