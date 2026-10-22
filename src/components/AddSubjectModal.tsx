import { useEffect, useState, type FormEvent } from 'react';
import { BookPlus, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { ClassSchedule, Subject, SubjectFormData, Weekday, WorkloadUnit } from '../types';
import { DEFAULT_ABSENCE_LIMIT, amountWithUnit, calculateStats } from '../utils/calculations';
import { WEEKDAYS_LONG } from '../utils/date';
import { uid } from '../utils/id';
import { Modal } from './Modal';

interface AddSubjectModalProps {
  open: boolean;
  /** Quando informado, o modal entra em modo edição */
  initial?: Subject | null;
  onClose: () => void;
  onSave: (data: SubjectFormData) => void;
}

interface FormState {
  name: string;
  professor: string;
  room: string;
  totalClasses: string;
  workloadUnit: WorkloadUnit;
  absenceLimitPercent: string;
  schedule: ClassSchedule[];
}

type Errors = Partial<Record<'name' | 'totalClasses' | 'absenceLimitPercent' | 'schedule', string>>;

const emptyForm = (): FormState => ({
  name: '',
  professor: '',
  room: '',
  totalClasses: '',
  workloadUnit: 'aulas',
  absenceLimitPercent: String(DEFAULT_ABSENCE_LIMIT),
  schedule: [],
});

const fromSubject = (s: Subject): FormState => ({
  name: s.name,
  professor: s.professor ?? '',
  room: s.room ?? '',
  totalClasses: String(s.totalClasses),
  workloadUnit: s.workloadUnit,
  absenceLimitPercent: String(s.absenceLimitPercent),
  schedule: s.schedule.map((slot) => ({ ...slot })),
});

const parseNumber = (value: string) => Number(value.replace(',', '.'));

export function AddSubjectModal({ open, initial, onClose, onSave }: AddSubjectModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const isEditing = Boolean(initial);

  useEffect(() => {
    if (!open) return;
    setForm(initial ? fromSubject(initial) : emptyForm());
    setErrors({});
  }, [open, initial]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const total = parseNumber(form.totalClasses);
  const limit = parseNumber(form.absenceLimitPercent);
  const preview =
    Number.isFinite(total) && total > 0 && Number.isFinite(limit) && limit >= 0 && limit <= 100
      ? calculateStats(total, limit, 0)
      : null;

  const addSlot = () => {
    const used = new Set(form.schedule.map((s) => s.day));
    const nextDay = ([1, 2, 3, 4, 5, 6, 0] as Weekday[]).find((d) => !used.has(d)) ?? 1;
    const last = form.schedule[form.schedule.length - 1];
    set('schedule', [
      ...form.schedule,
      { id: uid(), day: nextDay, start: last?.start ?? '19:00', end: last?.end ?? '20:40' },
    ]);
  };

  const updateSlot = (id: string, patch: Partial<ClassSchedule>) =>
    set(
      'schedule',
      form.schedule.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );

  const removeSlot = (id: string) =>
    set(
      'schedule',
      form.schedule.filter((s) => s.id !== id),
    );

  const validate = (): Errors => {
    const next: Errors = {};
    if (!form.name.trim()) next.name = 'Informe o nome da disciplina.';
    if (!Number.isFinite(total) || total <= 0) next.totalClasses = 'Informe um número maior que zero.';
    if (!Number.isFinite(limit) || limit < 0 || limit > 100) next.absenceLimitPercent = 'Use um valor entre 0 e 100.';
    if (form.schedule.some((s) => s.end <= s.start)) next.schedule = 'O horário de término precisa ser depois do início.';
    return next;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    onSave({
      name: form.name.trim(),
      professor: form.professor.trim() || undefined,
      room: form.room.trim() || undefined,
      totalClasses: total,
      workloadUnit: form.workloadUnit,
      absenceLimitPercent: limit,
      schedule: [...form.schedule].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start)),
    });
  };

  const unitWord = form.workloadUnit === 'horas' ? 'horas' : 'aulas';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEditing ? 'Editar disciplina' : 'Nova disciplina'}
      description={isEditing ? initial?.name : 'Os limites de falta são calculados automaticamente.'}
      icon={isEditing ? <Pencil className="h-5 w-5" /> : <BookPlus className="h-5 w-5" />}
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="subject-form" className="btn-primary">
            {isEditing ? 'Salvar alterações' : 'Adicionar disciplina'}
          </button>
        </>
      }
    >
      <form id="subject-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="subject-name" className="label">
            Nome da disciplina
          </label>
          <input
            id="subject-name"
            className="input"
            placeholder="Ex.: Cálculo II"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            aria-invalid={Boolean(errors.name)}
            maxLength={80}
          />
          {errors.name && <p className="mt-1 text-xs font-medium text-rose-600">{errors.name}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="subject-professor" className="label">
              Professor <span className="font-normal text-ink-400">(opcional)</span>
            </label>
            <input
              id="subject-professor"
              className="input"
              placeholder="Ex.: Profª. Ana Ribeiro"
              value={form.professor}
              onChange={(e) => set('professor', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="subject-room" className="label">
              Sala <span className="font-normal text-ink-400">(opcional)</span>
            </label>
            <input
              id="subject-room"
              className="input"
              placeholder="Ex.: Sala 204"
              value={form.room}
              onChange={(e) => set('room', e.target.value)}
            />
          </div>
        </div>

        <fieldset>
          <legend className="label">Carga horária do semestre</legend>
          <div className="flex gap-2">
            <input
              id="subject-total"
              type="number"
              inputMode="decimal"
              min={1}
              step={form.workloadUnit === 'horas' ? 0.5 : 1}
              className="input"
              placeholder={form.workloadUnit === 'horas' ? 'Ex.: 60' : 'Ex.: 72'}
              value={form.totalClasses}
              onChange={(e) => set('totalClasses', e.target.value)}
              aria-invalid={Boolean(errors.totalClasses)}
              aria-label="Carga horária total"
            />
            <div className="flex shrink-0 rounded-xl bg-ink-100 p-1 dark:bg-ink-800" role="radiogroup" aria-label="Unidade">
              {(['aulas', 'horas'] as WorkloadUnit[]).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  role="radio"
                  aria-checked={form.workloadUnit === unit}
                  onClick={() => set('workloadUnit', unit)}
                  className={`focus-ring rounded-lg px-3 text-sm font-semibold capitalize transition ${
                    form.workloadUnit === unit
                      ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-600 dark:text-white'
                      : 'text-ink-500 dark:text-ink-400'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
          {errors.totalClasses && <p className="mt-1 text-xs font-medium text-rose-600">{errors.totalClasses}</p>}
        </fieldset>

        <div>
          <label htmlFor="subject-limit" className="label">
            Limite máximo de faltas (%)
          </label>
          <div className="flex gap-2">
            <input
              id="subject-limit"
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              className="input"
              value={form.absenceLimitPercent}
              onChange={(e) => set('absenceLimitPercent', e.target.value)}
              aria-invalid={Boolean(errors.absenceLimitPercent)}
            />
            {limit !== DEFAULT_ABSENCE_LIMIT && (
              <button
                type="button"
                className="btn-secondary shrink-0"
                onClick={() => set('absenceLimitPercent', String(DEFAULT_ABSENCE_LIMIT))}
              >
                <RotateCcw className="h-4 w-4" />
                {DEFAULT_ABSENCE_LIMIT}%
              </button>
            )}
          </div>
          {errors.absenceLimitPercent && (
            <p className="mt-1 text-xs font-medium text-rose-600">{errors.absenceLimitPercent}</p>
          )}
          <p className="mt-2 rounded-xl bg-ink-50 px-3 py-2 text-sm text-ink-600 dark:bg-ink-800/60 dark:text-ink-300">
            {preview
              ? `Você poderá faltar até ${amountWithUnit(form.workloadUnit, preview.maxAbsences)} no semestre (frequência mínima de ${100 - limit}%).`
              : `Preencha a carga horária para ver quantas ${unitWord} você pode faltar.`}
          </p>
        </div>

        <fieldset>
          <div className="mb-2 flex items-center justify-between">
            <legend className="label mb-0">Dias e horários</legend>
            <button type="button" className="btn-ghost -mr-2 px-2 py-1.5 text-caneta-600 dark:text-caneta-400" onClick={addSlot}>
              <Plus className="h-4 w-4" />
              Adicionar horário
            </button>
          </div>
          {form.schedule.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-200 px-3 py-4 text-center text-sm text-ink-500 dark:border-ink-700 dark:text-ink-400">
              Sem horários cadastrados. Eles ajudam a saber quando você tem aula hoje.
            </p>
          ) : (
            <ul className="space-y-2">
              {form.schedule.map((slot) => (
                <li key={slot.id} className="flex items-center gap-2">
                  <select
                    className="input min-w-0 flex-[1.3]"
                    value={slot.day}
                    onChange={(e) => updateSlot(slot.id, { day: Number(e.target.value) as Weekday })}
                    aria-label="Dia da semana"
                  >
                    {WEEKDAYS_LONG.map((label, day) => (
                      <option key={label} value={day}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    className="input min-w-0 flex-1"
                    value={slot.start}
                    onChange={(e) => updateSlot(slot.id, { start: e.target.value })}
                    aria-label="Início"
                  />
                  <input
                    type="time"
                    className="input min-w-0 flex-1"
                    value={slot.end}
                    onChange={(e) => updateSlot(slot.id, { end: e.target.value })}
                    aria-label="Término"
                  />
                  <button type="button" className="icon-btn shrink-0" onClick={() => removeSlot(slot.id)} aria-label="Remover horário">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {errors.schedule && <p className="mt-1 text-xs font-medium text-rose-600">{errors.schedule}</p>}
        </fieldset>
      </form>
    </Modal>
  );
}
