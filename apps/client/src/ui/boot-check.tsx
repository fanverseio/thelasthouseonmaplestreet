import { APP_NAME, APP_VERSION, type ConfigStatusResponse, type HealthResponse } from '@tlh/shared';
import { useEffect, useState } from 'react';
import { TestScene } from '../scene/test-scene.tsx';
import { fetchConfigStatus, fetchHealth } from '../services/api-client.ts';

type Check<T> = { state: 'pending' } | { state: 'ok'; value: T } | { state: 'error'; message: string };

function hasWebGL2(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

/**
 * Developer boot check: shows that the client, the local API and WebGL all work.
 * The game's real start (warning screen and menu) replaces this in tasks.md task 2.9.
 */
export function BootCheck() {
  const [health, setHealth] = useState<Check<HealthResponse>>({ state: 'pending' });
  const [status, setStatus] = useState<Check<ConfigStatusResponse>>({ state: 'pending' });
  const [webgl] = useState(hasWebGL2);

  useEffect(() => {
    const controller = new AbortController();
    const fail = (error: unknown) => ({ state: 'error' as const, message: (error as Error).message });
    fetchHealth(controller.signal).then(
      (value) => setHealth({ state: 'ok', value }),
      (error: unknown) => !controller.signal.aborted && setHealth(fail(error)),
    );
    fetchConfigStatus(controller.signal).then(
      (value) => setStatus({ state: 'ok', value }),
      (error: unknown) => !controller.signal.aborted && setStatus(fail(error)),
    );
    return () => controller.abort();
  }, []);

  const apiText =
    health.state === 'ok'
      ? `ok (v${health.value.version}, ${health.value.mode} mode)`
      : health.state === 'error'
        ? `unreachable: ${health.message}`
        : 'checking...';

  const aiText =
    status.state === 'ok'
      ? status.value.aiAvailable && status.value.provider
        ? `configured (${status.value.provider.protocol}, ${status.value.provider.model})`
        : status.value.aiAvailable
          ? 'configured'
          : 'not configured (Classic Mode only)'
      : status.state === 'error'
        ? 'unknown'
        : 'checking...';

  return (
    <main className="boot">
      <section className="boot__panel" aria-labelledby="boot-title">
        <h1 id="boot-title">{APP_NAME}</h1>
        <p>Development build {APP_VERSION}. Foundations only: the game itself is not playable yet.</p>
        <dl className="boot__status" aria-live="polite">
          <dt>Client</dt>
          <dd className="status--ok">ok</dd>
          <dt>API</dt>
          <dd className={health.state === 'error' ? 'status--bad' : health.state === 'ok' ? 'status--ok' : ''}>
            {apiText}
          </dd>
          <dt>AI provider</dt>
          <dd>{aiText}</dd>
          <dt>WebGL 2</dt>
          <dd className={webgl ? 'status--ok' : 'status--bad'}>
            {webgl ? 'available' : 'not available: use desktop Chrome, Edge or Firefox'}
          </dd>
        </dl>
      </section>
      {webgl && (
        <figure className="boot__scene" role="img" aria-label="Test scene: a dark box lit by a warm lamp in fog">
          <TestScene />
        </figure>
      )}
    </main>
  );
}
