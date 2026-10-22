import { CheckCircle2, Undo2, X } from 'lucide-react';

export interface ToastData {
  id: number;
  message: string;
  tone?: 'default' | 'error';
  onUndo?: () => void;
}

interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        key={toast.id}
        role="status"
        className={`pointer-events-auto flex w-full max-w-md animate-sheet-up items-center gap-3 rounded-2xl px-4 py-3 text-sm shadow-xl ${
          toast.tone === 'error' ? 'bg-rose-600 text-white' : 'bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900'
        }`}
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 opacity-80" />
        <p className="min-w-0 flex-1">{toast.message}</p>
        {toast.onUndo && (
          <button
            type="button"
            onClick={() => {
              toast.onUndo?.();
              onDismiss();
            }}
            className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 font-semibold text-caneta-400 hover:bg-white/10 dark:text-caneta-600 dark:hover:bg-ink-900/10"
          >
            <Undo2 className="h-4 w-4" />
            Desfazer
          </button>
        )}
        <button type="button" onClick={onDismiss} className="shrink-0 rounded-lg p-1 opacity-60 hover:opacity-100" aria-label="Fechar aviso">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
