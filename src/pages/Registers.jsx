import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { StageRegister } from '../components/register/StageRegister';
import { registersApi } from '../api/registers.api';
import { StageMenu } from '../components/ui/StageMenu';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { PRODUCTION_STAGES, formatDate, statusLabel } from '../lib/sales';

const cell = 'whitespace-nowrap border border-stone-300 px-2 py-1.5 align-middle text-sm';
const head = 'whitespace-nowrap border border-stone-400 bg-stone-100 px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-600';

export function Registers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = usePermission();
  const isAdmin =
    can('production:read') ||
    can('sales:read') ||
    can('accounts:read') ||
    can('inventory:read') ||
    can('production:packing:read');
  const view = isAdmin && searchParams.get('view') === 'orders' ? 'orders' : 'stage';
  const stage = searchParams.get('stage') || '';
  const presetJob = searchParams.get('job') || '';
  const stages = useMemo(
    () => (isAdmin ? PRODUCTION_STAGES : PRODUCTION_STAGES.filter((item) => can(item.read))),
    [can, isAdmin]
  );
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [entryAction, setEntryAction] = useState(null);
  const onEntryState = useCallback((next) => setEntryAction(next), []);

  useEffect(() => {
    if (view === 'orders' || !stages.length) return;
    if (stage && stages.some((item) => item.id === stage)) return;
    const next = { stage: stages[0].id };
    if (isAdmin) next.view = 'stage';
    setSearchParams(next, { replace: true });
  }, [view, stage, stages, isAdmin, setSearchParams]);

  useEffect(() => {
    if (view !== 'orders') return;
    setError('');
    registersApi.list().then(setRows).catch((err) => setError(err.message));
  }, [view]);

  function setView(next) {
    if (next === 'orders') {
      setSearchParams({ view: 'orders' });
      return;
    }
    setSearchParams({ view: 'stage', stage: stage || stages[0]?.id || 'rolling' });
  }

  function clearJob() {
    const next = { stage: stage || '' };
    if (isAdmin) next.view = 'stage';
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="-mx-5 -my-4 flex h-dvh min-h-0 flex-col md:-mx-6">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-stone-800 bg-[#fffdf6]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-stone-800 bg-[#f6f1e4] px-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold text-stone-900">Register</h1>
            {isAdmin ? (
              <div className="flex overflow-hidden rounded-sm border border-stone-800">
                <button
                  type="button"
                  onClick={() => setView('orders')}
                  className={`px-3 py-1 text-sm font-semibold ${view === 'orders' ? 'bg-stone-900 text-white' : 'bg-white text-stone-800'}`}
                >
                  Sales order
                </button>
                <button
                  type="button"
                  onClick={() => setView('stage')}
                  className={`px-3 py-1 text-sm font-semibold ${view === 'stage' ? 'bg-stone-900 text-white' : 'bg-white text-stone-800'}`}
                >
                  Stage wise
                </button>
              </div>
            ) : null}
            {view === 'stage' && stages.length ? (
              <StageMenu
                stages={stages}
                value={stage || stages[0].id}
                onChange={(id) => setSearchParams(isAdmin ? { view: 'stage', stage: id } : { stage: id })}
              />
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {view === 'stage' && entryAction?.canEnter ? (
              <button
                type="button"
                onClick={entryAction.open}
                disabled={entryAction.disabled}
                className="rounded-sm bg-stone-900 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
              >
                New entry
              </button>
            ) : null}
            <p className="text-sm font-semibold text-stone-900">{formatDate(new Date())}</p>
          </div>
        </div>

        {view === 'orders' ? (
          <>
            {error ? <p className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p> : null}
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className={head}>No</th>
                    <th className={head}>Sales order</th>
                    <th className={head}>Party</th>
                    <th className={head}>Status</th>
                    <th className={head}>Due</th>
                    <th className={head}>Stages</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td className={`${cell} text-stone-500`} colSpan={6}>
                        No sales order is on the register yet.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr
                        key={row.orderId}
                        onClick={() => navigate(`/registers/${row.orderId}`)}
                        className={`cursor-pointer ${index % 2 ? 'bg-[#fbf7ee]' : 'bg-white'} hover:bg-amber-50`}
                      >
                        <td className={`${cell} w-12 text-stone-500`}>{index + 1}</td>
                        <td className={`${cell} font-semibold`}>{row.orderNumber}</td>
                        <td className={cell}>{row.customerName || '—'}</td>
                        <td className={cell}>{statusLabel(row.status)}</td>
                        <td className={cell}>{formatDate(row.deliveryDate)}</td>
                        <td className={cell}>{(row.stages || []).map((item) => item.label).join(' · ') || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <StageRegister
            stage={stage}
            isAdmin={isAdmin}
            presetJob={presetJob}
            operatorName={user?.fullName || user?.username || ''}
            onConsumePreset={clearJob}
            onEntryState={onEntryState}
          />
        )}
      </div>
    </div>
  );
}
