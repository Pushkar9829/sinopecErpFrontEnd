export const CHART_COLORS = {
  output: '#059669',
  waste: '#d97706',
  rolling: '#ea580c',
  printing: '#0284c7',
  cutting: '#7c3aed',
  dispatch: '#0d9488',
  morning: '#ea580c',
  afternoon: '#0284c7',
  night: '#4338ca',
  muted: '#64748b',
};

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
}) {
  const width = Math.max(240, data.length * 28 + 40);
  const pad = { top: 8, right: 6, bottom: 24, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...data.map((row) => Number(row[valueKey]) || 0), 0));
  const gap = 4;
  const barW = data.length ? Math.max(6, innerW / data.length - gap) : 6;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto h-28 w-full max-w-lg" role="img">
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
            >
              <title>{`${row[labelKey]}: ${value}`}</title>
            </rect>
            <text
              x={x + barW / 2}
              y={height - 8}
              textAnchor="middle"
              className="fill-steel"
              fontSize="9"
            >
              {row[labelKey]}
            </text>
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
}) {
  const width = Math.max(240, data.length * 28 + 40);
  const pad = { top: 8, right: 6, bottom: 24, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const totals = data.map((row) => series.reduce((sum, item) => sum + (Number(row[item.key]) || 0), 0));
  const max = niceMax(Math.max(...totals, 0));
  const gap = 4;
  const barW = data.length ? Math.max(6, innerW / data.length - gap) : 6;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto h-28 w-full max-w-lg" role="img">
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
            <text x={x + barW / 2} y={height - 8} textAnchor="middle" className="fill-steel" fontSize="9">
              {row[labelKey]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
