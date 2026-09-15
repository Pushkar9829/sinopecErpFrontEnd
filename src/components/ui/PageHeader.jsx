import { Link } from 'react-router-dom';

export function PageHeader({ title, subtitle, backTo, backLabel = 'Back', actions, search, extra }) {
  const hasToolbar = Boolean(search || actions);

  return (
    <div className="space-y-3">
      <div className={`flex flex-wrap gap-3 ${hasToolbar ? 'items-center justify-between' : 'items-start'}`}>
        <div className="min-w-0">
          {backTo ? (
            <Link to={backTo} className="mb-0.5 inline-block text-sm text-steel hover:text-ink">
              ← {backLabel}
            </Link>
          ) : null}
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle ? <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-slate">{subtitle}</div> : null}
        </div>
        {hasToolbar ? (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            {search}
            {actions}
          </div>
        ) : null}
      </div>
      {extra}
    </div>
  );
}
