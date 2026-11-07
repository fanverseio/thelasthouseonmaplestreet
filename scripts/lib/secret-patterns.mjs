// Patterns for credentials that must never be committed. Kept specific to avoid noisy false positives.
export const SECRET_PATTERNS = [
  { name: 'OpenAI-style key', regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/ },
  { name: 'Anthropic key', regex: /\bsk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: 'xAI key', regex: /\bxai-[A-Za-z0-9]{20,}/ },
  { name: 'Google API key', regex: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'ElevenLabs key', regex: /\bsk_[a-f0-9]{32,}\b/ },
  { name: 'Upstash token', regex: /\bA[A-Za-z0-9]{3}AAIj[A-Za-z0-9_-]{20,}/ },
  { name: 'Bearer token', regex: /\bBearer\s+[A-Za-z0-9._~+/-]{24,}/ },
  { name: 'Private key', regex: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
];

// Environment files that may contain real values. Only the example file may be committed.
export function isForbiddenEnvFile(filePath) {
  const base = filePath.split(/[\\/]/).pop() ?? '';
  return (base === '.env' || base.startsWith('.env.')) && base !== '.env.example';
}

// Values in .env.example must be empty or obvious placeholders.
export function findNonEmptySecretsInEnvExample(text) {
  const problems = [];
  const sensitive = /(KEY|TOKEN|SECRET|HASHES)$/;
  text.split(/\r?\n/).forEach((line, index) => {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) return;
    const [, name, rawValue] = match;
    // A value that is only a comment (`KEY=  # note`) counts as empty.
    const value = rawValue.replace(/(?:^|\s+)#.*$/, '').trim();
    if (sensitive.test(name) && value !== '') problems.push({ line: index + 1, name });
  });
  return problems;
}

export function scanText(text) {
  const findings = [];
  text.split(/\r?\n/).forEach((line, index) => {
    for (const { name, regex } of SECRET_PATTERNS) {
      if (regex.test(line)) findings.push({ line: index + 1, name });
    }
  });
  return findings;
}
