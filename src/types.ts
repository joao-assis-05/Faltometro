/** 0 = Domingo ... 6 = Sábado (mesmo padrão de Date.getDay()) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A carga horária pode ser contada em aulas ou em horas */
export type WorkloadUnit = 'aulas' | 'horas';

export type SubjectStatus = 'safe' | 'warning' | 'critical' | 'failed';

export type Theme = 'light' | 'dark';

export interface ClassSchedule {
  id: string;
  day: Weekday;
  /** Formato HH:mm */
  start: string;
  /** Formato HH:mm */
  end: string;
}

export interface Subject {
  id: string;
  name: string;
  professor?: string;
  room?: string;
  /** Total de aulas (ou horas) do semestre */
  totalClasses: number;
  workloadUnit: WorkloadUnit;
  /** Limite máximo de faltas em % (padrão 25) */
  absenceLimitPercent: number;
  schedule: ClassSchedule[];
  createdAt: string;
}

export interface AbsenceRecord {
  id: string;
  subjectId: string;
  /** Formato YYYY-MM-DD */
  date: string;
  /** Aulas (ou horas) perdidas no dia */
  amount: number;
  reason?: string;
  /** Falta com justificativa (atestado, trabalho etc.) */
  justified: boolean;
  /** Falta abonada: fica no histórico mas NÃO conta no limite. Só vale se justified = true */
  excused: boolean;
  createdAt: string;
}

export interface SubjectStats {
  totalClasses: number;
  maxAbsences: number;
  countedAbsences: number;
  excusedAbsences: number;
  remainingAbsences: number;
  /** Quanto ultrapassou o limite (0 se não ultrapassou) */
  exceededBy: number;
  /** ((Total - Faltas) / Total) * 100 */
  frequency: number;
  /** Percentual do limite de faltas já consumido */
  limitUsedPercent: number;
  status: SubjectStatus;
}

export type SortOption = 'name' | 'frequency' | 'risk';

export interface FilterOptions {
  search: string;
  status: SubjectStatus | 'all';
  sortBy: SortOption;
}

export interface BackupData {
  app: 'faltometro';
  version: 1;
  exportedAt: string;
  subjects: Subject[];
  absences: AbsenceRecord[];
}

export type SubjectFormData = Omit<Subject, 'id' | 'createdAt'>;
export type AbsenceFormData = Omit<AbsenceRecord, 'id' | 'subjectId' | 'createdAt'>;
export type LogTab = 'add' | 'history';
