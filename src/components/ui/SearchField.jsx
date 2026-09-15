export function SearchField({ value, onChange, placeholder, className = 'w-56' }) {
  return (
    <label className={`relative block shrink-0 ${className}`}>
      <span className="sr-only">{placeholder}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line bg-white px-3 py-1.5 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}
