const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(ym) {
  const [year, month] = ym.split('-');
  const label = MONTH_NAMES[Number(month) - 1] ?? month;
  const now = new Date();
  if (String(now.getFullYear()) !== year) return `${label} '${year.slice(2)}`;
  return label;
}

export default function IncomeChart({ data = [] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.expected, d.collected)));

  return (
    <div className="ll-chart" role="img" aria-label="Expected vs collected income, last 6 months">
      <div className="ll-chart-bars">
        {data.map((d) => (
          <div className="ll-chart-col" key={d.month}>
            <div className="ll-chart-track">
              <div
                className="ll-chart-bar ll-chart-expected"
                style={{ height: `${Math.round((d.expected / max) * 100)}%` }}
                title={`Expected: $${Number(d.expected).toFixed(2)}`}
              />
              <div
                className="ll-chart-bar ll-chart-collected"
                style={{ height: `${Math.round((d.collected / max) * 100)}%` }}
                title={`Collected: $${Number(d.collected).toFixed(2)}`}
              />
            </div>
            <span className="ll-chart-month">{monthLabel(d.month)}</span>
          </div>
        ))}
      </div>
      <div className="ll-chart-legend">
        <span className="ll-chart-key ll-chart-key-expected">Expected</span>
        <span className="ll-chart-key ll-chart-key-collected">Collected</span>
      </div>
    </div>
  );
}