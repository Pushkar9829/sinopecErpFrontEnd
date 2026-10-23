import { useEffect, useState } from 'react';
import { billingApi } from '../../api/billing.api';
import { Field, inputClass } from '../ui/FormField';

// Cash or bank account the money went into. It is kept on the payment, so a
// later change of the default bank never moves it. Empty value = the API's
// default (cash for cash, the default bank for the rest), shown pre-selected.
export function DepositToField({ method, value, onChange }) {
  const [options, setOptions] = useState(null);
  useEffect(() => {
    let alive = true;
    billingApi
      .depositAccounts()
      .then((data) => alive && setOptions(data))
      .catch(() => alive && setOptions({ accounts: [] }));
    return () => {
      alive = false;
    };
  }, []);
  const fallback = options ? (method === 'cash' ? options.cash : options.defaultBank) || '' : '';
  const shown = value || fallback;
  if (!options?.accounts?.length) return null;
  return (
    <Field label="Deposited to">
      <select value={shown} onChange={(event) => onChange(event.target.value === fallback ? '' : event.target.value)} className={inputClass}>
        {options.accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
            {a.group === 'cash' ? ' (cash)' : ''}
            {a.id === options.defaultBank ? ' (default bank)' : ''}
          </option>
        ))}
      </select>
    </Field>
  );
}
