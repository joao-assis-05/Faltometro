import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Calculator, CalendarCheck } from 'lucide-react';
import type { AbsenceRecord, Subject } from '../types';
import {
  STATUS_META,
  amountWithUnit,
  calculateStats,
  computeSubjectStats,
  formatAmount,
  formatPercent,
  sessionSize,
  todaysSessions,
} from '../utils/calculations';
import { WEEKDAYS_LONG } from '../utils/date';
import { Modal } from './Modal';
import { ProgressBar } from './ProgressBar';

interface SimulatorModalProps {
  open: boolean;
  subjects: Subject[];
  absences: AbsenceRecord[];
  initialSubjectId?: string | null;
  onClose: () => void;
}

const VERDICT = {
  safe: { title: 'Pode faltar tranquilo', text: 'Você continua em situação segura.' },
  warning: { title: 'Pode, mas com atenção', text: 'Você entra na zona de alerta. Evite novas faltas depois disso.' },
  critical: { title: 'Pode, mas fica no limite', text: 'Você fica a poucas faltas de reprovar. Só se for realmente necessário.' },
  failed: { title: 'Não falte', text: 'Com essas faltas você ultrapassa o limite e reprova por frequência.' },
} as const;

function meetingSize(subject: Subject): number {
  const slot = todaysSessions(subject)[0] ?? subject.schedule[0];
  return slot ? sessionSize(subject.workloadUnit, slot) : 2;
}

export function SimulatorModal({ open, subjects, absences, initialSubjectId, onClose }: SimulatorModalProps) {
  const [subjectId, setSubjectId] = useState<string>('');
  const [extra, setExtra] = useState(2);
  const today = new Date().getDay();

  const subject = subjects.find((s) => s.id === subjectId) ?? null;

  useEffect(() => {
    if (!open) return;
    const withClassToday = subjects.find((s) => todaysSessions(s, today).length > 0);
    const initial = subjects.find((s) => s.id === initialSubjectId) ?? withClassToday ?? subjects[0];
    setSubjectId(initial?.id ?? '');
    setExtra(initial ? meetingSize(initial) : 2);
  }, [open, initialSubjectId, subjects, today]);

  const todayList = useMemo(
    () =>
      subjects
        .filter((s) => todaysSessions(s, today).length > 0)
        .map((s) => {
          const current = computeSubjectStats(s, absences);
          const size = todaysSessions(s, today).reduce((sum, slot) => sum + sessionSize(s.workloadUnit, slot), 0);
          const after = calculateStats(s.totalClasses, s.absenceLimitPercent, current.countedAbsences + size);
          return { subject: s, size, after };
        }),
    [subjects, absences, today],
  );

  if (subjects.length === 0) {
    return (
      <Modal open={open} onClose={onClose} title="Posso faltar?" icon={<Calculator className="h-5 w-5" />}>
        <p className="py-6 text-center text-sm text-ink-500 dark:text-ink-400">Cadastre uma disciplina para usar o simulador.</p>
      </Modal>
    );
  }

  const current = subject ? computeSubjectStats(subject, absences) : null;
  const projected =
    subject && current
      ? calculateStats(subject.totalClasses, subject.absenceLimitPercent, current.countedAbsences + extra)
      : null;
  const unit = subject?.workloadUnit ?? 'aulas';
  const step = unit === 'horas' ? 0.5 : 1;
  const sliderMax = current ? Math.max(8, Math.ceil(current.remainingAbsences + Math.max(4, current.maxAbsences * 0.25))) : 10;
  const verdict = projected ? VERDICT[projected.status] : null;
  const meta = projected ? STATUS_META[projected.status] : null;
  const size = subject ? meetingSize(subject) : 2;

  const presets = subject && current
    ? Array.from(
        new Map<number, string>([
          [size, `1 encontro (${formatAmount(size)})`],
          [size * 2, `2 encontros (${formatAmount(size * 2)})`],
          ...(current.remainingAbsences > 0
            ? ([[current.remainingAbsences, `Todo o restante (${formatAmount(current.remainingAbsences)})`]] as [number, string][])
            : []),
        ]),
      )
    : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Posso faltar?"
      description="Veja como fica sua frequência antes de decidir."
      icon={<Calculator className="h-5 w-5" />}
      footer={
        <button type="button" className="btn-secondary" onClick={onClose}>
          Fechar
        </button>
      }
    >
      <div className="space-y-5">
        {todayList.length > 0 && (
          <section aria-label="Aulas de hoje" className="rounded-2xl bg-caneta-500/[0.07] p-4 dark:bg-caneta-500/10">
            <h3 className="flex items-center gap-2 text-sm font-bold text-caneta-700 dark:text-caneta-400">
              <CalendarCheck className="h-4 w-4" />
              Hoje é {WEEKDAYS_LONG[today].toLowerCase()}. Se faltar tudo hoje:
            </h3>
            <ul className="mt-3 space-y-2">
              {todayList.map(({ subject: s, size: daySize, after }) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSubjectId(s.id);
                      setExtra(daySize);
                    }}
                    className="focus-ring flex w-full items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-left ring-1 ring-ink-100 transition hover:ring-caneta-400 dark:bg-ink-900 dark:ring-ink-800"
                  >
                    <span aria-hidden>{STATUS_META[after.status].emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{s.name}</span>
                      <span className="block text-xs text-ink-500 dark:text-ink-400">
                        −{amountWithUnit(s.workloadUnit, daySize)} → {formatPercent(after.frequency)}
                      </span>
                    </span>
                    <span className={`shrink-0 text-xs font-bold ${STATUS_META[after.status].text}`}>
                      {after.status === 'failed' ? 'Não pode' : after.status === 'safe' ? 'Pode' : 'Com cuidado'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div>
          <label htmlFor="sim-subject" className="label">
            Disciplina
          </label>
          <select
            id="sim-subject"
            className="input"
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              const next = subjects.find((s) => s.id === e.target.value);
              if (next) setExtra(meetingSize(next));
            }}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {subject && current && projected && verdict && meta && (
          <>
            <div>
              <div className="flex items-baseline justify-between">
                <label htmlFor="sim-extra" className="label mb-0">
                  Se eu faltar mais
                </label>
                <span className="font-display text-2xl font-bold">{amountWithUnit(unit, extra)}</span>
              </div>
              <input
                id="sim-extra"
                type="range"
                min={0}
                max={sliderMax}
                step={step}
                value={Math.min(extra, sliderMax)}
                onChange={(e) => setExtra(Number(e.target.value))}
                className="mt-2 w-full accent-caneta-500"
              />
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                {presets.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setExtra(value)}
                    className={extra === value ? 'chip-on' : 'chip-off'}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`rounded-2xl p-4 sm:p-5 ${meta.soft}`} aria-live="polite">
              <p className="font-display text-2xl font-bold tracking-tight">
                {meta.emoji} {verdict.title}
              </p>
              <p className="mt-1 text-sm opacity-80">{verdict.text}</p>

              <div className="mt-4 flex items-center gap-3">
                <div>
                  <p className="text-xs font-medium opacity-70">Hoje</p>
                  <p className="font-display text-2xl font-bold">{formatPercent(current.frequency)}</p>
                </div>
                <ArrowRight className="h-5 w-5 opacity-50" />
                <div>
                  <p className="text-xs font-medium opacity-70">Depois</p>
                  <p className="font-display text-2xl font-bold">{formatPercent(projected.frequency)}</p>
                </div>
              </div>

              <div className="mt-4">
                <ProgressBar used={projected.countedAbsences} max={projected.maxAbsences} status={projected.status} />
                <p className="mt-1.5 text-xs opacity-80">
                  {projected.status === 'failed'
                    ? `${amountWithUnit(unit, projected.exceededBy)} acima do limite de ${formatAmount(projected.maxAbsences)}.`
                    : `Sobrariam ${amountWithUnit(unit, projected.remainingAbsences)} de ${formatAmount(projected.maxAbsences)}.`}
                </p>
              </div>
            </div>

            <p className="text-sm text-ink-500 dark:text-ink-400">
              {current.status === 'failed'
                ? 'Esta disciplina já passou do limite de faltas.'
                : `Hoje, o máximo que você ainda pode faltar em ${subject.name} é ${amountWithUnit(unit, current.remainingAbsences)}.`}
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
