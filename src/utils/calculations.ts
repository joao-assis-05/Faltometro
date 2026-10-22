import type {
  AbsenceRecord,
  ClassSchedule,
  Subject,
  SubjectStats,
  SubjectStatus,
  WorkloadUnit,
} from '../types';
import { timeToMinutes } from './date';

export const DEFAULT_ABSENCE_LIMIT = 25;

export const STATUS_ORDER: Record<SubjectStatus, number> = {
  safe: 0,
  warning: 1,
  critical: 2,
  failed: 3,
};

interface StatusMeta {
  label: string;
  emoji: string;
  badge: string;
  bar: string;
  slotEmpty: string;
  accent: string;
  text: string;
  soft: string;
}

export const STATUS_META: Record<SubjectStatus, StatusMeta> = {
  safe: {
    label: 'Seguro',
    emoji: '🟢',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300',
    bar: 'bg-emerald-500',
    slotEmpty: 'bg-emerald-500/15 dark:bg-emerald-400/10',
    accent: 'before:bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-400',
    soft: 'bg-emerald-50 text-emerald-900 dark:bg-emerald-400/10 dark:text-emerald-200',
  },
  warning: {
    label: 'Atenção',
    emoji: '🟡',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
    bar: 'bg-amber-500',
    slotEmpty: 'bg-amber-500/15 dark:bg-amber-400/10',
    accent: 'before:bg-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
    soft: 'bg-amber-50 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200',
  },
  critical: {
    label: 'Crítico',
    emoji: '🔴',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300',
    bar: 'bg-rose-500',
    slotEmpty: 'bg-rose-500/15 dark:bg-rose-400/10',
    accent: 'before:bg-rose-500',
    text: 'text-rose-700 dark:text-rose-400',
    soft: 'bg-rose-50 text-rose-900 dark:bg-rose-400/10 dark:text-rose-200',
  },
  failed: {
    label: 'Reprovado',
    emoji: '🟣',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-400/15 dark:text-purple-300',
    bar: 'bg-purple-600 dark:bg-purple-500',
    slotEmpty: 'bg-purple-500/15',
    accent: 'before:bg-purple-600',
    text: 'text-purple-700 dark:text-purple-400',
    soft: 'bg-purple-50 text-purple-900 dark:bg-purple-400/10 dark:text-purple-200',
  },
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function isCounted(record: AbsenceRecord): boolean {
  return !(record.justified && record.excused);
}

/**
 * Regras de status:
 * 🟣 Reprovado: faltas acima do limite permitido.
 * 🔴 Crítico:   mais de 80% do limite consumido (ou frequência abaixo de 75%).
 * 🟡 Atenção:   entre 50% e 80% do limite consumido (ou frequência abaixo de 85%).
 * 🟢 Seguro:    menos de 50% do limite consumido e frequência a partir de 85%.
 */
export function getStatus(counted: number, maxAbsences: number, frequency: number): SubjectStatus {
  if (counted > maxAbsences) return 'failed';
  if (maxAbsences === 0) return 'safe';
  const ratio = counted / maxAbsences;
  if (ratio > 0.8 || frequency < 75) return 'critical';
  if (ratio >= 0.5 || frequency < 85) return 'warning';
  return 'safe';
}

export function calculateStats(
  totalClasses: number,
  limitPercent: number,
  countedAbsences: number,
  excusedAbsences = 0,
): SubjectStats {
  const total = Math.max(0, totalClasses);
  // +1e-9 evita erro de ponto flutuante (ex.: 72 * 25 / 100)
  const maxAbsences = Math.floor((total * limitPercent) / 100 + 1e-9);
  const counted = round1(Math.max(0, countedAbsences));
  const frequency = total > 0 ? clamp(((total - counted) / total) * 100, 0, 100) : 100;
  const limitUsedPercent =
    maxAbsences > 0 ? (counted / maxAbsences) * 100 : counted > 0 ? 100 : 0;

  return {
    totalClasses: total,
    maxAbsences,
    countedAbsences: counted,
    excusedAbsences: round1(excusedAbsences),
    remainingAbsences: Math.max(0, round1(maxAbsences - counted)),
    exceededBy: Math.max(0, round1(counted - maxAbsences)),
    frequency,
    limitUsedPercent,
    status: getStatus(counted, maxAbsences, frequency),
  };
}

export function computeSubjectStats(subject: Subject, absences: AbsenceRecord[]): SubjectStats {
  let counted = 0;
  let excused = 0;
  for (const record of absences) {
    if (record.subjectId !== subject.id) continue;
    if (isCounted(record)) counted += record.amount;
    else excused += record.amount;
  }
  return calculateStats(subject.totalClasses, subject.absenceLimitPercent, counted, excused);
}

/** Estima quantas aulas/horas um encontro tem (aula de ~50 min) */
export function sessionSize(unit: WorkloadUnit, schedule: ClassSchedule): number {
  const minutes = timeToMinutes(schedule.end) - timeToMinutes(schedule.start);
  if (minutes <= 0) return 2;
  if (unit === 'horas') return Math.max(0.5, Math.round(minutes / 30) / 2);
  return Math.max(1, Math.round(minutes / 50));
}

export function todaysSessions(subject: Subject, day = new Date().getDay()): ClassSchedule[] {
  return subject.schedule.filter((s) => s.day === day);
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function formatAmount(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

export function unitLabel(unit: WorkloadUnit, amount: number): string {
  const singular = Math.abs(amount) === 1;
  if (unit === 'horas') return singular ? 'hora' : 'horas';
  return singular ? 'aula' : 'aulas';
}

export function amountWithUnit(unit: WorkloadUnit, amount: number): string {
  return `${formatAmount(amount)} ${unitLabel(unit, amount)}`;
}

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
