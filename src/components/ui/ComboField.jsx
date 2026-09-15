import { useEffect, useMemo, useRef, useState } from 'react';
import { Field, inputClass } from './FormField';

export function ComboField({ label, value, options = [], onChange, disabled, required, className = '', placeholder = 'Select or type' }) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  const unique = useMemo(
    () => [...new Set(options.map((item) => String(item ?? '').trim()).filter(Boolean))],
    [options]
  );

  const filtered = useMemo(() => {
    const q = String(value || '').trim().toLowerCase();
    if (!q) return unique;
    return unique.filter((item) => item.toLowerCase().includes(q));
  }, [unique, value]);

  useEffect(() => {
    function handleClick(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const active = listRef.current.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [open, highlight, filtered]);

  function pick(option) {
    onChange(option);
    setOpen(false);
  }

  function onKeyDown(event) {
    if (disabled || filtered.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlight((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setHighlight((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && open && filtered[highlight]) {
      event.preventDefault();
      pick(filtered[highlight]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <Field label={label} className={className}>
      <div ref={rootRef} className="relative">
        <input
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          onFocus={() => !disabled && unique.length > 0 && setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
          className={inputClass}
        />
        {open && !disabled && filtered.length > 0 ? (
          <ul
            ref={listRef}
            className="absolute z-40 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-line bg-card py-1 shadow-lg"
          >
            {filtered.map((option, index) => (
              <li key={option}>
                <button
                  type="button"
                  data-active={index === highlight ? 'true' : 'false'}
                  className={`w-full px-3 py-1.5 text-left text-sm ${
                    index === highlight ? 'bg-paper text-ink' : 'text-slate hover:bg-paper'
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => pick(option)}
                >
                  {option}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Field>
  );
}
