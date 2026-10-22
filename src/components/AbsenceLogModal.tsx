import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarX2, Check, FileText, Pencil, Trash2, X } from 'lucide-react';
import type { AbsenceFormData, AbsenceRecord, LogTab, Subject } from '../types';
import {
  STATUS_META,
  amountWithUnit,
  calculateStats,
  computeSubjectStats,
  formatAmount,
  formatPercent,
  isCounted,
  sessionSize,
  todaysSessions,
} from '../utils/calculations';
import { WEEKDAYS_LONG, formatDateBR, todayISO, weekdayOf } from '../utils/date';
import { Modal } from './Modal';
import { Switch } from './Switch';

interface AbsenceLogModalProps {
  open: boolean;
  subject: Subject | null;
  /** Todas as faltas (o modal filtra pela disciplina) */
  absences: AbsenceRecord[];
  initialTab: LogTab;
  onClose: () => void;
  onAdd: (subjectId: string, data: AbsenceFormData) => void;
  onUpdate: (id: string, data: AbsenceFormData) => void;
  onDelete: (id: string) => void;
}

const REASONS = ['Atestado médico', 'Trânsito', 'Trabalho', 'Doença', 'Compromisso pessoal'];

interface FormState {
  date: string;
  amount: string;
  reason: string;
  justified: boolean;
  excused: boolean;
}

function defaultAmount(subject: Subject | null): number {
  if (!subject) return 1;
  const today = todaysSessions(subject)[0] ?? subject.schedule[0];
  return today ? sessionSize(subject.workloadUnit, today) : subject.workloadUnit === 'horas' ? 2 : 2;
}

const emptyForm = (subject: Subject | null): FormState => ({
  date: todayISO(),
  amount: String(defaultAmount(subject)),
  reason: '',
  justified: false,
  excused: false,
});

export function AbsenceLogModal({
  open,
  subject,
  absences,
  initialTab,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
}: AbsenceLogModalProps) {
  const [tab, setTab] = useState<LogTab>(initialTab);
  const [form, setForm] = useState<FormState>(() => emptyForm(subject));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setForm(emptyForm(subject));
    setEditingId(null);
    setConfirmDeleteId(null);
    setError('');
  }, [open, initialTab, subject]);

  const records = useMemo(
    () =>
      subject
        ? absences
            .filter((a) => a.subjectId === subject.id)
            .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
        : [],
    [absences, subject],
  );

  if (!subject) return null;

  const unit = subject.workloadUnit;
  const stats = computeSubjectStats(subject, absences);
  const amount = Number(form.amount.replace(',', '.'));
  const validAmount = Number.isFinite(amount) && amount > 0;
  const editing = editingId ? records.find((r) => r.id === editingId) : undefined;

  // Prévia: como fica a frequência depois deste lançamento
  const previousCounted = editing && isCounted(editing) ? editing.amount : 0;
  const thisCounted = validAmount && !(form.justified && form.excused) ? amount : 0;
  const projected = calculateStats(
    subject.totalClasses,
    subject.absenceLimitPercent,
    stats.countedAbsences - previousCounted + thisCounted,
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const startEdit = (record: AbsenceRecord) => {
    setEditingId(record.id);
    setForm({
      date: record.date,
      amount: String(record.amount),
      reason: record.reason ?? '',
      justified: record.justified,
      excused: record.excused,
    });
    setError('');
    setTab('add');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm(subject));
    setTab('history');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.date) return setError('Informe a data da falta.');
    if (!validAmount) return setError(`Informe quantas ${unit} você perdeu.`);
    const data: AbsenceFormData = {
      date: form.date,
      amount,
      reason: form.reason.trim() || undefined,
      justified: form.justified,
      excused: form.justified && form.excused,
    };
    if (editingId) {
      onUpdate(editingId, data);
      setEditingId(null);
      setForm(emptyForm(subject));
      setTab('history');
    } else {
      onAdd(subject.id, data);
    }
  };

  const quickAmounts = unit === 'horas' ? [1, 2, 3, 4] : [1, 2, 3, 4];
  const projectedMeta = STATUS_META[projected.status];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={subject.name}
      description={`${formatPercent(stats.frequency)} de frequência · ${amountWithUnit(unit, stats.countedAbsences)} de ${formatAmount(stats.maxAbsences)} usadas`}
      icon={<CalendarX2 className="h-5 w-5" />}
      footer={
        tab === 'add' ? (
          <>
            <button type="button" className="btn-ghost" onClick={editingId ? cancelEdit : onClose}>
              {editingId ? 'Cancelar edição' : 'Cancelar'}
            </button>
            <button type="submit" form="absence-form" className="btn-primary">
              {editingId ? 'Salvar alterações' : 'Registrar falta'}
            </button>
          </>
        ) : (
          <button type="button" className="btn-secondary" onClick={onClose}>
            Fechar
          </button>
        )
      }
    >
      <div className="mb-5 grid grid-cols-2 rounded-xl bg-ink-100 p-1 dark:bg-ink-800" role="tablist">
        {(
          [
            ['add', editingId ? 'Editando falta' : 'Registrar falta'],
            ['history', `Histórico (${records.length})`],
          ] as [LogTab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`focus-ring rounded-lg py-2 text-sm font-semibold transition ${
              tab === key ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-600 dark:text-white' : 'text-ink-500 dark:text-ink-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'add' ? (
        <form id="absence-form" onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="absence-date" className="label">
                Data
              </label>
              <input
                id="absence-date"
                type="date"
                className="input"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
              {form.date && (
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{WEEKDAYS_LONG[weekdayOf(form.date)]}</p>
              )}
            </div>
            <div>
              <label htmlFor="absence-amount" className="label">
                {unit === 'horas' ? 'Horas perdidas' : 'Aulas perdidas'}
              </label>
              <input
                id="absence-amount"
                type="number"
                inputMode="decimal"
                min={unit === 'horas' ? 0.5 : 1}
                step={unit === 'horas' ? 0.5 : 1}
                className="input"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
              />
              <div className="mt-2 flex gap-1.5">
                {quickAmounts.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set('amount', String(n))}
                    className={amount === n ? 'chip-on' : 'chip-off'}
                  >
                    {n}
                    {unit === 'horas' ? 'h' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="absence-reason" className="label">
              Justificativa ou observação <span className="font-normal text-ink-400">(opcional)</span>
            </label>
            <input
              id="absence-reason"
              className="input"
              placeholder="Ex.: Atestado médico"
              value={form.reason}
              onChange={(e) => set('reason', e.target.value)}
              maxLength={120}
            />
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => set('reason', reason)}
                  className={form.reason === reason ? 'chip-on' : 'chip-off'}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Switch
              checked={form.justified}
              onChange={(value) => setForm((prev) => ({ ...prev, justified: value, excused: value ? prev.excused : false }))}
              label="Falta justificada"
              description="Você tem comprovante ou motivo formal para esta falta."
            />
            {form.justified && (
              <Switch
                checked={form.excused}
                onChange={(value) => set('excused', value)}
                label="Falta abonada"
                description="A faculdade aceitou o abono: fica no histórico, mas não conta no limite."
              />
            )}
          </div>

          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

          {validAmount && (
            <div className={`rounded-xl px-4 py-3 text-sm ${projectedMeta.soft}`}>
              <p className="font-semibold">
                {projectedMeta.emoji} Depois deste registro: {formatPercent(projected.frequency)} de frequência
              </p>
              <p className="mt-0.5 opacity-80">
                {projected.status === 'failed'
                  ? `Ultrapassa o limite em ${amountWithUnit(unit, projected.exceededBy)}.`
                  : `Restarão ${amountWithUnit(unit, projected.remainingAbsences)} antes de reprovar.`}
                {form.justified && form.excused && ' Esta falta abonada não altera o cálculo.'}
              </p>
            </div>
          )}
        </form>
      ) : records.length === 0 ? (
        <div className="py-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-ink-300 dark:text-ink-600" />
          <p className="mt-3 font-semibold">Nenhuma falta registrada</p>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Use “Registrar falta” quando perder uma aula.</p>
        </div>
      ) : (
        <ul className="divide-y divide-ink-100 dark:divide-ink-800">
          {records.map((record) => {
            const counted = isCounted(record);
            const confirming = confirmDeleteId === record.id;
            return (
              <li key={record.id} className="flex items-start gap-3 py-3">
                <div
                  className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl font-display leading-none ${
                    counted
                      ? 'bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-100'
                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'
                  }`}
                >
                  <span className={`text-lg font-bold ${counted ? '' : 'line-through decoration-2'}`}>{formatAmount(record.amount)}</span>
                  <span className="text-[10px] font-semibold opacity-70">{unit === 'horas' ? 'h' : 'aulas'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {formatDateBR(record.date)}{' '}
                    <span className="font-normal text-ink-500 dark:text-ink-400">{WEEKDAYS_LONG[weekdayOf(record.date)]}</span>
                  </p>
                  {record.reason && <p className="truncate text-sm text-ink-600 dark:text-ink-300">{record.reason}</p>}
                  {(record.justified || record.excused) && (
                    <div className="mt-1 flex gap-1.5">
                      {record.justified && (
                        <span className="rounded-md bg-caneta-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-caneta-700 dark:text-caneta-400">
                          Justificada
                        </span>
                      )}
                      {record.excused && (
                        <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          Abonada
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {confirming ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="mr-1 text-xs font-medium text-rose-600">Excluir?</span>
                    <button
                      type="button"
                      className="icon-btn bg-rose-600 !text-white hover:!bg-rose-500"
                      onClick={() => {
                        onDelete(record.id);
                        setConfirmDeleteId(null);
                      }}
                      aria-label="Confirmar exclusão"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button type="button" className="icon-btn" onClick={() => setConfirmDeleteId(null)} aria-label="Cancelar exclusão">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0">
                    <button type="button" className="icon-btn" onClick={() => startEdit(record)} aria-label="Editar registro">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="icon-btn hover:!bg-rose-50 hover:!text-rose-600 dark:hover:!bg-rose-500/10"
                      onClick={() => setConfirmDeleteId(record.id)}
                      aria-label="Excluir registro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
