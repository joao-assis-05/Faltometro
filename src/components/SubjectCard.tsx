import { Calculator, CalendarPlus, Clock, History, MapPin, Pencil, Plus, Trash2, User } from 'lucide-react';
import type { LogTab, Subject, SubjectStats } from '../types';
import { STATUS_META, amountWithUnit, formatAmount, formatPercent, unitLabel } from '../utils/calculations';
import { WEEKDAYS_SHORT } from '../utils/date';
import { ProgressBar } from './ProgressBar';

interface SubjectCardProps {
  subject: Subject;
  stats: SubjectStats;
  /** Destaca o card logo após um lançamento rápido */
  justStamped?: boolean;
  onQuickAbsence: (subject: Subject) => void;
  onOpenLog: (subject: Subject, tab: LogTab) => void;
  onSimulate: (subject: Subject) => void;
  onEdit: (subject: Subject) => void;
  onDelete: (subject: Subject) => void;
}

function statusMessage(stats: SubjectStats, subject: Subject): string {
  const unit = subject.workloadUnit;
  switch (stats.status) {
    case 'failed':
      return `Limite ultrapassado em ${amountWithUnit(unit, stats.exceededBy)}. Procure a coordenação sobre abono ou reposição.`;
    case 'critical':
      return stats.remainingAbsences === 0
        ? 'Você está exatamente no limite. Qualquer nova falta reprova.'
        : `Risco alto: só ${stats.remainingAbsences === 1 ? 'resta' : 'restam'} ${amountWithUnit(unit, stats.remainingAbsences)} antes de reprovar.`;
    case 'warning':
      return `Você já usou ${Math.round(stats.limitUsedPercent)}% do limite de faltas.`;
    default:
      return stats.countedAbsences === 0
        ? 'Nenhuma falta contabilizada até agora.'
        : `Tranquilo: ainda dá para faltar ${amountWithUnit(unit, stats.remainingAbsences)}.`;
  }
}

export function SubjectCard({
  subject,
  stats,
  justStamped,
  onQuickAbsence,
  onOpenLog,
  onSimulate,
  onEdit,
  onDelete,
}: SubjectCardProps) {
  const meta = STATUS_META[stats.status];
  const today = new Date().getDay();
  const unit = subject.workloadUnit;
  const schedule = [...subject.schedule].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
  const hasClassToday = schedule.some((s) => s.day === today);

  return (
    <article
      className={`panel relative flex flex-col overflow-hidden pl-1.5 before:absolute before:inset-y-0 before:left-0 before:w-1.5 ${meta.accent}`}
    >
      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        {/* Cabeçalho */}
        <header className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${meta.badge}`}>
                <span aria-hidden>{meta.emoji}</span>
                {meta.label}
              </span>
              {hasClassToday && (
                <span className="rounded-full bg-caneta-500/10 px-2 py-0.5 text-xs font-bold text-caneta-600 dark:text-caneta-400">
                  Tem aula hoje
                </span>
              )}
            </div>
            <h3 className="mt-2 font-display text-xl font-bold leading-tight tracking-tight">{subject.name}</h3>
            {(subject.professor || subject.room) && (
              <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-ink-500 dark:text-ink-400">
                {subject.professor && (
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {subject.professor}
                  </span>
                )}
                {subject.room && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {subject.room}
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="-mr-2 -mt-1 flex shrink-0">
            <button type="button" className="icon-btn" onClick={() => onEdit(subject)} aria-label={`Editar ${subject.name}`} title="Editar disciplina">
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="icon-btn hover:!bg-rose-50 hover:!text-rose-600 dark:hover:!bg-rose-500/10"
              onClick={() => onDelete(subject)}
              aria-label={`Excluir ${subject.name}`}
              title="Excluir disciplina"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Horários */}
        {schedule.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Horários">
            {schedule.map((slot) => (
              <li
                key={slot.id}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${
                  slot.day === today
                    ? 'bg-caneta-500 text-white'
                    : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'
                }`}
              >
                <Clock className="h-3 w-3" />
                {WEEKDAYS_SHORT[slot.day]} {slot.start}–{slot.end}
              </li>
            ))}
          </ul>
        )}

        {/* Frequência + consumo do limite */}
        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className={`font-display text-4xl font-extrabold leading-none tracking-tight ${meta.text} ${justStamped ? 'animate-stamp' : ''}`}>
                {formatPercent(stats.frequency)}
              </p>
              <p className="mt-1 text-xs font-medium text-ink-500 dark:text-ink-400">de frequência</p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold leading-none">
                {stats.status === 'failed' ? `+${formatAmount(stats.exceededBy)}` : formatAmount(stats.remainingAbsences)}
              </p>
              <p className="mt-1 text-xs font-medium text-ink-500 dark:text-ink-400">
                {stats.status === 'failed'
                  ? `${unitLabel(unit, stats.exceededBy)} além do limite`
                  : `${unitLabel(unit, stats.remainingAbsences)} ${stats.remainingAbsences === 1 ? 'restante' : 'restantes'}`}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <ProgressBar used={stats.countedAbsences} max={stats.maxAbsences} status={stats.status} />
            <div className="mt-1.5 flex justify-between text-xs text-ink-500 dark:text-ink-400">
              <span>
                {formatAmount(stats.countedAbsences)} de {amountWithUnit(unit, stats.maxAbsences)} usadas
              </span>
              <span>
                limite {subject.absenceLimitPercent}% de {formatAmount(subject.totalClasses)}
                {unit === 'horas' ? 'h' : ''}
              </span>
            </div>
          </div>

          {stats.excusedAbsences > 0 && (
            <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
              + {amountWithUnit(unit, stats.excusedAbsences)} {stats.excusedAbsences === 1 ? 'abonada' : 'abonadas'} (não contam no limite)
            </p>
          )}
        </div>

        <p className={`rounded-xl px-3 py-2 text-sm ${meta.soft}`}>{statusMessage(stats, subject)}</p>
      </div>

      {/* Ações */}
      <footer className="flex items-center gap-2 border-t border-ink-100 p-3 dark:border-ink-800 sm:px-5">
        <button type="button" className="btn-primary flex-1 sm:flex-none" onClick={() => onQuickAbsence(subject)}>
          <Plus className="h-4 w-4" />
          1 falta
        </button>
        <button type="button" className="btn-secondary flex-1 sm:flex-none" onClick={() => onOpenLog(subject, 'add')}>
          <CalendarPlus className="h-4 w-4" />
          Detalhar
        </button>
        <div className="ml-auto flex">
          <button type="button" className="icon-btn" onClick={() => onOpenLog(subject, 'history')} aria-label="Ver histórico de faltas" title="Histórico de faltas">
            <History className="h-[18px] w-[18px]" />
          </button>
          <button type="button" className="icon-btn" onClick={() => onSimulate(subject)} aria-label="Simular faltas" title="Posso faltar?">
            <Calculator className="h-[18px] w-[18px]" />
          </button>
        </div>
      </footer>
    </article>
  );
}
