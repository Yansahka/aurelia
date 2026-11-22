// Histogramme en CSS pur. `target` = ligne d'objectif ; la dernière barre est mise en avant.
export default function BarChart({ data, target, format, height = 190, highlight = 'last', showValues = false }) {
  const max = (Math.max(...data.map((d) => d.value), target || 0) || 1) * 1.1;
  const hi = highlight === 'last' ? data.length - 1 : data.findIndex((d) => d.key === highlight);
  return (
    <div className="chart">
      <div className="plot" style={{ height, marginTop: showValues ? 18 : 0 }}>
        {target ? <div className="tgt" style={{ bottom: (target / max) * 100 + '%' }} /> : null}
        {data.map((d, i) => (
          <div className="col" key={d.key} title={`${d.label} : ${format(d.value)}`}>
            {showValues && <span className="chart-value">{format(d.value)}</span>}
            <div className={'bar' + (i === hi ? ' hi' : '')} style={{ height: (d.value / max) * 100 + '%' }} />
          </div>
        ))}
      </div>
      <div className="labels">{data.map((d) => <span key={d.key}>{d.label}</span>)}</div>
    </div>
  );
}
