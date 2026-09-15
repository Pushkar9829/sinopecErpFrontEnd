export function StatusToggle({ checked, onChange, disabled, labels = ['Inactive', 'Active'] }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        disabled ? '' : 'cursor-pointer'
      }`}
    >
      <span
        className={`relative h-5 w-9 rounded-full transition ${
          checked ? 'bg-emerald-600' : 'bg-rose-500'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
      <span
        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
          checked
            ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
            : 'border-rose-200 bg-rose-100 text-rose-800'
        }`}
      >
        {checked ? labels[1] : labels[0]}
      </span>
    </button>
  );
}
