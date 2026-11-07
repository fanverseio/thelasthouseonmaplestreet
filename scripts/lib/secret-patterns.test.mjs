import { describe, expect, it } from 'vitest';
import { findNonEmptySecretsInEnvExample, isForbiddenEnvFile, scanText } from './secret-patterns.mjs';

// Fake credentials are assembled at runtime so this file never contains a matching string.
const fake = (prefix, length, alphabet = 'abcdef0123456789') =>
  prefix + Array.from({ length }, (_, i) => alphabet[i % alphabet.length]).join('');

describe('scanText', () => {
  it.each([
    ['OpenAI-style key', fake('sk' + '-', 32, 'AbCdEf123')],
    ['xAI key', fake('xai' + '-', 32, 'AbCdEf123')],
    ['ElevenLabs key', fake('sk' + '_', 40)],
    ['Bearer token', 'Authorization: ' + 'Bear' + 'er ' + fake('', 40, 'AbCd123')],
    ['Private key', '-----BEGIN ' + 'PRIVATE KEY-----'],
  ])('detects a planted %s', (name, secret) => {
    const findings = scanText(`const x = 1;\nconst key = "${secret}";\n`);
    expect(findings.map((f) => f.name)).toContain(name);
    expect(findings[0].line).toBe(2);
  });

  it('ignores ordinary code and documentation', () => {
    const text = [
      'LLM_API_KEY=',
      'Never log keys (`sk-`, `xai-`, `Bearer `).',
      'git clone https://github.com/fanverseio/thelasthouseonmaplestreet.git',
      'phase (menu/playing/paused/locket/cutscene/ended)',
    ].join('\n');
    expect(scanText(text)).toEqual([]);
  });
});

describe('isForbiddenEnvFile', () => {
  it.each(['.env', '.env.local', 'apps/server/.env', '.env.production'])('forbids %s', (file) => {
    expect(isForbiddenEnvFile(file)).toBe(true);
  });
  it.each(['.env.example', 'README.md', 'env.ts', 'src/.envrc.md'])('allows %s', (file) => {
    expect(isForbiddenEnvFile(file)).toBe(false);
  });
});

describe('findNonEmptySecretsInEnvExample', () => {
  it('flags filled-in secrets but not ordinary defaults', () => {
    const text = ['APP_MODE=local', 'PORT=3000', 'LLM_API_KEY=', 'SESSION_SECRET=abc', 'UPSTASH_REDIS_REST_TOKEN=  # set in Vercel'].join('\n');
    expect(findNonEmptySecretsInEnvExample(text)).toEqual([{ line: 4, name: 'SESSION_SECRET' }]);
  });
});
