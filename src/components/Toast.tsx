import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

interface ToastOpts {
  message: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

const ToastCtx = createContext<(t: ToastOpts) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOpts & { key: number }) | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((t: ToastOpts) => {
    window.clearTimeout(timer.current);
    setToast({ ...t, key: Date.now() });
    timer.current = window.setTimeout(() => setToast(null), t.duration ?? 3200);
  }, []);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
        style={{ bottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 84px)' }}
        aria-live="polite"
      >
        {toast && (
          <div key={toast.key} className="pointer-events-auto flex animate-fade-up items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-bg shadow-xl">
            <Icon name="check" size={18} />
            <span>{toast.message}</span>
            {toast.action && (
              <button
                className="tap -my-1 ml-1 rounded-lg px-2 py-1 font-semibold underline-offset-2 hover:underline"
                onClick={() => {
                  toast.action!.onClick();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}
