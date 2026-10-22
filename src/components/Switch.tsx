interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <label
      className={`flex cursor-pointer items-start justify-between gap-4 rounded-xl p-3 ring-1 ring-ink-200 transition hover:bg-ink-50 dark:ring-ink-700 dark:hover:bg-ink-800/60 ${
        disabled ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-500 dark:text-ink-400">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`focus-ring relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          checked ? 'bg-caneta-500' : 'bg-ink-300 dark:bg-ink-700'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </label>
  );
}
