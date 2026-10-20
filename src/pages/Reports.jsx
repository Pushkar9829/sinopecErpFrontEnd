import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { reportsApi } from '../api/reports.api';
import { AccountsReport } from '../components/reports/AccountsReport';
import { DispatchReport } from '../components/reports/DispatchReport';
import { OverviewReport } from '../components/reports/OverviewReport';
import { ProductionReport } from '../components/reports/ProductionReport';
import { SalesReport } from '../components/reports/SalesReport';
import { PeriodPicker } from '../components/reports/ReportKit';
import { ReportPeriodContext, presetPeriod } from '../lib/reports';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { useAuth } from '../context/auth';
import { usePermission } from '../hooks/usePermission';
import { formatDate } from '../lib/sales';

// One place for every report. Each tab is shown only to the people whose work
// it is; the API checks the same permission again.
const REPORTS = [
  // No role holds company:update, so only the owner (Super Admin) sees the overview.
  { id: 'overview', label: 'Owner overview', anyOf: ['company:update'], load: reportsApi.overview, View: OverviewReport },
  { id: 'sales', label: 'Sales', anyOf: ['sales:read'], load: reportsApi.sales, View: SalesReport },
  { id: 'production', label: 'Production', anyOf: ['production:read'], load: reportsApi.production, View: ProductionReport },
  { id: 'dispatch', label: 'Dispatch', anyOf: ['dispatch:read', 'production:read', 'sales:read'], load: reportsApi.dispatch, View: DispatchReport },
  { id: 'accounts', label: 'Accounts', anyOf: ['accounts:read'], load: reportsApi.accounts, View: AccountsReport },
];

export function Reports() {
  const { can } = usePermission();
  const { user } = useAuth();
  const tabs = useMemo(() => REPORTS.filter((r) => r.anyOf.some(can)), [can]);
  const [params, setParams] = useSearchParams();
  const tab = tabs.find((t) => t.id === params.get('tab')) || tabs[0];
  const preset = params.get('period') || 'fy';
  const fallback = presetPeriod(preset === 'custom' ? 'fy' : preset);
  const period = preset === 'custom' ? { from: params.get('from') || fallback.from, to: params.get('to') || fallback.to } : fallback;
  const [result, setResult] = useState({ key: '', data: null, error: '' });
  const key = `${tab?.id}|${period.from}|${period.to}`;

  useEffect(() => {
    if (!tab) return undefined;
    let live = true;
    tab
      .load(period)
      .then((data) => live && setResult({ key, data, error: '' }))
      .catch((err) => live && setResult({ key, data: null, error: err.message }));
    return () => {
      live = false;
    };
    // `period` is rebuilt every render; `key` holds what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function update(next) {
    const merged = { tab: tab?.id, period: preset, from: period.from, to: period.to, ...next };
    if (merged.period !== 'custom') {
      delete merged.from;
      delete merged.to;
    }
    setParams(Object.fromEntries(Object.entries(merged).filter(([, v]) => v)), { replace: true });
  }

  if (!tabs.length) return <p className="text-sm text-slate">No reports for your role yet.</p>;
  const loading = result.key !== key;
  const View = tab.View;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        subtitle="Figures for a period, with downloads for Excel and printing."
        actions={
          <button type="button" onClick={() => window.print()} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold print:hidden">
            Print / Save as PDF
          </button>
        }
      />
      <div className="hidden print:block">
        <p className="text-lg font-semibold">
          {tab.label} report · {formatDate(period.from)} to {formatDate(period.to)}
        </p>
        <p className="text-xs text-slate">
          Printed {new Date().toLocaleString('en-IN')} by {user?.fullName || user?.username}
        </p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        {tabs.length > 1 ? <Tabs tabs={tabs.map((t) => ({ id: t.id, label: t.label }))} value={tab.id} onChange={(id) => update({ tab: id })} /> : <span />}
        <PeriodPicker preset={preset} period={period} onChange={(nextPreset, next) => update({ period: nextPreset, ...(nextPreset === 'custom' ? next : {}) })} />
      </div>
      {!loading && result.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{result.error}</p> : null}
      {loading ? <p className="text-sm text-slate">Working out the figures…</p> : null}
      {!loading && result.data ? (
        <ReportPeriodContext.Provider value={`${tab.label} report · ${formatDate(period.from)} to ${formatDate(period.to)}`}>
          <View data={result.data} />
        </ReportPeriodContext.Provider>
      ) : null}
    </div>
  );
}
