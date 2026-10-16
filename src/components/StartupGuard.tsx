import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { db } from '@/db/db';

/**
 * Keeps a startup failure from turning into a silent black screen.
 * - DbGate opens IndexedDB up front. If Safari refuses (e.g. "Block All Cookies"
 *   is on) or the open hangs, it explains what happened instead of waiting forever.
 * - AppErrorBoundary catches any render crash and shows the error.
 */

const DB_OPEN_TIMEOUT_MS = 6000;

async function repairAndReload() {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? [];
    await Promise.all(regs.map((r) => r.unregister()));
    const keys = (await caches?.keys?.()) ?? [];
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    /* best effort */
  }
  location.reload();
}

function FatalScreen({ title, body, detail }: { title: string; body: ReactNode; detail?: string }) {
  return (
    <div
      className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-6"
      style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
      role="alert"
    >
      <div className="card">
        <p className="label mb-2 text-danger">Ledger couldn’t start</p>
        <h1 className="font-display text-2xl font-bold leading-tight">{title}</h1>
        <div className="mt-3 space-y-2 text-sm text-muted">{body}</div>
        {detail && <pre className="mt-4 whitespace-pre-wrap break-words rounded-2xl bg-elevated p-3 text-xs text-muted">{detail}</pre>}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="btn-primary" onClick={() => location.reload()}>Reload</button>
          <button className="btn-ghost" onClick={repairAndReload}>Repair</button>
        </div>
        <p className="mt-3 text-xs text-muted">“Repair” clears the offline cache only. Your logged data is not touched.</p>
      </div>
    </div>
  );
}

const describe = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e));

export function DbGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'opening' | 'ready' | { error: string; timedOut: boolean }>('opening');

  useEffect(() => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) setState({ error: `Opening the on-device database took longer than ${DB_OPEN_TIMEOUT_MS / 1000}s.`, timedOut: true });
    }, DB_OPEN_TIMEOUT_MS);
    db.open()
      .then(() => {
        done = true;
        clearTimeout(timer);
        setState('ready');
      })
      .catch((e) => {
        done = true;
        clearTimeout(timer);
        setState({ error: describe(e), timedOut: false });
      });
    return () => clearTimeout(timer);
  }, []);

  if (state === 'ready') return <>{children}</>;
  if (state === 'opening') {
    return (
      <div className="grid min-h-[100dvh] place-items-center" aria-busy="true" aria-label="Loading Ledger">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-line/10 border-t-weight" />
      </div>
    );
  }
  return (
    <FatalScreen
      title="Safari isn’t letting Ledger store data"
      body={
        <>
          <p>Ledger keeps everything on this phone in the browser’s storage, and Safari {state.timedOut ? 'didn’t respond' : 'refused access'}. Usually one of these fixes it:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b className="text-ink">Settings → Apps → Safari</b> → turn <b className="text-ink">off</b> “Block All Cookies” (it also blocks app storage).
            </li>
            <li>Don’t use a Private Browsing tab.</li>
            <li>Fully close Safari or the Ledger app (swipe it away), then open it again.</li>
          </ul>
        </>
      }
      detail={state.error}
    />
  );
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Ledger crashed', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <FatalScreen
        title="Something went wrong"
        body={<p>The app hit an unexpected error. Reloading usually fixes it. If it keeps happening, send a screenshot of the details below.</p>}
        detail={describe(this.state.error)}
      />
    );
  }
}
