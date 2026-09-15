import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { salesSettingsApi } from '../api/salesSettings.api';
import { PermissionGate } from '../components/PermissionGate';
import { ActiveBadge, Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { Tabs } from '../components/ui/Tabs';
import { StatusToggle } from '../components/ui/StatusToggle';
import { usePagedList } from '../hooks/usePagedList';
import { usePermission } from '../hooks/usePermission';
import { OPTION_GROUPS, OPTION_LIST_SECTIONS, routeLabel } from '../lib/sales';

const WORD_PAGE_SIZE = 8;

function groupMeta(id, groups) {
  const local = OPTION_GROUPS.find((item) => item.id === id);
  const fromApi = groups.find((item) => item.id === id);
  if (!local && !fromApi) return null;
  return { ...local, ...fromApi, hint: local?.hint || fromApi?.hint || '' };
}

export function SalesSettings() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const canEdit = can('sales:update');
  const [tab, setTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [optionRows, setOptionRows] = useState([]);
  const [groups, setGroups] = useState(OPTION_GROUPS);
  const [group, setGroup] = useState('material');
  const [newValue, setNewValue] = useState('');
  const [query, setQuery] = useState('');
  const [wordQuery, setWordQuery] = useState('');
  const [wordStatus, setWordStatus] = useState('all');
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

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((template) =>
      [template.name, template.code, template.product, template.material, template.size].some((value) =>
        String(value || '').toLowerCase().includes(q)
      )
    );
  }, [templates, query]);

  const counts = useMemo(() => {
    const next = {};
    for (const row of optionRows) {
      next[row.group] = (next[row.group] || 0) + 1;
    }
    return next;
  }, [optionRows]);

  const selectedGroup = groupMeta(group, groups);
  const searchingWords = wordQuery.trim().length > 0;

  const scopedWords = useMemo(() => {
    const q = wordQuery.trim().toLowerCase();
    return optionRows.filter((option) => {
      if (!q && option.group !== group) return false;
      if (!q) return true;
      const listName = groupMeta(option.group, groups)?.label || option.group;
      return [option.value, listName].some((value) => String(value || '').toLowerCase().includes(q));
    });
  }, [optionRows, group, wordQuery, groups]);

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
        if (wordStatus === 'active') return active;
        if (wordStatus === 'inactive') return !active;
        return true;
      })
      .sort((a, b) => String(a.value).localeCompare(String(b.value)));
  }, [scopedWords, wordStatus]);

  const wordList = usePagedList(filteredWords, { pageSize: WORD_PAGE_SIZE, resetKey: `${group}|${wordQuery}|${wordStatus}` });

  async function addOption(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      await salesSettingsApi.addOption({ group, value: newValue });
      setNewValue('');
      await load();
      setNotice(`Added “${newValue.trim()}” to ${selectedGroup?.label || 'the list'}.`);
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

  async function removeOption(option) {
    if (!window.confirm(`Remove “${option.value}” from ${selectedGroup?.label || 'this list'}?`)) return;
    setError('');
    try {
      await salesSettingsApi.removeOption(option.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeTemplate(template) {
    if (!window.confirm(`Delete saved product “${template.name}”? Orders already created are not changed.`)) return;
    setError('');
    try {
      await salesSettingsApi.removeTemplate(template.id);
      await load();
      setNotice(`Removed “${template.name}”.`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className={tab === 'lists' ? 'flex h-[calc(100dvh-2rem)] flex-col gap-4 overflow-hidden' : 'space-y-5'}>
      <div className="shrink-0">
      <PageHeader
        title="Product setup"
        subtitle="Save what you sell often. On a sales order, pick it from a list — or still type something new."
        search={
          tab === 'templates' ? <SearchField value={query} onChange={setQuery} placeholder="Find a saved product" /> : null
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/sales-orders/new" className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-paper">
              New sales order
            </Link>
            <PermissionGate permission="sales:create">
              <Link
                to="/sales-settings/templates/new"
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark"
              >
                Save a product
              </Link>
            </PermissionGate>
          </div>
        }
        extra={
          <Tabs
            tabs={[
              { id: 'templates', label: 'Saved products', count: templates.length, tone: 'accent' },
              { id: 'lists', label: 'Quick-pick words', count: optionRows.length, tone: 'info' },
            ]}
            value={tab}
            onChange={setTab}
          />
        }
      />
      </div>

      {error ? <p className="shrink-0 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="shrink-0 text-sm text-emerald-700">{notice}</p> : null}

      {tab === 'templates' ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <section className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-orange-900">1. Saved products</p>
              <p className="mt-1 text-sm text-slate">
                One card = one product you sell again and again. Size, material, print, holes, and route are stored together.
              </p>
            </section>
            <section className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-sky-900">2. On the sales order</p>
              <p className="mt-1 text-sm text-slate">
                Open a line, choose <span className="font-medium text-ink">Use saved template</span>, then only change quantity or anything special for that customer.
              </p>
            </section>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="rounded-xl border border-line bg-card">
              <EmptyState
                title={query ? 'No saved product matches' : 'No saved products yet'}
                hint={query ? 'Clear search or save a new product.' : 'Start with a bag or film roll you make every week.'}
              />
              {!query ? (
                <div className="pb-5 text-center">
                  <PermissionGate permission="sales:create">
                    <Link
                      to="/sales-settings/templates/new"
                      className="inline-flex rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark"
                    >
                      Save your first product
                    </Link>
                  </PermissionGate>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredTemplates.map((template) => (
                <article
                  key={template.id}
                  className="cursor-pointer rounded-xl border border-line bg-card p-4 hover:border-accent"
                  onClick={() => navigate(`/sales-settings/templates/${template.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-medium">{template.name}</h2>
                      <p className="text-xs text-slate">{template.code || 'No code'}</p>
                    </div>
                    <ActiveBadge active={template.isActive !== false} />
                  </div>
                  <p className="mt-3 text-sm">
                    {template.product || 'No product name'}
                    {template.size ? ` · ${template.size}` : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {template.material ? <Badge tone="info">{template.material}</Badge> : null}
                    {template.color ? <Badge tone="teal">{template.color}</Badge> : null}
                    {template.thickness ? <Badge tone="warning">{template.thickness}</Badge> : null}
                    {template.productionRoute ? <Badge tone="accent">{routeLabel(template.productionRoute)}</Badge> : null}
                  </div>
                  <div className="mt-4 flex gap-3 text-sm">
                    <button
                      type="button"
                      className="text-ink hover:underline"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/sales-settings/templates/${template.id}`);
                      }}
                    >
                      Edit
                    </button>
                    {can('sales:delete') ? (
                      <button
                        type="button"
                        className="text-red-700 hover:underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeTemplate(template);
                        }}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden lg:grid-cols-[17.5rem_1fr] lg:grid-rows-none">
          <aside className="flex max-h-52 min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-card lg:max-h-none">
            <p className="shrink-0 border-b border-line px-3 py-2 text-xs font-medium uppercase tracking-wide text-steel">
              Lists
            </p>
            <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto p-2">
              {OPTION_LIST_SECTIONS.map((section) => {
                const visibleGroups = section.groups.map((id) => groupMeta(id, groups)).filter(Boolean);
                if (!visibleGroups.length) return null;
                return (
                  <div key={section.id}>
                    <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wide text-steel">{section.label}</p>
                    <div className="space-y-1">
                      {visibleGroups.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setGroup(item.id);
                            setWordQuery('');
                            setWordStatus('all');
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm ${
                            group === item.id ? 'bg-ink text-paper' : 'text-slate hover:bg-paper'
                          }`}
                        >
                          <span>{item.label}</span>
                          <span className={group === item.id ? 'text-white/70' : 'text-steel'}>{counts[item.id] || 0}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </nav>
          </aside>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-card">
            <div className="shrink-0 border-b border-line px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-medium">{searchingWords ? 'Search results' : selectedGroup?.label || 'List'}</h2>
                  <p className="mt-0.5 text-sm text-slate">
                    {searchingWords
                      ? 'Matching words across every list'
                      : selectedGroup?.hint
                        ? `Examples: ${selectedGroup.hint}`
                        : 'These words appear on the sales order'}
                  </p>
                </div>
                <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                  <SearchField
                    value={wordQuery}
                    onChange={setWordQuery}
                    placeholder="Search words"
                    className="w-52"
                  />
                  {canEdit ? (
                    <form onSubmit={addOption} className="flex items-center gap-2">
                      <input
                        required
                        value={newValue}
                        onChange={(event) => setNewValue(event.target.value)}
                        placeholder={selectedGroup?.label ? `Add ${selectedGroup.label.toLowerCase()}` : 'Add a word'}
                        className="h-9 w-44 rounded-lg border border-line bg-white px-3 text-sm outline-none focus:border-accent"
                      />
                      <button
                        type="submit"
                        className="h-9 shrink-0 rounded-lg bg-accent px-3 text-sm font-medium text-white hover:bg-accent-dark"
                      >
                        Add
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
              <div className="mt-3">
                <Tabs
                  tabs={[
                    { id: 'all', label: 'All', count: wordStatusCounts.all },
                    { id: 'active', label: 'Active', count: wordStatusCounts.active, tone: 'success' },
                    { id: 'inactive', label: 'Inactive', count: wordStatusCounts.inactive, tone: 'danger' },
                  ]}
                  value={wordStatus}
                  onChange={setWordStatus}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-ink text-paper">
                  <tr>
                    <th className="w-16 px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Word</th>
                    <th className="px-4 py-3 font-medium">List</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    {canEdit ? <th className="w-28 px-4 py-3 font-medium">Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {wordList.paged.map((option, index) => (
                    <tr key={option.id} className="border-t border-line hover:bg-paper/70">
                      <td className="px-4 py-3 text-slate">{(wordList.page - 1) * wordList.pageSize + index + 1}</td>
                      <td className="px-4 py-3 font-medium">{option.value}</td>
                      <td className="px-4 py-3 text-slate">{groupMeta(option.group, groups)?.label || option.group}</td>
                      <td className="px-4 py-3">
                        <StatusToggle
                          checked={option.isActive !== false}
                          disabled={!canEdit}
                          onChange={(isActive) => toggleOption(option, isActive)}
                        />
                      </td>
                      {canEdit ? (
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => removeOption(option)} className="text-red-700 hover:underline">
                            Remove
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
              {wordList.total === 0 ? (
                <EmptyState
                  title={wordQuery ? 'No word matches' : 'Nothing in this list yet'}
                  hint={wordQuery ? 'Try another word, or pick a list on the left.' : 'Add the words your team types most often.'}
                />
              ) : null}
            </div>

            {wordList.total > 0 ? (
              <Pagination
                page={wordList.page}
                totalPages={wordList.totalPages}
                total={wordList.total}
                pageSize={wordList.pageSize}
                onPage={wordList.setPage}
              />
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
