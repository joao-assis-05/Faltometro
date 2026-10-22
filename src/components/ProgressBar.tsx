import type { SubjectStatus } from '../types';
import { STATUS_META } from '../utils/calculations';

interface ProgressBarProps {
  /** Faltas contabilizadas */
  used: number;
  /** Máximo de faltas permitido */
  max: number;
  status: SubjectStatus;
  label?: string;
  size?: 'sm' | 'md';
}

const MAX_SLOTS = 40;
const MAX_OVERFLOW_SLOTS = 8;

/**
 * Barra de consumo do limite de faltas.
 * Quando o limite é pequeno o bastante, cada falta permitida vira um "quadradinho"
 * da caderneta — fica visível quantas ainda sobram. Para limites grandes, vira barra contínua.
 */
export function ProgressBar({ used, max, status, label, size = 'md' }: ProgressBarProps) {
  const meta = STATUS_META[status];
  const height = size === 'sm' ? 'h-2' : 'h-3';
  const percent = max > 0 ? Math.min(100, (used / max) * 100) : used > 0 ? 100 : 0;
  const aria = {
    role: 'progressbar' as const,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-valuenow': Math.min(used, max),
    'aria-label': label ?? `${used} de ${max} faltas usadas`,
  };

  if (max > 0 && max <= MAX_SLOTS) {
    const overflow = Math.min(MAX_OVERFLOW_SLOTS, Math.ceil(Math.max(0, used - max)));
    return (
      <div className="flex items-center gap-[3px]" {...aria}>
        {Array.from({ length: max }, (_, i) => {
          const fill = Math.min(1, Math.max(0, used - i));
          return (
            <span
              key={i}
              className={`relative ${height} min-w-0 flex-1 overflow-hidden rounded-[3px] ${meta.slotEmpty}`}
            >
              {fill > 0 && (
                <span
                  className={`absolute inset-y-0 left-0 ${meta.bar} transition-[width] duration-500`}
                  style={{ width: `${fill * 100}%` }}
                />
              )}
            </span>
          );
        })}
        {overflow > 0 && (
          <>
            <span className={`mx-0.5 ${size === 'sm' ? 'h-3' : 'h-4'} w-px bg-ink-400`} />
            {Array.from({ length: overflow }, (_, i) => (
              <span
                key={`o${i}`}
                className={`${height} w-2 shrink-0 rounded-[3px] bg-[repeating-linear-gradient(135deg,theme(colors.purple.600)_0_2px,transparent_2px_4px)]`}
              />
            ))}
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${height} w-full overflow-hidden rounded-full ${meta.slotEmpty}`} {...aria}>
      <div
        className={`h-full rounded-full ${meta.bar} transition-[width] duration-500`}
        style={{ width: `${percent}%` }}
      />
      <span className="absolute inset-y-0 left-1/2 w-px bg-white/70 dark:bg-ink-950/70" />
      <span className="absolute inset-y-0 left-[80%] w-px bg-white/70 dark:bg-ink-950/70" />
    </div>
  );
}
