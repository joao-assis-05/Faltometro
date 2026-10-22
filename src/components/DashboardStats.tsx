import type { ReactNode } from 'react';
import { AlertTriangle, BookOpen, ShieldAlert } from 'lucide-react';
import type { Subject, SubjectStats } from '../types';
import { formatAmount, formatPercent } from '../utils/calculations';

interface DashboardStatsProps {
  subjects: Subject[];
  statsById: Record<string, SubjectStats>;
}

export function DashboardStats({ subjects, statsById }: DashboardStatsProps) {
  const all = subjects.map((s) => statsById[s.id]).filter(Boolean);
  const average = all.length ? all.reduce((sum, s) => sum + s.frequency, 0) / all.length : 100;
  const warning = all.filter((s) => s.status === 'warning').length;
  const critical = all.filter((s) => s.status === 'critical').length;
  const failed = all.filter((s) => s.status === 'failed').length;
  const totalAbsences = all.reduce((sum, s) => sum + s.countedAbsences, 0);
  const tightest = all.length ? Math.min(...all.filter((s) => s.status !== 'failed').map((s) => s.remainingAbsences)) : 0;

  const averageColor =
    average >= 85 ? 'text-emerald-600 dark:text-emerald-400' : average >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';

  return (
    <section aria-label="Resumo do semestre" className="grid grid-cols-3 gap-2.5 sm:gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <div className="panel relative col-span-3 overflow-hidden p-5 sm:p-6 lg:col-span-1">
        <p className="text-sm font-medium text-ink-500 dark:text-ink-400">Frequência média do semestre</p>
        <p className={`mt-1 font-display text-5xl font-extrabold tracking-tight sm:text-6xl ${averageColor}`}>
          {formatPercent(average)}
        </p>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
          {subjects.length === 0
            ? 'Cadastre uma disciplina para começar.'
            : `${formatAmount(totalAbsences)} faltas contabilizadas em ${subjects.length} ${subjects.length === 1 ? 'disciplina' : 'disciplinas'}.`}
          {Number.isFinite(tightest) && all.some((s) => s.status !== 'failed') && (
            <> Na matéria mais apertada, sobram {formatAmount(tightest)}.</>
          )}
        </p>
      </div>

      <StatTile
        icon={<BookOpen className="h-5 w-5" />}
        label="Disciplinas"
        value={subjects.length}
        hint={`${all.filter((s) => s.status === 'safe').length} em situação segura`}
        tone="text-caneta-600 bg-caneta-500/10 dark:text-caneta-400"
      />
      <StatTile
        icon={<AlertTriangle className="h-5 w-5" />}
        label="Em alerta"
        value={warning}
        hint="Entre 50% e 80% do limite"
        tone="text-amber-700 bg-amber-500/10 dark:text-amber-400"
      />
      <StatTile
        icon={<ShieldAlert className="h-5 w-5" />}
        label="Críticas"
        value={critical + failed}
        hint={failed > 0 ? `${failed} já ${failed === 1 ? 'reprovada' : 'reprovadas'} por falta` : 'Nenhuma reprovação por falta'}
        tone="text-rose-700 bg-rose-500/10 dark:text-rose-400"
      />
    </section>
  );
}

interface StatTileProps {
  icon: ReactNode;
  label: string;
  value: number;
  hint: string;
  tone: string;
}

function StatTile({ icon, label, value, hint, tone }: StatTileProps) {
  return (
    <div className="panel flex flex-col items-start gap-2 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4 lg:flex-col lg:items-start lg:p-5">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink-500 dark:text-ink-400 sm:text-sm">{label}</p>
        <p className="font-display text-2xl font-bold leading-none tracking-tight sm:text-3xl">{value}</p>
        <p className="mt-1 hidden truncate text-xs text-ink-500 dark:text-ink-400 sm:block">{hint}</p>
      </div>
    </div>
  );
}
