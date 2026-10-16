import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/** Bottom sheet modal. Stays mounted briefly after close so it can animate out. */
export function Sheet({ open, onClose, title, children }: Props) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => setMounted(false), 220);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal aria-label={title}>
      <button
        aria-label="Close"
        className={`absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-200 ${closing ? 'opacity-0' : 'animate-fade-in'}`}
        onClick={onClose}
      />
      <div
        className={`relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-surface px-5 pt-3 shadow-2xl transition-transform duration-200 ${closing ? 'translate-y-full' : 'animate-sheet-up'}`}
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 20px)' }}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line/15" />
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">{title}</h2>
            <button onClick={onClose} className="tap grid h-9 w-9 place-items-center rounded-full bg-elevated text-muted" aria-label="Close">
              <Icon name="x" size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
