import { CHART_COLORS } from './chartColors';

// The drawing is capped in width so many bars (e.g. 90 days) get thinner
// instead of the whole chart shrinking until labels are unreadable; labels
// are then thinned out to about 15.
function chartWidth(count) {
  return Math.max(240, Math.min(640, count * 28 + 40));
}

function labelStep(count) {
  return Math.max(1, Math.ceil(count / 15));
}

function barKeyDown(event, row, onBarClick) {
  if (!onBarClick || (event.key !== 'Enter' && event.key !== ' ')) return;
  event.preventDefault();
  onBarClick(row);
}

function niceMax(value) {
  if (!value || value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const norm = value / exp;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * exp;
}

export function BarChart({
  data = [],
  valueKey = 'value',
  labelKey = 'label',
  colorKey = 'color',
  color = CHART_COLORS.output,
  height = 108,
  onBarClick,
  ariaLabel,
}) {
  const width = chartWidth(data.length);
  const step = labelStep(data.length);
  const pad = { top: 8, right: 6, bottom: 24, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...data.map((row) => Number(row[valueKey]) || 0), 0));
  const gap = 4;
  const barW = data.length ? Math.max(6, innerW / data.length - gap) : 6;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto h-28 w-full max-w-3xl" role="img" aria-label={ariaLabel || 'Bar chart'}>
      {[0, 0.5, 1].map((tick) => {
        const y = pad.top + innerH - tick * innerH;
        return (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={pad.left - 6} y={y + 3} textAnchor="end" className="fill-steel" fontSize="9">
              {Math.round(max * tick)}
            </text>
          </g>
        );
      })}
      {data.map((row, index) => {
        const value = Number(row[valueKey]) || 0;
        const h = max ? (value / max) * innerH : 0;
        const x = pad.left + index * (barW + gap) + gap / 2;
        const y = pad.top + innerH - h;
        const fill = row[colorKey] || color;
        return (
          <g key={`${row[labelKey]}-${index}`}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(0, h)}
              rx="3"
              fill={fill}
              className={onBarClick ? 'cursor-pointer' : undefined}
              onClick={() => onBarClick?.(row)}
              tabIndex={onBarClick ? 0 : undefined}
              role={onBarClick ? 'button' : undefined}
              aria-label={onBarClick ? `${row[labelKey]}: ${value}` : undefined}
              onKeyDown={(event) => barKeyDown(event, row, onBarClick)}
            >
              <title>{`${row[labelKey]}: ${value}`}</title>
            </rect>
            {index % step === 0 ? (
              <text
                x={x + barW / 2}
                y={height - 8}
                textAnchor="middle"
                className="fill-steel"
                fontSize="9"
              >
                {row[labelKey]}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function StackedBarChart({
  data = [],
  series = [
    { key: 'output', color: CHART_COLORS.output },
    { key: 'waste', color: CHART_COLORS.waste },
  ],
  labelKey = 'label',
  height = 108,
  onBarClick,
  ariaLabel,
}) {
  const width = chartWidth(data.length);
  const step = labelStep(data.length);
  const pad = { top: 8, right: 6, bottom: 24, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const totals = data.map((row) => series.reduce((sum, item) => sum + (Number(row[item.key]) || 0), 0));
  const max = niceMax(Math.max(...totals, 0));
  const gap = 4;
  const barW = data.length ? Math.max(6, innerW / data.length - gap) : 6;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto h-28 w-full max-w-3xl" role="img" aria-label={ariaLabel || 'Bar chart'}>
      {[0, 0.5, 1].map((tick) => {
        const y = pad.top + innerH - tick * innerH;
        return (
          <g key={tick}>
            <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={pad.left - 6} y={y + 3} textAnchor="end" className="fill-steel" fontSize="9">
              {Math.round(max * tick)}
            </text>
          </g>
        );
      })}
      {data.map((row, index) => {
        const x = pad.left + index * (barW + gap) + gap / 2;
        let y = pad.top + innerH;
        return (
          <g
            key={`${row[labelKey]}-${index}`}
            className={onBarClick ? 'cursor-pointer' : undefined}
            onClick={() => onBarClick?.(row)}
            tabIndex={onBarClick ? 0 : undefined}
            role={onBarClick ? 'button' : undefined}
            aria-label={onBarClick ? String(row[labelKey]) : undefined}
            onKeyDown={(event) => barKeyDown(event, row, onBarClick)}
          >
            {series.map((item) => {
              const value = Number(row[item.key]) || 0;
              const h = max ? (value / max) * innerH : 0;
              y -= h;
              return (
                <rect key={item.key} x={x} y={y} width={barW} height={Math.max(0, h)} fill={item.color}>
                  <title>{`${row[labelKey]} ${item.key}: ${value}`}</title>
                </rect>
              );
            })}
            {index % step === 0 ? (
              <text x={x + barW / 2} y={height - 8} textAnchor="middle" className="fill-steel" fontSize="9">
                {row[labelKey]}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
