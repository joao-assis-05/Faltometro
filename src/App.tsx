import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowDownUp,
  BookPlus,
  Calculator,
  Download,
  GraduationCap,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import { AbsenceLogModal } from './components/AbsenceLogModal';
import { AddSubjectModal } from './components/AddSubjectModal';
import { DashboardStats } from './components/DashboardStats';
import { SimulatorModal } from './components/SimulatorModal';
import { SubjectCard } from './components/SubjectCard';
import { Toast, type ToastData } from './components/Toast';
import { MOCK_ABSENCES, MOCK_SUBJECTS } from './data/mockData';
import { useLocalStorage } from './hooks/useLocalStorage';
import type {
  AbsenceFormData,
  AbsenceRecord,
  FilterOptions,
  LogTab,
  SortOption,
  Subject,
  SubjectFormData,
  SubjectStats,
  SubjectStatus,
  Theme,
} from './types';
import { downloadBackup, parseBackup } from './utils/backup';
import {
  STATUS_META,
  STATUS_ORDER,
  amountWithUnit,
  computeSubjectStats,
  formatPercent,
  normalizeText,
} from './utils/calculations';
import { todayISO } from './utils/date';
import { uid } from './utils/id';

const STORAGE_KEYS = {
  subjects: 'faltometro:subjects',
  absences: 'faltometro:absences',
  theme: 'faltometro:theme',
} as const;

const SORT_LABELS: Record<SortOption, string> = {
  risk: 'Maior risco primeiro',
  frequency: 'Menor frequência',
  name: 'Nome (A–Z)',
};

const STATUS_FILTERS: (SubjectStatus | 'all')[] = ['all', 'safe', 'warning', 'critical', 'failed'];

const systemTheme = (): Theme =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export default function App() {
  const [subjects, setSubjects] = useLocalStorage<Subject[]>(STORAGE_KEYS.subjects, MOCK_SUBJECTS);
  const [absences, setAbsences] = useLocalStorage<AbsenceRecord[]>(STORAGE_KEYS.absences, MOCK_ABSENCES);
  const [theme, setTheme] = useLocalStorage<Theme>(STORAGE_KEYS.theme, systemTheme);

  const [filters, setFilters] = useState<FilterOptions>({ search: '', status: 'all', sortBy: 'risk' });
  const [subjectModal, setSubjectModal] = useState<{ open: boolean; editing: Subject | null }>({
    open: false,
    editing: null,
  });
  const [logModal, setLogModal] = useState<{ subjectId: string; tab: LogTab } | null>(null);
  const [simulator, setSimulator] = useState<{ open: boolean; subjectId: string | null }>({
    open: false,
    subjectId: null,
  });
  const [toast, setToast] = useState<ToastData | null>(null);
  const [stampedId, setStampedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tema
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Toast some sozinho
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.onUndo ? 6000 : 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!stampedId) return;
    const timer = window.setTimeout(() => setStampedId(null), 400);
    return () => window.clearTimeout(timer);
  }, [stampedId]);

  const notify = useCallback((message: string, onUndo?: () => void, tone: ToastData['tone'] = 'default') => {
    setToast({ id: Date.now(), message, onUndo, tone });
  }, []);

  // Estatísticas calculadas
  const statsById = useMemo(() => {
    const map: Record<string, SubjectStats> = {};
    for (const subject of subjects) map[subject.id] = computeSubjectStats(subject, absences);
    return map;
  }, [subjects, absences]);

  const statusCounts = useMemo(() => {
    const counts: Record<SubjectStatus | 'all', number> = { all: subjects.length, safe: 0, warning: 0, critical: 0, failed: 0 };
    for (const s of subjects) counts[statsById[s.id].status] += 1;
    return counts;
  }, [subjects, statsById]);

  const visibleSubjects = useMemo(() => {
    const query = normalizeText(filters.search);
    const list = subjects.filter((subject) => {
      const stats = statsById[subject.id];
      if (filters.status !== 'all' && stats.status !== filters.status) return false;
      if (!query) return true;
      return [subject.name, subject.professor ?? '', subject.room ?? ''].some((field) =>
        normalizeText(field).includes(query),
      );
    });
    return list.sort((a, b) => {
      const sa = statsById[a.id];
      const sb = statsById[b.id];
      if (filters.sortBy === 'name') return a.name.localeCompare(b.name, 'pt-BR');
      if (filters.sortBy === 'frequency') return sa.frequency - sb.frequency;
      return (
        STATUS_ORDER[sb.status] - STATUS_ORDER[sa.status] ||
        sb.limitUsedPercent - sa.limitUsedPercent ||
        a.name.localeCompare(b.name, 'pt-BR')
      );
    });
  }, [subjects, statsById, filters]);

  // ---------- Disciplinas ----------
  const handleSaveSubject = (data: SubjectFormData) => {
    const editing = subjectModal.editing;
    if (editing) {
      setSubjects((prev) => prev.map((s) => (s.id === editing.id ? { ...s, ...data } : s)));
      notify(`“${data.name}” atualizada.`);
    } else {
      const subject: Subject = { ...data, id: uid(), createdAt: new Date().toISOString() };
      setSubjects((prev) => [...prev, subject]);
      notify(`“${data.name}” adicionada.`);
    }
    setSubjectModal({ open: false, editing: null });
  };

  const handleDeleteSubject = (subject: Subject) => {
    const related = absences.filter((a) => a.subjectId === subject.id).length;
    const message =
      related > 0
        ? `Excluir “${subject.name}” e ${related} ${related === 1 ? 'registro' : 'registros'} de falta?`
        : `Excluir “${subject.name}”?`;
    if (!window.confirm(message)) return;
    const previousSubjects = subjects;
    const previousAbsences = absences;
    setSubjects((prev) => prev.filter((s) => s.id !== subject.id));
    setAbsences((prev) => prev.filter((a) => a.subjectId !== subject.id));
    notify(`“${subject.name}” excluída.`, () => {
      setSubjects(previousSubjects);
      setAbsences(previousAbsences);
    });
  };

  // ---------- Faltas ----------
  const handleQuickAbsence = (subject: Subject) => {
    const record: AbsenceRecord = {
      id: uid(),
      subjectId: subject.id,
      date: todayISO(),
      amount: 1,
      justified: false,
      excused: false,
      createdAt: new Date().toISOString(),
    };
    const after = computeSubjectStats(subject, [...absences, record]);
    setAbsences((prev) => [...prev, record]);
    setStampedId(subject.id);
    notify(
      `+1 falta em ${subject.name}. Frequência: ${formatPercent(after.frequency)}.`,
      () => setAbsences((prev) => prev.filter((a) => a.id !== record.id)),
    );
  };

  const handleAddAbsence = (subjectId: string, data: AbsenceFormData) => {
    const subject = subjects.find((s) => s.id === subjectId);
    if (!subject) return;
    const record: AbsenceRecord = { ...data, id: uid(), subjectId, createdAt: new Date().toISOString() };
    const after = computeSubjectStats(subject, [...absences, record]);
    setAbsences((prev) => [...prev, record]);
    setLogModal(null);
    setStampedId(subjectId);
    notify(
      `${amountWithUnit(subject.workloadUnit, data.amount)} registradas em ${subject.name}. Frequência: ${formatPercent(after.frequency)}.`,
      () => setAbsences((prev) => prev.filter((a) => a.id !== record.id)),
    );
  };

  const handleUpdateAbsence = (id: string, data: AbsenceFormData) => {
    setAbsences((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
    notify('Registro de falta atualizado.');
  };

  const handleDeleteAbsence = (id: string) => {
    const removed = absences.find((a) => a.id === id);
    if (!removed) return;
    setAbsences((prev) => prev.filter((a) => a.id !== id));
    notify('Registro de falta excluído.', () => setAbsences((prev) => [...prev, removed]));
  };

  // ---------- Backup ----------
  const handleExport = () => {
    downloadBackup(subjects, absences);
    notify('Backup baixado. Guarde o arquivo .json para restaurar em outro dispositivo.');
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const backup = parseBackup(await file.text());
      const ok = window.confirm(
        `Restaurar ${backup.subjects.length} disciplina(s) e ${backup.absences.length} falta(s)? Os dados atuais deste navegador serão substituídos.`,
      );
      if (!ok) return;
      const previousSubjects = subjects;
      const previousAbsences = absences;
      setSubjects(backup.subjects);
      setAbsences(backup.absences);
      notify('Backup restaurado.', () => {
        setSubjects(previousSubjects);
        setAbsences(previousAbsences);
      });
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Não foi possível ler o arquivo.', undefined, 'error');
    }
  };

  const loadExample = () => {
    setSubjects(MOCK_SUBJECTS);
    setAbsences(MOCK_ABSENCES);
    notify('Dados de exemplo carregados.');
  };

  const logSubject = logModal ? subjects.find((s) => s.id === logModal.subjectId) ?? null : null;
  const hasFilters = filters.search !== '' || filters.status !== 'all';

  return (
    <div className="min-h-dvh pb-24 sm:pb-10">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-ink-50/85 pt-[env(safe-area-inset-top)] backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/85">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-caneta-500 text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-extrabold leading-none tracking-tight">Faltômetro</h1>
            <p className="mt-0.5 truncate text-xs text-ink-500 dark:text-ink-400">Sua frequência, matéria por matéria</p>
          </div>
          <nav className="flex items-center gap-1" aria-label="Ações">
            <button
              type="button"
              className="btn-ghost px-2.5 sm:px-3"
              onClick={() => setSimulator({ open: true, subjectId: null })}
              title="Posso faltar?"
            >
              <Calculator className="h-[18px] w-[18px]" />
              <span className="hidden md:inline">Posso faltar?</span>
            </button>
            <button type="button" className="btn-ghost px-2.5 sm:px-3" onClick={handleExport} title="Exportar backup (JSON)">
              <Download className="h-[18px] w-[18px]" />
              <span className="hidden md:inline">Exportar</span>
            </button>
            <button
              type="button"
              className="btn-ghost px-2.5 sm:px-3"
              onClick={() => fileInputRef.current?.click()}
              title="Importar backup (JSON)"
            >
              <Upload className="h-[18px] w-[18px]" />
              <span className="hidden md:inline">Importar</span>
            </button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
            <button
              type="button"
              className="icon-btn"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
              title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
            >
              {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 pt-5 sm:px-6 sm:pt-8">
        <DashboardStats subjects={subjects} statsById={statsById} />

        {subjects.length === 0 ? (
          <section className="panel flex flex-col items-center px-6 py-14 text-center">
            <BookPlus className="h-12 w-12 text-caneta-500" />
            <h2 className="mt-4 font-display text-2xl font-bold">Comece pelas suas disciplinas</h2>
            <p className="mt-2 max-w-sm text-sm text-ink-500 dark:text-ink-400">
              Cadastre cada matéria com a carga horária e o Faltômetro calcula quantas faltas você ainda pode ter.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn-primary" onClick={() => setSubjectModal({ open: true, editing: null })}>
                <Plus className="h-4 w-4" />
                Nova disciplina
              </button>
              <button type="button" className="btn-secondary" onClick={loadExample}>
                <Sparkles className="h-4 w-4" />
                Carregar exemplo
              </button>
            </div>
          </section>
        ) : (
          <section aria-label="Disciplinas" className="space-y-4">
            {/* Barra de busca e filtros */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="search"
                  className="input pl-10"
                  placeholder="Buscar disciplina, professor ou sala"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  aria-label="Buscar disciplina"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 lg:flex-none">
                  <ArrowDownUp className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <select
                    className="input pl-10 pr-8"
                    value={filters.sortBy}
                    onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value as SortOption }))}
                    aria-label="Ordenar"
                  >
                    {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                      <option key={key} value={key}>
                        {SORT_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn-primary hidden shrink-0 sm:inline-flex"
                  onClick={() => setSubjectModal({ open: true, editing: null })}
                >
                  <Plus className="h-4 w-4" />
                  Nova disciplina
                </button>
              </div>
            </div>

            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="group" aria-label="Filtrar por situação">
              {STATUS_FILTERS.map((status) => {
                const active = filters.status === status;
                const label = status === 'all' ? 'Todas' : `${STATUS_META[status].emoji} ${STATUS_META[status].label}`;
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilters((f) => ({ ...f, status }))}
                    className={active ? 'chip-on' : 'chip-off'}
                  >
                    {label}
                    <span className={`rounded-full px-1.5 text-[11px] ${active ? 'bg-white/20 dark:bg-ink-900/15' : 'bg-ink-100 dark:bg-ink-800'}`}>
                      {statusCounts[status]}
                    </span>
                  </button>
                );
              })}
            </div>

            {visibleSubjects.length === 0 ? (
              <div className="panel px-6 py-12 text-center">
                <p className="font-semibold">Nenhuma disciplina encontrada</p>
                <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Tente outro termo ou remova os filtros.</p>
                {hasFilters && (
                  <button
                    type="button"
                    className="btn-secondary mt-4"
                    onClick={() => setFilters((f) => ({ ...f, search: '', status: 'all' }))}
                  >
                    <X className="h-4 w-4" />
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visibleSubjects.map((subject) => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    stats={statsById[subject.id]}
                    justStamped={stampedId === subject.id}
                    onQuickAbsence={handleQuickAbsence}
                    onOpenLog={(s, tab) => setLogModal({ subjectId: s.id, tab })}
                    onSimulate={(s) => setSimulator({ open: true, subjectId: s.id })}
                    onEdit={(s) => setSubjectModal({ open: true, editing: s })}
                    onDelete={handleDeleteSubject}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Legenda */}
        <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t border-ink-100 pt-5 text-xs text-ink-500 dark:border-ink-800 dark:text-ink-400">
          <span>{STATUS_META.safe.emoji} Seguro: menos de 50% do limite usado</span>
          <span>{STATUS_META.warning.emoji} Atenção: de 50% a 80% do limite</span>
          <span>{STATUS_META.critical.emoji} Crítico: acima de 80% do limite</span>
          <span>{STATUS_META.failed.emoji} Reprovado: limite ultrapassado</span>
          <span className="w-full">Os dados ficam salvos apenas neste navegador. Exporte um backup para levar a outro dispositivo.</span>
        </footer>
      </main>

      {/* Botão flutuante no celular */}
      {subjects.length > 0 && (
        <button
          type="button"
          onClick={() => setSubjectModal({ open: true, editing: null })}
          className="focus-ring fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-caneta-500 text-white shadow-lg shadow-caneta-500/30 transition active:scale-95 sm:hidden"
          aria-label="Nova disciplina"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <AddSubjectModal
        open={subjectModal.open}
        initial={subjectModal.editing}
        onClose={() => setSubjectModal({ open: false, editing: null })}
        onSave={handleSaveSubject}
      />

      <AbsenceLogModal
        open={Boolean(logModal && logSubject)}
        subject={logSubject}
        absences={absences}
        initialTab={logModal?.tab ?? 'add'}
        onClose={() => setLogModal(null)}
        onAdd={handleAddAbsence}
        onUpdate={handleUpdateAbsence}
        onDelete={handleDeleteAbsence}
      />

      <SimulatorModal
        open={simulator.open}
        subjects={subjects}
        absences={absences}
        initialSubjectId={simulator.subjectId}
        onClose={() => setSimulator({ open: false, subjectId: null })}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
