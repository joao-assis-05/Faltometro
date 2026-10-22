import type { AbsenceRecord, Subject } from '../types';
import { daysAgoISO } from '../utils/date';

const created = new Date().toISOString();

export const MOCK_SUBJECTS: Subject[] = [
  {
    id: 'calc2',
    name: 'Cálculo II',
    professor: 'Profª. Ana Ribeiro',
    room: 'Sala 204',
    totalClasses: 72,
    workloadUnit: 'aulas',
    absenceLimitPercent: 25,
    schedule: [
      { id: 'calc2-1', day: 1, start: '19:00', end: '20:40' },
      { id: 'calc2-2', day: 3, start: '19:00', end: '20:40' },
    ],
    createdAt: created,
  },
  {
    id: 'ed',
    name: 'Estruturas de Dados',
    professor: 'Prof. Marcos Lima',
    room: 'Laboratório 3',
    totalClasses: 80,
    workloadUnit: 'aulas',
    absenceLimitPercent: 25,
    schedule: [
      { id: 'ed-1', day: 2, start: '18:00', end: '21:20' },
      { id: 'ed-2', day: 4, start: '20:40', end: '22:20' },
    ],
    createdAt: created,
  },
  {
    id: 'bd',
    name: 'Banco de Dados',
    professor: 'Profª. Carla Souza',
    room: 'Sala 108',
    totalClasses: 60,
    workloadUnit: 'horas',
    absenceLimitPercent: 25,
    schedule: [{ id: 'bd-1', day: 5, start: '18:00', end: '22:00' }],
    createdAt: created,
  },
  {
    id: 'ingles',
    name: 'Inglês Instrumental',
    professor: 'Prof. Daniel Costa',
    room: 'Sala 301',
    totalClasses: 40,
    workloadUnit: 'aulas',
    absenceLimitPercent: 25,
    schedule: [{ id: 'ing-1', day: 1, start: '20:40', end: '22:20' }],
    createdAt: created,
  },
  {
    id: 'es',
    name: 'Engenharia de Software',
    professor: 'Profª. Juliana Prado',
    totalClasses: 64,
    workloadUnit: 'aulas',
    absenceLimitPercent: 25,
    schedule: [{ id: 'es-1', day: 3, start: '20:40', end: '22:20' }],
    createdAt: created,
  },
];

const absence = (
  id: string,
  subjectId: string,
  days: number,
  amount: number,
  reason = '',
  justified = false,
  excused = false,
): AbsenceRecord => ({
  id,
  subjectId,
  date: daysAgoISO(days),
  amount,
  reason: reason || undefined,
  justified,
  excused,
  createdAt: created,
});

export const MOCK_ABSENCES: AbsenceRecord[] = [
  // Cálculo II — 4 de 18 (seguro)
  absence('a1', 'calc2', 40, 2, 'Trânsito'),
  absence('a2', 'calc2', 12, 2, 'Trabalho', true),

  // Estruturas de Dados — 12 de 20 (atenção)
  absence('a3', 'ed', 50, 4, 'Prova de outra disciplina'),
  absence('a4', 'ed', 29, 4, 'Atestado médico', true),
  absence('a5', 'ed', 8, 2, 'Trânsito'),
  absence('a6', 'ed', 6, 2),

  // Banco de Dados — 13h de 15h + 4h abonadas (crítico)
  absence('a7', 'bd', 45, 4, 'Atestado médico', true, true),
  absence('a8', 'bd', 31, 4, 'Trabalho'),
  absence('a9', 'bd', 17, 4, 'Greve de ônibus', true),
  absence('a10', 'bd', 3, 5),

  // Inglês Instrumental — 12 de 10 (reprovado)
  absence('a11', 'ingles', 60, 2),
  absence('a12', 'ingles', 46, 2, 'Trabalho'),
  absence('a13', 'ingles', 32, 2),
  absence('a14', 'ingles', 25, 2, 'Trânsito'),
  absence('a15', 'ingles', 11, 2),
  absence('a16', 'ingles', 4, 2, 'Viagem'),
];
