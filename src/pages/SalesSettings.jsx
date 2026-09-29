import { confirmAction } from '../components/ui/ConfirmHost';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { salesSettingsApi } from '../api/salesSettings.api';
import { PermissionGate } from '../components/PermissionGate';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { StatusToggle } from '../components/ui/StatusToggle';
import { usePagedList } from '../hooks/usePagedList';
import { usePermission } from '../hooks/usePermission';
import { OPTION_GROUPS, OPTION_LIST_SECTIONS, routeLabel } from '../lib/sales';

const PAGE_SIZE = 8;

const VIEW_OPTIONS = [
  { id: 'templates', label: 'Saved products', chip: 'border-orange-300 bg-orange-100 text-orange-900', dot: 'bg-orange-600' },
  { id: 'lists', label: 'Quick-pick words', chip: 'border-sky-300 bg-sky-100 text-sky-800', dot: 'bg-sky-600' },
];

const STATUS_OPTIONS = [
  { id: 'all', label: 'All', chip: 'border-slate-300 bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  { id: 'active', label: 'Active', chip: 'border-emerald-300 bg-emerald-100 text-emerald-800', dot: 'bg-emerald-600' },
  { id: 'inactive', label: 'Inactive', chip: 'border-rose-300 bg-rose-100 text-rose-800', dot: 'bg-rose-600' },
];

const SECTION_TONES = {
  product: { chip: 'border-orange-300 bg-orange-100 text-orange-900', dot: 'bg-orange-600' },
  size: { chip: 'border-sky-300 bg-sky-100 text-sky-800', dot: 'bg-sky-600' },
  factory: { chip: 'border-violet-300 bg-violet-100 text-violet-800', dot: 'bg-violet-600' },
  print: { chip: 'border-teal-300 bg-teal-100 text-teal-800', dot: 'bg-teal-600' },
  finish: { chip: 'border-emerald-300 bg-emerald-100 text-emerald-800', dot: 'bg-emerald-600' },
};

function groupMeta(id, groups) {
  const local = OPTION_GROUPS.find((item) => item.id === id);
  const fromApi = groups.find((item) => item.id === id);
  if (!local && !fromApi) return null;
  return { ...local, ...fromApi, hint: local?.hint || fromApi?.hint || '' };
}

function sectionOf(groupId) {
  return OPTION_LIST_SECTIONS.find((section) => section.groups.includes(groupId));
}

function Chevron({ open }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function useMenu() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    function close() {
      setOpen(false);
    }
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);
  return [open, setOpen];
}

function ViewMenu({ value, counts, onChange }) {
  const [open, setOpen] = useMenu();
  const current = VIEW_OPTIONS.find((item) => item.id === value) || VIEW_OPTIONS[0];
  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label="Product setup view"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${current.chip}`}
      >
        <span className={`h-2 w-2 rounded-full ${current.dot}`} />
        {current.label} · {counts[current.id] ?? 0}
        <Chevron open={open} />
      </button>
      {open ? (
        <div className="absolute left-0 z-20 mt-1 w-52 rounded-lg border border-line bg-white p-1 shadow-md">
          {VIEW_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onChange(item.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                item.id === value ? item.chip : 'text-ink hover:bg-paper'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${item.dot}`} />
              <span className="flex-1">{item.label}</span>
              <span className="text-xs">{counts[item.id] ?? 0}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StatusMenu({ value, counts, onChange }) {
  const [open, setOpen] = useMenu();
  const current = STATUS_OPTIONS.find((item) => item.id === value) || STATUS_OPTIONS[0];
  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label="Status"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${current.chip}`}
      >
        <span className={`h-2 w-2 rounded-full ${current.dot}`} />
        {current.label} · {counts[current.id] ?? 0}
        <Chevron open={open} />
      </button>
      {open ? (
        <div className="absolute left-0 z-20 mt-1 w-44 rounded-lg border border-line bg-white p-1 shadow-md">
          {STATUS_OPTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onChange(item.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                item.id === value ? item.chip : 'text-ink hover:bg-paper'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${item.dot}`} />
              <span className="flex-1">{item.label}</span>
              <span className="text-xs">{counts[item.id] ?? 0}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ListMenu({ groups, value, counts, onChange }) {
  const [open, setOpen] = useMenu();
  const current = groupMeta(value, groups);
  const section = sectionOf(value);
  const tone = SECTION_TONES[section?.id] || SECTION_TONES.product;
  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label="Word list"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        className={`inline-flex max-w-56 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium ${tone.chip}`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
        <span className="truncate">{current?.label || 'List'} · {counts[value] || 0}</span>
        <Chevron open={open} />
      </button>
      {open ? (
        <div className="absolute left-0 z-20 mt-1 max-h-80 w-64 overflow-auto rounded-lg border border-line bg-white p-1 shadow-md">
          {OPTION_LIST_SECTIONS.map((sectionItem) => {
            const visible = sectionItem.groups.map((id) => groupMeta(id, groups)).filter(Boolean);
            if (!visible.length) return null;
            const itemTone = SECTION_TONES[sectionItem.id] || tone;
            return (
              <div key={sectionItem.id} className="py-1">
                <p className="px-2 py-1 text-xs font-medium text-steel">{sectionItem.label}</p>
                {visible.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange(item.id);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                      item.id === value ? itemTone.chip : 'text-ink hover:bg-paper'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${itemTone.dot}`} />
                    <span className="flex-1">{item.label}</span>
                    <span className="text-xs">{counts[item.id] || 0}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function IconButton({ label, className = '', children, ...props }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12.5 3.5l4 4L7 17H3v-4L12.5 3.5z" strokeLinejoin="round" />
      <path d="M10.5 5.5l4 4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M4 6h12" strokeLinecap="round" />
      <path d="M8 6V4h4v2" />
      <path d="M6 6l.7 10h6.6L14 6" strokeLinejoin="round" />
      <path d="M8.5 9v5M11.5 9v5" strokeLinecap="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="7" y="7" width="9" height="9" rx="1.5" />
      <path d="M13 7V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M10 4v12M4 10h12" strokeLinecap="round" />
    </svg>
  );
}

export function SalesSettings() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const canEdit = can('sales:update');
  const canCreate = can('sales:create');
  const canDelete = can('sales:delete');
  const [tab, setTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [optionRows, setOptionRows] = useState([]);
  const [groups, setGroups] = useState(OPTION_GROUPS);
  const [group, setGroup] = useState('material');
  const [newValue, setNewValue] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    const [nextTemplates, optionData] = await Promise.all([
      salesSettingsApi.listTemplates(),
      salesSettingsApi.options(),
    ]);
    setTemplates(nextTemplates);
    setOptionRows(optionData.options || []);
    if (optionData.groups?.length) setGroups(optionData.groups);
  }

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
  }, []);

  const viewCounts = useMemo(
    () => ({ templates: templates.length, lists: optionRows.length }),
    [templates.length, optionRows.length]
  );

  const listCounts = useMemo(() => {
    const next = {};
    for (const row of optionRows) {
      next[row.group] = (next[row.group] || 0) + 1;
    }
    return next;
  }, [optionRows]);

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((template) => {
      const active = template.isActive !== false;
      if (status === 'active' && !active) return false;
      if (status === 'inactive' && active) return false;
      if (!q) return true;
      return [template.name, template.code, template.product, template.material, template.size].some((value) =>
        String(value || '').toLowerCase().includes(q)
      );
    });
  }, [templates, query, status]);

  const templateStatusCounts = useMemo(
    () => ({
      all: templates.length,
      active: templates.filter((template) => template.isActive !== false).length,
      inactive: templates.filter((template) => template.isActive === false).length,
    }),
    [templates]
  );

  const templateList = usePagedList(filteredTemplates, { pageSize: PAGE_SIZE, resetKey: `${query}|${status}` });

  const selectedGroup = groupMeta(group, groups);

  const scopedWords = useMemo(() => {
    const q = query.trim().toLowerCase();
    return optionRows.filter((option) => {
      if (option.group !== group) return false;
      if (!q) return true;
      return String(option.value || '').toLowerCase().includes(q);
    });
  }, [optionRows, group, query]);

  const wordStatusCounts = useMemo(
    () => ({
      all: scopedWords.length,
      active: scopedWords.filter((option) => option.isActive !== false).length,
      inactive: scopedWords.filter((option) => option.isActive === false).length,
    }),
    [scopedWords]
  );

  const filteredWords = useMemo(() => {
    return scopedWords
      .filter((option) => {
        const active = option.isActive !== false;
        if (status === 'active') return active;
        if (status === 'inactive') return !active;
        return true;
      })
      .sort((a, b) => String(a.value).localeCompare(String(b.value)));
  }, [scopedWords, status]);

  const wordList = usePagedList(filteredWords, { pageSize: PAGE_SIZE, resetKey: `${group}|${query}|${status}` });

  async function addOption(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await salesSettingsApi.addOption({ group, value: newValue });
      setNewValue('');
      await load();
      setNotice(`Added “${newValue.trim()}”.`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleOption(option, isActive) {
    setError('');
    setNotice('');
    try {
      await salesSettingsApi.updateOption(option.id, { isActive });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleTemplate(template, isActive) {
    setError('');
    setNotice('');
    try {
      await salesSettingsApi.updateTemplate(template.id, { isActive });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeOption(option) {
    if (!(await confirmAction({ message: `Remove “${option.value}”?`, confirmLabel: 'Delete', danger: true }))) return;
    setError('');
    try {
      await salesSettingsApi.removeOption(option.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function nextCopyName(name) {
    const base = String(name || 'Product').replace(/ copy( \d+)?$/i, '');
    const taken = new Set(templates.map((item) => String(item.name || '').toLowerCase()));
    let candidate = `${base} copy`;
    let count = 2;
    while (taken.has(candidate.toLowerCase())) {
      candidate = `${base} copy ${count}`;
      count += 1;
    }
    return candidate;
  }

  async function duplicateTemplate(template) {
    setError('');
    setNotice('');
    try {
      const source = await salesSettingsApi.getTemplate(template.id);
      const name = nextCopyName(source.name);
      const created = await salesSettingsApi.createTemplate({
        ...source,
        name,
        product: source.product && source.product !== source.name ? source.product : name,
        code: '',
        productCode: source.productCode && source.productCode !== source.code ? source.productCode : '',
      });
      setNotice(`Copied “${source.name}”.`);
      navigate(`/sales-settings/templates/${created.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeTemplate(template) {
    if (!(await confirmAction({ message: `Delete saved product “${template.name}”?`, confirmLabel: 'Delete', danger: true }))) return;
    setError('');
    try {
      await salesSettingsApi.removeTemplate(template.id);
      await load();
      setNotice(`Removed “${template.name}”.`);
    } catch (err) {
      setError(err.message);
    }
  }

  const statusCounts = tab === 'templates' ? templateStatusCounts : wordStatusCounts;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
        <h1 className="px-1 text-lg font-semibold">Product setup</h1>
        <ViewMenu value={tab} counts={viewCounts} onChange={setTab} />
        <StatusMenu value={status} counts={statusCounts} onChange={setStatus} />
        {tab === 'lists' ? (
          <ListMenu
            groups={groups}
            value={group}
            counts={listCounts}
            onChange={(next) => {
              setGroup(next);
              setQuery('');
              setStatus('all');
            }}
          />
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={tab === 'templates' ? 'Search products' : 'Search words'}
          />
          {tab === 'templates' ? (
            <PermissionGate permission="sales:create">
              <Link
                to="/sales-settings/templates/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark"
              >
                <PlusIcon />
                Add product
              </Link>
            </PermissionGate>
          ) : canEdit ? (
            <form onSubmit={addOption} className="flex items-center gap-2">
              <input
                required
                value={newValue}
                onChange={(event) => setNewValue(event.target.value)}
                placeholder={selectedGroup?.label ? `Add ${selectedGroup.label.toLowerCase()}` : 'Add a word'}
                className="w-40 rounded-lg border border-line bg-white px-3 py-1.5 text-sm outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark"
              >
                <PlusIcon />
                Add
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      {tab === 'templates' ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-card">
          <table className="min-w-full whitespace-nowrap text-left text-sm lg:whitespace-normal">
            <thead className="bg-ink text-paper">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Details</th>
                <th className="px-4 py-3 font-semibold">Route</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templateList.paged.map((template) => (
                <tr
                  key={template.id}
                  tabIndex={0}
                  onClick={() => navigate(`/sales-settings/templates/${template.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/sales-settings/templates/${template.id}`);
                    }
                  }}
                  className="cursor-pointer border-t border-line hover:bg-paper/70"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{template.name}</p>
                    <p className="text-xs text-slate">{template.product || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate">{template.code || '—'}</td>
                  <td className="px-4 py-3 text-slate">
                    {[template.material, template.size, template.color].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate">{template.productionRoute ? routeLabel(template.productionRoute) : '—'}</td>
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                    <StatusToggle
                      checked={template.isActive !== false}
                      disabled={!canEdit}
                      onChange={(isActive) => toggleTemplate(template, isActive)}
                    />
                  </td>
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <IconButton
                        label="Edit product"
                        className="text-ink hover:bg-paper"
                        onClick={() => navigate(`/sales-settings/templates/${template.id}`)}
                      >
                        <PencilIcon />
                      </IconButton>
                      {canCreate ? (
                        <IconButton
                          label="Duplicate product"
                          className="text-ink hover:bg-paper"
                          onClick={() => duplicateTemplate(template)}
                        >
                          <CopyIcon />
                        </IconButton>
                      ) : null}
                      {canDelete ? (
                        <IconButton
                          label="Delete product"
                          className="text-red-700 hover:bg-red-50"
                          onClick={() => removeTemplate(template)}
                        >
                          <TrashIcon />
                        </IconButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loaded ? (
            <p className="px-4 py-6 text-sm text-slate">Loading…</p>
          ) : templateList.total === 0 ? (
            <EmptyState title="No saved products found" hint="Add a product you sell again." />
          ) : (
            <Pagination
              page={templateList.page}
              totalPages={templateList.totalPages}
              total={templateList.total}
              pageSize={templateList.pageSize}
              onPage={templateList.setPage}
            />
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-card">
          <table className="min-w-full whitespace-nowrap text-left text-sm lg:whitespace-normal">
            <thead className="bg-ink text-paper">
              <tr>
                <th className="px-4 py-3 font-semibold">Word</th>
                <th className="px-4 py-3 font-semibold">List</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {wordList.paged.map((option) => (
                <tr key={option.id} className="border-t border-line hover:bg-paper/70">
                  <td className="px-4 py-3 font-semibold">{option.value}</td>
                  <td className="px-4 py-3 text-slate">{groupMeta(option.group, groups)?.label || option.group}</td>
                  <td className="px-4 py-3">
                    <StatusToggle
                      checked={option.isActive !== false}
                      disabled={!canEdit}
                      onChange={(isActive) => toggleOption(option, isActive)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <IconButton label="Delete word" className="text-red-700 hover:bg-red-50" onClick={() => removeOption(option)}>
                        <TrashIcon />
                      </IconButton>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loaded ? (
            <p className="px-4 py-6 text-sm text-slate">Loading…</p>
          ) : wordList.total === 0 ? (
            <EmptyState title="No words found" hint="Add a word for this list." />
          ) : (
            <Pagination
              page={wordList.page}
              totalPages={wordList.totalPages}
              total={wordList.total}
              pageSize={wordList.pageSize}
              onPage={wordList.setPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
