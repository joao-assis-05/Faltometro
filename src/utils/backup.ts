import type { AbsenceRecord, BackupData, ClassSchedule, Subject } from '../types';
import { DEFAULT_ABSENCE_LIMIT } from './calculations';
import { todayISO } from './date';
import { uid } from './id';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSchedule(value: unknown): value is ClassSchedule {
  return (
    isObject(value) &&
    typeof value.day === 'number' &&
    value.day >= 0 &&
    value.day <= 6 &&
    typeof value.start === 'string' &&
    typeof value.end === 'string'
  );
}

function toSubject(value: unknown): Subject | null {
  if (!isObject(value)) return null;
  if (typeof value.id !== 'string' || typeof value.name !== 'string') return null;
  if (typeof value.totalClasses !== 'number' || value.totalClasses <= 0) return null;
  return {
    id: value.id,
    name: value.name,
    professor: typeof value.professor === 'string' ? value.professor : undefined,
    room: typeof value.room === 'string' ? value.room : undefined,
    totalClasses: value.totalClasses,
    workloadUnit: value.workloadUnit === 'horas' ? 'horas' : 'aulas',
    absenceLimitPercent:
      typeof value.absenceLimitPercent === 'number'
        ? value.absenceLimitPercent
        : DEFAULT_ABSENCE_LIMIT,
    schedule: Array.isArray(value.schedule)
      ? value.schedule.filter(isSchedule).map((s) => ({ ...s, id: s.id || uid() }))
      : [],
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
  };
}

function toAbsence(value: unknown): AbsenceRecord | null {
  if (!isObject(value)) return null;
  if (typeof value.id !== 'string' || typeof value.subjectId !== 'string') return null;
  if (typeof value.amount !== 'number' || value.amount <= 0) return null;
  const justified = value.justified === true;
  return {
    id: value.id,
    subjectId: value.subjectId,
    date: typeof value.date === 'string' ? value.date : todayISO(),
    amount: value.amount,
    reason: typeof value.reason === 'string' ? value.reason : undefined,
    justified,
    excused: justified && value.excused === true,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
  };
}

export function createBackup(subjects: Subject[], absences: AbsenceRecord[]): BackupData {
  return {
    app: 'faltometro',
    version: 1,
    exportedAt: new Date().toISOString(),
    subjects,
    absences,
  };
}

export function downloadBackup(subjects: Subject[], absences: AbsenceRecord[]): void {
  const json = JSON.stringify(createBackup(subjects, absences), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `faltometro-backup-${todayISO()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Valida e normaliza o conteúdo de um arquivo de backup. Lança Error com mensagem amigável. */
export function parseBackup(text: string): BackupData {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  if (!isObject(data) || !Array.isArray(data.subjects) || !Array.isArray(data.absences)) {
    throw new Error('Este arquivo não é um backup do Faltômetro.');
  }
  const subjects = data.subjects.map(toSubject).filter((s): s is Subject => s !== null);
  const ids = new Set(subjects.map((s) => s.id));
  const absences = data.absences
    .map(toAbsence)
    .filter((a): a is AbsenceRecord => a !== null && ids.has(a.subjectId));

  if (subjects.length === 0 && data.subjects.length > 0) {
    throw new Error('Nenhuma disciplina válida foi encontrada no backup.');
  }

  return {
    app: 'faltometro',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    subjects,
    absences,
  };
}
