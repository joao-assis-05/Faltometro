import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

export function Modal({ open, onClose, title, description, icon, children, footer, size = 'md' }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);

    // foca o primeiro campo do modal
    requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'input:not([type=hidden]), select, textarea, button[data-autofocus]',
      );
      (first ?? panelRef.current)?.focus();
    });

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="absolute inset-0 animate-fade-in bg-ink-950/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative flex max-h-[92dvh] w-full animate-sheet-up flex-col rounded-t-3xl bg-white shadow-2xl outline-none ring-1 ring-ink-900/5 dark:bg-ink-900 dark:ring-white/10 sm:rounded-3xl ${
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-ink-200 dark:bg-ink-700 sm:hidden" />
        <header className="flex items-start gap-3 px-5 pb-3 pt-4 sm:px-6 sm:pt-6">
          {icon && (
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-caneta-500/10 text-caneta-600 dark:text-caneta-400">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-xl font-bold leading-tight tracking-tight">
              {title}
            </h2>
            {description && <div className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{description}</div>}
          </div>
          <button type="button" onClick={onClose} className="icon-btn -mr-2 -mt-1" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-ink-800 sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
