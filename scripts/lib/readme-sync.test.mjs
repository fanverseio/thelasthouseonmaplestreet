import { describe, expect, it } from 'vitest';
import { envNamesReadInCode, findSyncProblems, npmScriptsMentioned, readmeMentionsEnv } from './readme-sync.mjs';

const readme = ['## For AI Coding Agents', 'Run `npm run dev`, `npm test`.', 'Set `PORT` and `ELEVENLABS_VOICE_ID_*`.'].join('\n');

describe('envNamesReadInCode', () => {
  it('finds process.env and env.X reads but not import.meta.env', () => {
    const code = "process.env.PORT; process.env['APP_MODE']; env.CLIENT_PORT; import.meta.env.DEV;";
    expect(envNamesReadInCode(code).sort()).toEqual(['APP_MODE', 'CLIENT_PORT', 'PORT']);
  });
});

describe('npmScriptsMentioned', () => {
  it('collects npm run commands and npm test', () => {
    expect(npmScriptsMentioned(readme).sort()).toEqual(['dev', 'test']);
  });
});

describe('readmeMentionsEnv', () => {
  it('supports documented wildcards', () => {
    expect(readmeMentionsEnv(readme, 'ELEVENLABS_VOICE_ID_ANGEL')).toBe(true);
    expect(readmeMentionsEnv(readme, 'LLM_API_KEY')).toBe(false);
  });
});

describe('findSyncProblems', () => {
  it('passes when everything matches', () => {
    expect(
      findSyncProblems({ scripts: ['dev', 'test'], readme, envExample: 'PORT=3000\n', codeEnvNames: ['PORT', 'CI'] }),
    ).toEqual([]);
  });

  it('reports undocumented scripts, phantom commands and missing env names', () => {
    const problems = findSyncProblems({
      scripts: ['dev', 'test', 'lint'],
      readme: readme + '\nThen `npm run deploy`.',
      envExample: 'PORT=3000\nLLM_API_KEY=\n',
      codeEnvNames: ['PORT', 'SECRET_THING'],
    });
    expect(problems).toEqual([
      'README does not document the "lint" script',
      'README mentions "npm run deploy", but package.json has no such script',
      'README does not mention LLM_API_KEY from .env.example',
      'Code reads SECRET_THING, but .env.example does not define it',
    ]);
  });

  it('requires the For AI Coding Agents section', () => {
    expect(findSyncProblems({ scripts: [], readme: 'nothing', envExample: '', codeEnvNames: [] })).toContain(
      'README is missing the "For AI Coding Agents" section',
    );
  });
});
